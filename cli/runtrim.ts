#!/usr/bin/env node

import { Command } from "commander";
import { Chalk, type ChalkInstance } from "chalk";
import ora from "ora";
import prompts from "prompts";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";
import os from "os";
import { execa } from "execa";
import packageJson from "../package.json";

import {
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG,
  getConfigDir,
  getRunsDir,
  configExists,
  detectProjectInfo,
} from "../src/lib/runtrim-config.ts";
import type { RunTrimConfig } from "../src/lib/runtrim-config.ts";
import { auditTask, detectProjectContext } from "../src/lib/run-audit.ts";
import { generateContract } from "../src/lib/run-contract.ts";
import { saveRun, loadLatestRun, loadAllRuns, updateRun } from "../src/lib/run-storage.ts";
import { getGitDiff, evaluateAgentOutput } from "../src/lib/run-evaluation.ts";
import { formatRisk, formatStatus, formatScore, formatDate, truncate } from "../src/lib/format.ts";
import type { RunEvaluationRecord, WatchEventRecord } from "../src/lib/run-storage.ts";
import { readMemory, writeMemoryFromRuns } from "../src/lib/run-memory.ts";
import { buildSyncPayload } from "../src/lib/runtrim-sync.ts";
import { evaluateWatchState } from "../src/lib/run-watch.ts";
import { startLocalPanelServer } from "../src/lib/local-panel-server.ts";
import {
  performBaselineProjectAudit,
  writeProjectAudit,
  writeRules,
  loadProjectAudit,
  buildBaselineMemoryMarkdown,
  ensureStarterPromptIfMissing,
  getProjectAuditPath,
} from "../src/lib/project-audit.ts";
import {
  assertFreeRepoAllowed,
  getCurrentRepoIdentity,
  loadGlobalRegistry,
  registerCurrentRepo,
  unlinkCurrentRepo,
} from "../src/lib/global-registry.ts";
import { trackCliCommandEvent } from "../src/lib/cli-telemetry.ts";

const chalk = new Chalk();
const oraFactory: typeof ora =
  (typeof ora === "function" ? ora : ((ora as unknown as { default?: typeof ora }).default ?? ora));
const ACCENT = chalk.hex("#C8901A");
const GO_ACCENT = chalk.hex("#8B7CFF");
const DIM = chalk.gray;
const BOLD = chalk.white.bold;

const program = new Command();
const SECTION = "-------------------------------------------------";
const OUTPUT_PREVIEW_MAX = 1600;
const STANDARD_RATE_PER_MILLION = 3;
const EXPENSIVE_RATE_PER_MILLION = 30;

function parseEstimatedNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function estimateSavingsFromTokens(tokens: number): { standard: number; expensive: number } {
  const inMillions = tokens / 1_000_000;
  return {
    standard: inMillions * STANDARD_RATE_PER_MILLION,
    expensive: inMillions * EXPENSIVE_RATE_PER_MILLION,
  };
}

function parseCommandString(input: string): { command: string; args: string[] } {
  const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const normalized = parts.map((p) => p.replace(/^"(.*)"$/, "$1"));
  return {
    command: normalized[0] ?? "",
    args: normalized.slice(1),
  };
}

function resolvePromptPath(config: RunTrimConfig, cwd: string): string {
  const configured = config.lastPromptPath?.trim() || ".runtrim/latest-prompt.md";
  return path.isAbsolute(configured) ? configured : path.join(cwd, configured);
}

function writeLatestPromptFile(content: string, config: RunTrimConfig, cwd: string): string {
  const promptPath = resolvePromptPath(config, cwd);
  const dir = path.dirname(promptPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(promptPath, content, "utf-8");
  return promptPath;
}

async function openInEditor(
  editorValue: string | undefined,
  config: RunTrimConfig,
  filePath: string,
  cwd: string
): Promise<boolean> {
  const selected = (editorValue?.trim() || config.preferredEditor || "code").trim();
  const normalized = selected.toLowerCase();
  let commandText = selected;
  if (normalized === "code") commandText = "code";
  if (normalized === "cursor") commandText = "cursor";
  const parsed = parseCommandString(commandText);
  if (!parsed.command) return false;
  try {
    await execa(parsed.command, [...parsed.args, filePath], { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function printPrepareAgentInstructions(agent: string, promptPath: string): void {
  const a = agent.toLowerCase();
  console.log(DIM("  AGENT INSTRUCTIONS"));
  console.log("");
  if (a === "claude") {
    console.log(DIM("  - Paste the copied contract into Claude Code."));
    console.log(
      DIM("  - Or run manually after review: ") +
        chalk.white(`Get-Content ${promptPath.replace(/\//g, "\\\\")} -Raw | claude`)
    );
    return;
  }
  if (a === "codex") {
    console.log(DIM("  - Paste the copied contract into Codex."));
    console.log(DIM("  - Or run manually after review with your Codex CLI command."));
    return;
  }
  if (a === "cursor") {
    console.log(DIM("  - Open .runtrim/latest-prompt.md, review it, then paste into Cursor Composer."));
    return;
  }
  if (a === "chatgpt") {
    console.log(DIM("  - Paste the copied contract into the active ChatGPT conversation."));
    return;
  }
  console.log(DIM("  - Review .runtrim/latest-prompt.md before running your agent."));
}

async function copyToClipboardSafe(value: string): Promise<boolean> {
  try {
    await clipboard.write(value);
    return true;
  } catch {
    return false;
  }
}

function resolveSyncEndpoint(dashboardUrl: string): string {
  try {
    const u = new URL(dashboardUrl);
    return `${u.origin}/api/sync`;
  } catch {
    return "http://localhost:3000/api/sync";
  }
}

function parseMemorySection(memory: string, title: string): string {
  const lines = memory.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim().toLowerCase() === `${title.toLowerCase()}:`);
  if (idx === -1) return "";
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    out.push(line.trim());
  }
  return out.join(" ");
}

function dedupeFiles(files: string[]): string[] {
  return [...new Set(files.filter(Boolean).map((f) => f.replace(/\\/g, "/")))];
}

const CONTINUATION_REASONS = [
  "usage_limit",
  "credits_exhausted",
  "context_limit",
  "rate_limit",
  "provider_error",
  "session_expired",
  "manual_handoff",
  "other",
] as const;
type ContinuationReason = (typeof CONTINUATION_REASONS)[number];

const CONTINUATION_AGENTS = [
  "claude",
  "codex",
  "cursor",
  "chatgpt",
  "gemini",
  "custom",
] as const;
type ContinuationAgent = (typeof CONTINUATION_AGENTS)[number];

function normalizeContinuationReason(value: string | undefined): ContinuationReason {
  if (!value) return "manual_handoff";
  const lower = value.trim().toLowerCase();
  if ((CONTINUATION_REASONS as readonly string[]).includes(lower)) {
    return lower as ContinuationReason;
  }
  return "other";
}

function normalizeContinuationAgent(value: string | undefined, fallback: string): ContinuationAgent {
  const candidate = (value || fallback || "custom").trim().toLowerCase();
  if ((CONTINUATION_AGENTS as readonly string[]).includes(candidate)) {
    return candidate as ContinuationAgent;
  }
  return "custom";
}

function resolveContinuationPath(cwd: string): string {
  return path.join(getConfigDir(cwd), "continuation-prompt.md");
}

function extractMemoryValue(memory: string | null, label: string): string {
  if (!memory) return "";
  const rx = new RegExp(`^${label}:\\s*(.*)$`, "im");
  const m = memory.match(rx);
  return (m?.[1] ?? "").trim();
}

function extractMemorySection(memory: string | null, section: string): string[] {
  if (!memory) return [];
  const lines = memory.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim().toLowerCase() === `${section.toLowerCase()}:`);
  if (idx === -1) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) break;
    out.push(line.replace(/^- /, "").trim());
  }
  return out;
}

function continuationReasonLine(reason: ContinuationReason): string {
  const map: Record<ContinuationReason, string> = {
    usage_limit: "usage limit reached",
    credits_exhausted: "credits exhausted",
    context_limit: "context limit reached",
    rate_limit: "rate limit interruption",
    provider_error: "provider error",
    session_expired: "session expired",
    manual_handoff: "manual handoff",
    other: "other interruption",
  };
  return map[reason];
}

function continuationReasonInstruction(reason: ContinuationReason): string {
  if (reason === "usage_limit" || reason === "credits_exhausted") {
    return "The previous agent stopped because usage or credits ran out. Do not repeat completed work. Start by summarizing the current state from the information below, then continue only from the next safe action.";
  }
  if (reason === "context_limit") {
    return "The previous agent likely lost context. Use this prompt as the compact source of truth. Do not ask to reload the entire project.";
  }
  if (reason === "rate_limit" || reason === "provider_error" || reason === "session_expired") {
    return "The previous agent stopped due to provider interruption. Continue from the last known state without expanding scope.";
  }
  if (reason === "manual_handoff") {
    return "This is a handoff from another AI session. Treat the project memory below as the source of truth.";
  }
  return "Continue from the last known state without restarting the task.";
}

function continuationExtraReasonInstruction(
  reason: ContinuationReason,
  hasUnverifiedChanges: boolean
): string {
  if (
    hasUnverifiedChanges &&
    (reason === "usage_limit" || reason === "credits_exhausted")
  ) {
    return "The previous agent stopped because usage or credits ran out. Do not repeat completed work. Treat this as a verification handoff before any further implementation.";
  }
  return "";
}

function continuationAgentLine(agent: ContinuationAgent): string {
  if (agent === "claude") return "Paste this continuation prompt into Claude.";
  if (agent === "codex") return "Paste this continuation prompt into Codex.";
  if (agent === "cursor") return "Paste this continuation prompt into Cursor Composer.";
  if (agent === "chatgpt") return "Paste this continuation prompt into ChatGPT.";
  if (agent === "gemini") return "Paste this continuation prompt into Gemini.";
  return "Paste this continuation prompt into your selected agent.";
}

function updateMemoryWithContinuation(
  memory: string,
  reason: ContinuationReason,
  promptPath: string,
  createdAt: string
): string {
  const block = [
    "Continuation metadata:",
    `- Last continuation reason: ${reason}`,
    `- Continuation prompt path: ${promptPath.replace(/\\/g, "/")}`,
    `- Continuation created at: ${createdAt}`,
  ].join("\n");
  const normalized = memory.replace(/\n?Continuation metadata:\n(?:- .*\n?)*/g, "").trimEnd();
  return `${normalized}\n\n${block}\n`;
}

function printWatchSnapshot(input: {
  task: string;
  maxFiles: number;
  summaryOnly: boolean;
  result: ReturnType<typeof evaluateWatchState>;
}): void {
  const { task, maxFiles, summaryOnly, result } = input;
  const statusColor =
    result.status === "safe"
      ? chalk.green
      : result.status === "caution"
      ? chalk.yellow
      : chalk.red;

  console.log(BOLD("RunTrim") + DIM("  watch"));
  console.log("");
  console.log(DIM("  Task                 ") + chalk.white(task));
  console.log(DIM("  Changed files        ") + chalk.white(`${result.changedFiles.length} / ${maxFiles}`));
  console.log(DIM("  Allowed changes      ") + chalk.white(String(result.relevantFiles.length)));
  console.log(DIM("  Sensitive changes    ") + chalk.white(String(result.sensitiveFiles.length)));
  console.log(DIM("  Forbidden changes    ") + chalk.white(String(result.forbiddenFiles.length)));
  console.log(DIM("  Status               ") + statusColor(formatStatus(result.status)));
  console.log(DIM("  Next action          ") + chalk.white(result.nextAction));

  if (!summaryOnly) {
    if (result.changedFiles.length === 0) {
      console.log("");
      console.log(DIM("  Watching. No agent changes detected yet."));
    } else {
      console.log("");
      console.log(DIM("  Changed files:"));
      for (const file of result.changedFiles.slice(0, 12)) {
        console.log(DIM("  - ") + chalk.white(file));
      }
      if (result.changedFiles.length > 12) {
        console.log(DIM(`  ... ${result.changedFiles.length - 12} more`));
      }
    }

    if (result.warnings.length > 0) {
      console.log("");
      console.log(chalk.yellow("  Warnings:"));
      for (const warning of result.warnings) {
        console.log(chalk.yellow("  - " + warning));
      }
    }
  }

  console.log("");
}

function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function ensureRepoAllowedForFree(cwd: string): Promise<boolean> {
  const check = await assertFreeRepoAllowed(cwd);
  if (check.allowed) {
    await registerCurrentRepo(cwd);
    return true;
  }

  console.log(chalk.yellow("  Free plan includes 1 tracked repo."));
  console.log("");
  console.log(DIM("  Tracked repo:"));
  console.log(chalk.white(`  ${check.trackedRepo?.path ?? "(none)"}`));
  console.log("");
  console.log(DIM("  This repo:"));
  console.log(chalk.white(`  ${check.currentRepo.path}`));
  console.log("");
  console.log(DIM("  Next:"));
  console.log(chalk.white("  - continue in the tracked repo"));
  console.log(chalk.white("  - unlink the tracked repo with runtrim repo unlink --force"));
  console.log(chalk.white("  - join Builder early access for unlimited repos"));
  console.log("");
  console.log(
    DIM(
      "  RunTrim stores this limit locally in ~/.runtrim/global.json. No source code is uploaded."
    )
  );
  console.log("");
  return false;
}

async function initializeRunTrim(
  cwd: string,
  options: { refresh?: boolean; allowOverwritePrompt?: boolean } = {}
): Promise<{ ok: boolean }> {
  const hadConfig = configExists(cwd);
  if (hadConfig && !options.refresh && options.allowOverwritePrompt) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "Overwrite existing config? (Use --refresh to keep config and refresh baseline)",
      initial: false,
    });
    if (!overwrite) {
      console.log(DIM("  Aborted."));
      console.log("");
      return { ok: false };
    }
  }

  const spinner = oraFactory({ text: "Building baseline project audit...", color: "yellow" }).start();
  await new Promise((r) => setTimeout(r, 120));
  const previousAudit = loadProjectAudit(cwd);
  const baseline = performBaselineProjectAudit(cwd, previousAudit);
  spinner.stop();

  const configDir = getConfigDir(cwd);
  const runsDir = getRunsDir(cwd);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });

  const existingConfig = hadConfig ? loadConfig(cwd) : null;
  const baseConfig = { ...DEFAULT_CONFIG, ...detectProjectInfo(cwd) };
  const nextConfig = options.refresh && existingConfig ? { ...existingConfig } : baseConfig;
  nextConfig.stack = baseline.detectedStack.join(",");
  nextConfig.packageManager = baseline.packageManager;
  nextConfig.baselineInitialized = true;
  nextConfig.lastAuditAt = baseline.updatedAt;
  saveConfig(nextConfig, cwd);

  writeProjectAudit(baseline, cwd);
  writeRules(baseline, cwd);

  const memoryPath = path.join(getConfigDir(cwd), "memory.md");
  const hasRuns = loadAllRuns(cwd).length > 0;
  if (hasRuns) {
    const latest = loadLatestRun(cwd);
    if (latest) writeMemoryFromRuns(latest, loadAllRuns(cwd), nextConfig, cwd);
  } else {
    fs.writeFileSync(memoryPath, buildBaselineMemoryMarkdown(baseline), "utf-8");
  }

  ensureStarterPromptIfMissing(cwd);

  const gitignorePath = path.join(cwd, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".runtrim/runs")) {
      fs.appendFileSync(gitignorePath, "\n# RunTrim run history\n.runtrim/runs/\n");
    }
  }

  return { ok: true };
}

async function runPrepareTask(
  task: string,
  options: {
    open?: boolean;
    editor?: string;
    agent?: string;
    copy?: boolean;
    print?: boolean;
    showHeader?: boolean;
  }
): Promise<void> {
  const cwd = process.cwd();
  const allowed = await ensureRepoAllowedForFree(cwd);
  if (!allowed) return;
  if (options.showHeader !== false) {
    console.log("");
    console.log(BOLD("RunTrim") + DIM("  prepare"));
    console.log("");
  }

  if (!configExists(cwd)) {
    console.log(chalk.yellow("  No config found. Run: runtrim init"));
    console.log("");
    return;
  }

  const config = loadConfig(cwd);
  const selectedAgent = (options.agent ?? config.defaultAgent ?? "claude").toLowerCase();
  const auditSpinner = oraFactory({ text: "Auditing task...", color: "yellow" }).start();
  await new Promise((r) => setTimeout(r, 250));
  const audit = auditTask(task, config, cwd);
  auditSpinner.stop();
  const contract = generateContract(task, audit, config);
  const run = saveRun(task, audit, contract, cwd);

  if (contract.isBlocked && contract.splitReport) {
    const splitPrompt = contract.splitReport.nextSafePrompt;
    updateRun(run.id, { status: "split_required" }, cwd);
    const promptPath = writeLatestPromptFile(splitPrompt, config, cwd);
    if (options.copy !== false) await copyToClipboardSafe(splitPrompt);

    console.log(chalk.red.bold("  SPLIT REQUIRED"));
    console.log("");
    console.log(DIM("  Task      ") + chalk.white(truncate(task, 70)));
    console.log(DIM("  Prompt    ") + chalk.white(promptPath));
    console.log(DIM("  Run saved ") + chalk.white(`.runtrim/runs/${run.id}.json`));
    console.log("");
    printPrepareAgentInstructions(selectedAgent, config.lastPromptPath);
    console.log("");
    if (options.print) {
      console.log(splitPrompt);
      console.log("");
    }
    if (options.open) {
      const opened = await openInEditor(options.editor, config, promptPath, cwd);
      if (!opened) {
        console.log(chalk.yellow("  Could not open editor command."));
        console.log("");
      }
    }
    return;
  }

  const promptPath = writeLatestPromptFile(contract.contractText, config, cwd);
  if (options.copy !== false) await copyToClipboardSafe(contract.contractText);
  updateRun(run.id, { status: "guarded" }, cwd);

  const riskColors: Record<string, ChalkInstance> = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.hex("#FF8C00"),
    critical: chalk.red,
  };
  const riskBefore = riskColors[audit.wasteRiskBefore] ?? chalk.white;
  const riskAfter = riskColors[contract.wasteRiskAfter] ?? chalk.green;
  const scoreDelta = contract.promptScoreAfter - audit.promptScoreBefore;
  const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

  console.log(DIM("  " + SECTION));
  console.log(DIM("  PREPARED GUARD"));
  console.log(DIM("  " + SECTION));
  console.log("");
  console.log(
    DIM("  Score     ") +
      chalk.white(formatScore(audit.promptScoreBefore)) +
      DIM("  ->  ") +
      chalk.white(formatScore(contract.promptScoreAfter)) +
      DIM("  (" + deltaStr + ")")
  );
  console.log(
    DIM("  Risk      ") +
      riskBefore(formatRisk(audit.wasteRiskBefore).toUpperCase()) +
      DIM("  ->  ") +
      riskAfter(formatRisk(contract.wasteRiskAfter).toUpperCase())
  );
  console.log(DIM("  Reduction ") + chalk.white(contract.riskReductionPercent + "%"));
  console.log(DIM("  Prompt    ") + chalk.white(promptPath));
  console.log(DIM("  Run saved ") + chalk.white(`.runtrim/runs/${run.id}.json`));
  console.log("");
  printPrepareAgentInstructions(selectedAgent, config.lastPromptPath);
  console.log("");

  if (options.print) {
    console.log(contract.contractText);
    console.log("");
  }

  if (options.open) {
    const opened = await openInEditor(options.editor, config, promptPath, cwd);
    if (!opened) {
      console.log(chalk.yellow("  Could not open editor command."));
      console.log("");
    }
  }
}

async function tryLaunchPanelMonitorDetached(cwd: string): Promise<boolean> {
  const entry = path.join(__dirname, "runtrim.cjs");
  if (!fs.existsSync(entry)) return false;
  try {
    const child = execa(process.execPath, [entry, "panel", "--monitor"], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref?.();
    return true;
  } catch {
    return false;
  }
}

program
  .name("runtrim")
  .description("CLI guard layer for AI coding runs")
  .version(packageJson.version);

let commandStartAt = Date.now();
program.hook("preAction", async () => {
  commandStartAt = Date.now();
});

program.hook("postAction", async (_thisCommand, actionCommand) => {
  const commandName = actionCommand.name();
  await trackCliCommandEvent({
    commandName,
    status: "ok",
    durationMs: Date.now() - commandStartAt,
    cwd: process.cwd(),
    cliVersion: program.version(),
  });
});

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ INIT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

program
  .command("start")
  .description("Guided RunTrim onboarding and daily loop")
  .option("--task <task>", "Prepare a guarded run immediately")
  .action(async (options: { task?: string }) => {
    const cwd = process.cwd();
    const interactive = isInteractiveTerminal();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  start"));
    console.log("");

    if (!configExists(cwd)) {
      console.log(chalk.yellow("  RunTrim is not initialized in this repo."));
      if (!interactive) {
        console.log(DIM("  Run: runtrim init"));
        console.log("");
        return;
      }

      const { initNow } = await prompts({
        type: "confirm",
        name: "initNow",
        message: "Initialize RunTrim here? Y/n",
        initial: true,
      });

      if (!initNow) {
        console.log(DIM("  Aborted."));
        console.log("");
        return;
      }

      const initResult = await initializeRunTrim(cwd, { allowOverwritePrompt: false });
      if (!initResult.ok) return;
      console.log(ACCENT.bold("  RunTrim is ready."));
      console.log("");
    }

    const memory = readMemory(cwd);
    const latestRun = loadLatestRun(cwd);
    const latestStatus = latestRun?.evaluation?.status ?? latestRun?.status ?? "baseline_initialized";
    const suggestedNext =
      options.task
        ? `runtrim prepare "${options.task}"`
        : latestRun?.evaluation?.nextSafeAction ||
          (latestRun ? "runtrim check" : 'runtrim prepare "describe your next AI coding task"');

    console.log(DIM("  Current state"));
    console.log(DIM("  Status     ") + chalk.white(formatStatus(latestStatus)));
    if (latestRun?.task) {
      console.log(DIM("  Last task  ") + chalk.white(truncate(latestRun.task, 80)));
    }
    if (memory) {
      const stateLine = parseMemorySection(memory, "Current state");
      if (stateLine) console.log(DIM("  Memory     ") + chalk.white(truncate(stateLine, 100)));
    }
    console.log(DIM("  Next       ") + chalk.white(suggestedNext));
    console.log("");

    console.log(DIM("  Next recommended actions"));
    console.log(chalk.white("  1. Prepare your first AI run"));
    console.log(chalk.white("  2. Open local panel with monitor"));
    console.log(chalk.white("  3. Show daily loop"));
    console.log("");

    if (options.task) {
      await runPrepareTask(options.task, { showHeader: false });
      return;
    }

    if (!interactive) return;

    const hasRuns = Boolean(latestRun);
    const { action } = await prompts({
      type: "select",
      name: "action",
      message: hasRuns ? "What do you want to do next?" : "What do you want to do next?",
      choices: hasRuns
        ? [
            { title: "Prepare a new run", value: "prepare" },
            { title: "Open local panel with monitor", value: "panel" },
            { title: "Check latest run", value: "check" },
            { title: "Continue after usage/context limit", value: "continue" },
            { title: "Show memory", value: "memory" },
            { title: "Sync dashboard", value: "sync" },
            { title: "Exit", value: "exit" },
          ]
        : [
            { title: "Prepare a new run", value: "prepare" },
            { title: "Open local panel with monitor", value: "panel" },
            { title: "Show memory", value: "memory" },
            { title: "Exit", value: "exit" },
          ],
      initial: 0,
    });

    if (!action || action === "exit") {
      console.log("");
      return;
    }

    if (action === "prepare") {
      const { task } = await prompts({
        type: "text",
        name: "task",
        message: "Describe the AI coding task:",
        validate: (value) => (value.trim().length > 0 ? true : "Task is required."),
      });
      if (!task) return;
      await runPrepareTask(task.trim(), { showHeader: false });
      return;
    }

    if (action === "panel") {
      await startLocalPanelServer({ monitor: true, cwd, open: true });
      return;
    }

    if (action === "check") {
      console.log(chalk.white("  runtrim check"));
      console.log("");
      return;
    }
    if (action === "continue") {
      console.log(chalk.white("  runtrim continue --reason usage_limit"));
      console.log("");
      return;
    }
    if (action === "memory") {
      console.log(chalk.white("  runtrim memory"));
      console.log("");
      return;
    }
    if (action === "sync") {
      console.log(chalk.white("  runtrim sync"));
      console.log("");
    }
  });

program
  .command("init")
  .description("Initialize RunTrim in the current project")
  .option("--refresh", "Refresh baseline audit/rules/memory without overwriting config")
  .action(async (options: { refresh?: boolean }) => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  init"));
    console.log("");

    const initResult = await initializeRunTrim(cwd, {
      refresh: options.refresh,
      allowOverwritePrompt: true,
    });
    if (!initResult.ok) return;

    const baseline = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
    const scriptNames = Object.keys(baseline.scripts);
    const starterCreated = fs.existsSync(path.join(getConfigDir(cwd), "latest-prompt.md"));

    console.log(ACCENT.bold("  RunTrim init"));
    console.log("");
    console.log(DIM("  Project detected"));
    console.log(DIM("  Name        ") + chalk.white(baseline.projectName));
    console.log(DIM("  Stack       ") + chalk.white(baseline.detectedStack.join(", ") || "unknown"));
    console.log(DIM("  Package     ") + chalk.white(baseline.packageManager));
    console.log("");
    console.log(DIM("  Scripts found"));
    console.log(DIM("  ") + chalk.white(scriptNames.length ? scriptNames.join(", ") : "none"));
    console.log("");
    console.log(DIM("  Risk surfaces"));
    for (const s of baseline.riskSurfaces.slice(0, 8)) {
      console.log(DIM("  - ") + chalk.white(s.type));
    }
    console.log("");
    console.log(DIM(options.refresh ? "  Files refreshed" : "  Files created"));
    console.log(DIM("  .runtrim/config.json"));
    console.log(DIM("  .runtrim/project-audit.json"));
    console.log(DIM("  .runtrim/rules.md"));
    console.log(DIM("  .runtrim/memory.md"));
    console.log(DIM("  .runtrim/runs/"));
    if (starterCreated) console.log(DIM("  .runtrim/latest-prompt.md"));
    console.log("");
    console.log(DIM("  Next"));
    console.log(chalk.white('  runtrim prepare "describe your next AI coding task"'));
    console.log("");
  });

// Agent config
const agentCommand = program.command("agent").description("Show or configure local agent execution settings");

agentCommand.action(() => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    console.log("");
    console.log(BOLD("RunTrim") + DIM("  agent"));
    console.log("");
    console.log(DIM("  " + SECTION));
    console.log(DIM("  AGENT CONFIG"));
    console.log(DIM("  " + SECTION));
    console.log("");
    console.log(DIM("  agentMode      ") + chalk.white(config.agentMode));
    console.log(DIM("  agentCommand   ") + chalk.white(config.agentCommand));
    console.log(DIM("  agentArgs      ") + chalk.white(JSON.stringify(config.agentArgs)));
    console.log(DIM("  agentPromptMode ") + chalk.white(config.agentPromptMode));
    console.log(DIM("  defaultAgent   ") + chalk.white(config.defaultAgent));
    console.log(DIM("  defaultModel   ") + chalk.white(config.defaultModel));
    console.log("");
  });

agentCommand
  .command("set <target> [commandText]")
  .description("Set agent profile: claude, codex, copy, custom")
  .action((target: string, commandText?: string) => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    const t = target.toLowerCase();
    if (t === "claude") {
      config.defaultAgent = "claude";
      config.agentMode = "command";
      config.agentCommand = "claude";
      config.agentArgs = [];
      config.agentPromptMode = "argument";
    } else if (t === "codex") {
      config.defaultAgent = "codex";
      config.agentMode = "command";
      config.agentCommand = "codex";
      config.agentArgs = [];
      config.agentPromptMode = "argument";
    } else if (t === "copy") {
      config.agentMode = "copy";
    } else if (t === "custom") {
      if (!commandText?.trim()) {
        console.log(chalk.yellow('  Missing command. Example: runtrim agent set custom "pnpm claude"'));
        console.log("");
        return;
      }
      const parsed = parseCommandString(commandText);
      if (!parsed.command) {
        console.log(chalk.yellow("  Invalid custom command."));
        console.log("");
        return;
      }
      config.defaultAgent = "custom";
      config.agentMode = "command";
      config.agentCommand = parsed.command;
      config.agentArgs = parsed.args;
      config.agentPromptMode = "argument";
    } else {
      console.log(chalk.yellow("  Unknown target. Use: claude | codex | copy | custom"));
      console.log("");
      return;
    }
    saveConfig(config, cwd);
    console.log("");
    console.log(ACCENT.bold("  Agent config updated."));
    console.log(DIM("  Mode:        ") + chalk.white(config.agentMode));
    console.log(DIM("  Command:     ") + chalk.white(config.agentCommand));
    console.log(DIM("  Args:        ") + chalk.white(JSON.stringify(config.agentArgs)));
    console.log(DIM("  Prompt mode: ") + chalk.white(config.agentPromptMode));
    console.log("");
  });

agentCommand
  .command("prompt-mode <mode>")
  .description("Set how guarded contract is passed to the local agent command")
  .action((mode: string) => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const m = mode.toLowerCase();
    if (m !== "argument" && m !== "stdin") {
      console.log(chalk.yellow("  Invalid mode. Use: argument | stdin"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    config.agentPromptMode = m;
    saveConfig(config, cwd);
    console.log("");
    console.log(ACCENT.bold("  Agent prompt mode updated to: " + m));
    console.log("");
  });

const authCommand = program.command("auth").description("Configure sync token for dashboard sync");

authCommand
  .command("set <token>")
  .description("Set sync token and enable sync")
  .action((token: string) => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    config.syncToken = token.trim();
    config.syncEnabled = true;
    saveConfig(config, cwd);
    console.log("");
    console.log(ACCENT.bold("  Sync token saved. Sync enabled."));
    console.log("");
  });

authCommand
  .command("status")
  .description("Show sync token status")
  .action(() => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    const configured = Boolean(config.syncToken);
    console.log("");
    console.log(BOLD("RunTrim") + DIM("  auth status"));
    console.log("");
    console.log(DIM("  Sync enabled   ") + chalk.white(config.syncEnabled ? "yes" : "no"));
    console.log(DIM("  Token set      ") + chalk.white(configured ? "yes" : "no"));
    console.log(DIM("  Dashboard URL  ") + chalk.white(config.dashboardUrl));
    console.log("");
  });

const configCommand = program.command("config").description("Configure RunTrim settings");

configCommand
  .command("set <key> <value>")
  .description("Set config values")
  .action((key: string, value: string) => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }
    const config = loadConfig(cwd);
    if (key === "dashboard-url") {
      config.dashboardUrl = value.trim();
      saveConfig(config, cwd);
      console.log("");
      console.log(ACCENT.bold("  Dashboard URL updated."));
      console.log(DIM("  Value: ") + chalk.white(config.dashboardUrl));
      console.log("");
      return;
    }
    console.log(chalk.yellow("  Unknown config key. Supported: dashboard-url"));
    console.log("");
  });

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ GUARD ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

const repoCommand = program.command("repo").description("Manage local tracked repo limit");

repoCommand
  .command("status")
  .description("Show local tracked repo status")
  .action(async () => {
    const cwd = process.cwd();
    const registry = loadGlobalRegistry();
    const identity = await getCurrentRepoIdentity(cwd);
    const check = await assertFreeRepoAllowed(cwd);
    const tracked = registry.trackedRepos[0] ?? null;

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  repo status"));
    console.log("");
    console.log(DIM("  Plan          ") + chalk.white(registry.plan));
    console.log(DIM("  Current repo  ") + chalk.white(identity.path));
    console.log(DIM("  Tracked repo  ") + chalk.white(tracked?.path ?? "(none)"));
    console.log(DIM("  Allowed       ") + chalk.white(check.allowed ? "yes" : "no"));
    console.log("");
    if (tracked) {
      console.log(DIM("  A tracked repo is one codebase with its own .runtrim workspace."));
      console.log("");
    }
  });

repoCommand
  .command("unlink")
  .description("Unlink tracked repo from local free-plan registry")
  .option("--force", "Force unlink tracked repo even when running from another path")
  .action(async (options: { force?: boolean }) => {
    const cwd = process.cwd();
    const result = await unlinkCurrentRepo(cwd, Boolean(options.force));

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  repo unlink"));
    console.log("");

    if (result.removed) {
      console.log(ACCENT.bold("  Tracked repo unlinked."));
      if (result.trackedRepo) {
        console.log(DIM("  Removed  ") + chalk.white(result.trackedRepo.path));
      }
      console.log("");
      return;
    }

    if (result.trackedRepo) {
      console.log(chalk.yellow("  Current repo is not the tracked repo."));
      console.log(DIM("  Tracked repo: ") + chalk.white(result.trackedRepo.path));
      console.log(DIM("  To unlink it from here, run: runtrim repo unlink --force"));
      console.log("");
      return;
    }

    console.log(DIM("  No tracked repo found."));
    console.log("");
  });

program
  .command("guard <task>")
  .description("Audit a task and generate a guarded run contract")
  .action(async (task: string) => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  guard"));
    console.log("");

    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }

    const config = loadConfig(cwd);

    const auditSpinner = oraFactory({ text: "Auditing task...", color: "yellow" }).start();
    await new Promise((r) => setTimeout(r, 250));
    const audit = auditTask(task, config, cwd);
    auditSpinner.stop();

    const contract = generateContract(task, audit, config);

    const riskColors: Record<string, ChalkInstance> = {
      low: chalk.green,
      medium: chalk.yellow,
      high: chalk.hex("#FF8C00"),
      critical: chalk.red,
    };

    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ BLOCKED MEGA-RUN PATH ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    if (contract.isBlocked && contract.splitReport) {
      const sr = contract.splitReport;

      console.log(DIM("  " + SECTION));
      console.log(chalk.red.bold("  SPLIT REQUIRED"));
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(DIM("  Task   ") + chalk.white(truncate(task, 55)));
      console.log(DIM("  Score  ") + chalk.red(formatScore(audit.promptScoreBefore)));
      console.log(DIM("  Risk   ") + chalk.red("CRITICAL  (mega-run blocked)"));
      console.log("");
      console.log(
        chalk.red("  This task crosses " + sr.detectedSystems.length + " high-risk systems.")
      );
      console.log(chalk.red("  Executing this in one AI run would cause token waste,"));
      console.log(chalk.red("  scope drift, and unsafe edits across forbidden areas."));
      console.log("");
      console.log(DIM("  Detected systems:"));
      for (const s of sr.detectedSystems) {
        console.log(chalk.red("  x  ") + chalk.white(s));
      }
      console.log("");
      console.log(DIM("  Why blocked:"));
      for (const r of sr.blockedReasons) {
        console.log(DIM("  -  ") + DIM(r));
      }
      console.log("");
      console.log(DIM("  " + SECTION));
      console.log(DIM("  RECOMMENDED SPLIT"));
      console.log(DIM("  " + SECTION));
      console.log("");
      for (const step of sr.recommendedSplit) {
        // Print step number in accent, rest in dim
        const match = step.match(/^(\d+\.\s+)(.+?)(\s+\(Reason:.+\))?$/);
        if (match) {
          process.stdout.write(ACCENT("  " + match[1]));
          process.stdout.write(chalk.white(match[2]));
          if (match[3]) process.stdout.write(DIM(match[3]));
          console.log("");
        } else {
          console.log(DIM("  " + step));
        }
      }
      console.log("");
      console.log(DIM("  Estimated waste avoided by splitting:"));
      console.log(ACCENT("  " + sr.estimatedWasteAvoided));
      console.log("");
      console.log(DIM("  " + SECTION));
      console.log(DIM("  NEXT SAFE PROMPT"));
      console.log(DIM("  " + SECTION));
      console.log("");
      const promptLines = sr.nextSafePrompt.match(/.{1,70}(\s|$)/g) ?? [sr.nextSafePrompt];
      console.log(DIM('  "' + promptLines[0].trimEnd()));
      for (const line of promptLines.slice(1)) {
        console.log(DIM("   " + line.trimEnd()));
      }
      console.log(DIM('   "'));
      console.log("");

      try {
        await clipboard.write(sr.nextSafePrompt);
        console.log(ACCENT.bold("  Next safe prompt copied. Use it as your first audit-only run."));
      } catch {
        // ignore
      }

      const run = saveRun(task, audit, contract, cwd);
      updateRun(run.id, { status: "blocked" }, cwd);
      console.log("");
      console.log(DIM("  Run saved: .runtrim/runs/" + run.id + ".json  (status: blocked)"));
      console.log("");
      console.log(DIM("  Next:  ") + chalk.white('runtrim guard "<one system at a time>"'));
      console.log("");
      return;
    }

    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ NORMAL GUARDED PATH ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const riskBefore = riskColors[audit.wasteRiskBefore] ?? chalk.white;
    const riskAfter = riskColors[contract.wasteRiskAfter] ?? chalk.green;
    const scoreDelta = contract.promptScoreAfter - audit.promptScoreBefore;
    const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

    console.log(DIM("  " + SECTION));
    console.log(DIM("  AUDIT REPORT"));
    console.log(DIM("  " + SECTION));
    console.log("");
    console.log(DIM("  Task      ") + chalk.white(truncate(task, 55)));

    if (contract.contract.cleanedObjective !== task) {
      console.log(DIM("  Cleaned   ") + chalk.white(truncate(contract.contract.cleanedObjective, 55)));
    }

    console.log("");
    console.log(
      DIM("  Score     ") +
        chalk.white(formatScore(audit.promptScoreBefore)) +
        DIM("  ->  ") +
        chalk.white(formatScore(contract.promptScoreAfter)) +
        DIM("  (" + deltaStr + ")")
    );
    console.log(
      DIM("  Risk      ") +
        riskBefore(formatRisk(audit.wasteRiskBefore).toUpperCase()) +
        DIM("  ->  ") +
        riskAfter(formatRisk(contract.wasteRiskAfter).toUpperCase())
    );
    console.log(DIM("  Reduction ") + chalk.white(contract.riskReductionPercent + "%"));
    console.log(
      DIM("  Tokens    ") + ACCENT("~" + contract.estimatedTokensTrimmed + " trimmed (estimated)")
    );
    console.log(
      DIM("  Savings   ") + ACCENT("~" + contract.estimatedDollarsTrimmed + " (estimated)")
    );

    if (audit.flags.length > 0) {
      console.log("");
      console.log(DIM("  Detected leaks:"));
      for (const flag of audit.flags) {
        const color =
          flag.severity === "critical"
            ? chalk.red
            : flag.severity === "warning"
            ? chalk.yellow
            : DIM;
        const prefix =
          flag.severity === "critical" ? "  x" : flag.severity === "warning" ? "  !" : "  -";
        console.log(color(`${prefix}  ${flag.code.padEnd(30)}`) + DIM(flag.label));
      }
    }

    if (audit.sensitiveAreasRelevant.length > 0) {
      console.log("");
      console.log(DIM("  Sensitive areas:"));
      console.log(
        chalk.yellow("  ~  ") +
          chalk.white(audit.sensitiveAreasRelevant.join(", ")) +
          DIM("   inspect allowed / approval required before editing")
      );
    }

    console.log("");
    console.log(DIM("  " + SECTION));
    console.log(DIM("  GUARDED CONTRACT"));
    console.log(DIM("  " + SECTION));
    console.log("");

    const contractLines = contract.contractText.split("\n");
    for (const line of contractLines) {
      if (line === "RUNTRIM GUARDED RUN CONTRACT") {
        console.log(chalk.white.bold("  " + line));
      } else if (/^[A-Z][A-Z\- ()]{4,}$/.test(line)) {
        console.log("");
        console.log(chalk.white.bold("  " + line));
      } else if (line.startsWith("- ")) {
        console.log(DIM("  " + line));
      } else if (line.match(/^\d+\./)) {
        console.log(DIM("  " + line));
      } else if (line === "") {
        // handled by section header spacing above
      } else {
        console.log(DIM("  " + line));
      }
    }

    console.log("");

    try {
      await clipboard.write(contract.contractText);
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(ACCENT.bold("  Guarded contract copied. Paste it into your AI coding agent."));
    } catch {
      console.log(DIM("  (Clipboard unavailable - copy the contract above manually)"));
    }

    const run = saveRun(task, audit, contract, cwd);
    console.log("");
    console.log(DIM("  Run saved: .runtrim/runs/" + run.id + ".json"));
    console.log("");
    console.log(DIM("  After your agent run:  ") + chalk.white("runtrim check"));
    console.log("");
  });

program
  .command("run <task>")
  .description("Guard then run configured local agent command")
  .action(async (task: string) => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  run"));
    console.log("");

    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }

    const config = loadConfig(cwd);
    const audit = auditTask(task, config, cwd);
    const contract = generateContract(task, audit, config);
    const run = saveRun(task, audit, contract, cwd);

    if (contract.isBlocked && contract.splitReport) {
      const sr = contract.splitReport;
      updateRun(run.id, { status: "split_required" }, cwd);
      console.log(chalk.red.bold("  SPLIT REQUIRED"));
      console.log("");
      console.log(DIM("  Next safe prompt:"));
      console.log(chalk.white('  "' + sr.nextSafePrompt + '"'));
      console.log("");
      await copyToClipboardSafe(sr.nextSafePrompt);
      console.log(chalk.red("  Agent execution skipped because RunTrim blocked this mega-run."));
      console.log("");
      return;
    }

    if (config.agentMode === "copy") {
      await copyToClipboardSafe(contract.contractText);
      updateRun(
        run.id,
        {
          status: "guarded",
          agentExecution: {
            mode: "copy",
            command: config.agentCommand,
            args: config.agentArgs,
            promptMode: config.agentPromptMode,
          },
        },
        cwd
      );
      const copySavings = estimateSavingsFromTokens(
        parseEstimatedNumber(String(contract.estimatedTokensTrimmed))
      );
      const riskColors: Record<string, ChalkInstance> = {
        low: chalk.green,
        medium: chalk.yellow,
        high: chalk.hex("#FF8C00"),
        critical: chalk.red,
      };
      const riskBefore = riskColors[audit.wasteRiskBefore] ?? chalk.white;
      const riskAfter = riskColors[contract.wasteRiskAfter] ?? chalk.green;
      const scoreDelta = contract.promptScoreAfter - audit.promptScoreBefore;
      const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

      console.log(DIM("  " + SECTION));
      console.log(DIM("  RUNTRIM RISK SUMMARY"));
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(
        DIM("  Prompt score  ") +
          chalk.white(formatScore(audit.promptScoreBefore)) +
          DIM("  ->  ") +
          chalk.white(formatScore(contract.promptScoreAfter)) +
          DIM("  (" + deltaStr + ")")
      );
      console.log(
        DIM("  Waste risk    ") +
          riskBefore(formatRisk(audit.wasteRiskBefore).toUpperCase()) +
          DIM("  ->  ") +
          riskAfter(formatRisk(contract.wasteRiskAfter).toUpperCase())
      );
      console.log(DIM("  Reduction     ") + chalk.white(contract.riskReductionPercent + "%"));
      console.log(
        DIM("  Est. tokens trimmed  ") +
          ACCENT("~" + parseEstimatedNumber(String(contract.estimatedTokensTrimmed)).toLocaleString("en-US") + " (estimated)")
      );
      console.log(
        DIM("  Est. savings         ") +
          ACCENT(
            "~$" +
              copySavings.standard.toFixed(2) +
              " standard / ~$" +
              copySavings.expensive.toFixed(2) +
              " expensive (estimated)"
          )
      );
      if (audit.flags.length > 0) {
        console.log("");
        console.log(DIM("  Detected leaks:"));
        for (const flag of audit.flags) {
          const color =
            flag.severity === "critical"
              ? chalk.red
              : flag.severity === "warning"
              ? chalk.yellow
              : DIM;
          const prefix =
            flag.severity === "critical" ? "  x" : flag.severity === "warning" ? "  !" : "  -";
          console.log(color(`${prefix}  ${flag.code.padEnd(30)}`) + DIM(flag.label));
        }
      }
      if (audit.sensitiveAreasRelevant.length > 0) {
        console.log("");
        console.log(DIM("  Sensitive areas:"));
        console.log(
          chalk.yellow("  ~  ") +
            chalk.white(audit.sensitiveAreasRelevant.join(", ")) +
            DIM("   inspect allowed / approval required before editing")
        );
      }
      console.log("");
      console.log(ACCENT.bold("  Agent mode is copy. Guarded contract copied. Paste it into your AI coding agent."));
      console.log(DIM("  After the agent finishes, run: npm run runtrim -- check"));
      console.log("");
      return;
    }

    console.log(DIM("  RunTrim guarded execution"));
    console.log(DIM("  Agent:       ") + chalk.white([config.agentCommand, ...config.agentArgs].join(" ")));
    console.log(DIM("  Mode:        ") + chalk.white("command"));
    console.log(DIM("  Prompt mode: ") + chalk.white(config.agentPromptMode));
    console.log("");

    const { confirmed } = await prompts({
      type: "confirm",
      name: "confirmed",
      message: "Run configured agent with this guarded contract? y/N",
      initial: false,
    });

    if (!confirmed) {
      await copyToClipboardSafe(contract.contractText);
      updateRun(
        run.id,
        {
          status: "guarded",
          agentExecution: {
            mode: "command",
            command: config.agentCommand,
            args: config.agentArgs,
            promptMode: config.agentPromptMode,
          },
        },
        cwd
      );
      console.log(DIM("  Execution cancelled. Guarded contract copied to clipboard."));
      console.log("");
      return;
    }

    const startedAt = new Date();
    const commandArgs =
      config.agentPromptMode === "argument"
        ? [...config.agentArgs, contract.contractText]
        : [...config.agentArgs];

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const child = execa(config.agentCommand, commandArgs, {
        cwd,
        stdin: config.agentPromptMode === "stdin" ? "pipe" : "inherit",
      });

      child.stdout?.on("data", (chunk) => {
        const text = String(chunk);
        stdout += text;
        process.stdout.write(text);
      });
      child.stderr?.on("data", (chunk) => {
        const text = String(chunk);
        stderr += text;
        process.stderr.write(text);
      });

      if (config.agentPromptMode === "stdin" && child.stdin) {
        child.stdin.write(contract.contractText);
        child.stdin.end();
      }

      const result = await child;
      exitCode = result.exitCode ?? 0;
    } catch (error: unknown) {
      const e = error as { stdout?: string; stderr?: string; exitCode?: number; code?: string };
      stdout += e.stdout ?? "";
      stderr += e.stderr ?? "";
      exitCode = typeof e.exitCode === "number" ? e.exitCode : 1;

      if ((e.code ?? "").toUpperCase() === "ENOENT") {
        await copyToClipboardSafe(contract.contractText);
        updateRun(
          run.id,
          {
            status: "guarded",
            agentExecution: {
              mode: "command",
              command: config.agentCommand,
              args: config.agentArgs,
              promptMode: config.agentPromptMode,
              startedAt: startedAt.toISOString(),
              endedAt: new Date().toISOString(),
              durationMs: Date.now() - startedAt.getTime(),
              exitCode,
              stdoutPreview: stdout.slice(0, OUTPUT_PREVIEW_MAX),
              stderrPreview: stderr.slice(0, OUTPUT_PREVIEW_MAX),
            },
          },
          cwd
        );
        console.log("");
        console.log(chalk.yellow("  Agent command not found. Falling back to copy mode guidance."));
        console.log(DIM("  Configure with: npm run runtrim -- agent set claude|codex|custom"));
        console.log(DIM("  Guarded contract copied. Paste it into your agent manually."));
        console.log("");
        return;
      }
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();
    const missingCommandText =
      /not recognized as an internal or external command|command not found|no such file or directory/i;
    const isMissingCommand = exitCode !== 0 && missingCommandText.test(stderr);
    if (isMissingCommand) {
      await copyToClipboardSafe(contract.contractText);
      updateRun(
        run.id,
        {
          status: "guarded",
          agentExecution: {
            mode: "command",
            command: config.agentCommand,
            args: config.agentArgs,
            promptMode: config.agentPromptMode,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            durationMs,
            exitCode,
            stdoutPreview: stdout.slice(0, OUTPUT_PREVIEW_MAX),
            stderrPreview: stderr.slice(0, OUTPUT_PREVIEW_MAX),
          },
        },
        cwd
      );
      console.log("");
      console.log(chalk.yellow("  Agent command not found. Falling back to copy mode guidance."));
      console.log(DIM("  Configure with: npm run runtrim -- agent set claude|codex|custom"));
      console.log(DIM("  Guarded contract copied. Paste it into your agent manually."));
      console.log("");
      return;
    }

    const outputPath = path.join(getRunsDir(cwd), `${run.id}.output.txt`);
    fs.writeFileSync(outputPath, `# stdout\n${stdout}\n\n# stderr\n${stderr}`, "utf-8");

    const changedFiles = await getGitDiff(cwd);
    const evaluationBase = evaluateAgentOutput(stdout || null, changedFiles, {
      task: run.task,
      relevantScope: run.contract.contract?.relevantScope ?? [],
      sensitiveScope: run.contract.contract?.sensitiveScope ?? [],
      forbiddenScope: run.contract.contract?.forbiddenScope ?? [],
      runStatus: run.status,
    });
    const evaluation: RunEvaluationRecord = {
      ...evaluationBase,
      nextPrompt: evaluationBase.nextGuardedPrompt,
      nextSafePrompt: evaluationBase.nextGuardedPrompt,
      nextSafeAction: evaluationBase.nextSafeAction,
      memorySummary: evaluationBase.memorySummary,
      evaluatedAt: evaluationBase.evaluatedAt,
    };

    updateRun(
      run.id,
      {
        status: "executed",
        agentExecution: {
          mode: "command",
          command: config.agentCommand,
          args: config.agentArgs,
          promptMode: config.agentPromptMode,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs,
          exitCode,
          stdoutPreview: stdout.slice(0, OUTPUT_PREVIEW_MAX),
          stderrPreview: stderr.slice(0, OUTPUT_PREVIEW_MAX),
          outputPath: `.runtrim/runs/${run.id}.output.txt`,
        },
        evaluation,
      },
      cwd
    );

    if (
      ["partial", "needs_verification", "no_changes_detected", "drift_detected", "blocked"].includes(
        evaluation.status
      )
    ) {
      await copyToClipboardSafe(evaluation.nextPrompt);
    }

    console.log("");
    console.log(DIM("  Agent exit code   ") + chalk.white(String(exitCode)));
    console.log(DIM("  Duration          ") + chalk.white(`${durationMs} ms`));
    console.log(DIM("  Changed files     ") + chalk.white(String(changedFiles.length)));
    for (const file of changedFiles) console.log(DIM("    " + file));
    console.log(DIM("  Contract score    ") + chalk.white(formatScore(evaluation.contractScore)));
    console.log(DIM("  Scope drift risk  ") + chalk.white(evaluation.scopeDriftRisk));
    console.log(DIM("  Missing proof items"));
    for (const item of evaluation.missingProofItems) console.log(DIM("    - " + item));
    console.log("");
    console.log(DIM("  Next safe prompt:"));
    for (const line of evaluation.nextPrompt.split("\n")) console.log(DIM("    " + line));
    console.log("");

    if (evaluation.status === "passed") {
      console.log(DIM("  Next recommended command: npm run runtrim -- check"));
    } else {
      console.log(DIM('  Next recommended command: npm run runtrim -- run "<next smaller task>"'));
    }
    console.log("");
  });

program
  .command("prepare <task>")
  .description("Prepare a guarded prompt without executing an agent")
  .option("--open", "Open .runtrim/latest-prompt.md in your editor")
  .option("--editor <editor>", "Editor command: code, cursor, or custom command")
  .option("--agent <agent>", "Instruction profile: claude, codex, cursor, chatgpt, custom")
  .option("--no-copy", "Do not copy prompt to clipboard")
  .option("--print", "Print the full prepared prompt")
  .action(
    async (
      task: string,
      options: {
        open?: boolean;
        editor?: string;
        agent?: string;
        copy?: boolean;
        print?: boolean;
      }
    ) => {
      await runPrepareTask(task, {
        open: options.open,
        editor: options.editor,
        agent: options.agent,
        copy: options.copy,
        print: options.print,
      });
    }
  );

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ CHECK ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

program
  .command("go <task>")
  .description("Daily shortcut: initialize if needed, prepare a guarded prompt, and show next steps")
  .option("--monitor", "Open local panel monitor in the background (best effort)")
  .action(async (task: string, options: { monitor?: boolean }) => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    if (!configExists(cwd)) {
      const initResult = await initializeRunTrim(cwd, { allowOverwritePrompt: false });
      if (!initResult.ok) return;
    }

    const originalLog = console.log;
    const originalError = console.error;
    console.log = () => undefined;
    console.error = () => undefined;
    try {
      await runPrepareTask(task, { showHeader: false, copy: true });
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    if (!configExists(cwd)) return;
    const config = loadConfig(cwd);
    const promptPath = resolvePromptPath(config, cwd);
    const promptValue = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, "utf-8") : "";
    const copied = promptValue ? await copyToClipboardSafe(promptValue) : false;

    if (options.monitor) {
      void tryLaunchPanelMonitorDetached(cwd);
    }

    console.log("");
    console.log(GO_ACCENT.bold("RunTrim go"));
    console.log("");
    console.log(GO_ACCENT.bold("Task"));
    console.log(chalk.white(task));
    console.log("");
    console.log(GO_ACCENT.bold("Guarded prompt"));
    console.log(copied ? chalk.white("Copied to clipboard.") : DIM("Clipboard unavailable. Prompt saved to .runtrim/latest-prompt.md"));
    console.log("");
    console.log(GO_ACCENT.bold("Next"));
    console.log(chalk.white("1. Paste into your preferred coding agent, like Claude, Codex, Cursor, ChatGPT, Kimi, or another agent."));
    console.log(chalk.white("2. Keep the local panel open:"));
    console.log(chalk.white("   runtrim panel --monitor"));
    console.log(chalk.white("3. After edits:"));
    console.log(chalk.white("   runtrim check"));
    console.log("");
    console.log(GO_ACCENT.bold("Why this helps"));
    console.log(DIM("RunTrim keeps each run scoped, remembered, and easier to continue."));
    console.log("");
    console.log(GO_ACCENT.bold("Need more control?"));
    console.log(chalk.white("Run `runtrim --help` to see all commands."));
    console.log("");
  });

program
  .command("check")
  .description("Check the latest run and evaluate agent output")
  .action(async () => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  check"));
    console.log("");

    const run = loadLatestRun(cwd);
    if (!run) {
      console.log(chalk.yellow("  No runs found. Run: runtrim guard \"your task\""));
      console.log("");
      return;
    }
    if (run.evaluation) {
      const { recheck } = await prompts({
        type: "confirm",
        name: "recheck",
        message: "Latest run already has an evaluation. Re-check now?",
        initial: false,
      });
      if (!recheck) {
        console.log(DIM("  Skipped. Existing evaluation retained."));
        console.log("");
        return;
      }
    }

    console.log(DIM("  Latest run:  ") + chalk.white(truncate(run.task, 55)));
    console.log(DIM("  Guarded at:  ") + chalk.white(formatDate(run.createdAt)));
    console.log("");

    if (run.status === "blocked" || run.status === "split_required") {
      const evaluationBase = evaluateAgentOutput(null, [], {
        task: run.task,
        relevantScope: run.contract.contract?.relevantScope ?? [],
        sensitiveScope: run.contract.contract?.sensitiveScope ?? [],
        forbiddenScope: run.contract.contract?.forbiddenScope ?? [],
        runStatus: run.status,
      });
      const evaluation: RunEvaluationRecord = {
        ...evaluationBase,
        nextPrompt: evaluationBase.nextGuardedPrompt,
        nextSafePrompt: evaluationBase.nextGuardedPrompt,
        nextSafeAction: evaluationBase.nextSafeAction,
        memorySummary: evaluationBase.memorySummary,
        evaluatedAt: evaluationBase.evaluatedAt,
      };

      updateRun(run.id, { evaluation, status: "checked" }, cwd);
      const latestAfterUpdate = loadLatestRun(cwd);
      if (latestAfterUpdate) {
        writeMemoryFromRuns(latestAfterUpdate, loadAllRuns(cwd), loadConfig(cwd), cwd);
      }

      await copyToClipboardSafe(evaluation.nextPrompt);
      console.log(chalk.yellow("  Latest run was blocked. Start with the recommended split audit task."));
      console.log("");
      console.log(DIM("  Next safe prompt:"));
      for (const line of evaluation.nextPrompt.split("\n")) console.log(DIM("    " + line));
      console.log("");
      console.log(ACCENT.bold("  Next prompt copied to clipboard."));
      console.log("");
      return;
    }

    const diffSpinner = oraFactory({ text: "Reading git diff...", color: "yellow" }).start();
    const changedFiles = await getGitDiff(cwd);
    diffSpinner.stop();

    if (changedFiles.length > 0) {
      console.log(DIM("  Changed files (" + changedFiles.length + "):"));
      for (const f of changedFiles) console.log(DIM("    " + f));
      console.log("");
    } else {
      console.log(DIM("  No git changes detected since last commit."));
      console.log("");
    }

    const { pasteOutput } = await prompts({
      type: "confirm",
      name: "pasteOutput",
      message: "Evaluate agent output? (paste output or skip)",
      initial: true,
    });

    let agentOutput: string | null = null;
    if (pasteOutput) {
      const { output } = await prompts({
        type: "text",
        name: "output",
        message: "Paste agent output:",
      });
      agentOutput = (output as string) ?? null;
    }

    const evaluationBase = evaluateAgentOutput(agentOutput, changedFiles, {
      task: run.task,
      relevantScope: run.contract.contract?.relevantScope ?? [],
      sensitiveScope: run.contract.contract?.sensitiveScope ?? [],
      forbiddenScope: run.contract.contract?.forbiddenScope ?? [],
      runStatus: run.status,
    });
    const evaluation: RunEvaluationRecord = {
      ...evaluationBase,
      nextPrompt: evaluationBase.nextGuardedPrompt,
      nextSafePrompt: evaluationBase.nextGuardedPrompt,
      nextSafeAction: evaluationBase.nextSafeAction,
      memorySummary: evaluationBase.memorySummary,
      evaluatedAt: evaluationBase.evaluatedAt,
    };

    updateRun(run.id, { evaluation, status: "checked" }, cwd);
    const latestAfterUpdate = loadLatestRun(cwd);
    if (latestAfterUpdate) {
      writeMemoryFromRuns(latestAfterUpdate, loadAllRuns(cwd), loadConfig(cwd), cwd);
    }

    const statusColors: Record<string, ChalkInstance> = {
      passed: chalk.green,
      partial: chalk.yellow,
      needs_verification: chalk.hex("#FF8C00"),
      no_changes_detected: chalk.hex("#FF8C00"),
      drift_detected: chalk.red,
      blocked: chalk.red,
    };
    const driftColors: Record<string, ChalkInstance> = {
      none: chalk.green,
      low: chalk.yellow,
      medium: chalk.hex("#FF8C00"),
      high: chalk.red,
    };

    const statusColor = statusColors[evaluation.status] ?? chalk.white;
    const driftColor = driftColors[evaluation.scopeDriftRisk] ?? chalk.white;

    console.log("");
    console.log(DIM("  " + SECTION));
    console.log(DIM("  EVALUATION"));
    console.log(DIM("  " + SECTION));
    console.log("");
    console.log(DIM("  Status         ") + statusColor(formatStatus(evaluation.status).toUpperCase()));
    console.log(DIM("  Contract score ") + chalk.white(formatScore(evaluation.contractScore)));
    console.log(DIM("  Scope drift    ") + driftColor(evaluation.scopeDriftRisk.toUpperCase()));
    console.log(DIM("  Next action    ") + chalk.white(evaluation.nextSafeAction));
    console.log("");

    if (evaluation.driftedFiles.length > 0) {
      console.log(chalk.red("  Drifted files:"));
      for (const f of evaluation.driftedFiles) console.log(chalk.red("    x " + f));
      console.log("");
    }

    if (evaluation.outOfScopeFiles.length > 0) {
      console.log(chalk.yellow("  Out-of-scope files:"));
      for (const f of evaluation.outOfScopeFiles) console.log(DIM("    - " + f));
      console.log("");
    }

    if (evaluation.missingProofItems.length > 0) {
      console.log(chalk.yellow("  Missing:"));
      for (const item of evaluation.missingProofItems) console.log(DIM("    - " + item));
      console.log("");
    }

    console.log(DIM("  " + SECTION));
    console.log(DIM("  NEXT GUARDED PROMPT"));
    console.log(DIM("  " + SECTION));
    console.log("");
    for (const line of evaluation.nextPrompt.split("\n")) {
      console.log(DIM("  " + line));
    }
    console.log("");

    try {
      await clipboard.write(evaluation.nextPrompt);
      console.log(ACCENT.bold("  Next prompt copied to clipboard."));
    } catch {
      // ignore
    }

    console.log("");
  });
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ REPORT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

program
  .command("sync")
  .description("Sync local RunTrim metadata to dashboard")
  .action(async () => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;
    const cfg = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }

    const config = loadConfig(cwd);
    if (!config.syncToken) {
      console.log(chalk.yellow("  Sync token missing. Run: runtrim auth set <token>"));
      console.log("");
      return;
    }

    const runs = loadAllRuns(cwd);
    const latestRun = runs[0] ?? null;
    const audit = loadProjectAudit(cwd);
    const inferredProjectName = audit?.projectName || path.basename(cwd);
    let memory = readMemory(cwd);
    if (!memory) {
      if (latestRun) {
        memory = writeMemoryFromRuns(latestRun, runs, config, cwd);
      } else if (audit) {
        memory = buildBaselineMemoryMarkdown(audit);
        fs.writeFileSync(path.join(getConfigDir(cwd), "memory.md"), memory, "utf-8");
      } else {
        memory = "RunTrim Project Memory\n\nCurrent state:\nNo local runs yet.\n";
      }
    }

    const payload = buildSyncPayload({
      cwd,
      projectName: inferredProjectName,
      config,
      projectAudit: audit,
      memoryMarkdown: memory,
      runs,
    });

    const endpoint = resolveSyncEndpoint(config.dashboardUrl);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-runtrim-sync-token": config.syncToken,
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        syncedRuns?: number;
        missing?: string[];
      };
      if (!response.ok) {
        console.log(chalk.red("  Sync failed: " + (body.error || `HTTP ${response.status}`)));
        console.log(DIM("  Endpoint: ") + chalk.white(endpoint));
        if (Array.isArray(body.missing) && body.missing.length > 0) {
          console.log(DIM("  Missing:  ") + chalk.white(body.missing.join(", ")));
        }
        console.log("");
        return;
      }
      const syncedRuns = body.syncedRuns ?? payload.runs.length;
      console.log(ACCENT.bold(`  Synced project memory and ${syncedRuns} runs.`));
      console.log(DIM("  Open dashboard: ") + chalk.white(config.dashboardUrl));
      console.log("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      console.log(chalk.red("  Sync failed: " + message));
      console.log(DIM("  Endpoint: ") + chalk.white(endpoint));
      console.log(
        DIM("  If your dashboard backend is offline, start it first and ensure env vars are set.")
      );
      console.log("");
    }
  });

program
  .command("audit")
  .description("Run baseline project audit and refresh local baseline files")
  .action(() => {
    const cwd = process.cwd();
    if (!configExists(cwd)) {
      console.log(chalk.yellow("  No config found. Run: runtrim init"));
      console.log("");
      return;
    }

    const config = loadConfig(cwd);
    const previous = loadProjectAudit(cwd);
    const baseline = performBaselineProjectAudit(cwd, previous);
    writeProjectAudit(baseline, cwd);
    writeRules(baseline, cwd);

    const nextConfig = { ...config };
    nextConfig.stack = baseline.detectedStack.join(",");
    nextConfig.packageManager = baseline.packageManager;
    nextConfig.baselineInitialized = true;
    nextConfig.lastAuditAt = baseline.updatedAt;
    saveConfig(nextConfig, cwd);

    const runs = loadAllRuns(cwd);
    if (runs.length > 0) {
      const latest = loadLatestRun(cwd);
      if (latest) writeMemoryFromRuns(latest, runs, nextConfig, cwd);
    } else {
      fs.writeFileSync(path.join(getConfigDir(cwd), "memory.md"), buildBaselineMemoryMarkdown(baseline), "utf-8");
    }

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  audit"));
    console.log("");
    console.log(DIM("  Project   ") + chalk.white(baseline.projectName));
    console.log(DIM("  Stack     ") + chalk.white(baseline.detectedStack.join(", ") || "unknown"));
    console.log(DIM("  Package   ") + chalk.white(baseline.packageManager));
    console.log(DIM("  Surfaces  ") + chalk.white(String(baseline.riskSurfaces.length)));
    console.log("");
    console.log(DIM("  Updated"));
    console.log(DIM("  " + getProjectAuditPath(cwd)));
    console.log(DIM("  .runtrim/rules.md"));
    console.log(DIM("  .runtrim/memory.md"));
    console.log("");
  });

program
  .command("watch")
  .description("Watch local git diff against the latest guarded run scope")
  .option("--interval <ms>", "Polling interval in milliseconds", "2000")
  .option("--strict", "Treat sensitive scope changes as high severity")
  .option("--once", "Run one check and exit")
  .option("--summary", "Print compact summary only")
  .option("--no-clear", "Do not clear screen between updates")
  .action(async (options: { interval?: string; strict?: boolean; once?: boolean; summary?: boolean; clear?: boolean }) => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;
    const config = loadConfig(cwd);
    const latestRun = loadLatestRun(cwd);

    console.log("");

    if (!latestRun) {
      console.log(chalk.yellow('  No guarded run found. Start with: runtrim prepare "your task"'));
      console.log("");
      return;
    }

    if (latestRun.status === "blocked" || latestRun.status === "split_required" || latestRun.contract.isBlocked) {
      console.log(chalk.yellow("  Latest run was blocked. Use runtrim memory --prompt first."));
      console.log("");
      return;
    }

    const relevantScope = latestRun.contract.contract?.relevantScope ?? [];
    const inferredMax =
      parseInt((relevantScope.join(" ").match(/maximum\s+(\d+)\s+files/i)?.[1] ?? ""), 10) || config.maxFilesPerRun || 5;
    const intervalMs = Math.max(500, Number.parseInt(options.interval ?? "2000", 10) || 2000);

    let lastSignature = "";
    let warningCount = 0;

    const evaluateAndPersist = async (): Promise<ReturnType<typeof evaluateWatchState>> => {
      const changedFiles = dedupeFiles(await getGitDiff(cwd));
      const result = evaluateWatchState({
        changedFiles,
        run: latestRun,
        maxFilesPerRun: inferredMax,
        strict: Boolean(options.strict),
      });

      const event: WatchEventRecord = {
        type: result.eventType,
        files:
          result.eventType === "file_limit_exceeded"
            ? result.changedFiles
            : result.eventType === "sensitive_changed"
            ? result.sensitiveFiles
            : result.eventType === "forbidden_changed"
            ? result.forbiddenFiles
            : result.changedFiles,
        createdAt: new Date().toISOString(),
        severity: result.severity,
      };

      const existing = loadLatestRun(cwd);
      if (existing?.id === latestRun.id) {
        const events = [...(existing.watchEvents ?? []), event].slice(-60);
        const warnings = dedupeFiles([...(existing.watchWarnings ?? []), ...result.warnings]);
        updateRun(
          latestRun.id,
          {
            watchEvents: events,
            watchStatus: result.status,
            watchWarnings: warnings,
            watchChangedFiles: result.changedFiles,
          },
          cwd
        );
      }

      warningCount += result.warnings.length;
      return result;
    };

    const render = (result: ReturnType<typeof evaluateWatchState>): void => {
      const signature = JSON.stringify({
        status: result.status,
        files: result.changedFiles,
        warnings: result.warnings,
      });
      if (signature === lastSignature) return;
      lastSignature = signature;

      if (options.clear !== false && !options.once) console.clear();
      printWatchSnapshot({
        task: latestRun.task,
        maxFiles: inferredMax,
        summaryOnly: Boolean(options.summary),
        result,
      });
    };

    if (options.once) {
      const result = await evaluateAndPersist();
      render(result);
      return;
    }

    const first = await evaluateAndPersist();
    render(first);

    const timer = setInterval(async () => {
      const result = await evaluateAndPersist();
      render(result);
    }, intervalMs);

    process.on("SIGINT", async () => {
      clearInterval(timer);
      const finalResult = await evaluateAndPersist();
      console.log(DIM("  " + SECTION));
      console.log(DIM("  WATCH SUMMARY"));
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(DIM("  Changed files        ") + chalk.white(String(finalResult.changedFiles.length)));
      console.log(DIM("  Warnings             ") + chalk.white(String(warningCount)));
      console.log(DIM("  Suggested next       ") + chalk.white("runtrim check"));
      console.log("");
      process.exit(0);
    });

    await new Promise(() => {
      // keep process alive
    });
  });

program
  .command("panel")
  .description("Open local RunTrim browser panel")
  .option("--monitor", "Enable live monitor mode")
  .option("--port <number>", "Preferred localhost port", (v) => Number.parseInt(v, 10))
  .option("--no-open", "Do not open browser automatically")
  .action(async (options: { monitor?: boolean; port?: number; open?: boolean }) => {
    const cwd = process.cwd();
    await startLocalPanelServer({
      monitor: Boolean(options.monitor),
      port: Number.isFinite(options.port) ? options.port : undefined,
      open: options.open !== false,
      cwd,
    });
  });

program
  .command("memory")
  .description("Show project memory and latest next safe prompt")
  .option("--prompt", "Print only latest next safe prompt")
  .action(async (options: { prompt?: boolean }) => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  memory"));
    console.log("");

    const latestRun = loadLatestRun(cwd);
    if (!latestRun) {
      const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
      const audit = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
      const memoryPath = path.join(getConfigDir(cwd), "memory.md");
      let memory = readMemory(cwd);
      if (!memory) {
        memory = buildBaselineMemoryMarkdown(audit);
        fs.writeFileSync(memoryPath, memory, "utf-8");
      }
      const baselinePrompt = 'runtrim prepare "describe your next AI coding task"';
      if (options.prompt) {
        console.log(baselinePrompt);
        await copyToClipboardSafe(baselinePrompt);
        console.log("");
        console.log(ACCENT.bold("  Latest next safe prompt copied."));
        console.log("");
        return;
      }
      console.log(memory);
      await copyToClipboardSafe(baselinePrompt);
      console.log(ACCENT.bold("  Project memory loaded. Latest next safe prompt copied."));
      console.log("");
      if (config.baselineInitialized !== true) {
        config.baselineInitialized = true;
        config.lastAuditAt = audit.updatedAt;
        saveConfig(config, cwd);
      }
      return;
    }
    const memory = writeMemoryFromRuns(latestRun, loadAllRuns(cwd), loadConfig(cwd), cwd);
    const latestPrompt =
      latestRun?.evaluation?.nextPrompt ??
      latestRun?.evaluation?.nextSafePrompt ??
      latestRun?.evaluation?.nextGuardedPrompt ??
      "";

    if (options.prompt) {
      if (!latestPrompt) {
        console.log(DIM("  No next safe prompt available yet."));
        console.log("");
        return;
      }
      console.log(latestPrompt);
      await copyToClipboardSafe(latestPrompt);
      console.log("");
      console.log(ACCENT.bold("  Latest next safe prompt copied."));
      console.log("");
      return;
    }

    console.log(memory);
    if (latestPrompt) {
      await copyToClipboardSafe(latestPrompt);
      console.log(ACCENT.bold("  Project memory loaded. Latest next safe prompt copied."));
    } else {
      console.log(DIM("  Project memory loaded."));
    }
    console.log("");
  });

program
  .command("continue")
  .description("Create a safe continuation prompt from latest RunTrim state")
  .option("--reason <reason>", "Continuation reason")
  .option("--agent <agent>", "Target agent hint")
  .option("--print", "Print the full continuation prompt")
  .option("--open", "Open continuation prompt in editor")
  .option("--editor <editor>", "Editor command (code, cursor, or custom)")
  .action(async (options: { reason?: string; agent?: string; print?: boolean; open?: boolean; editor?: string }) => {
    const cwd = process.cwd();
    const hasConfig = configExists(cwd);
    const config = hasConfig ? loadConfig(cwd) : DEFAULT_CONFIG;
    const latestRun = loadLatestRun(cwd);
    const allRuns = loadAllRuns(cwd);
    const audit = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
    const reason = normalizeContinuationReason(options.reason);
    const agent = normalizeContinuationAgent(options.agent, config.defaultAgent);
    const nowIso = new Date().toISOString();
    const continuationPath = resolveContinuationPath(cwd);
    const latestPromptPath = resolvePromptPath(config, cwd);
    const latestPrompt = fs.existsSync(latestPromptPath)
      ? fs.readFileSync(latestPromptPath, "utf-8").trim()
      : "";

    let memory = readMemory(cwd);
    if (!memory) {
      if (latestRun) memory = writeMemoryFromRuns(latestRun, allRuns, config, cwd);
      else memory = buildBaselineMemoryMarkdown(audit);
    }

    const projectName = audit.projectName || path.basename(cwd);
    const stackLine = audit.detectedStack.length > 0 ? audit.detectedStack.join(", ") : "unknown";
    const diffFiles = dedupeFiles(await getGitDiff(cwd));
    const changedFiles = latestRun?.evaluation?.changedFiles?.length
      ? dedupeFiles(latestRun.evaluation.changedFiles)
      : diffFiles;
    const missing = latestRun?.evaluation?.missingProofItems ?? [];
    const watchWarnings = latestRun?.watchWarnings ?? [];
    const protectedAreas =
      audit.protectedAreas?.length > 0
        ? audit.protectedAreas
        : [
            "auth",
            "middleware",
            "database schema",
            "env/secrets",
            "billing/payments/webhooks",
          ];

    let stateLine = "Baseline initialized. No guarded runs yet.";
    let nextObjective = 'Run runtrim prepare "describe your next AI coding task".';
    let rulesLine = "Continue from baseline and define a scoped first task.";
    let stillMissing = missing.length > 0 ? missing : ["No open proof items recorded."];
    let hasUnverifiedChanges = false;
    let hasContainmentWarning = false;

    if (latestRun) {
      const status = (latestRun.evaluation?.status ?? latestRun.status).toLowerCase();
      hasUnverifiedChanges = status === "guarded" && changedFiles.length > 0;
      hasContainmentWarning =
        watchWarnings.some((w) =>
          /(forbidden|drift|file limit exceeded|critical)/i.test(w)
        ) || false;

      if (status === "guarded" && hasUnverifiedChanges) {
        if (watchWarnings.length > 0 && hasContainmentWarning) {
          stateLine =
            "Guarded run has unverified changes and watch warnings. Do not continue implementation yet.";
          nextObjective =
            "Stop implementation and run a post-run verification. Confirm whether the changed files match the original RunTrim contract before continuing.";
          rulesLine =
            "Containment first. Do not continue implementation until runtrim check is complete.";
        } else {
          stateLine =
            "Guarded run has unverified changes. Run check before continuing.";
          nextObjective =
            "Stop implementation and run a post-run verification. Confirm whether the changed files match the original RunTrim contract before continuing.";
          rulesLine = "Verification first. Complete post-run check before any new edits.";
        }
        stillMissing = [
          "Post-run check has not been completed",
          "Root cause has not been verified",
          "Changed files have not been approved against the contract",
          "Verification steps are missing",
        ];
      } else
      if (status === "blocked" || status === "split_required" || latestRun.contract.isBlocked) {
        stateLine = "Split required. Continue with one isolated audit task only.";
        nextObjective = "Run one split audit task first. Do not implement changes yet.";
        rulesLine = "Do not begin implementation. Keep scope isolated to one protected system.";
      } else if (status === "partial" || status === "needs_verification" || status === "no_changes_detected") {
        stateLine = "Partial verification. Confirm missing proof from the current diff only.";
        nextObjective = latestRun.evaluation?.nextSafeAction || "Verify the current diff before starting new scope.";
        rulesLine = "Verification first. No new scope until missing proof is complete.";
      } else if (status === "drift_detected") {
        stateLine = "Scope drift detected. Containment is required before any new implementation.";
        nextObjective = "Inspect out-of-scope files and contain drift before continuing.";
        rulesLine = "Stop new edits. Identify out-of-scope files and recommend revert or approval.";
      } else if (status === "passed") {
        stateLine = "Previous run appears complete.";
        nextObjective = "Mark this task done or define a new scoped task.";
        rulesLine = "Do not reopen completed work unless evidence shows a gap.";
        stillMissing = ["No open proof items recorded."];
      } else {
        stateLine = latestRun.evaluation?.memorySummary || "Guarded run available.";
        nextObjective = latestRun.evaluation?.nextSafeAction || "Run runtrim check before continuing.";
        if (status === "guarded" && changedFiles.length === 0 && missing.length === 0) {
          stillMissing = ["Post-run check has not been completed yet."];
        }
      }
    }

    const previousTask = latestRun?.task || extractMemorySection(memory, "Previous task").join(" ") || "No previous guarded task recorded.";
    const latestStatus = latestRun
      ? formatStatus(latestRun.evaluation?.status ?? latestRun.status)
      : "baseline_initialized";

    const memoryCurrentState =
      extractMemorySection(memory, "Current state").join(" ") ||
      extractMemoryValue(memory, "Current state");
    const memoryNextAction =
      extractMemorySection(memory, "Next safe action").join(" ") ||
      extractMemoryValue(memory, "Next safe action");
    const memorySummaryLine = memoryCurrentState || stateLine;
    const openNextAction = memoryNextAction || nextObjective;

    const whatHappened: string[] = [];
    whatHappened.push(latestRun?.evaluation?.memorySummary || memorySummaryLine);
    if (watchWarnings.length > 0) {
      whatHappened.push(`Watch warnings: ${watchWarnings.join("; ")}`);
    }
    if (changedFiles.length > 0) {
      whatHappened.push(`Changed files detected: ${changedFiles.length}`);
    } else {
      whatHappened.push("No changed files detected.");
    }

    const splitSystems = latestRun?.contract.splitReport?.detectedSystems ?? [];
    const recommendedSplit = splitSystems.length
      ? splitSystems.map((s, i) => `${i + 1}. Audit ${s} only. No edits.`)
      : [
          "1. Audit auth flow only. No edits.",
          "2. Audit middleware behavior only. No edits.",
          "3. Audit database/schema impact only. No edits.",
          "4. Audit billing or subscription flow only. No edits.",
        ];

    const promptLines: string[] = [
      "RUNTRIM CONTINUATION PROMPT",
      "",
      "Reason:",
      continuationReasonLine(reason),
      "",
      "Project:",
      projectName,
      "Stack:",
      stackLine,
      "",
      "Previous task:",
      previousTask,
      "",
      "Current state:",
      `${latestStatus}. ${stateLine}`,
      "",
      "What already happened:",
      ...whatHappened.map((line) => `- ${line}`),
      "",
      "Changed files:",
      ...(changedFiles.length > 10
        ? [
            `${changedFiles.length} files changed. Showing first 10:`,
            ...changedFiles.slice(0, 10).map((f) => `- ${f}`),
            "Run `runtrim check` for full verification.",
          ]
        : changedFiles.length > 0
        ? changedFiles.map((f) => `- ${f}`)
        : ["- No changed files recorded."]),
      "",
      "Still missing:",
      ...stillMissing.map((m) => `- ${m}`),
      ...(hasUnverifiedChanges ? [] : [`- ${openNextAction}`]),
      "",
      "Protected areas:",
      ...protectedAreas.map((p) => `- ${p}`),
      "",
      "Continuation rules:",
      "- Continue from the current diff only.",
      "- Do not restart the entire task.",
      "- Do not reread unrelated files.",
      "- Do not modify new files unless verification proves it is required.",
      "- Identify root cause before editing.",
      "- Return files changed and verification steps.",
      "- Stop if scope expands.",
      "",
      "Next objective:",
      nextObjective,
      "",
    ];

    if ((latestRun?.evaluation?.status ?? latestRun?.status) === "drift_detected") {
      promptLines.push("Containment mode:");
      promptLines.push("- Stop all new edits.");
      promptLines.push("- Identify files outside allowed scope.");
      promptLines.push("- Recommend revert, approval, or split before continuing.");
      promptLines.push("");
    }

    if ((latestRun?.evaluation?.status ?? latestRun?.status) === "blocked" || (latestRun?.evaluation?.status ?? latestRun?.status) === "split_required") {
      promptLines.push("Recommended split:");
      promptLines.push(...recommendedSplit);
      promptLines.push("");
    }

    const extraReasonInstruction = continuationExtraReasonInstruction(
      reason,
      hasUnverifiedChanges
    );
    const selectedReasonInstruction =
      extraReasonInstruction || continuationReasonInstruction(reason);

    promptLines.push(
      "Required output:",
      "- CURRENT UNDERSTANDING",
      "- FILES TO INSPECT",
      "- ROOT CAUSE OR OPEN QUESTION",
      "- PROPOSED NEXT STEP",
      "- FILES CHANGED",
      "- HOW TO VERIFY",
      "- REMAINING RISK",
      "- NEXT SAFE ACTION",
      "",
      "Agent note:",
      continuationAgentLine(agent),
      "",
      selectedReasonInstruction,
      ""
    );

    if (latestPrompt) {
      promptLines.push("Previous prepared prompt reference:");
      promptLines.push("- Use existing scoped contract as context if still relevant.");
      promptLines.push("");
    }

    const continuationPrompt = promptLines.join("\n");
    const continuationDir = path.dirname(continuationPath);
    if (!fs.existsSync(continuationDir)) fs.mkdirSync(continuationDir, { recursive: true });
    fs.writeFileSync(continuationPath, continuationPrompt, "utf-8");

    const copied = await copyToClipboardSafe(continuationPrompt);

    if (memory) {
      const memoryWithContinuation = updateMemoryWithContinuation(memory, reason, continuationPath, nowIso);
      fs.writeFileSync(path.join(getConfigDir(cwd), "memory.md"), memoryWithContinuation, "utf-8");
    }

    if (hasConfig) {
      const nextConfig = {
        ...config,
        lastContinuationReason: reason,
        continuationPromptPath: continuationPath.replace(/\\/g, "/"),
        continuationCreatedAt: nowIso,
      };
      saveConfig(nextConfig, cwd);
    }

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  continue"));
    console.log("");
    console.log(DIM("  Reason             ") + chalk.white(reason));
    console.log(DIM("  Latest status      ") + chalk.white(latestStatus));
    console.log(DIM("  Changed files      ") + chalk.white(String(changedFiles.length)));
    console.log(DIM("  Prompt path        ") + chalk.white(continuationPath.replace(/\\/g, "/")));
    console.log(DIM("  Clipboard          ") + chalk.white(copied ? "updated" : "unavailable"));
    console.log("");

    if (options.print) {
      console.log(continuationPrompt);
      console.log("");
    }

    if (options.open) {
      const opened = await openInEditor(options.editor, config, continuationPath, cwd);
      if (!opened) {
        console.log(chalk.yellow("  Could not open editor automatically."));
        console.log(DIM("  Open file manually: ") + chalk.white(continuationPath.replace(/\\/g, "/")));
        console.log("");
      } else {
        console.log(ACCENT.bold("  Continuation prompt opened in editor."));
        console.log("");
      }
    }
  });

program
  .command("report")
  .description("Show a summary of all local RunTrim runs")
  .action(async () => {
    const cwd = process.cwd();
    const cfg = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  report"));
    console.log("");

    const runs = loadAllRuns(cwd);

    if (runs.length === 0) {
      const audit = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
      console.log(DIM("  " + SECTION));
      console.log(DIM("  WHERE YOU LEFT OFF"));
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(DIM("  Status      ") + chalk.white("Baseline initialized"));
      console.log(DIM("  Next        ") + chalk.white('runtrim prepare "describe your next AI coding task"'));
      if (cfg.lastContinuationReason) {
        console.log(DIM("  Continue    ") + chalk.white(cfg.lastContinuationReason));
      }
      if (cfg.continuationPromptPath) {
        console.log(DIM("  Prompt path ") + chalk.white(cfg.continuationPromptPath));
      }
      console.log("");
      console.log(DIM("  " + SECTION));
      console.log(DIM("  PROJECT BASELINE"));
      console.log(DIM("  " + SECTION));
      console.log("");
      console.log(DIM("  Project     ") + chalk.white(audit.projectName));
      console.log(DIM("  Stack       ") + chalk.white(audit.detectedStack.join(", ") || "unknown"));
      console.log(DIM("  Package mgr ") + chalk.white(audit.packageManager));
      console.log(DIM("  Scripts     ") + chalk.white(Object.keys(audit.scripts).join(", ") || "none"));
      console.log(DIM("  Surfaces    ") + chalk.white(audit.riskSurfaces.map((s) => s.type).join(", ")));
      console.log(DIM("  Protected   ") + chalk.white(audit.protectedAreas.join(", ")));
      console.log("");
      console.log(chalk.yellow("  No guarded runs yet."));
      console.log("");
      return;
    }

    const totalTokens = runs.reduce(
      (sum, r) => sum + parseEstimatedNumber(r.contract.estimatedTokensTrimmed),
      0
    );
    const savingsEstimate = estimateSavingsFromTokens(totalTokens);

    const avgRiskReduction = Math.round(
      runs.reduce((sum, r) => sum + (r.contract.riskReductionPercent ?? 0), 0) / runs.length
    );
    const evaluatedRuns = runs.filter((r) => Boolean(r.evaluation));
    const avgContractScore =
      evaluatedRuns.length > 0
        ? Math.round(
            evaluatedRuns.reduce((sum, r) => sum + (r.evaluation?.contractScore ?? 0), 0) /
              evaluatedRuns.length
          )
        : null;
    const executedRuns = runs.filter(
      (r) =>
        r.agentExecution?.mode === "command" &&
        typeof r.agentExecution.exitCode === "number" &&
        typeof r.agentExecution.durationMs === "number"
    ).length;
    const blockedRuns = runs.filter((r) => r.status === "blocked" || r.status === "split_required").length;

    const driftWarnings = runs.filter(
      (r) =>
        r.evaluation?.scopeDriftRisk === "high" || r.evaluation?.scopeDriftRisk === "medium"
    ).length;

    const latestRun = runs[0];
    const latestEval = latestRun.evaluation;

    console.log(DIM("  " + SECTION));
    console.log(DIM("  WHERE YOU LEFT OFF"));
    console.log(DIM("  " + SECTION));
    console.log("");
    const audit = loadProjectAudit(cwd);
    console.log(DIM("  Project     ") + chalk.white(audit?.projectName ?? path.basename(cwd)));
    console.log(DIM("  Focus       ") + chalk.white(truncate(latestRun.contract.contract?.cleanedObjective ?? latestRun.task, 58)));
    console.log(DIM("  Status      ") + chalk.white(formatStatus(latestEval?.status ?? latestRun.status)));
    console.log(DIM("  Changed     ") + chalk.white(`${latestEval?.changedFiles?.length ?? 0} file${(latestEval?.changedFiles?.length ?? 0) === 1 ? "" : "s"}`));
    console.log(DIM("  Missing     ") + chalk.white((latestEval?.missingProofItems?.length ?? 0) > 0 ? latestEval?.missingProofItems?.join(", ") : "none"));
    if ((latestRun.watchWarnings?.length ?? 0) > 0) {
      console.log(DIM("  Watch       ") + chalk.white(`${latestRun.watchWarnings?.length} warning${latestRun.watchWarnings?.length === 1 ? "" : "s"}`));
    }
    console.log(DIM("  Next        ") + chalk.white(latestEval?.nextSafeAction ?? "Run runtrim check to evaluate latest run."));
    if (latestEval?.nextPrompt) {
      console.log(DIM("  Prompt      ") + chalk.white(truncate(latestEval.nextPrompt.replace(/\s+/g, " "), 92)));
    }
    if (cfg.lastContinuationReason) {
      console.log(DIM("  Continue    ") + chalk.white(cfg.lastContinuationReason));
    }
    if (cfg.continuationPromptPath) {
      console.log(DIM("  Prompt path ") + chalk.white(cfg.continuationPromptPath));
    }
    console.log("");

    console.log(DIM("  " + SECTION));
    console.log(DIM("  PROJECT REPORT"));
    console.log(DIM("  " + SECTION));
    console.log("");
    console.log(DIM("  Runs guarded           ") + chalk.white(String(runs.length)));
    console.log(DIM("  Runs executed          ") + chalk.white(String(executedRuns)));
    console.log(DIM("  Runs blocked           ") + chalk.white(String(blockedRuns)));
    console.log(
      DIM("  Est. tokens trimmed    ") + ACCENT("~" + totalTokens.toLocaleString("en-US") + " (estimated)")
    );
    console.log(
      DIM("  Est. savings           ") +
        ACCENT(
          "~$" +
            savingsEstimate.standard.toFixed(2) +
            " standard / ~$" +
            savingsEstimate.expensive.toFixed(2) +
            " expensive (estimated)"
        )
    );
    console.log(DIM("  Avg. risk reduction    ") + chalk.white(avgRiskReduction + "%"));
    console.log(
      DIM("  Avg. contract score    ") +
        chalk.white(avgContractScore === null ? "n/a" : formatScore(avgContractScore))
    );
    console.log(
      DIM("  Scope drift warnings   ") +
        (driftWarnings > 0 ? chalk.yellow(String(driftWarnings)) : chalk.green("0"))
    );
    console.log("");
    console.log(DIM("  " + SECTION));
    console.log(DIM("  RUN HISTORY"));
    console.log(DIM("  " + SECTION));
    console.log("");

    for (const run of runs.slice(0, 10)) {
      const statusColor = run.evaluation ? (statusColors[run.evaluation.status] ?? DIM) : DIM;
      const status = run.evaluation ? formatStatus(run.evaluation.status) : formatStatus(run.status);

      console.log(
        DIM("  " + formatDate(run.createdAt) + "  ") +
          chalk.white(truncate(run.task, 38).padEnd(40)) +
          "  " +
          statusColor(status)
      );
    }

    console.log("");
  });

const statusColors: Record<string, ChalkInstance> = {
  passed: chalk.green,
  partial: chalk.yellow,
  needs_verification: chalk.hex("#FF8C00"),
  no_changes_detected: chalk.hex("#FF8C00"),
  drift_detected: chalk.red,
  blocked: chalk.red,
};

program.parse(process.argv);

