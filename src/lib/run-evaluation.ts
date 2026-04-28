import { execa } from "execa";

export type EvaluationStatus =
  | "passed"
  | "partial"
  | "needs_verification"
  | "drift_detected"
  | "blocked"
  | "no_changes_detected";

export type ScopeDriftRisk = "none" | "low" | "medium" | "high";

export interface EvaluationInput {
  task: string;
  relevantScope: string[];
  sensitiveScope: string[];
  forbiddenScope: string[];
  runStatus?: string;
}

export interface EvaluationResult {
  contractScore: number;
  scopeDriftRisk: ScopeDriftRisk;
  missingProofItems: string[];
  nextGuardedPrompt: string;
  status: EvaluationStatus;
  changedFiles: string[];
  driftedFiles: string[];
  outOfScopeFiles: string[];
  nextSafeAction: string;
  memorySummary: string;
  evaluatedAt: string;
}

export async function getGitDiff(cwd = process.cwd()): Promise<string[]> {
  try {
    const [unstaged, staged] = await Promise.all([
      execa("git", ["diff", "--name-only", "HEAD"], { cwd }),
      execa("git", ["diff", "--name-only", "--cached"], { cwd }),
    ]);
    const files = [...unstaged.stdout.split("\n"), ...staged.stdout.split("\n")].filter(Boolean);
    return [...new Set(files)];
  } catch {
    return [];
  }
}

function normalizeScopeKeywords(scope: string[]): string[] {
  const words = new Set<string>();
  for (const line of scope) {
    const lower = line.toLowerCase();
    const direct = lower.match(/[a-z0-9_./-]+/g) ?? [];
    for (const token of direct) {
      if (token.length >= 4 && (token.includes("/") || token.includes("."))) words.add(token);
    }

    const cleaned = lower
      .replace(/^do not (touch|modify|read|write|reference|install) /, "")
      .replace(/[^a-z0-9_./\s-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (const token of cleaned) {
      if (token.length >= 4) words.add(token);
    }
  }
  return [...words];
}

function hasAnyKeyword(file: string, keywords: string[]): boolean {
  const f = file.toLowerCase();
  return keywords.some((kw) => kw.length >= 4 && f.includes(kw));
}

export function evaluateAgentOutput(
  agentOutput: string | null,
  changedFiles: string[],
  input: EvaluationInput
): EvaluationResult {
  const evaluatedAt = new Date().toISOString();

  if (input.runStatus === "blocked" || input.runStatus === "split_required") {
    const prompt = buildBlockedPrompt(input.task);
    return {
      contractScore: 0,
      scopeDriftRisk: "high",
      missingProofItems: ["Run was blocked before execution"],
      nextGuardedPrompt: prompt,
      status: "blocked",
      changedFiles,
      driftedFiles: [],
      outOfScopeFiles: [],
      nextSafeAction: "Start with one split audit-only task from the recommended split list.",
      memorySummary: "Latest run blocked as split required. Start with one isolated audit task.",
      evaluatedAt,
    };
  }

  const missingProofItems: string[] = [];
  let contractScore = 100;

  const mentionedRootCause = agentOutput
    ? /root cause|because|reason|the issue (is|was)|the problem (is|was)/i.test(agentOutput)
    : false;
  if (!mentionedRootCause) {
    missingProofItems.push("No root cause identified");
    contractScore -= 15;
  }

  const listedFiles = agentOutput
    ? /files? (changed|modified|updated)|changed files|modified:/i.test(agentOutput)
    : false;
  if (!listedFiles) {
    missingProofItems.push("No list of changed files provided");
    contractScore -= 10;
  }

  const hasVerification = agentOutput
    ? /\b(test|verify|check|confirm|run|npm|yarn|pnpm|bun|steps?)\b/i.test(agentOutput)
    : false;
  if (!hasVerification) {
    missingProofItems.push("No verification or test steps provided");
    contractScore -= 10;
  }

  const hasClearNextAction = agentOutput
    ? /next (step|action|safe|prompt)|done|complete|finished/i.test(agentOutput)
    : false;
  if (!hasClearNextAction) {
    missingProofItems.push("No clear next action provided");
    contractScore -= 5;
  }

  const forbiddenKeywords = normalizeScopeKeywords(input.forbiddenScope);
  const relevantKeywords = normalizeScopeKeywords(input.relevantScope);
  const sensitiveKeywords = normalizeScopeKeywords(input.sensitiveScope);

  const driftedFiles = changedFiles.filter((file) => hasAnyKeyword(file, forbiddenKeywords));
  const outOfScopeFiles = changedFiles.filter((file) => {
    if (driftedFiles.includes(file)) return false;
    if (relevantKeywords.length === 0 && sensitiveKeywords.length === 0) return false;
    const matchesRelevant = hasAnyKeyword(file, relevantKeywords);
    const matchesSensitive = hasAnyKeyword(file, sensitiveKeywords);
    return !matchesRelevant && !matchesSensitive;
  });

  let scopeDriftRisk: ScopeDriftRisk = "none";
  if (driftedFiles.length > 0) {
    scopeDriftRisk = driftedFiles.length > 2 ? "high" : "medium";
    contractScore -= driftedFiles.length * 25;
  } else if (outOfScopeFiles.length > 0) {
    scopeDriftRisk = outOfScopeFiles.length > 2 ? "medium" : "low";
    contractScore -= outOfScopeFiles.length * 8;
  }

  contractScore = Math.max(0, Math.min(100, contractScore));

  let status: EvaluationStatus;
  if (driftedFiles.length > 0) {
    status = "drift_detected";
  } else if (changedFiles.length === 0 && missingProofItems.length > 0) {
    status = "no_changes_detected";
  } else if (changedFiles.length === 0) {
    status = "needs_verification";
  } else if (missingProofItems.length === 0) {
    status = "passed";
  } else if (missingProofItems.length >= 3) {
    status = "needs_verification";
  } else {
    status = "partial";
  }

  const nextGuardedPrompt = buildNextPrompt(status, input.task, changedFiles, driftedFiles, missingProofItems);
  const nextSafeAction = buildNextSafeAction(status, missingProofItems.length, driftedFiles.length);
  const memorySummary = buildMemorySummary(status, changedFiles.length, scopeDriftRisk, missingProofItems.length);

  return {
    contractScore,
    scopeDriftRisk,
    missingProofItems,
    nextGuardedPrompt,
    status,
    changedFiles,
    driftedFiles,
    outOfScopeFiles,
    nextSafeAction,
    memorySummary,
    evaluatedAt,
  };
}

function buildBlockedPrompt(task: string): string {
  return [
    "SPLIT REQUIRED CONTINUATION",
    "",
    `Previous task:\n${task}`,
    "",
    "Do not implement changes yet.",
    "Run one audit-only split task first.",
    "Return the smallest safe scope for the first implementation run.",
  ].join("\n");
}

function buildNextPrompt(
  status: EvaluationStatus,
  task: string,
  changedFiles: string[],
  driftedFiles: string[],
  missingItems: string[]
): string {
  if (status === "drift_detected") {
    const changed = changedFiles.length ? changedFiles.map((f) => `- ${f}`) : ["- No changed files detected"];
    const drift = driftedFiles.length ? driftedFiles.map((f) => `- ${f}`) : ["- None detected"];
    return [
      "SCOPE DRIFT DETECTED",
      "",
      "Stop all new edits.",
      "Inspect changed files and identify files outside allowed scope.",
      "",
      "Changed files:",
      ...changed,
      "",
      "Out-of-scope files:",
      ...drift,
      "",
      "Recommend one of these before continuing:",
      "- Revert out-of-scope files",
      "- Get explicit approval",
      "- Split into isolated audit tasks",
      "",
      "Do not continue implementation.",
    ].join("\n");
  }

  if (status === "needs_verification" || status === "no_changes_detected") {
    const evidence = missingItems.length ? missingItems.map((m) => `- ${m}`) : ["- Confirmation that current state resolves objective"];
    return [
      "Verification mode. No edits.",
      "",
      "Inspect current state only.",
      "Do not modify files.",
      "",
      `Previous task:\n${task}`,
      "",
      "Return whether the task is complete and provide exact evidence:",
      ...evidence,
      "",
      "If incomplete, return one minimal next safe action.",
    ].join("\n");
  }

  if (status === "partial") {
    const files = changedFiles.length ? changedFiles.map((f) => `- ${f}`) : ["- No changed files detected"];
    const missing = missingItems.length ? missingItems.map((m) => `- ${m}`) : ["- None"];
    return [
      "Continue from the current diff only.",
      "",
      "Do not modify new files unless verification proves it is required.",
      "",
      `Previous task:\n${task}`,
      "",
      "Current changed files:",
      ...files,
      "",
      "Still missing:",
      ...missing,
      "",
      "Your job now is verification only.",
      "",
      "Return exactly:",
      "- ROOT CAUSE",
      "- FILES CHANGED",
      "- WHAT CHANGED",
      "- HOW TO VERIFY",
      "- REMAINING RISK",
      "- NEXT SAFE ACTION",
      "",
      "Do not start a new scope.",
      "Do not expand beyond the current diff.",
    ].join("\n");
  }

  return [
    "Previous run appears complete.",
    "",
    "Summary:",
    `- Task: ${task}`,
    `- Changed files: ${changedFiles.length}`,
    "",
    "Safe next action: done, or run runtrim guard for a new scoped task.",
  ].join("\n");
}

function buildNextSafeAction(status: EvaluationStatus, missingCount: number, driftCount: number): string {
  if (status === "blocked") return "Run one split audit-only task and stop before implementation.";
  if (status === "drift_detected") {
    return driftCount > 0
      ? "Contain drift first. Revert or approve out-of-scope files before any new edits."
      : "Contain drift first before continuing.";
  }
  if (status === "needs_verification" || status === "no_changes_detected") {
    return "Run verification only. Do not edit until evidence confirms completion.";
  }
  if (status === "partial") {
    return missingCount > 0
      ? "Complete missing proof items against current diff before starting new scope."
      : "Verify current diff and finalize output sections.";
  }
  return "Done, or start a new guarded task.";
}

function buildMemorySummary(
  status: EvaluationStatus,
  changedFilesCount: number,
  scopeDriftRisk: ScopeDriftRisk,
  missingCount: number
): string {
  const parts = [
    formatStatusForSummary(status),
    `${changedFilesCount} changed file${changedFilesCount === 1 ? "" : "s"}`,
  ];
  if (scopeDriftRisk !== "none") parts.push(`drift risk ${scopeDriftRisk}`);
  if (missingCount > 0) parts.push(`${missingCount} missing proof item${missingCount === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function formatStatusForSummary(status: EvaluationStatus): string {
  const map: Record<EvaluationStatus, string> = {
    passed: "Passed",
    partial: "Partial",
    needs_verification: "Needs verification",
    drift_detected: "Drift detected",
    blocked: "Blocked",
    no_changes_detected: "No changes detected",
  };
  return map[status];
}
