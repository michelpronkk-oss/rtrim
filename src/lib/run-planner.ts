/**
 * Contract Autopilot v1 — Run Planner
 *
 * Generates a contract preview (RunPlan) from a task description
 * without creating a full run or executing any code.
 *
 * Uses:
 *   - Run Compiler v1 (explicit paths, category, risk)
 *   - Project learning (similar runs, proof gaps, sensitive areas)
 *   - Auto-guard mode
 *   - Detected adapters
 *   - Current changed files
 */

import { compileTask, buildCategoryScope } from "./run-compiler.ts";
import { classifyFileRisk }                from "./auto-guard.ts";
import { getLearningContext }              from "./project-learning.ts";
import { detectAdapters }                 from "./adapters.ts";
import type { RunRecord }                 from "./run-storage.ts";
import type { RunTrimConfig }             from "./runtrim-config.ts";
import type { AutoGuardMode }             from "./auto-guard.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimilarRunRef {
  task:         string;
  date:         string;
  changedFiles: string[];
  proofGaps:    string[];
}

export interface RunPlan {
  task:             string;
  category:         string;
  risk:             "low" | "medium" | "high" | "critical";
  guardMode:        AutoGuardMode;
  contractRequired: boolean;
  fastPathAllowed:  boolean;
  objective:        string;
  recommendedScope: string[];
  forbiddenAreas:   string[];
  sensitiveAreas:   string[];
  stopRules:        string[];
  successCriteria:  string[];
  proofRequired:    string[];
  verificationSteps: string[];
  similarRuns:      SimilarRunRef[];
  learnedContext:   string[];
  reasoning:        string;
}

// ── Fast path eligibility ─────────────────────────────────────────────────────

const FAST_PATH_CATEGORIES = new Set(["ui", "docs", "tests", "unknown"]);
const ALWAYS_CONTRACT_CATEGORIES = new Set(["auth", "billing", "payment", "webhook", "database", "env", "middleware"]);
const RISK_ORDER: Array<"low" | "medium" | "high" | "critical"> = ["low", "medium", "high", "critical"];
const NEGATION_PREFIX_RE =
  /\b(do not|don't|dont|never|avoid|must not|should not|without changing|without touching|no changes to|keep .* untouched|leave .* untouched|keep .* unchanged)\b/i;

function maxRisk(a: "low" | "medium" | "high" | "critical", b: "low" | "medium" | "high" | "critical"): "low" | "medium" | "high" | "critical" {
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(a), RISK_ORDER.indexOf(b))];
}

function hasNegationNear(text: string, index: number): boolean {
  const start = Math.max(0, index - 64);
  const window = text.slice(start, index + 8);
  return NEGATION_PREFIX_RE.test(window);
}

function hasPositiveKeywordMention(taskLower: string, keyword: string): boolean {
  let idx = taskLower.indexOf(keyword.toLowerCase());
  while (idx !== -1) {
    if (!hasNegationNear(taskLower, idx)) return true;
    idx = taskLower.indexOf(keyword.toLowerCase(), idx + keyword.length);
  }
  return false;
}

function isFastPathEligible(
  risk: "low" | "medium" | "high" | "critical",
  category: string,
  guardMode: AutoGuardMode,
  hasExplicitPaths: boolean,
): boolean {
  if (guardMode === "strict")  return false;
  if (guardMode === "off")     return true;
  if (risk === "critical")     return false;
  if (risk === "high")         return false;
  if (ALWAYS_CONTRACT_CATEGORIES.has(category)) return false;

  if (guardMode === "fast")    return risk === "low" || risk === "medium";
  // smart mode: low risk + fast-path category
  if (guardMode === "smart")   return risk === "low" && (FAST_PATH_CATEGORIES.has(category) || hasExplicitPaths);

  return false;
}

// ── Plan generation ───────────────────────────────────────────────────────────

export function generatePlan(
  cwd: string,
  task: string,
  runs: RunRecord[],
  config: RunTrimConfig,
  currentChangedFiles: string[],
): RunPlan {
  const compiler    = compileTask(task);
  const guardMode   = ((config as Record<string, unknown>).autoGuardMode as AutoGuardMode) ?? "smart";
  const adapters    = detectAdapters(cwd);

  // Risk from explicit paths first. Avoid using unrelated working-tree changes
  // so preview risk reflects the requested task scope.
  const riskFiles   = compiler.explicitPaths.length > 0
    ? compiler.explicitPaths
    : [];
  let rawRisk: "low" | "medium" | "high" | "critical" = classifyFileRisk(riskFiles);
  if (ALWAYS_CONTRACT_CATEGORIES.has(compiler.taskCategory)) {
    rawRisk = maxRisk(rawRisk, "high");
  }
  const lowerTask = task.toLowerCase();
  const criticalSystemMentions = ["auth", "billing", "payment", "webhook", "database", "migration", "middleware"]
    .filter((k) => hasPositiveKeywordMention(lowerTask, k)).length;
  if (criticalSystemMentions >= 2) {
    rawRisk = maxRisk(rawRisk, "critical");
  }

  // Category-specific scope, forbidden, stop, verification
  const catScope = buildCategoryScope(
    compiler.taskCategory,
    true, // hasSrc — safe assumption for most projects
    true, // hasApp
    false,
  );

  // If explicit paths are present, use them as scope instead of category hints
  const recommendedScope = compiler.explicitPaths.length > 0
    ? compiler.explicitPaths.map((p) => `${p}  [explicit]`)
    : catScope.allowedHints.filter(Boolean);

  // Forbidden areas
  const forbiddenBase = [
    "auth internals and session logic",
    "billing and subscription lifecycle",
    "payment processing and webhook handlers",
    "database schema and migrations",
    ".env files and secrets",
    "middleware and edge config",
  ];
  const forbiddenAreas = [
    ...forbiddenBase,
    ...catScope.forbiddenAdditions.filter((r) => !forbiddenBase.some((b) => b.includes(r.split(" ")[0]))),
  ].slice(0, 8);

  // Stop rules
  const stopRules = [
    `Stop if the change requires touching more than ${config.maxFilesPerRun ?? 5} files.`,
    "Stop if any forbidden area must be modified.",
    "Stop if the root cause cannot be identified without leaving scope.",
    ...catScope.stopRules,
  ].slice(0, 6);

  // Proof required
  const proofRequired: string[] = [...(catScope.verificationSteps.length > 0 ? catScope.verificationSteps : ["npm run build"])];
  if (rawRisk === "high" || rawRisk === "critical") {
    if (!proofRequired.some((p) => p.includes("build"))) proofRequired.push("npm run build");
    proofRequired.push("Check Vercel function logs if a server route changed");
    proofRequired.push("Confirm no regressions in adjacent flows");
  }

  // Learning context
  const learningCtx = getLearningContext(cwd, task, runs);

  // Merge learning-specific proof gaps into proof required
  const learnedProofGaps = learningCtx.proofGapsToExpect
    .filter((g) => !proofRequired.some((p) => p.toLowerCase().includes(g.toLowerCase().slice(0, 12))))
    .slice(0, 3);

  const allProof = [...proofRequired, ...learnedProofGaps];

  // Learned context strings
  const learnedContext: string[] = [];
  if (learningCtx.learnedWarnings.length > 0) {
    learnedContext.push(...learningCtx.learnedWarnings);
  }
  if (learningCtx.sensitivePaths.length > 0) {
    learnedContext.push(`Sensitive paths touched before: ${learningCtx.sensitivePaths.slice(0, 3).join(", ")}`);
  }
  if (learningCtx.proofGapsToExpect.length > 0) {
    learnedContext.push(`Common proof gaps: ${learningCtx.proofGapsToExpect.slice(0, 2).join("; ")}`);
  }
  for (const sr of learningCtx.similarRuns) {
    if (sr.changedFiles.length > 0) {
      learnedContext.push(`Previous similar run touched: ${sr.changedFiles.slice(0, 2).join(", ")}`);
    }
    if (sr.proofGaps.length > 0) {
      learnedContext.push(`Previous proof gap: ${sr.proofGaps[0]}`);
    }
  }

  const fastPathAllowed  = isFastPathEligible(rawRisk, compiler.taskCategory, guardMode, compiler.explicitPaths.length > 0);
  const contractRequired = !fastPathAllowed;

  // Reasoning summary
  const reasonParts: string[] = [];
  if (compiler.onlyMode)          reasonParts.push(`"Only" mode: scope locked to ${compiler.explicitPaths.join(", ")}.`);
  if (rawRisk === "critical")      reasonParts.push("Critical risk: contract required. Split if multiple high-risk systems.");
  else if (rawRisk === "high")     reasonParts.push("High risk: contract required. Stay narrowly scoped.");
  else if (rawRisk === "medium")   reasonParts.push("Medium risk: contract recommended.");
  else                             reasonParts.push("Low risk: Fast Path eligible if guard mode allows.");
  if (ALWAYS_CONTRACT_CATEGORIES.has(compiler.taskCategory)) {
    reasonParts.push(`Category "${compiler.taskCategory}" always requires a contract.`);
  }
  if (guardMode === "strict")      reasonParts.push("Guard mode: strict. Contract always required.");
  if (adapters.length > 0)        reasonParts.push(`Active adapters: ${adapters.slice(0, 3).join(", ")}.`);

  return {
    task,
    category:         compiler.taskCategory,
    risk:             rawRisk,
    guardMode,
    contractRequired,
    fastPathAllowed,
    objective:        task,
    recommendedScope,
    forbiddenAreas,
    sensitiveAreas:   learningCtx.sensitivePaths.slice(0, 5),
    stopRules,
    successCriteria: [
      "The specific behavior described in the task is implemented or fixed.",
      "No regressions in adjacent functionality.",
      "Changes stay within the recommended scope.",
      "All proof requirements are met.",
    ],
    proofRequired:    allProof.slice(0, 6),
    verificationSteps: learningCtx.recommendedVerify,
    similarRuns:       learningCtx.similarRuns.slice(0, 3),
    learnedContext:    learnedContext.slice(0, 6),
    reasoning:         reasonParts.join(" "),
  };
}
