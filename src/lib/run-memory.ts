import fs from "fs";
import path from "path";
import type { RunRecord } from "./run-storage";
import { getConfigDir, type RunTrimConfig } from "./runtrim-config";

export function getMemoryPath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "memory.md");
}

function formatDateTime(iso = new Date().toISOString()): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    passed: "Passed",
    partial: "Partial",
    needs_verification: "Needs verification",
    drift_detected: "Drift detected",
    blocked: "Blocked",
    split_required: "Split required",
    no_changes_detected: "No changes detected",
    guarded: "Guarded",
    checked: "Checked",
    executed: "Executed",
  };
  return map[status] ?? status;
}

function normalizeStack(stack: string): string {
  if (!stack || stack === "auto") return "Auto";
  if (stack.includes("nextjs")) return "Next.js";
  return stack;
}

function normalizeMissing(items: string[]): string[] {
  return items.map((i) =>
    i
      .replace(/^No /i, "")
      .replace(/ provided$/i, "")
      .replace(/ identified$/i, "")
      .toLowerCase()
  );
}

function normalizeSystemName(system: string): string {
  const lower = system.toLowerCase();
  if (lower.includes("auth")) return "auth";
  if (lower.includes("middleware")) return "middleware";
  if (lower.includes("database")) return "database schema";
  if (lower.includes("billing")) return "billing";
  if (lower.includes("payment") || lower.includes("stripe")) return "payments";
  if (lower.includes("webhook")) return "webhooks";
  if (lower.includes("env")) return "env/secrets";
  return system;
}

function buildProtectedAreaLines(config: RunTrimConfig, forbiddenScope: string[]): string[] {
  const areas = new Set<string>(config.sensitiveAreas.map((a) => a.toLowerCase()));
  for (const line of forbiddenScope) {
    const lower = line.toLowerCase();
    if (lower.includes("auth")) areas.add("auth");
    if (lower.includes("middleware")) areas.add("middleware");
    if (lower.includes("database")) areas.add("database");
    if (lower.includes("env")) areas.add("env");
    if (lower.includes("billing")) areas.add("billing");
    if (lower.includes("payment") || lower.includes("stripe")) areas.add("payments");
    if (lower.includes("webhook")) areas.add("webhooks");
  }

  const ordered = ["auth", "middleware", "database", "env", "billing", "payments", "webhooks"];
  const lines: string[] = [];
  let hasBillingFamily = false;
  for (const area of ordered) {
    if (!areas.has(area)) continue;
    if (area === "auth") lines.push("auth changes require isolated scope");
    else if (area === "middleware") lines.push("middleware changes require isolated scope");
    else if (area === "database") lines.push("database schema changes require migration review");
    else if (area === "env") lines.push("env/secrets must not be read or changed");
    else if (area === "billing" || area === "payments" || area === "webhooks") hasBillingFamily = true;
  }
  if (hasBillingFamily) {
    lines.push("billing, payments and webhooks require explicit approval");
  }
  return lines;
}

function buildCurrentState(status: string): string {
  if (status === "blocked" || status === "split_required") {
    return "Split required. Last task crossed too many high-risk systems.";
  }
  if (status === "drift_detected") return "Scope drift detected. Containment is required before new edits.";
  if (status === "partial") return "Partial. Continue verification from the current diff only.";
  if (status === "needs_verification" || status === "no_changes_detected") {
    return "Needs verification. Confirm completion with evidence before new scope.";
  }
  if (status === "passed") return "Completed. Latest run appears verified.";
  return "Guarded. Run check to evaluate the latest state.";
}

function buildBlockedReasons(blockedReasons: string[]): string[] {
  if (blockedReasons.length === 0) {
    return [
      "likely full-repo scan",
      "likely scope drift",
      "unsafe rewrite language",
      "multiple protected systems requested in one run",
    ];
  }

  const normalized = new Set<string>();
  for (const r of blockedReasons) {
    const lower = r.toLowerCase();
    if (lower.includes("full-repo") || lower.includes("full repo")) normalized.add("likely full-repo scan");
    else if (lower.includes("scope drift")) normalized.add("likely scope drift");
    else if (lower.includes("rewrite") || lower.includes("restructure")) normalized.add("unsafe rewrite language");
    else if (lower.includes("forbidden") || lower.includes("high-risk") || lower.includes("systems")) {
      normalized.add("multiple protected systems requested in one run");
    }
  }

  if (normalized.size === 0) {
    normalized.add("likely full-repo scan");
    normalized.add("likely scope drift");
    normalized.add("multiple protected systems requested in one run");
  }

  return [...normalized];
}

function buildRecommendedSplit(detectedSystems: string[]): string[] {
  const map: Record<string, string> = {
    auth: "Audit auth flow only. No edits.",
    middleware: "Audit middleware behavior only. No edits.",
    "database schema": "Audit database/schema impact only. No edits.",
    billing: "Audit billing or subscription flow only. No edits.",
    payments: "Audit payments flow only. No edits.",
    webhooks: "Audit webhook behavior only. No edits.",
    "env/secrets": "Audit env/secrets references only. No edits.",
  };

  const unique = [...new Set(detectedSystems.map(normalizeSystemName))];
  return unique.map((s, i) => `${i + 1}. ${map[s] ?? `Audit ${s} only. No edits.`}`);
}

export function buildMemoryMarkdown(
  latestRun: RunRecord,
  allRuns: RunRecord[],
  config: RunTrimConfig,
  cwd = process.cwd()
): string {
  const projectName = path.basename(cwd);
  const stack = normalizeStack(config.stack || "auto");

  const evaluation = latestRun.evaluation;
  const status = evaluation?.status ?? latestRun.status;
  const changedFiles = evaluation?.changedFiles ?? [];
  const missing = normalizeMissing(evaluation?.missingProofItems ?? []);
  const nextSafeAction = evaluation?.nextSafeAction ?? "Run runtrim check to evaluate the latest run.";
  const nextPrompt = evaluation?.nextPrompt ?? evaluation?.nextSafePrompt ?? evaluation?.nextGuardedPrompt ?? "n/a";

  const forbidden = latestRun.contract.contract?.forbiddenScope ?? [];
  const protectedAreaLines = buildProtectedAreaLines(config, forbidden);

  const splitReport = latestRun.contract.splitReport;
  const detectedSystems = splitReport?.detectedSystems?.map(normalizeSystemName) ?? [];
  const blockedReasons = buildBlockedReasons(splitReport?.blockedReasons ?? []);
  const recommendedSplit = buildRecommendedSplit(detectedSystems);

  const recentSummary = allRuns
    .slice(0, 4)
    .map((run) => {
      const e = run.evaluation;
      const s = statusLabel(e?.status ?? run.status);
      const changes = e?.changedFiles?.length ?? 0;
      const drift = e?.scopeDriftRisk ?? "none";
      const day = formatDay(run.createdAt);
      return `- ${day}: ${s}, ${drift === "none" ? "no scope drift" : `scope drift ${drift}`}, ${changes} changed file${changes === 1 ? "" : "s"}`;
    })
    .join("\n");

  const output: string[] = [
    "RunTrim Project Memory",
    "",
    `Project: ${projectName}`,
    `Stack: ${stack}`,
    `Last updated: ${formatDateTime()}`,
    "",
    "Current state:",
    buildCurrentState(status),
    "",
    "Previous task:",
    latestRun.task,
    "",
    "Latest run status:",
    statusLabel(status),
    "",
  ];

  output.push("Changed files:");
  if (changedFiles.length > 0) output.push(...changedFiles.map((f) => `- ${f}`));
  else output.push("No changed files recorded.");
  output.push("");

  output.push("Still missing:");
  if (missing.length > 0) output.push(...missing.map((m) => `- ${m}`));
  else output.push("No open proof items recorded.");
  output.push("");

  if (status === "blocked" || status === "split_required") {
    output.push("Detected high-risk systems:");
    if (detectedSystems.length > 0) output.push(...detectedSystems.map((s) => `- ${s}`));
    else output.push("- auth", "- middleware", "- database schema", "- billing");
    output.push("");

    output.push("Why this was blocked:", ...blockedReasons.map((r) => `- ${r}`), "");

    output.push("Recommended split:");
    if (recommendedSplit.length > 0) output.push(...recommendedSplit);
    else {
      output.push(
        "1. Audit auth flow only. No edits.",
        "2. Audit middleware behavior only. No edits.",
        "3. Audit database/schema impact only. No edits.",
        "4. Audit billing or subscription flow only. No edits."
      );
    }
    output.push("");
  }

  output.push(
    "Protected areas:",
    ...(protectedAreaLines.length > 0 ? protectedAreaLines.map((l) => `- ${l}`) : ["- none"]),
    "",
    "Next safe action:",
    nextSafeAction,
    "",
    "Next safe prompt:",
    nextPrompt,
    "",
    "Recent run summary:",
    recentSummary || "- none",
    ""
  );

  return output.join("\n");
}

export function writeMemoryFromRuns(
  latestRun: RunRecord,
  allRuns: RunRecord[],
  config: RunTrimConfig,
  cwd = process.cwd()
): string {
  const body = buildMemoryMarkdown(latestRun, allRuns, config, cwd);
  const memoryPath = getMemoryPath(cwd);
  const dir = path.dirname(memoryPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(memoryPath, body, "utf-8");
  return body;
}

export function readMemory(cwd = process.cwd()): string | null {
  const p = getMemoryPath(cwd);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}
