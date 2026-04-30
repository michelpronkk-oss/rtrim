import path from "path";
import type { RunRecord } from "./run-storage";
import type { ProjectState } from "./run-project-state";
import type { RunTrimConfig } from "./runtrim-config";

export interface DerivedPanelState {
  statusLabel: string;
  severity: "clear" | "info" | "warn" | "critical";
  nextAction: string;
  nextCommand: string;
  nextReason: string;
  promptPreview: string;
  riskSummary: string;
  verificationDebt: number;
  driftSignals: string[];
}

export interface RiskArea {
  key: string;
  status: "clear" | "protected" | "sensitive" | "touched" | "unknown";
  detail: string;
}

export interface GroupedFiles {
  group: string;
  files: string[];
}

function short(text: string, max = 220): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function mapStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "no_runs_yet") return "No runs yet";
  if (s === "guarded") return "Guarded";
  if (s === "partial") return "Partial";
  if (s === "needs_verification" || s === "no_changes_detected") return "Needs verification";
  if (s === "drift_detected") return "Drift detected";
  if (s === "split_required" || s === "blocked") return "Split required";
  if (s === "passed") return "Passed";
  return status;
}

export function derivePanelState(input: {
  cwd: string;
  latestRun: RunRecord | null;
  projectState: ProjectState | null;
  changedFiles: string[];
  continuationPrompt: string;
  latestPrompt: string;
}): DerivedPanelState {
  const statusRaw = (input.latestRun?.evaluation?.status ?? input.latestRun?.status ?? "no_runs_yet").toLowerCase();
  const changedCount = input.projectState?.changedCount ?? input.changedFiles.length;
  const warnings = input.projectState?.watchWarnings ?? input.latestRun?.watchWarnings ?? [];
  const missing = input.latestRun?.evaluation?.missingProofItems?.length ?? 0;
  const nextPrompt =
    input.projectState?.nextSafePrompt ??
    input.latestRun?.evaluation?.nextPrompt ??
    input.latestRun?.evaluation?.nextSafePrompt ??
    input.latestRun?.evaluation?.nextGuardedPrompt ??
    input.latestPrompt ??
    "";
  const scoreBefore = input.latestRun?.audit?.promptScoreBefore ?? 0;
  const scoreAfter = input.latestRun?.contract?.promptScoreAfter ?? scoreBefore;
  const riskBefore = input.latestRun?.audit?.wasteRiskBefore ?? "unknown";
  const riskAfter = input.latestRun?.contract?.wasteRiskAfter ?? "unknown";
  const scoreText = scoreBefore > 0 ? `${scoreBefore} -> ${scoreAfter}` : "n/a";
  const riskText = `${riskBefore} -> ${riskAfter}`;

  let statusLabel = mapStatus(statusRaw);
  let severity: DerivedPanelState["severity"] = "info";
  let nextAction = "Review local state and continue safely.";
  let nextCommand = "runtrim start";
  let nextReason = "RunTrim can route you to the safest next step from current local state.";
  let driftSignals: string[] = [];

  if (statusRaw === "no_runs_yet") {
    severity = "info";
    nextAction = "Project initialized. Prepare the first run.";
    nextCommand = 'runtrim prepare "your task"';
    nextReason = "No guarded runs exist yet for this repository.";
  } else if ((statusRaw === "guarded" || statusRaw === "executed" || statusRaw === "checked") && changedCount === 0) {
    severity = "info";
    statusLabel = "Prompt prepared";
    nextAction = "Paste the prepared prompt into your agent, then monitor.";
    nextCommand = "runtrim panel --monitor";
    nextReason = "No agent changes detected yet.";
  } else if ((statusRaw === "guarded" || statusRaw === "executed" || statusRaw === "checked") && changedCount > 0) {
    severity = warnings.length > 0 ? "warn" : "info";
    statusLabel = warnings.length > 0 ? "Risk detected" : "Unverified changes detected";
    nextAction = "Verify this run before any new edits.";
    nextCommand = "runtrim check";
    nextReason =
      warnings.length > 0
        ? "Monitor flagged sensitive or forbidden scope risk."
        : "Files changed after guard, but post-run verification is not complete.";
  } else if (statusRaw === "partial" || statusRaw === "needs_verification" || statusRaw === "no_changes_detected") {
    severity = "warn";
    statusLabel = "Verification debt";
    nextAction = "Continue in verification mode.";
    nextCommand = "runtrim continue --reason manual_handoff";
    nextReason = "The run is missing proof or verification detail.";
  } else if (statusRaw === "drift_detected") {
    severity = "critical";
    statusLabel = "Scope drift";
    nextAction = "Contain drift before editing anything else.";
    nextCommand = "runtrim continue --reason manual_handoff";
    nextReason = "Changed files touched scope outside the contract.";
    driftSignals = input.projectState?.forbiddenTouched ?? [];
  } else if (statusRaw === "split_required" || statusRaw === "blocked") {
    severity = "critical";
    statusLabel = "Split required";
    nextAction = "Run one audit-only split task first.";
    nextCommand = "runtrim memory --prompt";
    nextReason = "The previous task crossed too many protected systems.";
  } else if (statusRaw === "passed") {
    severity = "clear";
    statusLabel = "Ready for next run";
    nextAction = "Sync metadata or prepare the next task.";
    nextCommand = 'runtrim sync or runtrim prepare "next task"';
    nextReason = "Latest run appears verified.";
  }

  return {
    statusLabel,
    severity,
    nextAction,
    nextCommand,
    nextReason,
    promptPreview: short(nextPrompt || "No prompt preview available.", 320),
    riskSummary: `Score ${scoreText}. Risk ${riskText}.`,
    verificationDebt: missing,
    driftSignals,
  };
}

export function buildRiskMap(config: RunTrimConfig, state: ProjectState | null): RiskArea[] {
  const touched = new Set((state?.changedFiles ?? []).map((f) => f.toLowerCase()));
  const sensitive = new Set((state?.sensitiveTouched ?? []).map((f) => f.toLowerCase()));
  const forbidden = new Set((state?.forbiddenTouched ?? []).map((f) => f.toLowerCase()));
  const areas = [
    { key: "auth", markers: ["auth", "session", "jwt"] },
    { key: "middleware", markers: ["middleware", "proxy.ts"] },
    { key: "database schema", markers: ["prisma", "drizzle", "schema", "migration"] },
    { key: "env/secrets", markers: [".env", "secret", "token"] },
    { key: "billing", markers: ["billing", "subscription", "checkout"] },
    { key: "payments", markers: ["payment", "stripe", "paypal", "dodo"] },
    { key: "webhooks", markers: ["webhook"] },
    { key: "package/config", markers: ["package.json", "tsconfig", "next.config", "eslint", "tailwind", "postcss"] },
  ];
  const sensitiveConfigured = new Set((config.sensitiveAreas ?? []).map((s) => s.toLowerCase()));
  return areas.map((area) => {
    const hit = [...touched].some((f) => area.markers.some((m) => f.includes(m)));
    const hitSensitive = [...sensitive].some((f) => area.markers.some((m) => f.includes(m)));
    const hitForbidden = [...forbidden].some((f) => area.markers.some((m) => f.includes(m)));
    const keyLower = area.key.toLowerCase();
    let status: RiskArea["status"] = "clear";
    let detail = "No local touch detected.";
    if (hitForbidden) {
      status = "touched";
      detail = "Forbidden touch signal detected.";
    } else if (hitSensitive) {
      status = "sensitive";
      detail = "Sensitive scope touched.";
    } else if (hit) {
      status = "touched";
      detail = "Touched locally.";
    } else if (
      sensitiveConfigured.has(keyLower) ||
      (keyLower.includes("database") && sensitiveConfigured.has("database")) ||
      (keyLower.includes("env") && sensitiveConfigured.has("env"))
    ) {
      status = "protected";
      detail = "Protected area. Keep scoped.";
    }
    return { key: area.key, status, detail };
  });
}

export function groupChangedFiles(files: string[], limit = 10): { groups: GroupedFiles[]; total: number } {
  const selected = files.slice(0, limit);
  const byGroup = new Map<string, string[]>();
  for (const file of selected) {
    const normalized = file.replace(/\\/g, "/");
    let group = "unknown";
    if (normalized.startsWith("src/app") || normalized.startsWith("app/")) group = "app/ui";
    else if (normalized.startsWith("cli/")) group = "cli";
    else if (normalized.startsWith("docs/")) group = "docs";
    else if (normalized.includes("config") || normalized.endsWith(".json") || normalized.endsWith(".yml")) group = "config";
    else group = path.dirname(normalized) || "root";
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)?.push(normalized);
  }
  const groups = [...byGroup.entries()].map(([group, groupFiles]) => ({ group, files: groupFiles }));
  return { groups, total: files.length };
}
