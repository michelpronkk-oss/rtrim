import type { RunRecord, WatchEventRecord } from "./run-storage";

export type WatchStatus = "safe" | "caution" | "drift_detected" | "limit_exceeded";

export interface WatchEvaluateInput {
  changedFiles: string[];
  run: RunRecord;
  maxFilesPerRun: number;
  strict: boolean;
}

export interface WatchEvaluateResult {
  status: WatchStatus;
  changedFiles: string[];
  relevantFiles: string[];
  sensitiveFiles: string[];
  forbiddenFiles: string[];
  outOfScopeFiles: string[];
  warnings: string[];
  nextAction: string;
  eventType: WatchEventRecord["type"];
  severity: WatchEventRecord["severity"];
}

function normalizeScopeKeywords(scope: string[]): string[] {
  const genericStopwords = new Set([
    "read",
    "write",
    "reference",
    "touch",
    "modify",
    "change",
    "update",
    "allow",
    "scope",
    "paths",
    "path",
    "files",
    "file",
    "only",
    "with",
    "without",
    "before",
    "after",
    "inside",
    "outside",
  ]);
  const words = new Set<string>();
  for (const line of scope) {
    const lower = line.toLowerCase();
    const direct = lower.match(/[a-z0-9_./-]+/g) ?? [];
    for (const token of direct) {
      if (token.length >= 4 && (token.includes("/") || token.includes("."))) words.add(token);
    }
    const cleaned = lower
      .replace(/[^a-z0-9_./\s-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (const token of cleaned) {
      if (token.length >= 4 && !genericStopwords.has(token)) words.add(token);
    }
  }
  return [...words];
}

function matchesKeyword(file: string, keywords: string[]): boolean {
  const f = file.toLowerCase();
  return keywords.some((kw) => kw.length >= 4 && f.includes(kw));
}

function matchesPathMarkers(file: string): { forbidden: boolean; sensitive: boolean } {
  const f = file.toLowerCase();
  const forbidden =
    f.includes("middleware.ts") ||
    f.includes("proxy.ts") ||
    f.includes(".env") ||
    f.endsWith(".env") ||
    f.includes(".env.") ||
    f.includes(".pem") ||
    f.includes(".key") ||
    f.includes("id_rsa") ||
    f.includes("id_ed25519") ||
    f.includes("private-key") ||
    f.includes("migration") ||
    f.includes("migrations") ||
    f.includes("jwt") ||
    f.includes("session") ||
    f.includes("auth");
  const sensitive =
    f.includes("billing") ||
    f.includes("payment") ||
    f.includes("stripe") ||
    f.includes("dodo") ||
    f.includes("webhook");
  return { forbidden, sensitive };
}

export function evaluateWatchState(input: WatchEvaluateInput): WatchEvaluateResult {
  const contract = input.run.contract.contract;
  const relevantKeywords = normalizeScopeKeywords(contract?.relevantScope ?? []);
  const sensitiveKeywords = normalizeScopeKeywords(contract?.sensitiveScope ?? []);
  const forbiddenKeywords = normalizeScopeKeywords(contract?.forbiddenScope ?? []);

  const forbiddenFiles = input.changedFiles.filter((file) => {
    const marker = matchesPathMarkers(file);
    return marker.forbidden || matchesKeyword(file, forbiddenKeywords);
  });

  const sensitiveFiles = input.changedFiles.filter((file) => {
    if (forbiddenFiles.includes(file)) return false;
    const marker = matchesPathMarkers(file);
    return marker.sensitive || matchesKeyword(file, sensitiveKeywords);
  });

  const relevantFiles = input.changedFiles.filter((file) => {
    if (forbiddenFiles.includes(file) || sensitiveFiles.includes(file)) return false;
    if (relevantKeywords.length === 0) return true;
    return matchesKeyword(file, relevantKeywords);
  });

  const outOfScopeFiles = input.changedFiles.filter(
    (file) =>
      !forbiddenFiles.includes(file) &&
      !sensitiveFiles.includes(file) &&
      !relevantFiles.includes(file)
  );

  const fileLimit = Math.max(1, input.maxFilesPerRun || 5);
  const limitExceeded = input.changedFiles.length > fileLimit;

  const warnings: string[] = [];
  let status: WatchStatus = "safe";
  let eventType: WatchEventRecord["type"] = "summary";
  let severity: WatchEventRecord["severity"] = "info";

  if (limitExceeded) {
    status = "limit_exceeded";
    eventType = "file_limit_exceeded";
    severity = "critical";
    warnings.push("File limit exceeded. Stop the agent and run runtrim check.");
  }

  if (forbiddenFiles.length > 0) {
    status = "drift_detected";
    eventType = "forbidden_changed";
    severity = "critical";
    warnings.push("Forbidden scope touched. Stop the agent and run runtrim check.");
  }

  if (sensitiveFiles.length > 0 && status === "safe") {
    status = "caution";
    eventType = "sensitive_changed";
    severity = input.strict ? "critical" : "warning";
    warnings.push(
      input.strict
        ? "Sensitive scope touched in strict mode. Stop the agent and run runtrim check."
        : "Sensitive scope touched. Continue with caution and run runtrim check soon."
    );
  }

  if (outOfScopeFiles.length > 0 && status === "safe") {
    status = "caution";
    warnings.push("Potential scope drift detected. Review changed files and run runtrim check.");
  }

  const nextAction =
    status === "safe"
      ? input.changedFiles.length === 0
        ? "Watching. No agent changes detected yet."
        : "Within expected scope. Continue watching and run runtrim check when done."
      : "Stop the agent and run runtrim check.";

  return {
    status,
    changedFiles: input.changedFiles,
    relevantFiles,
    sensitiveFiles,
    forbiddenFiles,
    outOfScopeFiles,
    warnings,
    nextAction,
    eventType,
    severity,
  };
}

