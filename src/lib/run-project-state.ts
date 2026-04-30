import fs from "fs";
import path from "path";
import { execa } from "execa";
import { getConfigDir, loadConfig, type RunTrimConfig } from "./runtrim-config";
import { loadLatestRun } from "./run-storage";
import { loadProjectAudit } from "./project-audit";
import { getGitDiff } from "./run-evaluation";
import { evaluateWatchState } from "./run-watch";

export interface ProjectState {
  projectName: string;
  updatedAt: string;
  latestRunId: string;
  latestTask: string;
  latestRunStatus: string;
  changedFiles: string[];
  untrackedFiles: string[];
  changedCount: number;
  allowed: string[];
  sensitiveTouched: string[];
  forbiddenTouched: string[];
  unknown: string[];
  fileLimitExceeded: boolean;
  hasUnverifiedChanges: boolean;
  watchWarnings: string[];
  recommendedAction: string;
  nextSafePrompt: string;
  summary: string;
}

const IGNORE_SEGMENTS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "dist-cli",
  "coverage",
  ".vercel",
  ".turbo",
  ".runtrim",
]);

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function isIgnoredPath(file: string): boolean {
  const parts = file.replace(/\\/g, "/").split("/");
  return parts.some((part) => IGNORE_SEGMENTS.has(part));
}

export function getProjectStatePath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "project-state.json");
}

export function readProjectState(cwd = process.cwd()): ProjectState | null {
  const file = getProjectStatePath(cwd);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as ProjectState;
  } catch {
    return null;
  }
}

async function getUntrackedFiles(cwd: string): Promise<string[]> {
  try {
    const status = await execa("git", ["status", "--porcelain"], { cwd });
    const lines = status.stdout.split(/\r?\n/).filter(Boolean);
    const untracked = lines
      .filter((line) => line.startsWith("?? "))
      .map((line) => line.slice(3).trim())
      .filter((f) => !isIgnoredPath(f));
    return dedupe(untracked);
  } catch {
    return [];
  }
}

function summarize(recommendedAction: string, status: string, changedCount: number): string {
  if (status === "drift_detected" || status === "split_required" || status === "blocked") {
    return "High risk detected. Contain scope before continuing.";
  }
  if (changedCount > 0 && recommendedAction.includes("check")) {
    return "Unverified changes detected. Run runtrim check before continuing.";
  }
  if (changedCount === 0) {
    return "No local file changes detected.";
  }
  return "Project state refreshed.";
}

export async function buildProjectState(cwd = process.cwd()): Promise<ProjectState> {
  const config: RunTrimConfig = loadConfig(cwd);
  const audit = loadProjectAudit(cwd);
  const latestRun = loadLatestRun(cwd);

  const diffFilesRaw = await getGitDiff(cwd);
  const untrackedRaw = await getUntrackedFiles(cwd);
  const diffFiles = dedupe(diffFilesRaw).filter((f) => !isIgnoredPath(f));
  const untrackedFiles = dedupe(untrackedRaw).filter((f) => !isIgnoredPath(f));
  const changedFiles = dedupe([...diffFiles, ...untrackedFiles]).filter((f) => !isIgnoredPath(f));

  const latestStatus = (latestRun?.evaluation?.status ?? latestRun?.status ?? "no_runs_yet").toLowerCase();
  const maxFilesPerRun = config.maxFilesPerRun || 5;
  let allowed: string[] = [];
  let sensitiveTouched: string[] = [];
  let forbiddenTouched: string[] = [];
  let unknown: string[] = [];
  let warnings: string[] = [];
  let recommendedAction = "runtrim check";
  let fileLimitExceeded = changedFiles.length > maxFilesPerRun;

  if (latestRun && !latestRun.contract.isBlocked) {
    const watch = evaluateWatchState({
      changedFiles,
      run: latestRun,
      maxFilesPerRun,
      strict: false,
    });
    allowed = watch.relevantFiles;
    sensitiveTouched = watch.sensitiveFiles;
    forbiddenTouched = watch.forbiddenFiles;
    unknown = watch.outOfScopeFiles;
    warnings = dedupe([...(latestRun.watchWarnings ?? []), ...watch.warnings]);
    recommendedAction = watch.status === "safe" ? "runtrim check" : "runtrim check";
    fileLimitExceeded = watch.changedFiles.length > maxFilesPerRun;
  } else {
    warnings = latestRun?.watchWarnings ?? [];
  }

  const hasUnverifiedChanges =
    changedFiles.length > 0 &&
    (latestStatus === "guarded" ||
      latestStatus === "executed" ||
      latestStatus === "checked" ||
      latestStatus === "partial" ||
      latestStatus === "needs_verification" ||
      latestStatus === "no_changes_detected");

  const nextSafePrompt =
    latestRun?.evaluation?.nextPrompt ??
    latestRun?.evaluation?.nextSafePrompt ??
    latestRun?.evaluation?.nextGuardedPrompt ??
    "";

  if (forbiddenTouched.length > 0 || fileLimitExceeded) recommendedAction = "runtrim check";
  if (latestStatus === "blocked" || latestStatus === "split_required") {
    recommendedAction = 'runtrim run "Audit auth flow only. No edits."';
  }

  return {
    projectName: audit?.projectName ?? path.basename(cwd),
    updatedAt: new Date().toISOString(),
    latestRunId: latestRun?.id ?? "",
    latestTask: latestRun?.task ?? "",
    latestRunStatus: latestStatus,
    changedFiles,
    untrackedFiles,
    changedCount: changedFiles.length,
    allowed,
    sensitiveTouched,
    forbiddenTouched,
    unknown,
    fileLimitExceeded,
    hasUnverifiedChanges,
    watchWarnings: warnings,
    recommendedAction,
    nextSafePrompt,
    summary: summarize(recommendedAction, latestStatus, changedFiles.length),
  };
}

export async function writeProjectState(cwd = process.cwd()): Promise<ProjectState> {
  const state = await buildProjectState(cwd);
  const file = getProjectStatePath(cwd);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf-8");
  return state;
}
