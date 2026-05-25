/**
 * RunTrim Auto-guard v1
 *
 * Modes: smart | strict | fast | off
 *
 * smart  - Fast when safe. Strict when risky. Finish before continuing.
 * strict - No contract means no edits. Always require runtrim go.
 * fast   - Low/medium risk may proceed without contract. Critical still requires go.
 * off    - Auto-guard disabled. RunTrim commands still work manually.
 */

import fs   from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getConfigDir, getRunsDir } from "./runtrim-config.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AutoGuardMode = "smart" | "strict" | "fast" | "off";
export type FileRisk      = "low" | "medium" | "high" | "critical";

// ── Risk classification ───────────────────────────────────────────────────────

/** Paths/patterns that indicate critical risk. */
const CRITICAL_PATH_PATTERNS = [
  "auth", "billing", "payment", "webhook", "subscription",
  "supabase/functions", "supabase/migrations", "migrations/",
  "middleware.ts", "middleware.js", "proxy.ts", "proxy.js",
  "dodo", "stripe", "checkout",
  ".env", "secrets", "credentials",
  ".pem", ".key", "id_rsa", "id_ed25519", "private-key",
  "rls", "database/", "db/schema", "schema.sql", "seed.sql",
  "customer-portal", "/portal/",
];

/** Paths/patterns that indicate high risk. */
const HIGH_PATH_PATTERNS = [
  "src/app/api/", "app/api/", "pages/api/",
  "lib/auth", "lib/billing", "lib/payments",
  "lib/entitlements", "lib/subscription",
  "guards/", "middleware/",
];

/** Paths/patterns that indicate medium risk. */
const MEDIUM_PATH_PATTERNS = [
  "src/lib/", "lib/", "src/hooks/", "hooks/",
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "tsconfig", "next.config", "vite.config", "webpack.config",
  "cli/", "scripts/",
];

/**
 * Classifies the highest risk level across a list of changed file paths.
 * Uses path substring matching — safe for inferred risk only.
 */
export function classifyFileRisk(files: string[]): FileRisk {
  if (files.length === 0) return "low";

  let maxRisk: FileRisk = "low";

  for (const f of files) {
    const norm = f.replace(/\\/g, "/").toLowerCase();

    if (CRITICAL_PATH_PATTERNS.some((p) => norm.includes(p))) {
      return "critical"; // short-circuit on first critical match
    }

    if (HIGH_PATH_PATTERNS.some((p) => norm.includes(p)) && maxRisk !== "high") {
      maxRisk = "high";
      continue;
    }

    if (MEDIUM_PATH_PATTERNS.some((p) => norm.includes(p)) && maxRisk === "low") {
      maxRisk = "medium";
    }
  }

  return maxRisk;
}

/** Returns true if a file path touches a sensitive/high-risk area. */
export function isSensitivePath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    CRITICAL_PATH_PATTERNS.some((p) => norm.includes(p)) ||
    HIGH_PATH_PATTERNS.some((p) => norm.includes(p))
  );
}

// ── Proof gaps for fast runs ──────────────────────────────────────────────────

export function inferFastRunProofGaps(
  changedFiles: string[],
  risk: FileRisk,
): string[] {
  const gaps: string[] = [
    "No pre-run contract was created for this run.",
    "Build not confirmed.",
    "Tests not confirmed.",
    "Manual verification missing.",
  ];

  if (changedFiles.some(isSensitivePath)) {
    gaps.push("Sensitive or high-risk files were changed without a contract.");
  }

  if (risk === "high" || risk === "critical") {
    gaps.push("Risk level requires a guarded run contract for future changes.");
  }

  return gaps;
}

// ── Adapter text per mode ─────────────────────────────────────────────────────

export function getAutoGuardAdapterBlock(mode: AutoGuardMode): string {
  switch (mode) {
    case "smart":
      return `
RunTrim Auto-guard: Smart Mode

Before editing code:
- If the task touches auth, billing, payments, webhooks, database, middleware,
  env vars, secrets, or subscriptions, stop and require an active RunTrim contract.
  Ask the user to run:
  runtrim go "<task>"
- For low-risk work (UI polish, copy, docs, isolated component styling):
  Fast Path is allowed if no unfinished changes exist.
  Keep the change minimal.
  Do not touch forbidden systems.
  After edits, ask the user to run:
  runtrim finish
- Before starting another task:
  If unfinished changes exist, stop.
  Ask the user to run:
  runtrim finish

Fast when safe. Strict when risky. Finish before continuing.
`.trim();

    case "strict":
      return `
RunTrim Auto-guard: Strict Mode

No active RunTrim contract means no code edits.

If no active contract exists at .runtrim/contracts/latest.md:
- Do not edit any file.
- Ask the user to start a guarded run:
  runtrim go "<task>"

After every editing session:
- Ask the user to run:
  runtrim finish
`.trim();

    case "fast":
      return `
RunTrim Auto-guard: Fast Mode

Fast Path is allowed for low and medium risk work.

Critical systems (auth, billing, payments, webhooks, database, middleware,
env vars, secrets, subscriptions) still require a RunTrim contract:
  runtrim go "<task>"

After any edits:
- runtrim finish is required before continuing to another task.
`.trim();

    case "off":
      return `
RunTrim Auto-guard: Off

Auto-guard is disabled for this project.
RunTrim can still be used manually:
  runtrim go "<task>"
  runtrim finish
`.trim();
  }
}

// ── Fast Run Report ───────────────────────────────────────────────────────────

export interface FastRunSummary {
  id:               string;
  task:             string;
  changedFiles:     string[];
  sensitiveFiles:   string[];
  risk:             FileRisk;
  proofGaps:        string[];
  nextSafeAction:   string;
  reportSummary:    string;
  createdAt:        string;
}

/**
 * Infer a task description from changed file paths.
 * Used when no pre-run contract exists.
 */
function inferTaskFromFiles(files: string[]): string {
  if (files.length === 0) return "Uncontracted changes (no pre-run contract)";
  if (files.length === 1) return `Edit ${files[0]}`;
  return `Edit ${files.length} files (${files[0]}...)`;
}

/**
 * Create and save a Fast Run Report for changes made without a pre-run contract.
 * Does not crash if there are no changed files.
 */
export function saveFastRunRecord(
  cwd: string,
  changedFiles: string[],
  risk: FileRisk,
): FastRunSummary {
  const now   = new Date().toISOString();
  const id    = nanoid(8);
  const task  = inferTaskFromFiles(changedFiles);
  const sensitive  = changedFiles.filter(isSensitivePath);
  const proofGaps  = inferFastRunProofGaps(changedFiles, risk);

  const reportParts: string[] = [];
  if (changedFiles.length === 0) {
    reportParts.push("No changed files detected.");
  } else {
    reportParts.push(`${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"} changed.`);
  }
  if (sensitive.length > 0) {
    reportParts.push(`${sensitive.length} sensitive path${sensitive.length === 1 ? "" : "s"} touched.`);
  }
  reportParts.push("No pre-run contract was captured for this run.");

  const nextSafeAction = changedFiles.length > 0
    ? 'Create a contract before the next change: runtrim go "<task>"'
    : 'Start a guarded run: runtrim go "<task>"';

  const summary: FastRunSummary = {
    id,
    task,
    changedFiles,
    sensitiveFiles: sensitive,
    risk,
    proofGaps,
    nextSafeAction,
    reportSummary: reportParts.join(" "),
    createdAt: now,
  };

  // Write a run record compatible with the sync system.
  // Fields use optional-chain access in the sync code, so null is safe.
  const runsDir = getRunsDir(cwd);
  if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });

  const record = {
    id,
    createdAt: now,
    task,
    status:            "completed",
    fastRun:           true,
    preRunContract:    false,
    bridgeMode:        false,
    audit:             null,
    contract:          null,
    watchChangedFiles: changedFiles,
    watchStatus:       risk === "low" ? "safe" : risk === "medium" ? "caution" : "drift_detected",
    watchWarnings:     sensitive.length > 0
                         ? [`Sensitive paths changed without contract: ${sensitive.join(", ")}`]
                         : [],
    scopeDriftStatus:  "no_contract",
    reportSummary:     summary.reportSummary,
    evaluation: {
      status:           "completed",
      changedFiles,
      missingProofItems: proofGaps,
      nextSafeAction,
      nextGuardedPrompt: nextSafeAction,
      nextPrompt:        nextSafeAction,
      nextSafePrompt:    nextSafeAction,
      memorySummary:     "",
      evaluatedAt:       now,
    },
  };

  fs.writeFileSync(
    path.join(runsDir, `${id}.json`),
    JSON.stringify(record, null, 2),
    "utf-8"
  );

  return summary;
}

// ── Guard state helpers ───────────────────────────────────────────────────────

/**
 * Returns the path to the auto-guard state file.
 * Mode is stored in the main config.json (as autoGuardMode).
 * This file is for runtime state like "last finish time".
 */
function guardStatePath(cwd: string): string {
  return path.join(getConfigDir(cwd), "guard-state.json");
}

export interface GuardState {
  lastFinishAt: string | null;
  lastGoAt:     string | null;
}

export function loadGuardState(cwd: string): GuardState {
  const p = guardStatePath(cwd);
  if (!fs.existsSync(p)) return { lastFinishAt: null, lastGoAt: null };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as GuardState;
  } catch {
    return { lastFinishAt: null, lastGoAt: null };
  }
}

export function saveGuardState(cwd: string, state: Partial<GuardState>): void {
  const p   = guardStatePath(cwd);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const existing = loadGuardState(cwd);
  fs.writeFileSync(p, JSON.stringify({ ...existing, ...state }, null, 2), "utf-8");
}

// ── Contract active check ─────────────────────────────────────────────────────

/**
 * Returns true if .runtrim/contracts/latest.md has Status: active.
 */
export function isContractActive(cwd: string): boolean {
  const p = path.join(getConfigDir(cwd), "contracts", "latest.md");
  if (!fs.existsSync(p)) return false;
  try {
    const content = fs.readFileSync(p, "utf-8");
    return content.includes("Status: active");
  } catch {
    return false;
  }
}
