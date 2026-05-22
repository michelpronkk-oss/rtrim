/**
 * Project Learning Loop v1
 *
 * Derives project intelligence from local run history and stores it in
 * .runtrim/learning.json. Updated after every runtrim finish.
 *
 * Learning is local-first, additive, and backward-compatible with old runs.
 * It feeds Contract Autopilot v1 via getLearningContext().
 */

import fs   from "fs";
import path from "path";
import { getConfigDir } from "./runtrim-config.ts";
import type { RunRecord } from "./run-storage.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FrequentFile {
  path:  string;
  count: number;
}

export interface LearningRun {
  task:  string;
  date:  string;
  risk?: string;
  changedFiles?: string[];
  proofGaps?:    string[];
}

export interface LearningData {
  updatedAt:               string;
  runCount:                number;
  frequentlyChangedFiles:  FrequentFile[];
  sensitiveFilesTouched:   string[];
  highRiskRuns:            LearningRun[];
  taskCategories:          Record<string, number>;
  commonProofGaps:         string[];
  acceptedSafeScopes:      string[];
  recentSuccessfulTasks:   LearningRun[];
  recentRiskyTasks:        LearningRun[];
  projectWarnings:         string[];
  verificationCommands:    string[];
}

const LEARNING_FILE = "learning.json";

// ── Helpers to extract fields safely from old or new run records ──────────────

function getChangedFiles(run: RunRecord): string[] {
  return (
    run.evaluation?.changedFiles ??
    ((run as unknown) as Record<string, unknown>).watchChangedFiles as string[] ??
    []
  );
}

function getProofGaps(run: RunRecord): string[] {
  return run.evaluation?.missingProofItems ?? [];
}

function getRisk(run: RunRecord): string {
  const r = run.contract?.wasteRiskAfter ?? run.audit?.wasteRiskBefore;
  return r ?? "unknown";
}

function getCategory(run: RunRecord): string | null {
  return ((run.audit as unknown) as Record<string, unknown> | undefined)?.taskCategory as string | null ?? null;
}

function getSensitiveAreas(run: RunRecord): string[] {
  return run.audit?.sensitiveAreasRelevant ?? [];
}

// ── Core extraction ───────────────────────────────────────────────────────────

export function extractLearningFromRuns(runs: RunRecord[]): LearningData {
  const fileCounts: Record<string, number>  = {};
  const sensitiveSet  = new Set<string>();
  const proofGapSet   = new Set<string>();
  const categories:   Record<string, number> = {};
  const safeScopes    = new Set<string>();
  const highRiskRuns: LearningRun[] = [];
  const successTasks: LearningRun[] = [];
  const riskyTasks:   LearningRun[] = [];

  for (const run of runs) {
    const changed   = getChangedFiles(run);
    const proofGaps = getProofGaps(run);
    const risk      = getRisk(run);
    const cat       = getCategory(run);
    const sens      = getSensitiveAreas(run);

    // File frequency
    for (const f of changed) {
      fileCounts[f] = (fileCounts[f] ?? 0) + 1;
    }

    // Sensitive areas
    for (const s of sens) sensitiveSet.add(s);

    // Proof gaps
    for (const g of proofGaps) {
      if (g) proofGapSet.add(g);
    }

    // Task category
    if (cat) categories[cat] = (categories[cat] ?? 0) + 1;

    // High-risk runs
    if (risk === "high" || risk === "critical") {
      highRiskRuns.push({
        task:         run.task,
        date:         run.createdAt,
        risk,
        changedFiles: changed.slice(0, 5),
        proofGaps:    proofGaps.slice(0, 3),
      });
    }

    // Accepted safe scope: completed runs with low/medium risk
    if (run.status === "completed" && (risk === "low" || risk === "medium")) {
      for (const f of changed) safeScopes.add(f);
    }

    // Recent success vs risky
    if (run.status === "completed") {
      if (risk === "low" || risk === "medium") {
        successTasks.push({ task: run.task, date: run.createdAt, changedFiles: changed.slice(0, 3) });
      }
      if (risk === "high" || risk === "critical") {
        riskyTasks.push({ task: run.task, date: run.createdAt, risk, proofGaps: proofGaps.slice(0, 3) });
      }
    }
  }

  // Derive verification commands from project (could be extended later)
  const verificationCommands = ["npm run build"];

  return {
    updatedAt: new Date().toISOString(),
    runCount:  runs.length,

    frequentlyChangedFiles: Object.entries(fileCounts)
      .map(([p, c]) => ({ path: p, count: c }))
      .filter((e) => e.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),

    sensitiveFilesTouched: [...sensitiveSet].slice(0, 30),

    highRiskRuns: highRiskRuns.slice(-10),

    taskCategories: categories,

    commonProofGaps: [...proofGapSet]
      .sort()
      .slice(0, 12),

    acceptedSafeScopes: [...safeScopes].slice(0, 30),

    recentSuccessfulTasks: successTasks.slice(-5),
    recentRiskyTasks:      riskyTasks.slice(-5),

    projectWarnings:     [],
    verificationCommands,
  };
}

// ── File I/O ──────────────────────────────────────────────────────────────────

function learningPath(cwd: string): string {
  return path.join(getConfigDir(cwd), LEARNING_FILE);
}

export function loadLearning(cwd: string): LearningData | null {
  const p = learningPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as LearningData;
  } catch {
    return null;
  }
}

export function saveLearning(cwd: string, data: LearningData): void {
  const dir = getConfigDir(cwd);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(learningPath(cwd), JSON.stringify(data, null, 2), "utf-8");
}

/** Rebuild learning from all local runs. Called after runtrim finish. */
export function updateLearning(cwd: string, runs: RunRecord[]): LearningData {
  try {
    const data = extractLearningFromRuns(runs);
    saveLearning(cwd, data);
    return data;
  } catch {
    return extractLearningFromRuns([]);
  }
}

// ── Similar run matching ──────────────────────────────────────────────────────

/** Returns up to `limit` completed runs whose task overlaps significantly with `task`. */
export function findSimilarRuns(runs: RunRecord[], task: string, limit = 3): RunRecord[] {
  const stopWords = new Set(["the", "a", "an", "and", "or", "in", "of", "to", "for", "with", "that", "this", "is", "are", "was", "be"]);
  const taskWords = new Set(
    task.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w))
  );

  if (taskWords.size === 0) return [];

  return runs
    .filter((r) => r.status === "completed" || r.status === "guarded")
    .map((r) => {
      const runWords = new Set(
        r.task.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w))
      );
      const overlap = [...taskWords].filter((w) => runWords.has(w)).length;
      return { run: r, overlap };
    })
    .filter((e) => e.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((e) => e.run);
}

// ── Context for planner ───────────────────────────────────────────────────────

export interface LearningContext {
  similarRuns:       Array<{ task: string; date: string; changedFiles: string[]; proofGaps: string[] }>;
  learnedWarnings:   string[];
  proofGapsToExpect: string[];
  sensitivePaths:    string[];
  knownSafeFiles:    string[];
  recommendedVerify: string[];
}

/** Returns learning-derived context relevant to a given task. */
export function getLearningContext(
  cwd: string,
  task: string,
  runs: RunRecord[],
): LearningContext {
  const learning = loadLearning(cwd);
  const similar  = findSimilarRuns(runs, task);

  const learnedWarnings: string[] = [];

  // Warn if task matches a previously high-risk pattern
  if (learning) {
    for (const hr of learning.highRiskRuns) {
      const hrWords = new Set(hr.task.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      const taskWords = new Set(task.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      const overlap = [...taskWords].filter((w) => hrWords.has(w)).length;
      if (overlap >= 2) {
        learnedWarnings.push(`Similar high-risk run: "${hr.task}" (risk: ${hr.risk ?? "unknown"})`);
        break;
      }
    }
  }

  return {
    similarRuns: similar.map((r) => ({
      task:         r.task,
      date:         r.createdAt,
      changedFiles: getChangedFiles(r).slice(0, 5),
      proofGaps:    getProofGaps(r).slice(0, 3),
    })),
    learnedWarnings,
    proofGapsToExpect: learning?.commonProofGaps.slice(0, 5) ?? [],
    sensitivePaths:    learning?.sensitiveFilesTouched.slice(0, 10) ?? [],
    knownSafeFiles:    learning?.acceptedSafeScopes.slice(0, 10) ?? [],
    recommendedVerify: learning?.verificationCommands ?? ["npm run build"],
  };
}
