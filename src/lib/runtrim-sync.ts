import { createHash } from "crypto";
import { z } from "zod";
import type { RunRecord } from "./run-storage";
import type { RunTrimConfig } from "./runtrim-config";

export const SyncRunSchema = z.object({
  localId: z.string(),
  task: z.string(),
  status: z.string(),
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
  nextSafePrompt: z.string().nullable(),
});

export const SyncPayloadSchema = z.object({
  project: z.object({
    localProjectId: z.string(),
    name: z.string(),
    stack: z.string(),
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

export function buildLocalProjectId(cwd: string): string {
  return createHash("sha256").update(cwd).digest("hex").slice(0, 24);
}

export function buildSyncPayload(input: {
  cwd: string;
  projectName: string;
  config: RunTrimConfig;
  memoryMarkdown: string;
  runs: RunRecord[];
}): SyncPayload {
  const { cwd, projectName, config, memoryMarkdown, runs } = input;
  const latest = runs[0];
  const nowIso = new Date().toISOString();
  const localProjectId = buildLocalProjectId(cwd);

  const mappedRuns = runs.slice(0, 200).map((run) => {
    const tokens = Math.round(parseEstimatedNumber(String(run.contract.estimatedTokensTrimmed)));
    const dollars = estimateSavingsFromTokens(tokens);
    return {
      localId: run.id,
      task: run.task,
      status: run.evaluation?.status ?? run.status,
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
      nextSafePrompt:
        run.evaluation?.nextPrompt ??
        run.evaluation?.nextSafePrompt ??
        run.evaluation?.nextGuardedPrompt ??
        run.contract?.splitReport?.nextSafePrompt ??
        null,
    };
  });

  const payload: SyncPayload = {
    project: {
      localProjectId,
      name: projectName,
      stack: config.stack || "auto",
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

