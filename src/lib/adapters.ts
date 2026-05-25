/**
 * RunTrim Universal Agent Adapters
 *
 * Central registry for all supported agent adapters.
 * Handles detection, installation, idempotent file updates, and state storage.
 *
 * Any agent. One run boundary.
 */

import fs   from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdapterId =
  | "claude"
  | "codex"
  | "cursor"
  | "chatgpt"
  | "gemini"
  | "kimi"
  | "deepseek"
  | "openclaw"
  | "custom";

export interface AdapterDef {
  id:          AdapterId;
  displayName: string;
  /** Target file path relative to project root. */
  targetFile:  string;
  description: string;
}

export interface AdapterState {
  installed:  AdapterId[];
  detected:   AdapterId[];
  updatedAt:  string;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const ADAPTERS: AdapterDef[] = [
  {
    id:          "claude",
    displayName: "Claude Code",
    targetFile:  "CLAUDE.md",
    description: "Anthropic Claude Code agent",
  },
  {
    id:          "codex",
    displayName: "OpenAI Codex",
    targetFile:  "AGENTS.md",
    description: "OpenAI Codex CLI and compatible agents",
  },
  {
    id:          "cursor",
    displayName: "Cursor",
    targetFile:  ".cursor/rules/runtrim.mdc",
    description: "Cursor IDE agent rules",
  },
  {
    id:          "chatgpt",
    displayName: "ChatGPT",
    targetFile:  ".runtrim/adapters/chatgpt.md",
    description: "ChatGPT coding assistant",
  },
  {
    id:          "gemini",
    displayName: "Google Gemini",
    targetFile:  "GEMINI.md",
    description: "Google Gemini coding assistant",
  },
  {
    id:          "kimi",
    displayName: "Kimi",
    targetFile:  ".runtrim/adapters/kimi.md",
    description: "Moonshot Kimi coding assistant",
  },
  {
    id:          "deepseek",
    displayName: "DeepSeek",
    targetFile:  ".runtrim/adapters/deepseek.md",
    description: "DeepSeek coding assistant",
  },
  {
    id:          "openclaw",
    displayName: "OpenClaw",
    targetFile:  ".runtrim/adapters/openclaw.md",
    description: "OpenClaw agentic coding assistant",
  },
  {
    id:          "custom",
    displayName: "Custom agent",
    targetFile:  ".runtrim/adapters/custom.md",
    description: "Any agent or prompt-runner",
  },
];

export function getAdapter(id: string): AdapterDef | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

// ── Idempotent block markers ───────────────────────────────────────────────────

export const ADAPTER_BLOCK_START = "<!-- BEGIN RUNTRIM ADAPTER -->";
export const ADAPTER_BLOCK_END   = "<!-- END RUNTRIM ADAPTER -->";

// Legacy marker support (from earlier runtrim versions) — upgrade transparently
const LEGACY_BLOCK_START = "<!-- RUNTRIM_PROTOCOL_START -->";
const LEGACY_BLOCK_END   = "<!-- RUNTRIM_PROTOCOL_END -->";

// ── Protocol text per adapter ─────────────────────────────────────────────────

const BASE_PROTOCOL = `
RunTrim Protocol

Before editing code:
1. Check for an active RunTrim contract at .runtrim/contracts/latest.md.
2. If Status: active, read the contract before making any changes.
3. Follow the allowed scope listed in the contract.
4. Do not touch forbidden files or areas listed in the contract.
5. Respect all stop rules.
6. Preserve the user's original task objective.
7. Produce evidence of what changed.

If no active RunTrim contract exists:
- Do not edit code without one.
- Ask the user to start a guarded run:
  runtrim agent "<task>" --copy

If the task requires leaving the current scope:
- Stop.
- Explain why the contract is insufficient.
- Ask the user to create a new run.
- If the user asks for extra work outside scope, request contract approval before continuing.
- Do not silently continue outside the active contract.

After editing:
- List every file you changed.
- State what verification you performed.
- Ask the user to run:
  runtrim finish
- runtrim finish verifies changed files against the active contract.

RunTrim gives this agent:
- Project memory
- Task scope
- Forbidden-file rules
- Stop rules
- Proof requirements
- Run history
- Handoff context

Any agent. One run boundary.
`.trim();

const PROTOCOL_TEXTS: Record<AdapterId, string> = {
  claude: `
# Claude Code Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}

## Claude-specific notes

Check CLAUDE.md (this file) for any project-specific conventions.
Check .runtrim/contracts/latest.md before every coding session.
Never edit outside the allowed scope without asking.
`.trim(),

  codex: `
# AI Agent Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}

## Codex / AGENTS.md notes

This file applies to all agents reading AGENTS.md.
Always check .runtrim/contracts/latest.md for an active task contract.
Apply strict task boundaries. Do not wander outside allowed scope.
`.trim(),

  cursor: null as unknown as string, // Cursor gets its own MDC format below

  chatgpt: `
# ChatGPT Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}
`.trim(),

  gemini: `
# Gemini Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}
`.trim(),

  kimi: `
# Kimi Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}
`.trim(),

  deepseek: `
# DeepSeek Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}
`.trim(),

  openclaw: `
# OpenClaw Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}

## OpenClaw-specific notes

Before using any tool or executing any command:
1. Confirm a RunTrim contract is active at .runtrim/contracts/latest.md.
2. If no active contract exists, do not proceed. Ask for:
   runtrim agent "<task>" --copy
3. Do not call shell commands, write files, or read env vars outside the contract.
`.trim(),

  custom: `
# Custom Agent Instructions

This repo uses RunTrim as the guarded AI coding protocol.

${BASE_PROTOCOL}

## Note for custom agents

Paste this file content into your agent system prompt or instructions.
Replace "RunTrim" references with your agent's instruction format if needed.
The core contract check (reading .runtrim/contracts/latest.md) is required.
`.trim(),
};

/** Returns the full MDC content for the Cursor adapter. */
function getCursorMdcContent(): string {
  return [
    "---",
    "description: RunTrim guarded AI coding protocol",
    "alwaysApply: true",
    "---",
    "",
    "# RunTrim Protocol",
    "",
    "This repo uses RunTrim as the guarded AI coding control layer.",
    "",
    "## Before editing any code",
    "",
    "1. Read `RUNTRIM.md` in the repo root.",
    "2. Check `.runtrim/contracts/latest.md` for an active contract.",
    "3. If Status: active, follow the contract strictly.",
    "",
    "## Rules",
    "",
    "- Stay inside the allowed scope defined in the contract.",
    "- Do not touch forbidden files or areas.",
    "- Stop if scope must expand beyond the contract.",
    "- If the user asks for extra work outside scope, request contract approval first.",
    "- Do not silently continue outside the active contract.",
    "- Do not read or write `.env` files or secrets.",
    "- Do not refactor code outside the direct task scope.",
    "",
    "## After editing",
    "",
    "Summarize changed files, then ask the user to run:",
    "`runtrim finish`",
    "runtrim finish verifies changed files against the active contract.",
    "",
    "## If no active contract",
    "",
    "Ask the user to start a guarded run:",
    '`runtrim agent "<task>" --copy`',
    "",
    "Any agent. One run boundary.",
  ].join("\n");
}

// ── Detection ──────────────────────────────────────────────────────────────────

/**
 * Detect which agent environments are present in the project directory.
 * Detection is based on existence of native agent files or directories.
 */
export function detectAdapters(cwd: string): AdapterId[] {
  const detected: AdapterId[] = [];

  for (const adapter of ADAPTERS) {
    if (adapter.id === "cursor") {
      // Cursor detected if .cursor/ directory exists (even without runtrim.mdc)
      if (
        fs.existsSync(path.join(cwd, ".cursor")) ||
        fs.existsSync(path.join(cwd, ".cursor", "rules", "runtrim.mdc"))
      ) {
        detected.push("cursor");
      }
      continue;
    }
    if (fs.existsSync(path.join(cwd, adapter.targetFile))) {
      detected.push(adapter.id);
    }
  }

  return detected;
}

/**
 * Returns true if the RunTrim adapter block (or legacy protocol block)
 * is present in the adapter's target file.
 */
export function isAdapterInstalled(cwd: string, id: AdapterId): boolean {
  const adapter = getAdapter(id);
  if (!adapter) return false;

  const filePath = path.join(cwd, adapter.targetFile);
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, "utf-8");

  if (id === "cursor") {
    // Cursor MDC is entirely managed by RunTrim — presence = installed
    return content.includes("runtrim go") || content.includes("runtrim finish");
  }

  return (
    content.includes(ADAPTER_BLOCK_START) ||
    content.includes(LEGACY_BLOCK_START)
  );
}

// ── Installation ───────────────────────────────────────────────────────────────

export type InstallResult = "created" | "updated" | "unchanged" | "error";

/**
 * Install or update the RunTrim adapter block in the target file.
 * Safe and idempotent: never removes user-authored content.
 */
export function installAdapter(cwd: string, id: AdapterId): InstallResult {
  const adapter = getAdapter(id);
  if (!adapter) return "error";

  const filePath = path.join(cwd, adapter.targetFile);
  const dir      = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); }
    catch { return "error"; }
  }

  // Cursor gets its own MDC format — always full-file ownership
  if (id === "cursor") {
    return installCursorAdapter(filePath);
  }

  const protocolText = PROTOCOL_TEXTS[id];
  if (!protocolText) return "error";

  if (!fs.existsSync(filePath)) {
    // Create a new file with a header + adapter block
    const content = buildNewAdapterFile(id, adapter, protocolText);
    try {
      fs.writeFileSync(filePath, content, "utf-8");
      return "created";
    } catch { return "error"; }
  }

  // File exists — upsert the adapter block, preserve surrounding content
  return upsertAdapterBlock(filePath, protocolText);
}

function installCursorAdapter(filePath: string): InstallResult {
  const existed = fs.existsSync(filePath);
  const content = getCursorMdcContent();
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return existed ? "updated" : "created";
  } catch { return "error"; }
}

function buildNewAdapterFile(id: AdapterId, adapter: AdapterDef, protocolText: string): string {
  const header = id === "claude"
    ? "# Claude Code Instructions"
    : id === "codex"
    ? "# AI Agent Instructions"
    : id === "gemini"
    ? "# Gemini Instructions"
    : `# ${adapter.displayName} Instructions`;

  return [
    header,
    "",
    `${ADAPTER_BLOCK_START}`,
    protocolText,
    `${ADAPTER_BLOCK_END}`,
    "",
  ].join("\n");
}

function upsertAdapterBlock(filePath: string, protocolText: string): "updated" | "unchanged" {
  let content: string;
  try { content = fs.readFileSync(filePath, "utf-8"); }
  catch { return "unchanged"; }

  const newBlock = `${ADAPTER_BLOCK_START}\n${protocolText.trim()}\n${ADAPTER_BLOCK_END}`;

  // Try new-format markers first
  const newStart = content.indexOf(ADAPTER_BLOCK_START);
  const newEnd   = content.indexOf(ADAPTER_BLOCK_END, newStart);
  if (newStart !== -1 && newEnd !== -1) {
    const before  = content.slice(0, newStart);
    const after   = content.slice(newEnd + ADAPTER_BLOCK_END.length);
    const updated = before + newBlock + after.replace(/^\n/, "");
    if (updated === content) return "unchanged";
    try { fs.writeFileSync(filePath, updated, "utf-8"); return "updated"; }
    catch { return "unchanged"; }
  }

  // Upgrade from legacy markers transparently
  const legStart = content.indexOf(LEGACY_BLOCK_START);
  const legEnd   = content.indexOf(LEGACY_BLOCK_END, legStart);
  if (legStart !== -1 && legEnd !== -1) {
    const before  = content.slice(0, legStart);
    const after   = content.slice(legEnd + LEGACY_BLOCK_END.length);
    const updated = before + newBlock + after.replace(/^\n/, "");
    if (updated === content) return "unchanged";
    try { fs.writeFileSync(filePath, updated, "utf-8"); return "updated"; }
    catch { return "unchanged"; }
  }

  // Append block at the end (no existing RunTrim section)
  const updated = content.trimEnd() + "\n\n" + newBlock + "\n";
  try { fs.writeFileSync(filePath, updated, "utf-8"); return "updated"; }
  catch { return "unchanged"; }
}

// ── Install all ────────────────────────────────────────────────────────────────

export interface InstallAllResult {
  results: Array<{ id: AdapterId; displayName: string; result: InstallResult }>;
}

export function installAllAdapters(cwd: string): InstallAllResult {
  const results: InstallAllResult["results"] = [];
  for (const adapter of ADAPTERS) {
    const result = installAdapter(cwd, adapter.id);
    results.push({ id: adapter.id, displayName: adapter.displayName, result });
  }
  return { results };
}

// ── State persistence ─────────────────────────────────────────────────────────

function adaptersStatePath(cwd: string): string {
  return path.join(cwd, ".runtrim", "adapters.json");
}

export function loadAdapterState(cwd: string): AdapterState {
  const p = adaptersStatePath(cwd);
  if (!fs.existsSync(p)) return { installed: [], detected: [], updatedAt: "" };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as AdapterState;
  } catch {
    return { installed: [], detected: [], updatedAt: "" };
  }
}

export function saveAdapterState(cwd: string, state: AdapterState): void {
  const p = adaptersStatePath(cwd);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
}

/**
 * Convenience: detect, check install status, persist state, return current picture.
 */
export function refreshAdapterState(cwd: string): {
  detected:    AdapterId[];
  installed:   AdapterId[];
  uninstalled: AdapterId[];
} {
  const detected    = detectAdapters(cwd);
  const installed   = ADAPTERS.map((a) => a.id).filter((id) => isAdapterInstalled(cwd, id));
  const uninstalled = ADAPTERS.map((a) => a.id).filter((id) => !installed.includes(id));

  saveAdapterState(cwd, { detected, installed, updatedAt: new Date().toISOString() });

  return { detected, installed, uninstalled };
}

