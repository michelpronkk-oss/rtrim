import { execa } from "execa";

export type EvaluationStatus =
  | "passed"
  | "partial"
  | "needs_verification"
  | "drift_detected";

export type ScopeDriftRisk = "none" | "low" | "medium" | "high";

export interface EvaluationResult {
  contractScore: number;
  scopeDriftRisk: ScopeDriftRisk;
  missingProofItems: string[];
  nextGuardedPrompt: string;
  status: EvaluationStatus;
  changedFiles: string[];
  driftedFiles: string[];
}

export async function getGitDiff(cwd = process.cwd()): Promise<string[]> {
  try {
    const [unstaged, staged] = await Promise.all([
      execa("git", ["diff", "--name-only", "HEAD"], { cwd }),
      execa("git", ["diff", "--name-only", "--cached"], { cwd }),
    ]);
    const files = [
      ...unstaged.stdout.split("\n"),
      ...staged.stdout.split("\n"),
    ].filter(Boolean);
    return [...new Set(files)];
  } catch {
    return [];
  }
}

export function evaluateAgentOutput(
  agentOutput: string | null,
  changedFiles: string[],
  forbiddenScope: string[],
  task: string
): EvaluationResult {
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
    ? /\b(test|verify|check|confirm|run|npm|yarn|pnpm|bun)\b/i.test(agentOutput)
    : false;
  if (!hasVerification) {
    missingProofItems.push("No verification or test steps provided");
    contractScore -= 10;
  }

  if (agentOutput && changedFiles.length > 5) {
    const askedBeforeExpanding =
      /should i|can i|do you want|before i (continue|proceed)|shall i/i.test(
        agentOutput
      );
    if (!askedBeforeExpanding) {
      missingProofItems.push("Agent may have expanded scope without asking");
      contractScore -= 15;
    }
  }

  const hasClearNextAction = agentOutput
    ? /next (step|action|safe|prompt)|done|complete|finished/i.test(agentOutput)
    : false;
  if (!hasClearNextAction) {
    missingProofItems.push("No clear next action provided");
    contractScore -= 5;
  }

  const forbiddenKeywords = forbiddenScope.map((f) =>
    f
      .toLowerCase()
      .replace(/^do not (touch|modify|read|write|reference|install) /i, "")
      .split(" ")[0]
  );

  const driftedFiles = changedFiles.filter((file) => {
    const fileLower = file.toLowerCase();
    return forbiddenKeywords.some((kw) => kw.length > 3 && fileLower.includes(kw));
  });

  let scopeDriftRisk: ScopeDriftRisk = "none";
  if (driftedFiles.length > 0) {
    scopeDriftRisk = driftedFiles.length > 2 ? "high" : "medium";
    contractScore -= driftedFiles.length * 20;
  } else if (changedFiles.length > 8) {
    scopeDriftRisk = "low";
    contractScore -= 10;
  }

  contractScore = Math.max(0, Math.min(100, contractScore));

  let status: EvaluationStatus;
  if (driftedFiles.length > 0) {
    status = "drift_detected";
  } else if (contractScore >= 80) {
    status = "passed";
  } else if (contractScore >= 50) {
    status = "partial";
  } else {
    status = "needs_verification";
  }

  const nextGuardedPrompt = buildNextPrompt(status, driftedFiles, missingProofItems);

  return {
    contractScore,
    scopeDriftRisk,
    missingProofItems,
    nextGuardedPrompt,
    status,
    changedFiles,
    driftedFiles,
  };
}

function buildNextPrompt(
  status: EvaluationStatus,
  driftedFiles: string[],
  missingItems: string[]
): string {
  if (status === "drift_detected") {
    return [
      "SCOPE DRIFT DETECTED. Do not continue with new work.",
      `Explain why you modified: ${driftedFiles.join(", ")}.`,
      "If the change was necessary, state the exact reason.",
      "If not, revert those files before proceeding.",
    ].join("\n");
  }

  if (status === "needs_verification") {
    return [
      "Before continuing, provide the following:",
      ...missingItems.map((m) => `- ${m}`),
      "Do not start new work until verification is complete.",
    ].join("\n");
  }

  if (status === "partial") {
    return [
      "The previous run completed partially.",
      `Still missing: ${missingItems.join(", ")}.`,
      "Confirm the task is fully resolved before starting a new scope.",
    ].join("\n");
  }

  return 'Previous run passed verification. Use: runtrim guard "<next task>" to continue safely.';
}
