import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import type { RunRecord } from "./run-storage";
import type { RunTrimConfig } from "./runtrim-config";

export const SyncRunSchema = z.object({
  localId: z.string(),
  task: z.string(),
  status: z.string(),
  // Bridge Mode optional fields
  goal: z.string().optional(),
  allowedScope: z.array(z.string()).optional(),
  forbiddenScope: z.array(z.string()).optional(),
  stopConditions: z.array(z.string()).optional(),
  memoryUsed: z.boolean().optional(),
  memorySummary: z.string().optional(),
  tokenBudget: z.number().optional(),
  scopeDriftStatus: z.string().optional(),
  reportSummary: z.string().optional(),
  createdAt: z.string(),
  evaluatedAt: z.string().nullable(),
  riskBefore: z.string().nullable(),
  riskAfter: z.string().nullable(),
  scoreBefore: z.number().nullable(),
  scoreAfter: z.number().nullable(),
  riskReductionPercent: z.number().nullable(),
  estimatedTokensTrimmed: z.number().int().nonnegative(),
  estimatedDollarsStandard: z.number().nonnegative(),
  estimatedDollarsExpensive: z.number().nonnegative(),
  changedFiles: z.array(z.string()),
  missingProofItems: z.array(z.string()),
  detectedRisks: z.array(z.string()),
  sensitiveAreas: z.array(z.string()),
  watchStatus: z.string().nullable(),
  watchWarnings: z.array(z.string()),
  watchChangedFiles: z.array(z.string()),
  nextSafePrompt: z.string().nullable(),
  latestPrompt: z.string().nullable(),
  continuationPrompt: z.string().nullable(),
  fallbackNextPrompt: z.string().nullable(),
});

export const SyncPayloadSchema = z.object({
  project: z.object({
    localProjectId: z.string(),
    name: z.string(),
    stack: z.array(z.string()),
    packageManager: z.string().nullable(),
    lastUpdated: z.string(),
  }),
  memory: z.object({
    markdown: z.string(),
    currentState: z.string(),
    previousTask: z.string(),
    latestStatus: z.string(),
    nextSafeAction: z.string(),
    nextSafePrompt: z.string(),
  }),
  runs: z.array(SyncRunSchema),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

function parseEstimatedNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function estimateSavingsFromTokens(tokens: number): { standard: number; expensive: number } {
  const inMillions = tokens / 1_000_000;
  return {
    standard: inMillions * 3,
    expensive: inMillions * 30,
  };
}

function readField(memory: string, label: string): string {
  const rx = new RegExp(`^${label}:\\s*(.*)$`, "mi");
  const match = memory.match(rx);
  return (match?.[1] ?? "").trim();
}

function readSection(memory: string, title: string): string {
  const lines = memory.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim().toLowerCase() === `${title.toLowerCase()}:`);
  if (idx === -1) return "";
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    out.push(line.trim());
  }
  return out.join(" ");
}

function readTextFileIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const text = fs.readFileSync(filePath, "utf-8").trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function resolveProjectName(cwd: string, inputName: string, auditName?: string): string {
  if (auditName?.trim()) return auditName.trim();
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
      if (pkg.name?.trim()) return pkg.name.trim();
    } catch {
      // ignore invalid package.json
    }
  }
  if (inputName.trim()) return inputName.trim();
  return path.basename(cwd);
}

function pickFallbackNextPrompt(input: {
  status: string;
  latestPromptText: string | null;
  continuationPromptText: string | null;
  run: RunRecord;
  memoryNextPrompt: string;
}): string | null {
  const { status, latestPromptText, continuationPromptText, run, memoryNextPrompt } = input;
  const runNextPrompt =
    run.evaluation?.nextPrompt ??
    run.evaluation?.nextSafePrompt ??
    run.evaluation?.nextGuardedPrompt ??
    run.contract?.splitReport?.nextSafePrompt ??
    null;
  const normalized = status.toLowerCase();

  if (normalized === "guarded" && latestPromptText) return latestPromptText;
  if (normalized === "split_required" || normalized === "blocked") {
    return runNextPrompt ?? (memoryNextPrompt || null);
  }
  if (normalized === "partial" || normalized === "needs_verification") {
    return continuationPromptText ?? run.evaluation?.nextPrompt ?? runNextPrompt ?? null;
  }

  return runNextPrompt;
}

export function buildLocalProjectId(cwd: string): string {
  return createHash("sha256").update(cwd).digest("hex").slice(0, 24);
}

export function buildSyncPayload(input: {
  cwd: string;
  projectName: string;
  config: RunTrimConfig;
  projectAudit?: { projectName?: string; detectedStack?: string[]; packageManager?: string } | null;
  memoryMarkdown: string;
  runs: RunRecord[];
}): SyncPayload {
  const { cwd, projectName, config, projectAudit, memoryMarkdown, runs } = input;
  const latest = runs[0];
  const nowIso = new Date().toISOString();
  const localProjectId = buildLocalProjectId(cwd);
  const latestPromptText = readTextFileIfExists(path.join(cwd, ".runtrim", "latest-prompt.md"));
  const continuationPromptText = readTextFileIfExists(
    path.join(cwd, ".runtrim", "continuation-prompt.md")
  );
  const memoryNextSafePrompt = readSection(memoryMarkdown, "Next safe prompt");

  const mappedRuns = runs.slice(0, 200).map((run) => {
    const tokens = Math.round(parseEstimatedNumber(String(run.contract.estimatedTokensTrimmed)));
    const dollars = estimateSavingsFromTokens(tokens);
    const status = run.evaluation?.status ?? run.status;
    const fallbackNextPrompt = pickFallbackNextPrompt({
      status,
      latestPromptText,
      continuationPromptText,
      run,
      memoryNextPrompt: memoryNextSafePrompt,
    });
    return {
      localId: run.id,
      task: run.task,
      status,
      createdAt: run.createdAt,
      evaluatedAt: run.evaluation?.evaluatedAt ?? null,
      riskBefore: run.audit?.wasteRiskBefore ?? null,
      riskAfter: run.contract?.wasteRiskAfter ?? null,
      scoreBefore: run.audit?.promptScoreBefore ?? null,
      scoreAfter: run.contract?.promptScoreAfter ?? null,
      riskReductionPercent: run.contract?.riskReductionPercent ?? null,
      estimatedTokensTrimmed: tokens,
      estimatedDollarsStandard: Number(dollars.standard.toFixed(4)),
      estimatedDollarsExpensive: Number(dollars.expensive.toFixed(4)),
      changedFiles: run.evaluation?.changedFiles ?? [],
      missingProofItems: run.evaluation?.missingProofItems ?? [],
      detectedRisks: (run.audit?.flags ?? []).map((f) => f.code),
      sensitiveAreas: run.audit?.sensitiveAreasRelevant ?? [],
      watchStatus: run.watchStatus ?? null,
      watchWarnings: run.watchWarnings ?? [],
      watchChangedFiles: run.watchChangedFiles ?? [],
      nextSafePrompt:
        run.evaluation?.nextPrompt ??
        run.evaluation?.nextSafePrompt ??
        run.evaluation?.nextGuardedPrompt ??
        run.contract?.splitReport?.nextSafePrompt ??
        fallbackNextPrompt ??
        null,
      latestPrompt: latestPromptText,
      continuationPrompt: continuationPromptText,
      fallbackNextPrompt,
      // Bridge Mode fields
      goal: run.contract?.contract?.cleanedObjective || undefined,
      allowedScope: run.contract?.contract?.relevantScope?.length
        ? run.contract.contract.relevantScope : undefined,
      forbiddenScope: run.contract?.contract?.forbiddenScope?.length
        ? run.contract.contract.forbiddenScope : undefined,
      stopConditions: run.contract?.contract?.stopRules?.length
        ? run.contract.contract.stopRules : undefined,
      memoryUsed: run.memoryUsed ?? undefined,
      memorySummary: run.memorySummary ?? run.evaluation?.memorySummary ?? undefined,
      tokenBudget: run.tokenBudget ?? undefined,
      scopeDriftStatus: run.scopeDriftStatus ?? undefined,
      reportSummary: run.reportSummary ?? undefined,
    };
  });

  const payload: SyncPayload = {
    project: {
      localProjectId,
      name: resolveProjectName(cwd, projectName, projectAudit?.projectName),
      stack: projectAudit?.detectedStack ?? (config.stack ? config.stack.split(",").map((s) => s.trim()).filter(Boolean) : ["auto"]),
      packageManager: projectAudit?.packageManager ?? config.packageManager ?? null,
      lastUpdated: nowIso,
    },
    memory: {
      markdown: memoryMarkdown,
      currentState: readSection(memoryMarkdown, "Current state"),
      previousTask: readSection(memoryMarkdown, "Previous task"),
      latestStatus: readSection(memoryMarkdown, "Latest run status"),
      nextSafeAction: readSection(memoryMarkdown, "Next safe action"),
      nextSafePrompt: readSection(memoryMarkdown, "Next safe prompt"),
    },
    runs: mappedRuns,
  };

  if (!payload.memory.currentState) {
    payload.memory.currentState = latest?.evaluation?.memorySummary ?? "No synced state yet.";
  }
  if (!payload.memory.previousTask) {
    payload.memory.previousTask = latest?.task ?? "";
  }
  if (!payload.memory.latestStatus) {
    payload.memory.latestStatus = latest?.evaluation?.status ?? latest?.status ?? "unknown";
  }
  if (!payload.memory.nextSafeAction) {
    payload.memory.nextSafeAction =
      latest?.evaluation?.nextSafeAction ?? "Run runtrim check before continuing.";
  }
  if (!payload.memory.nextSafePrompt) {
    payload.memory.nextSafePrompt =
      latest?.evaluation?.nextPrompt ??
      latest?.evaluation?.nextSafePrompt ??
      latest?.evaluation?.nextGuardedPrompt ??
      latest?.contract?.splitReport?.nextSafePrompt ??
      "";
  }

  return SyncPayloadSchema.parse(payload);
}
