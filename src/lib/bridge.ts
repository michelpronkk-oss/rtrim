/**
 * RunTrim Bridge Mode — file writers and prompt builder.
 *
 * Bridge Mode places RunTrim between any AI coding agent and the codebase.
 * These helpers write the protocol files that guide the external agent.
 *
 * Lifecycle:
 *   runtrim init   → writeCanonicalRuntrimMd, writeRestingContract, writeRestingMemory
 *   runtrim go     → writeContractFile, writeMemoryFile, writeBridgeInstructions
 *                    (RUNTRIM.md is NOT overwritten — it stays canonical)
 *   runtrim finish → archiveContract, archiveMemory, writeCanonicalRuntrimMd,
 *                    writeRestingContract, writeRestingMemory, removeBridgeBlock
 */

import fs from "fs";
import path from "path";
import { getConfigDir } from "./runtrim-config";
import type { ContractResult } from "./run-contract";

// ── Block markers ─────────────────────────────────────────────────────────────

/** Legacy bridge-session block. Written by older `runtrim go`. Cleaned up by finish/init. */
const BRIDGE_START = "<!-- RUNTRIM_BRIDGE_START -->";
const BRIDGE_END   = "<!-- RUNTRIM_BRIDGE_END -->";

// ── Derived context ───────────────────────────────────────────────────────────

export interface BridgeContext {
  task: string;
  goal: string;
  riskLevel: string;
  tokenBudget: number;
  allowedScope: string[];
  forbiddenScope: string[];
  stopConditions: string[];
  verificationSteps: string[];
  memoryContext: string;
  projectName: string;
}

const TOKEN_BUDGET_MAP: Record<string, number> = {
  low:      10_000,
  medium:   25_000,
  high:     40_000,
  critical: 50_000,
};

export function deriveBridgeContext(
  task: string,
  contract: ContractResult,
  recentRuns: { task: string; status: string; createdAt: string }[],
  projectName: string
): BridgeContext {
  const c = contract.contract;
  const riskLevel = contract.wasteRiskAfter ?? "medium";
  const tokenBudget = TOKEN_BUDGET_MAP[riskLevel] ?? 25_000;

  // Deduplicated stop conditions: use stopRules, convert whenToAsk to a
  // "Stop and ask before:" prefix so there is no mixed "stop vs ask" wording.
  const stopFromRules = c.stopRules ?? [];
  const stopFromAsk   = (c.whenToAsk ?? []).map((s) => `Stop and ask before: ${s}`);
  const stopConditions = [...stopFromRules, ...stopFromAsk];

  const verificationSteps = c.successCriteria ?? [];

  const lines = recentRuns.slice(0, 3).map((r) => {
    const day = new Date(r.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
    return `- ${r.task} (${r.status}, ${day})`;
  });

  const memoryContext =
    lines.length > 0
      ? `Recent runs:\n${lines.join("\n")}`
      : "No prior runs. This is the first run for this project.";

  return {
    task,
    goal: c.cleanedObjective || task,
    riskLevel,
    tokenBudget,
    allowedScope: c.relevantScope ?? [],
    forbiddenScope: c.forbiddenScope ?? [],
    stopConditions,
    verificationSteps,
    memoryContext,
    projectName,
  };
}

// ── Canonical / resting-state writers ────────────────────────────────────────

/**
 * Writes the canonical RUNTRIM.md that is safe for agents at rest.
 * No task-specific content. Explains the protocol and how to check
 * whether a contract is active before doing anything.
 */
export function writeCanonicalRuntrimMd(cwd = process.cwd(), projectName?: string): void {
  const lines = [
    "# RunTrim Protocol",
    "",
    ...(projectName ? [`Project: ${projectName}`, ""] : []),
    "This repo uses RunTrim as the guarded AI coding control layer.",
    "",
    "## How to start an AI coding task",
    "",
    "```",
    'runtrim go "<task>"',
    "```",
    "",
    "RunTrim creates a scoped contract, loads project memory, and generates a guarded prompt.",
    "",
    "## How to use your agent",
    "",
    "Paste the guarded prompt into Claude Code, Codex, Cursor, or any other coding agent.",
    "",
    "## After edits",
    "",
    "```",
    "runtrim finish",
    "```",
    "",
    "RunTrim checks changed files, detects drift, scores risk, and saves the run report.",
    "",
    "## If you are an AI coding agent",
    "",
    "1. Read `.runtrim/contracts/latest.md`.",
    "   - If `Status: active` — a live task exists. Follow the contract strictly.",
    "   - If `Status: none` — no active task. Ask the user to run `runtrim go \"<task>\"` first.",
    "2. Do not assume any prior task is still active.",
    "3. Stay inside the allowed scope defined in the contract.",
    "4. Stop and ask before touching any forbidden area.",
    "5. Do not read or write `.env` files or secrets.",
    "6. After editing, tell the user to run: `runtrim finish`",
    "",
    "---",
    `Protocol: runtrim init. Updated: ${new Date().toISOString()}`,
  ];

  fs.writeFileSync(path.join(cwd, "RUNTRIM.md"), lines.join("\n"), "utf-8");
}

/**
 * Writes a resting-state placeholder to contracts/latest.md.
 * Agents reading this will see Status: none and know no task is active.
 */
export function writeRestingContract(cwd = process.cwd()): void {
  const dir = path.join(getConfigDir(cwd), "contracts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const content = [
    "# RunTrim Contract",
    "",
    "Status: none",
    "",
    "No active RunTrim contract.",
    "",
    "Start one with:",
    "",
    "```",
    'runtrim go "<your task>"',
    "```",
    "",
    "---",
    `Reset by runtrim finish. Updated: ${new Date().toISOString()}`,
  ].join("\n");

  fs.writeFileSync(path.join(dir, "latest.md"), content, "utf-8");
}

/**
 * Writes a resting-state placeholder to memory/current.md.
 * Points agents to baseline.md for permanent project context.
 */
export function writeRestingMemory(cwd = process.cwd()): void {
  const dir = path.join(getConfigDir(cwd), "memory");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const content = [
    "# RunTrim Memory",
    "",
    "Status: none",
    "",
    "No active RunTrim session.",
    "",
    "Project baseline is in `.runtrim/memory/baseline.md`.",
    "",
    "Start a new session with:",
    "",
    "```",
    'runtrim go "<your task>"',
    "```",
    "",
    "---",
    `Reset by runtrim finish. Updated: ${new Date().toISOString()}`,
  ].join("\n");

  fs.writeFileSync(path.join(dir, "current.md"), content, "utf-8");
}

// ── Archive helpers ───────────────────────────────────────────────────────────

/** Archives the current active contract before the resting state is written. */
export function archiveContract(cwd: string, runId: string): void {
  const contractsDir = path.join(getConfigDir(cwd), "contracts");
  const latestPath   = path.join(contractsDir, "latest.md");
  if (!fs.existsSync(latestPath)) return;

  const content = fs.readFileSync(latestPath, "utf-8");
  // Only archive if it was actually an active contract, not a resting-state file
  if (content.includes("Status: none")) return;

  const archiveDir = path.join(contractsDir, "archive");
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, `${runId}.md`), content, "utf-8");
}

/** Archives current session memory before the resting state is written. */
export function archiveMemory(cwd: string, runId: string): void {
  const memoryDir  = path.join(getConfigDir(cwd), "memory");
  const currentPath = path.join(memoryDir, "current.md");
  if (!fs.existsSync(currentPath)) return;

  const content = fs.readFileSync(currentPath, "utf-8");
  if (content.includes("Status: none")) return;

  const archiveDir = path.join(memoryDir, "archive");
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, `${runId}.md`), content, "utf-8");
}

// ── Block management ──────────────────────────────────────────────────────────

/**
 * Removes a legacy RUNTRIM_BRIDGE_START/END block from a file.
 * These blocks were written by older versions of `runtrim go`.
 * Returns true if a block was found and removed.
 */
export function removeBridgeBlock(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(BRIDGE_START);
  const endIdx   = content.indexOf(BRIDGE_END);
  if (startIdx === -1 || endIdx === -1) return false;

  const before = content.slice(0, startIdx).trimEnd();
  const after  = content.slice(endIdx + BRIDGE_END.length).replace(/^\n+/, "\n");
  const newContent = (before + after).trimEnd() + "\n";
  if (newContent === content) return false;
  fs.writeFileSync(filePath, newContent, "utf-8");
  return true;
}

// ── Session-active writers ────────────────────────────────────────────────────

/**
 * Writes the active scoped contract to .runtrim/contracts/latest.md.
 * Includes Status: active so agents can detect a live session.
 */
export function writeContractFile(ctx: BridgeContext, cwd = process.cwd()): void {
  const dir = path.join(getConfigDir(cwd), "contracts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const scopeLines = ctx.allowedScope.length > 0
    ? ctx.allowedScope.map((s) => `- ${s}`)
    : ["- Scope not explicitly defined. Stay close to the task description."];

  const forbidLines = ctx.forbiddenScope.length > 0
    ? ctx.forbiddenScope.map((s) => `- ${s}`)
    : ["- .env* files", "- auth logic", "- database schema / migrations", "- billing and payment logic"];

  // Deduplicated stop conditions — one clear rule per concern
  const stopLines = ctx.stopConditions.length > 0
    ? ctx.stopConditions.map((s) => `- ${s}`)
    : [
        "- Stop if scope must expand beyond the task.",
        "- Stop and ask before touching any forbidden area.",
        "- Stop if more than 5 files require changes.",
      ];

  const verifyLines = ctx.verificationSteps.length > 0
    ? ctx.verificationSteps.map((s) => `- ${s}`)
    : ["- Verify the behavior described in the task.", "- Check no unrelated files changed."];

  const lines = [
    "# RunTrim Active Contract",
    "",
    "Status: active",
    "",
    `Task: ${ctx.task}`,
    `Goal: ${ctx.goal}`,
    `Risk: ${ctx.riskLevel}`,
    `Token budget: ~${ctx.tokenBudget.toLocaleString()}`,
    `Created: ${new Date().toISOString()}`,
    "",
    "## Allowed scope",
    ...scopeLines,
    "",
    "## Forbidden scope",
    ...forbidLines,
    "",
    "## Stop conditions",
    ...stopLines,
    "",
    "## Verification steps",
    ...verifyLines,
    "",
    "---",
    "Generated by RunTrim Bridge. Do not edit manually.",
  ];

  fs.writeFileSync(path.join(dir, "latest.md"), lines.join("\n"), "utf-8");
}

export function writeMemoryFile(ctx: BridgeContext, cwd = process.cwd()): void {
  const dir = path.join(getConfigDir(cwd), "memory");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const noTouchLines = ctx.forbiddenScope.length > 0
    ? ctx.forbiddenScope.map((s) => `- ${s}`)
    : ["- .env files", "- auth logic", "- database schema", "- billing and payment logic"];

  const scopeLines = ctx.allowedScope.length > 0
    ? ctx.allowedScope.map((s) => `- ${s}`)
    : ["- Defined in .runtrim/contracts/latest.md"];

  const lines = [
    "# RunTrim Memory Pack",
    "",
    "Status: active",
    "",
    `Project: ${ctx.projectName}`,
    `Current task: ${ctx.task}`,
    `Updated: ${new Date().toISOString()}`,
    "",
    "## Context",
    ctx.memoryContext,
    "",
    "## Do not touch",
    ...noTouchLines,
    "",
    "## Active task scope",
    ...scopeLines,
    "",
    "---",
    "Generated by RunTrim Bridge. Do not edit manually.",
  ];

  fs.writeFileSync(path.join(dir, "current.md"), lines.join("\n"), "utf-8");
}

/**
 * Writes agent instructions that are session-aware.
 * Agents check the status field in latest.md/current.md before acting.
 */
export function writeBridgeInstructions(cwd = process.cwd()): void {
  const dir = path.join(getConfigDir(cwd), "bridge");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const lines = [
    "# RunTrim Agent Instructions",
    "",
    "You are operating inside a RunTrim-guarded session.",
    "",
    "## Before editing",
    "",
    "1. Read `RUNTRIM.md`.",
    "2. Read `.runtrim/contracts/latest.md`.",
    "   - If `Status: active` — follow the contract strictly.",
    "   - If `Status: none` — stop. Ask the user to run `runtrim go \"<task>\"` first.",
    "3. If the contract is active, read `.runtrim/memory/current.md` for session context.",
    "   If no active session, read `.runtrim/memory/baseline.md` for project baseline.",
    "",
    "## During editing",
    "",
    "- Stay within the allowed scope defined in the contract.",
    "- Stop and ask the user before touching any forbidden area.",
    "- Make minimal, targeted changes only.",
    "- Do not refactor, rename, or reorganize outside the task scope.",
    "- Do not add console.log statements or debug artifacts.",
    "- Do not install new dependencies without explicit approval.",
    "",
    "## After editing",
    "",
    "- Tell the user which files you changed and why.",
    "- The user will run: runtrim finish",
    "- Do not run runtrim commands yourself unless explicitly asked.",
    "",
    "---",
    "Generated by RunTrim. Do not edit manually.",
  ];

  fs.writeFileSync(path.join(dir, "agent-instructions.md"), lines.join("\n"), "utf-8");
}

// ── writeBridgeFiles ──────────────────────────────────────────────────────────

export interface WriteBridgeFilesResult {
  /** Human-readable display labels. */
  written: string[];
  /**
   * Actual relative file paths that RunTrim wrote during this session.
   * Used by `runtrim finish` to exclude these from agent drift evaluation.
   * NOTE: RUNTRIM.md is intentionally NOT included — it is never overwritten
   * during a bridge session. It stays canonical.
   */
  managedPaths: string[];
}

/**
 * Writes all session-scoped bridge files.
 *
 * Deliberately does NOT overwrite RUNTRIM.md (canonical, managed by init/finish)
 * and does NOT append bridge blocks to CLAUDE.md/AGENTS.md (managed by init).
 */
export function writeBridgeFiles(
  ctx: BridgeContext,
  cwd: string
): WriteBridgeFilesResult {
  const written: string[] = [];
  const managedPaths: string[] = [];

  const track = (relativePath: string, label?: string) => {
    managedPaths.push(relativePath);
    written.push(label ?? relativePath);
  };

  // Contract and memory are session-scoped (overwritten each go, archived on finish)
  writeContractFile(ctx, cwd);
  track(".runtrim/contracts/latest.md");

  writeMemoryFile(ctx, cwd);
  track(".runtrim/memory/current.md");

  // Bridge instructions (session-aware, overwrites are safe)
  writeBridgeInstructions(cwd);
  track(".runtrim/bridge/agent-instructions.md");

  // RUNTRIM.md is intentionally excluded — stays canonical
  // CLAUDE.md/AGENTS.md bridge blocks are intentionally excluded — managed by init/finish

  return { written, managedPaths };
}

// ── Guarded bridge prompt ─────────────────────────────────────────────────────

export function buildBridgePrompt(contractText: string, ctx: BridgeContext): string {
  const allowedList = ctx.allowedScope.length > 0
    ? ctx.allowedScope.map((s) => `  - ${s}`).join("\n")
    : "  - Defined in .runtrim/contracts/latest.md";

  const forbidList = ctx.forbiddenScope.length > 0
    ? ctx.forbiddenScope.map((s) => `  - ${s}`).join("\n")
    : "  - .env files, auth, database schema, billing, payments";

  const stopList = ctx.stopConditions.length > 0
    ? ctx.stopConditions.slice(0, 4).map((s) => `  - ${s}`).join("\n")
    : "  - Stop if more than 5 files need changes.\n  - Stop and ask before touching any forbidden area.";

  const header = [
    "RUNTRIM BRIDGE SESSION",
    `Task: ${ctx.task}`,
    `Risk: ${ctx.riskLevel}  |  Token budget: ~${ctx.tokenBudget.toLocaleString()}`,
    "",
    "ALLOWED SCOPE",
    allowedList,
    "",
    "FORBIDDEN SCOPE",
    forbidList,
    "",
    "STOP CONDITIONS",
    stopList,
    "",
  ].join("\n");

  const footer = [
    "",
    "RULES",
    "  - Read RUNTRIM.md and .runtrim/contracts/latest.md before touching any file.",
    "  - Inspect first. List relevant files before opening them.",
    "  - Make the minimal change required. No unrelated refactors.",
    "  - Stop and ask before touching any forbidden area.",
    "  - After editing, tell the user which files changed. They will run: runtrim finish",
    "",
  ].join("\n");

  return header + contractText + footer;
}

// ── Legacy appendBridgeBlock — kept for backward compatibility only ────────────
// No longer called by writeBridgeFiles. Preserved so external callers don't break.
export function appendBridgeBlock(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  if (content.includes(BRIDGE_START)) return false;
  const block = `\n${BRIDGE_START}\nBefore editing code, read RUNTRIM.md and .runtrim/contracts/latest.md.\nStay inside the active scoped contract.\nDo not touch forbidden files or unrelated systems.\nIf scope expands, stop and ask for a new RunTrim run.\nAfter editing, run: runtrim finish\n${BRIDGE_END}\n`;
  fs.writeFileSync(filePath, content.trimEnd() + block, "utf-8");
  return true;
}

// Kept for backward compatibility — no longer called internally
export function writeRootProtocolFile(ctx: BridgeContext, cwd = process.cwd()): void {
  writeCanonicalRuntrimMd(cwd, ctx.projectName || undefined);
}
