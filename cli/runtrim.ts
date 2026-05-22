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
import {
  deriveBridgeContext,
  writeBridgeFiles,
  buildBridgePrompt,
  writeCanonicalRuntrimMd,
  writeRestingContract,
  writeRestingMemory,
  archiveContract,
  archiveMemory,
  removeBridgeBlock,
  type BridgeContext,
} from "../src/lib/bridge.ts";
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
import {
  ADAPTERS,
  detectAdapters,
  isAdapterInstalled,
  installAdapter,
  installAllAdapters,
  refreshAdapterState,
  type AdapterId,
} from "../src/lib/adapters.ts";

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
function resolveCliLauncherPath(): string | null {
  const invokedPath = process.argv[1]?.trim();
  if (invokedPath) {
    const absolute = path.resolve(invokedPath);
    if (fs.existsSync(absolute)) return absolute;
  }

  const localFallback = path.resolve(process.cwd(), "dist-cli", "runtrim.cjs");
  if (fs.existsSync(localFallback)) return localFallback;
  return null;
}

function resolveCliRuntimeDir(): string {
  const launcher = resolveCliLauncherPath();
  if (launcher) return path.dirname(launcher);
  return process.cwd();
}

function resolveCliVersion(): string {
  const cliDir = resolveCliRuntimeDir();
  const candidates = [
    path.resolve(cliDir, "..", "package.json"),
    path.resolve(cliDir, "package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];

  for (const packageJsonPath of candidates) {
    try {
      const raw = fs.readFileSync(packageJsonPath, "utf-8");
      const parsed = JSON.parse(raw) as { version?: string };
      if (parsed.version && parsed.version.trim()) return parsed.version.trim();
    } catch {
      // continue
    }
  }

  try {
    const fromNodeExecArgv = process.execArgv.find((arg) => arg.startsWith("--runtrim-version="));
    if (fromNodeExecArgv) {
      const v = fromNodeExecArgv.split("=")[1]?.trim();
      if (v) return v;
    }
  } catch {
    // continue
  }

  const envVersion = process.env.npm_package_version?.trim();
  return envVersion || "0.0.0";
}

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

const HIGH_RISK_PATH_KEYWORDS = [
  "auth",
  "login",
  "signup",
  "session",
  "jwt",
  "middleware",
  "proxy",
  "billing",
  "payment",
  "stripe",
  "dodo",
  "checkout",
  "webhook",
  "database",
  "schema",
  "migration",
  "supabase",
  "env",
  "secret",
  "token",
  "admin",
  "permission",
  "security",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

function inferMaxFilesFromScope(scope: string[], fallback: number): number {
  const text = scope.join(" ").toLowerCase();
  const n = Number.parseInt(text.match(/maximum\s+(\d+)\s+files/)?.[1] ?? "", 10);
  if (Number.isFinite(n) && n > 0) return n;
  return Math.max(1, fallback || 5);
}

function collectProtectedSystems(
  run: ReturnType<typeof loadLatestRun>,
  config: RunTrimConfig,
  audit: ReturnType<typeof loadProjectAudit>
): string[] {
  const values = new Set<string>();
  const add = (v: string): void => {
    const x = v.trim().toLowerCase();
    if (!x) return;
    values.add(x);
  };
  for (const a of config.sensitiveAreas ?? []) add(a);
  for (const a of audit?.protectedAreas ?? []) add(a);
  for (const s of run?.contract.contract?.sensitiveScope ?? []) add(s);
  for (const s of run?.contract.contract?.forbiddenScope ?? []) add(s);

  const mapped = new Set<string>();
  for (const raw of values) {
    if (raw.includes("auth")) mapped.add("auth");
    if (raw.includes("middleware") || raw.includes("proxy")) mapped.add("middleware");
    if (raw.includes("database") || raw.includes("schema") || raw.includes("migration")) mapped.add("database");
    if (raw.includes("env") || raw.includes("secret")) mapped.add("env/secrets");
    if (raw.includes("billing")) mapped.add("billing");
    if (raw.includes("payment") || raw.includes("stripe") || raw.includes("dodo")) mapped.add("payments");
    if (raw.includes("webhook")) mapped.add("webhooks");
    if (raw.includes("package") || raw.includes("lock")) mapped.add("package/config changes");
  }

  const ordered = [
    "auth",
    "middleware",
    "database",
    "env/secrets",
    "billing",
    "payments",
    "webhooks",
    "package/config changes",
  ];
  return ordered.filter((x) => mapped.has(x));
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
  const entry = resolveCliLauncherPath() ?? path.resolve(cwd, "dist-cli", "runtrim.cjs");
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
  .version(resolveCliVersion());

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

// ── Protocol installer helpers ────────────────────────────────────────────────

const PROTOCOL_BLOCK_START = "<!-- RUNTRIM_PROTOCOL_START -->";
const PROTOCOL_BLOCK_END   = "<!-- RUNTRIM_PROTOCOL_END -->";

const PROTOCOL_POINTER_BLOCK = `
${PROTOCOL_BLOCK_START}
This repo uses RunTrim as the guarded AI coding protocol.
Before editing code, read RUNTRIM.md.
Start every task with: runtrim go "<task>"
Stay inside .runtrim/contracts/latest.md.
After edits, ask the user to run: runtrim finish
${PROTOCOL_BLOCK_END}
`;

function upsertProtocolBlock(filePath: string): "created" | "updated" | "unchanged" | "skipped" {
  if (!fs.existsSync(filePath)) return "skipped";
  const content = fs.readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(PROTOCOL_BLOCK_START);
  const endIdx   = content.indexOf(PROTOCOL_BLOCK_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing block
    const before = content.slice(0, startIdx);
    const after  = content.slice(endIdx + PROTOCOL_BLOCK_END.length);
    const newContent = before + PROTOCOL_POINTER_BLOCK.trimStart() + after.replace(/^\n/, "");
    if (newContent === content) return "unchanged";
    fs.writeFileSync(filePath, newContent, "utf-8");
    return "updated";
  }

  // Append block
  fs.writeFileSync(filePath, content.trimEnd() + "\n" + PROTOCOL_POINTER_BLOCK, "utf-8");
  return "updated";
}

function createMinimalAgentPointerFile(filePath: string, filename: string): void {
  const label = filename === "CLAUDE.md" ? "Claude Code" : "AI agents";
  const content = [
    `# ${label} Instructions`,
    "",
    "This repo uses RunTrim as the guarded AI coding protocol.",
    "Read RUNTRIM.md before editing any code.",
    "",
    PROTOCOL_POINTER_BLOCK.trim(),
    "",
  ].join("\n");
  fs.writeFileSync(filePath, content, "utf-8");
}

interface ProtocolInstallResult {
  runtrimMd:    "created" | "updated";
  projectJson:  "created" | "updated";
  policiesJson: "created" | "updated";
  baselineMd:   "created" | "updated";
  folders:      string[];
  agentFiles:   Array<{ file: string; result: string }>;
  cursorRules:  "created" | "updated" | "skipped";
}

function installProtocol(
  cwd: string,
  baseline: import("../src/lib/project-audit.ts").BaselineProjectAudit,
  opts: { agentFiles?: boolean; cursor?: boolean } = {}
): ProtocolInstallResult {
  const configDir = getConfigDir(cwd);
  const now = new Date().toISOString();

  // ── Folders ────────────────────────────────────────────────────────────
  const extraFolders = [
    path.join(configDir, "contracts"),
    path.join(configDir, "memory"),
    path.join(configDir, "bridge"),
    path.join(configDir, "reports"),
  ];
  const createdFolders: string[] = [];
  for (const dir of extraFolders) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      createdFolders.push(dir.replace(cwd + path.sep, "").replace(/\\/g, "/"));
    }
  }

  // ── Detect build/test commands ─────────────────────────────────────────
  const scripts = baseline.scripts ?? {};
  const buildCmd = scripts["build"] ?? scripts["build:web"] ?? scripts["build:all"] ?? null;
  const testCmd  = scripts["test"] ?? scripts["test:run"] ?? null;

  // ── RUNTRIM.md — use canonical writer from bridge.ts ──────────────────
  const runtrimMdPath = path.join(cwd, "RUNTRIM.md");
  const runtrimMdExists = fs.existsSync(runtrimMdPath);

  // Delegates to the single canonical writer so init, finish, and baseline
  // all produce the same resting-state RUNTRIM.md.
  writeCanonicalRuntrimMd(cwd, baseline.projectName);

  // ── .runtrim/project.json ──────────────────────────────────────────────
  const projectJsonPath = path.join(configDir, "project.json");
  const projectJsonExists = fs.existsSync(projectJsonPath);
  const projectJson = {
    name:           baseline.projectName,
    stack:          baseline.detectedStack,
    packageManager: baseline.packageManager,
    buildCommand:   buildCmd,
    testCommand:    testCmd,
    detectedAt:     now,
  };
  fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2), "utf-8");

  // ── .runtrim/policies.json ─────────────────────────────────────────────
  const policiesPath = path.join(configDir, "policies.json");
  const policiesJsonExists = fs.existsSync(policiesPath);

  // Merge any additional sensitive areas found by baseline
  const detectedSensitive = (baseline.riskSurfaces ?? []).map((s: { type: string }) => s.type.toLowerCase());
  const policies = {
    version: 1,
    protected: [
      ".env*",
      "secrets",
      "*.key",
      "*.pem",
      "auth/**",
      "middleware.ts",
      "prisma/schema.prisma",
      "prisma/migrations/**",
      "database/migrations/**",
      "stripe/**",
      "billing/**",
      "payment/**",
      "webhooks/**",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      ".next/**",
      "dist/**",
      "build/**",
      "node_modules/**",
    ],
    sensitive: [
      "auth",
      "billing",
      "payment",
      "middleware",
      "database",
      "schema",
      "migrations",
      "env",
      "secrets",
      "webhooks",
      ...detectedSensitive.filter((s: string) => !["auth","billing","payment","middleware","database","env","secrets","webhooks"].includes(s)),
    ],
    note: "These areas require explicit task scope before any agent edits.",
    updatedAt: now,
  };
  fs.writeFileSync(policiesPath, JSON.stringify(policies, null, 2), "utf-8");

  // ── .runtrim/memory/baseline.md ────────────────────────────────────────
  const baselineMdPath = path.join(configDir, "memory", "baseline.md");
  const baselineMdExists = fs.existsSync(baselineMdPath);

  const protectedList = policies.protected.slice(0, 10).map((p: string) => `- ${p}`).join("\n");
  const stackLine     = baseline.detectedStack.join(", ") || "unknown";

  const baselineMd = [
    "# RunTrim Memory — Baseline",
    "",
    `Project: ${baseline.projectName}`,
    `Stack: ${stackLine}`,
    `Package manager: ${baseline.packageManager}`,
    ...(buildCmd ? [`Build: ${buildCmd}`] : []),
    ...(testCmd  ? [`Test: ${testCmd}`]   : []),
    "",
    "## Protected areas",
    "",
    protectedList,
    "",
    "## Project rules",
    "",
    "- Start every AI task with: runtrim go \"<task>\"",
    "- Stay inside the scoped contract.",
    "- Run runtrim finish after agent edits.",
    "- No unrelated refactors during a task.",
    "- Never touch .env files.",
    "",
    "## Prior agent decisions",
    "",
    "No prior runs recorded. This is the baseline for this project.",
    "",
    "---",
    `Created by runtrim init. Updated: ${now}`,
  ].join("\n");

  fs.writeFileSync(baselineMdPath, baselineMd, "utf-8");

  // ── Agent pointer files ────────────────────────────────────────────────
  const agentResults: Array<{ file: string; result: string }> = [];
  const agentTargets = ["CLAUDE.md", "AGENTS.md"];

  for (const filename of agentTargets) {
    const filePath = path.join(cwd, filename);
    if (fs.existsSync(filePath)) {
      // Remove any legacy RUNTRIM_BRIDGE block first, then upsert the canonical PROTOCOL block
      removeBridgeBlock(filePath);
      const result = upsertProtocolBlock(filePath);
      agentResults.push({ file: filename, result: result === "skipped" ? "unchanged" : result });
    } else if (opts.agentFiles) {
      createMinimalAgentPointerFile(filePath, filename);
      agentResults.push({ file: filename, result: "created" });
    } else {
      agentResults.push({ file: filename, result: "skipped" });
    }
  }

  // ── Cursor rules ───────────────────────────────────────────────────────
  let cursorResult: "created" | "updated" | "skipped" = "skipped";
  const cursorDir    = path.join(cwd, ".cursor");
  const cursorExists = fs.existsSync(cursorDir);

  if (opts.cursor || cursorExists) {
    const rulesDir  = path.join(cursorDir, "rules");
    const mdcPath   = path.join(rulesDir, "runtrim.mdc");
    if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
    const existed = fs.existsSync(mdcPath);

    const cursorMdc = [
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
      "2. If `.runtrim/contracts/latest.md` exists, read the active contract.",
      "",
      "## Rules",
      "",
      "- Stay inside the allowed scope defined in the contract.",
      "- Do not touch forbidden files or unrelated systems.",
      "- Stop immediately if scope must expand.",
      "- Do not read or write `.env` files.",
      "- Do not refactor outside the task scope.",
      "",
      "## After editing",
      "",
      "Tell the user to run: `runtrim finish`",
    ].join("\n");

    fs.writeFileSync(mdcPath, cursorMdc, "utf-8");
    cursorResult = existed ? "updated" : "created";
  }

  // ── Resting-state contract and memory (safe for fresh init) ───────────────
  // Write resting-state placeholders so agents never see stale session data
  // if runtrim finish has not yet been run in this repo.
  const contractsDir = path.join(configDir, "contracts");
  const latestContractPath = path.join(contractsDir, "latest.md");
  const contractIsStale = fs.existsSync(latestContractPath) &&
    !fs.readFileSync(latestContractPath, "utf-8").includes("Status: none");
  if (!fs.existsSync(latestContractPath) || contractIsStale) {
    writeRestingContract(cwd);
  }

  const memoryDir = path.join(configDir, "memory");
  const currentMemoryPath = path.join(memoryDir, "current.md");
  const memoryIsStale = fs.existsSync(currentMemoryPath) &&
    !fs.readFileSync(currentMemoryPath, "utf-8").includes("Status: none");
  if (!fs.existsSync(currentMemoryPath) || memoryIsStale) {
    writeRestingMemory(cwd);
  }

  return {
    runtrimMd:    runtrimMdExists ? "updated" : "created",
    projectJson:  projectJsonExists ? "updated" : "created",
    policiesJson: policiesJsonExists ? "updated" : "created",
    baselineMd:   baselineMdExists  ? "updated" : "created",
    folders:      createdFolders,
    agentFiles:   agentResults,
    cursorRules:  cursorResult,
  };
}

// ── runtrim init ──────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Install the RunTrim protocol in the current project")
  .option("--refresh",     "Refresh baseline audit, rules, and memory without overwriting config")
  .option("--agent-files", "Create CLAUDE.md and AGENTS.md if missing, with RunTrim pointer")
  .option("--cursor",      "Create .cursor/rules/runtrim.mdc Cursor agent instructions")
  .action(async (options: { refresh?: boolean; agentFiles?: boolean; cursor?: boolean }) => {
    const cwd = process.cwd();
    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    console.log("");
    console.log(GO_ACCENT.bold("RunTrim init"));
    console.log("");

    // ── Existing baseline init (unchanged) ─────────────────────────────
    const initResult = await initializeRunTrim(cwd, {
      refresh: options.refresh,
      allowOverwritePrompt: true,
    });
    if (!initResult.ok) return;

    // ── Protocol installer ─────────────────────────────────────────────
    const baseline = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
    const protocol = installProtocol(cwd, baseline, {
      agentFiles: options.agentFiles,
      cursor: options.cursor,
    });

    // ── Output ─────────────────────────────────────────────────────────
    const stackLine = baseline.detectedStack.length
      ? baseline.detectedStack.join(" + ")
      : "unknown stack";

    console.log(DIM("  Project"));
    console.log(chalk.white("  " + baseline.projectName));
    console.log(DIM("  " + stackLine));
    console.log("");

    console.log(DIM("  Protocol"));
    const protocolFiles: Array<[string, string]> = [
      ["RUNTRIM.md",                    protocol.runtrimMd],
      [".runtrim/project.json",         protocol.projectJson],
      [".runtrim/policies.json",        protocol.policiesJson],
      [".runtrim/memory/baseline.md",   protocol.baselineMd],
    ];
    for (const [file, result] of protocolFiles) {
      console.log(DIM("  ") + chalk.white(file.padEnd(34)) + DIM(result));
    }
    console.log("");

    console.log(DIM("  Agent pointers"));
    for (const { file, result } of protocol.agentFiles) {
      const color = result === "skipped" ? DIM : chalk.white;
      console.log(DIM("  ") + color(file.padEnd(34)) + DIM(result));
    }
    if (protocol.cursorRules !== "skipped") {
      console.log(DIM("  ") + chalk.white(".cursor/rules/runtrim.mdc".padEnd(34)) + DIM(protocol.cursorRules));
    } else if (options.cursor) {
      console.log(DIM("  Cursor rules skipped (.cursor/ not found and --cursor not passed)"));
    }
    console.log("");

    if (protocol.folders.length > 0) {
      console.log(DIM("  Folders created"));
      for (const f of protocol.folders) {
        console.log(DIM("  " + f + "/"));
      }
      console.log("");
    }

    // ── Adapter detection + auto-install ──────────────────────────────────
    const detectedAdapters = detectAdapters(cwd);

    // Always install adapters for detected environments.
    // Additionally install claude + codex as safe defaults (they are markdown files
    // that only update if already present, or create minimal pointer files).
    const toInstall: AdapterId[] = [...new Set([
      ...detectedAdapters,
      // Safe defaults: install if already triggered by --agent-files
      ...(options.agentFiles ? ["claude" as AdapterId, "codex" as AdapterId] : []),
    ])];

    const adapterResults: Array<{ id: AdapterId; displayName: string; result: string }> = [];
    for (const id of toInstall) {
      const adapter = ADAPTERS.find((a) => a.id === id);
      if (!adapter) continue;
      const result = installAdapter(cwd, id);
      if (result !== "unchanged") {
        adapterResults.push({ id, displayName: adapter.displayName, result });
      }
    }
    refreshAdapterState(cwd);

    // ── Output ─────────────────────────────────────────────────────────────
    console.log(DIM("  Adapters"));
    if (detectedAdapters.length > 0) {
      console.log(DIM("  Detected:"));
      for (const id of detectedAdapters) {
        const a = ADAPTERS.find((x) => x.id === id);
        const installed = isAdapterInstalled(cwd, id);
        if (a) {
          console.log(
            DIM("  ") +
            chalk.white(a.displayName.padEnd(16)) +
            DIM(a.targetFile.padEnd(38)) +
            (installed ? chalk.green("installed") : DIM("detected"))
          );
        }
      }
    } else {
      console.log(DIM("  No specific agent environments detected."));
      console.log(DIM("  Add one with: runtrim adapters install cursor"));
    }
    console.log("");

    console.log(DIM("  Next"));
    console.log(chalk.white('  runtrim go "your first task"'));
    if (detectedAdapters.length === 0) {
      console.log(chalk.white("  runtrim adapters install --all"));
    }
    console.log("");
  });

// ── runtrim adapters ──────────────────────────────────────────────────────────

const adaptersCommand = program
  .command("adapters")
  .description("Manage RunTrim agent adapters (list, status, install)");

// Default: show help
adaptersCommand.action(() => {
  adaptersCommand.help();
});

// runtrim adapters list
adaptersCommand
  .command("list")
  .description("List all supported adapters with detection and install status")
  .action(() => {
    const cwd = process.cwd();
    console.log("");
    console.log(GO_ACCENT.bold("RunTrim adapters"));
    console.log("");
    console.log(DIM("  Supported adapters"));
    console.log("");

    for (const adapter of ADAPTERS) {
      const detected  = detectAdapters(cwd).includes(adapter.id);
      const installed = isAdapterInstalled(cwd, adapter.id);

      const statusParts: string[] = [];
      if (detected)  statusParts.push("detected");
      if (installed) statusParts.push("installed");
      const statusStr = statusParts.length > 0 ? statusParts.join(", ") : "missing";
      const statusColor = installed ? chalk.green : detected ? chalk.yellow : DIM;

      console.log(
        DIM("  ") +
        chalk.white(adapter.id.padEnd(12)) +
        chalk.white(adapter.targetFile.padEnd(42)) +
        statusColor(statusStr)
      );
    }
    console.log("");
    console.log(DIM("  Install one:   ") + chalk.white("runtrim adapters install <id>"));
    console.log(DIM("  Install all:   ") + chalk.white("runtrim adapters install --all"));
    console.log("");
  });

// runtrim adapters status
adaptersCommand
  .command("status")
  .description("Show detected, installed, and recommended adapters")
  .action(() => {
    const cwd  = process.cwd();
    const state = refreshAdapterState(cwd);
    console.log("");
    console.log(GO_ACCENT.bold("RunTrim adapters"));
    console.log("");

    if (state.detected.length > 0) {
      console.log(DIM("  Detected agents"));
      for (const id of state.detected) {
        const a = ADAPTERS.find((x) => x.id === id);
        if (a) console.log(DIM("  ") + chalk.white(a.displayName));
      }
      console.log("");
    } else {
      console.log(DIM("  No specific agent environments detected."));
      console.log("");
    }

    if (state.installed.length > 0) {
      console.log(DIM("  Installed adapters"));
      for (const id of state.installed) {
        const a = ADAPTERS.find((x) => x.id === id);
        if (a) console.log(DIM("  ") + chalk.white(a.displayName) + DIM("  " + a.targetFile));
      }
      console.log("");
    } else {
      console.log(DIM("  No adapters installed."));
      console.log("");
    }

    const missing = state.detected.filter((id) => !state.installed.includes(id));
    if (missing.length > 0) {
      console.log(DIM("  Recommended (detected but not installed)"));
      for (const id of missing) {
        const a = ADAPTERS.find((x) => x.id === id);
        if (a) {
          console.log(DIM("  ") + chalk.yellow(a.displayName) + DIM("  " + a.targetFile));
        }
      }
      console.log("");
      const first = missing[0];
      if (first) {
        console.log(DIM("  Next"));
        console.log(chalk.white(`  runtrim adapters install ${first}`));
      }
    } else if (state.installed.length === 0) {
      console.log(DIM("  Next"));
      console.log(chalk.white("  runtrim adapters install --all"));
    } else {
      console.log(DIM("  All detected adapters are installed."));
    }
    console.log("");
  });

// runtrim adapters install [adapter] [--all]
adaptersCommand
  .command("install [adapter]")
  .description("Install a specific adapter or all adapters")
  .option("--all", "Install all supported adapters")
  .action((adapterId: string | undefined, options: { all?: boolean }) => {
    const cwd = process.cwd();
    console.log("");
    console.log(GO_ACCENT.bold("RunTrim adapters"));
    console.log("");

    if (options.all) {
      console.log(DIM("  Installing all adapters..."));
      console.log("");
      const { results } = installAllAdapters(cwd);
      for (const { displayName, result, id } of results) {
        const a = ADAPTERS.find((x) => x.id === id);
        const file = a?.targetFile ?? "";
        const color = result === "created" ? chalk.green
          : result === "updated"  ? chalk.cyan
          : result === "error"    ? chalk.red
          : DIM;
        console.log(
          DIM("  ") +
          chalk.white(displayName.padEnd(16)) +
          DIM(file.padEnd(42)) +
          color(result)
        );
      }
      refreshAdapterState(cwd);
      console.log("");
      console.log(DIM("  All adapters processed."));
      console.log(DIM("  State saved to .runtrim/adapters.json"));
      console.log("");
      return;
    }

    if (!adapterId) {
      console.log(chalk.yellow("  Specify an adapter ID or use --all."));
      console.log("");
      console.log(DIM("  Supported IDs:"));
      for (const a of ADAPTERS) {
        console.log(DIM("  ") + chalk.white(a.id.padEnd(12)) + DIM(a.targetFile));
      }
      console.log("");
      return;
    }

    const adapter = ADAPTERS.find((a) => a.id === adapterId);
    if (!adapter) {
      console.log(chalk.red(`  Unknown adapter: ${adapterId}`));
      console.log("");
      console.log(DIM("  Supported IDs: ") + ADAPTERS.map((a) => a.id).join(", "));
      console.log("");
      return;
    }

    const result = installAdapter(cwd, adapterId as AdapterId);
    const color  = result === "created"   ? chalk.green
      : result === "updated"   ? chalk.cyan
      : result === "unchanged" ? DIM
      : chalk.red;

    console.log(
      DIM("  ") +
      chalk.white(adapter.displayName.padEnd(16)) +
      DIM(adapter.targetFile.padEnd(42)) +
      color(result)
    );
    console.log("");

    if (result !== "error") {
      refreshAdapterState(cwd);
      console.log(DIM("  State updated in .runtrim/adapters.json"));
    }
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
  .description("Bridge Mode: generate a scoped contract, write protocol files, and prepare the guarded prompt")
  .option("--no-clipboard", "Print prompt to terminal instead of copying to clipboard")
  .option("--no-sync",      "Skip cloud sync even if a CLI token is configured")
  .option("--no-bridge",    "Skip bridge file writing (RUNTRIM.md, contracts, memory)")
  .option("--print",        "Always print the prompt to terminal in addition to copying")
  .option("--monitor",      "Open local panel monitor in the background (best effort)")
  .action(async (task: string, options: {
    clipboard?: boolean;
    sync?: boolean;
    bridge?: boolean;
    print?: boolean;
    monitor?: boolean;
  }) => {
    const cwd = process.cwd();

    const allowed = await ensureRepoAllowedForFree(cwd);
    if (!allowed) return;

    if (!configExists(cwd)) {
      const initResult = await initializeRunTrim(cwd, { allowOverwritePrompt: false });
      if (!initResult.ok) return;
    }

    const config = loadConfig(cwd);

    // ── Bridge run entitlement check ──────────────────────────────────────
    const globalAuth = loadGlobalAuth();
    const rawToken   = globalAuth?.token ?? config.syncToken ?? null;
    const apiBase    = resolveApiBase(config);

    if (rawToken?.startsWith("rt_live_")) {
      // Connected: ask server to check + increment
      let serverResult: { allowed: boolean; used: number; limit: number | null; plan: string } | null = null;
      try {
        const res = await fetch(`${apiBase}/api/cli/usage/bridge-run`, {
          method: "POST",
          headers: { Authorization: `Bearer ${rawToken}` },
        });
        if (res.ok) {
          const body = await res.json() as {
            allowed: boolean;
            plan: string;
            usage: { bridgeRunsUsed: number | null; bridgeRunsLimit: number | null };
          };
          serverResult = {
            allowed: body.allowed,
            plan:    body.plan,
            used:    body.usage.bridgeRunsUsed ?? 0,
            limit:   body.usage.bridgeRunsLimit,
          };
        }
      } catch { /* network error — degrade gracefully below */ }

      if (serverResult !== null && !serverResult.allowed) {
        printBridgeLimitMessage(serverResult.used);
        return;
      }
      // If serverResult is null (unreachable), fall through — allow the run
      // so a network blip never blocks a paid user from working.
    } else {
      // Unconnected: local usage tracking
      const check = checkAndIncrementLocalUsage();
      if (!check.allowed) {
        printBridgeLimitMessage(check.used);
        return;
      }
    }

    // ── Audit + contract ─────────────────────────────────────────────────
    const auditSpinner = oraFactory({ text: "  Auditing task...", color: "blue" }).start();
    await new Promise((r) => setTimeout(r, 180));
    const audit = auditTask(task, config, cwd);
    auditSpinner.stop();

    const contract = generateContract(task, audit, config);

    // Handle blocked mega-run
    if (contract.isBlocked && contract.splitReport) {
      const sr = contract.splitReport;
      updateRun(saveRun(task, audit, contract, cwd).id, { status: "blocked" }, cwd);
      console.log("");
      console.log(GO_ACCENT.bold("RunTrim go"));
      console.log("");
      console.log(chalk.red.bold("  SPLIT REQUIRED"));
      console.log("");
      console.log(DIM("  Task    ") + chalk.white(truncate(task, 60)));
      console.log(DIM("  Risk    ") + chalk.red("CRITICAL"));
      console.log("");
      console.log(DIM("  This task crosses multiple high-risk systems."));
      console.log(DIM("  Running it in one agent session would cause scope drift and token waste."));
      console.log("");
      console.log(DIM("  Detected: ") + chalk.white(sr.detectedSystems.join(", ")));
      console.log("");
      for (const step of sr.recommendedSplit) {
        console.log(DIM("  ") + chalk.white(step));
      }
      console.log("");
      console.log(DIM("  Estimated waste avoided: ") + ACCENT(sr.estimatedWasteAvoided));
      console.log("");
      return;
    }

    // ── Save run ─────────────────────────────────────────────────────────
    const runs = loadAllRuns(cwd);
    const projectAudit = loadProjectAudit(cwd);
    const projectName = projectAudit?.projectName ?? path.basename(cwd);
    const memoryMarkdown = (() => { try { return readMemory(cwd); } catch { return null; } })();
    const memoryUsed = Boolean(memoryMarkdown && memoryMarkdown.trim().length > 50);

    const run = saveRun(task, audit, contract, cwd);
    updateRun(run.id, {
      status: "guarded",
      bridgeMode: true,
      tokenBudget: deriveBridgeContext(task, contract, runs, projectName).tokenBudget,
      memoryUsed,
    }, cwd);

    // ── Bridge files ──────────────────────────────────────────────────────
    const bridgeCtx: BridgeContext = deriveBridgeContext(task, contract, runs, projectName);
    let bridgeWritten: string[] = [];

    let bridgeManagedPaths: string[] = [];
    if (options.bridge !== false) {
      const result = writeBridgeFiles(bridgeCtx, cwd);
      bridgeWritten = result.written;
      bridgeManagedPaths = result.managedPaths;
    }

    // ── Prompt ────────────────────────────────────────────────────────────
    const rawPrompt  = contract.contractText;
    const fullPrompt = options.bridge !== false
      ? buildBridgePrompt(rawPrompt, bridgeCtx)
      : rawPrompt;

    const promptPath = writeLatestPromptFile(fullPrompt, config, cwd);
    // Track the prompt file itself as RunTrim-managed
    const promptRelative = ".runtrim/latest-prompt.md";
    if (!bridgeManagedPaths.includes(promptRelative)) {
      bridgeManagedPaths.push(promptRelative);
    }

    const doCopy = options.clipboard !== false;
    const copied = doCopy ? await copyToClipboardSafe(fullPrompt) : false;

    if (options.monitor) void tryLaunchPanelMonitorDetached(cwd);

    // Persist the managed file list so runtrim finish can exclude them from drift
    updateRun(run.id, { bridgeManagedFiles: bridgeManagedPaths }, cwd);

    // ── Cloud sync ────────────────────────────────────────────────────────
    let cloudSync: CloudSyncResult = { status: "skipped_no_token" };
    if (options.sync !== false) {
      cloudSync = await syncRunsToCloud({
        cwd,
        config,
        projectName,
        projectAudit: projectAudit ?? null,
        memoryMarkdown: memoryMarkdown ?? "",
        runs: loadAllRuns(cwd),
        markPendingRunIds: [run.id],
      });
    }

    // ── Output ────────────────────────────────────────────────────────────
    const riskColor = ({ low: chalk.green, medium: chalk.yellow, high: chalk.hex("#FF8C00"), critical: chalk.red } as Record<string, typeof chalk>)[bridgeCtx.riskLevel] ?? chalk.white;

    console.log("");
    console.log(GO_ACCENT.bold("RunTrim go"));
    console.log("");
    console.log(GO_ACCENT.bold("Task"));
    console.log(chalk.white("  " + task));
    console.log("");
    console.log(GO_ACCENT.bold("Memory"));
    console.log(DIM("  " + (memoryUsed ? `Loaded ${runs.length} prior run${runs.length === 1 ? "" : "s"} and project context.` : "No prior runs. Starting from project context.")));
    console.log("");
    console.log(GO_ACCENT.bold("Contract"));
    console.log(DIM("  Risk          ") + riskColor(bridgeCtx.riskLevel));
    console.log(DIM("  Category      ") + chalk.white(audit.taskCategory ?? "unknown"));
    console.log(DIM("  Token budget  ") + chalk.white("~" + bridgeCtx.tokenBudget.toLocaleString()));
    // Show explicit paths prominently if present
    if (audit.explicitPaths && audit.explicitPaths.length > 0) {
      const mode = audit.onlyMode ? "only" : audit.mustIncludeMode ? "must include" : "explicit";
      console.log(DIM("  Scope         ") + chalk.cyan(`[${mode}] `) + chalk.white(audit.explicitPaths.slice(0, 3).join(", ")));
    } else if (bridgeCtx.allowedScope.length > 0) {
      console.log(DIM("  Allowed       ") + chalk.white(truncate(bridgeCtx.allowedScope.slice(0, 2).join(", "), 60)));
    }
    if (bridgeCtx.forbiddenScope.length > 0) {
      console.log(DIM("  Forbidden     ") + chalk.white(truncate(bridgeCtx.forbiddenScope.slice(0, 2).join(", "), 60)));
    }
    if (contract.contract.stopRules.length > 0) {
      console.log(DIM("  Stop rule     ") + chalk.white(truncate(contract.contract.stopRules[contract.contract.stopRules.length - 1] ?? "", 60)));
    }
    console.log(DIM("  Run saved     ") + chalk.white(`.runtrim/runs/${run.id}.json`));
    console.log("");
    if (bridgeWritten.length > 0) {
      console.log(GO_ACCENT.bold("Bridge"));
      for (const f of bridgeWritten) {
        console.log(DIM("  ") + chalk.white(f));
      }
      console.log("");
    }
    if (options.sync !== false) {
      console.log(GO_ACCENT.bold("Cloud sync"));
      if (cloudSync.status === "synced") {
        console.log(chalk.white("  Started run synced."));
      } else if (cloudSync.status === "failed") {
        console.log(chalk.yellow("  Failed. Run saved locally. Use runtrim sync later."));
      } else if (cloudSync.status === "skipped_no_token" || cloudSync.status === "skipped_invalid_token") {
        console.log(DIM("  Skipped. Run runtrim login to connect your dashboard."));
      } else {
        console.log(DIM("  Skipped."));
      }
      console.log("");
    }
    console.log(GO_ACCENT.bold("Prompt"));
    if (copied) {
      console.log(chalk.white("  Copied to clipboard."));
    } else if (!doCopy) {
      console.log(chalk.white("  Saved to: " + promptPath));
    } else {
      console.log(DIM("  Clipboard unavailable. Saved to: " + promptPath));
    }
    if (options.print) {
      console.log("");
      console.log(fullPrompt);
    }
    console.log("");
    console.log(GO_ACCENT.bold("Next"));
    console.log(chalk.white("  Paste the guarded prompt into Claude Code, Codex, Cursor, or your agent."));
    console.log(chalk.white("  After edits are done, run: runtrim finish"));
    console.log("");
  });

program
  .command("check")
  .description("Check the latest run and evaluate agent output")
  .option("--json", "Print machine-readable check summary")
  .action(async (options: { json?: boolean }) => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  check"));
    console.log("");

    const run = loadLatestRun(cwd);
    if (!run) {
      console.log(chalk.yellow('  No runs found. Start with: runtrim go "your task"'));
      console.log("");
      return;
    }
    const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    const changedFiles = dedupeFiles(await getGitDiff(cwd));
    const maxFiles = inferMaxFilesFromScope(run.contract.contract?.relevantScope ?? [], config.maxFilesPerRun);
    const scope = evaluateWatchState({
      changedFiles,
      run,
      maxFilesPerRun: maxFiles,
      strict: false,
    });

    const evaluationBase = evaluateAgentOutput(null, changedFiles, {
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
    const lowerChanged = changedFiles.map((f) => f.toLowerCase());
    const riskFlags = new Set<string>();
    for (const file of lowerChanged) {
      for (const kw of HIGH_RISK_PATH_KEYWORDS) {
        if (file.includes(kw)) {
          riskFlags.add(`High-risk path touched: ${kw}`);
          break;
        }
      }
    }
    if (scope.forbiddenFiles.length > 0) riskFlags.add("Forbidden scope changed");
    if (scope.sensitiveFiles.length > 0) riskFlags.add("Sensitive scope changed");
    if (scope.outOfScopeFiles.length > 0) riskFlags.add("Potential outside-scope changes detected");
    if (changedFiles.length > maxFiles) riskFlags.add(`File count exceeded scope limit (${maxFiles})`);

    const verificationDebt = new Set<string>();
    if (changedFiles.length > 0) {
      if (run.status === "guarded") verificationDebt.add("Run is still guarded and not checked.");
      if (!run.evaluation) verificationDebt.add("Changed files exist but no post-run check was recorded.");
      if (scope.sensitiveFiles.length > 0) verificationDebt.add("Sensitive files changed. Review and verify before continuing.");
      if (scope.forbiddenFiles.length > 0) verificationDebt.add("Forbidden files changed. Manual containment required.");
      if (changedFiles.length > maxFiles) verificationDebt.add("Too many files changed for one scoped run. Split the task.");
      if (lowerChanged.some((f) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f))) {
        verificationDebt.add("Lockfile changed. Confirm dependency intent.");
      }
      if (lowerChanged.some((f) => /(migration|migrations|schema|database)/.test(f))) {
        verificationDebt.add("Database or migration-related changes need explicit verification.");
      }
      if (lowerChanged.some((f) => /(middleware|auth|login|session|jwt|payment|billing|stripe|webhook)/.test(f))) {
        verificationDebt.add("Auth, middleware, payment, or webhook surface changed. Run focused verification.");
      }
      if (scope.outOfScopeFiles.length > 0) {
        verificationDebt.add("Some changed files appear outside declared relevant scope.");
      }
      for (const item of run.evaluation?.missingProofItems ?? []) verificationDebt.add(item);
    }

    let nextSafeAction = "Run is ready to continue.";
    if (scope.forbiddenFiles.length > 0) {
      nextSafeAction = "Stop and inspect forbidden files before continuing.";
    } else if (scope.sensitiveFiles.length > 0) {
      nextSafeAction = "Review sensitive changes, then run tests before continuing.";
    } else if (changedFiles.length > maxFiles) {
      nextSafeAction = "Stop scope drift and split the task.";
    } else if (changedFiles.length === 0) {
      nextSafeAction = "No local changes detected. Continue or prepare the next run.";
    } else if (verificationDebt.size > 0) {
      nextSafeAction = "Resolve verification debt, then run runtrim check again.";
    }

    evaluation.nextSafeAction = nextSafeAction;
    evaluation.nextPrompt = evaluation.nextGuardedPrompt;
    evaluation.nextSafePrompt = evaluation.nextGuardedPrompt;

    const checkSummary = {
      checkedAt: new Date().toISOString(),
      changedFilesCount: changedFiles.length,
      allowedCount: scope.relevantFiles.length,
      sensitiveCount: scope.sensitiveFiles.length,
      forbiddenCount: scope.forbiddenFiles.length,
      outsideScopeCount: scope.outOfScopeFiles.length,
      verificationDebt: [...verificationDebt],
      riskFlags: [...riskFlags],
      nextSafeAction,
    };

    updateRun(run.id, { evaluation, checkSummary, status: "checked" }, cwd);
    const latestAfterUpdate = loadLatestRun(cwd);
    if (latestAfterUpdate && configExists(cwd)) {
      writeMemoryFromRuns(latestAfterUpdate, loadAllRuns(cwd), loadConfig(cwd), cwd);
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            runId: run.id,
            task: run.task,
            scopeResult: {
              allowedChanges: checkSummary.allowedCount,
              sensitiveChanges: checkSummary.sensitiveCount,
              forbiddenChanges: checkSummary.forbiddenCount,
              outsideScope: checkSummary.outsideScopeCount,
            },
            verificationDebt: checkSummary.verificationDebt,
            riskFlags: checkSummary.riskFlags,
            changedFiles: changedFiles,
            nextSafeAction: checkSummary.nextSafeAction,
            checkedAt: checkSummary.checkedAt,
          },
          null,
          2
        )
      );
      console.log("");
      return;
    }

    const changedPreview = changedFiles.slice(0, 8);
    const extraCount = Math.max(0, changedFiles.length - changedPreview.length);

    console.log(BOLD("Run"));
    console.log(chalk.white(run.task?.trim() ? truncate(run.task, 68) : "Latest run"));
    console.log("");
    console.log(BOLD("Scope result"));
    console.log(chalk.white(`- Allowed changes: ${checkSummary.allowedCount}`));
    console.log(chalk.white(`- Sensitive changes: ${checkSummary.sensitiveCount}`));
    console.log(chalk.white(`- Forbidden changes: ${checkSummary.forbiddenCount}`));
    console.log(chalk.white(`- Outside scope: ${checkSummary.outsideScopeCount}`));
    console.log("");
    console.log(BOLD("Verification debt"));
    if (checkSummary.verificationDebt.length === 0) {
      console.log(chalk.white("No verification debt recorded."));
    } else {
      for (const item of checkSummary.verificationDebt) console.log(chalk.white(`- ${item}`));
    }
    console.log("");
    console.log(BOLD("Risk flags"));
    if (checkSummary.riskFlags.length === 0) {
      console.log(chalk.white("No high-risk flags detected."));
    } else {
      for (const flag of checkSummary.riskFlags) console.log(chalk.white(`- ${flag}`));
    }
    console.log("");
    console.log(BOLD("Changed files"));
    if (changedFiles.length === 0) {
      console.log(chalk.white("No local changed files detected."));
    } else {
      for (const file of changedPreview) console.log(chalk.white(`- ${file}`));
      if (extraCount > 0) console.log(chalk.white(`+${extraCount} more`));
    }
    console.log("");
    console.log(BOLD("Next safe action"));
    console.log(chalk.white(checkSummary.nextSafeAction));
    console.log("");
  });
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ REPORT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬


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
  .option("--full", "Print full memory markdown")
  .action(async (options: { prompt?: boolean; full?: boolean }) => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  memory"));
    console.log("");

    const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    const audit = loadProjectAudit(cwd) ?? performBaselineProjectAudit(cwd, null);
    const memoryPath = path.join(getConfigDir(cwd), "memory.md");
    const latestRun = loadLatestRun(cwd);

    if (!latestRun) {
      let memory = readMemory(cwd);
      if (!memory) {
        const memoryDir = path.dirname(memoryPath);
        if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });
        memory = buildBaselineMemoryMarkdown(audit);
        fs.writeFileSync(memoryPath, memory, "utf-8");
      }
      const baselinePrompt = 'runtrim go "your task"';
      if (options.prompt) {
        console.log(baselinePrompt);
        await copyToClipboardSafe(baselinePrompt);
        console.log("");
        console.log(ACCENT.bold("  Latest next safe prompt copied."));
        console.log("");
        return;
      }
      if (options.full) {
        console.log(memory);
        console.log("");
      }
      console.log(BOLD("Project"));
      console.log(chalk.white(audit.projectName || cwd));
      console.log("");
      console.log(BOLD("Current state"));
      console.log(chalk.white("No runs recorded yet."));
      console.log("");
      console.log(BOLD("Latest run"));
      console.log(chalk.white("- Task: none"));
      console.log(chalk.white("- Status: baseline"));
      console.log(chalk.white("- Proof: needs check"));
      console.log(chalk.white(`- Next: ${baselinePrompt}`));
      console.log("");
      console.log(BOLD("Protected systems"));
      const protectedSystems = collectProtectedSystems(null, config, audit);
      console.log(chalk.white((protectedSystems.length ? protectedSystems : ["auth", "middleware", "database", "env/secrets", "billing", "webhooks", "migrations"]).join(", ")));
      console.log("");
      console.log(BOLD("Recent context"));
      console.log(chalk.white("No recent memory items yet."));
      console.log("");
      console.log(BOLD("Continuation"));
      console.log(chalk.white("No continuation prompt yet. Run `runtrim continue --reason usage_limit` when context runs out."));
      console.log("");
      console.log(BOLD("Useful commands"));
      console.log(chalk.white('- runtrim go "your task"'));
      console.log(chalk.white("- runtrim panel --monitor"));
      console.log(chalk.white("- runtrim check"));
      console.log(chalk.white("- runtrim continue --reason usage_limit"));
      console.log("");
      if (config.baselineInitialized !== true) {
        config.baselineInitialized = true;
        config.lastAuditAt = audit.updatedAt;
        saveConfig(config, cwd);
      }
      return;
    }
    const allRuns = loadAllRuns(cwd);
    const memory = writeMemoryFromRuns(latestRun, allRuns, config, cwd);
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

    if (options.full) {
      console.log(memory);
      console.log("");
    }

    const status = latestRun.evaluation?.status ?? latestRun.status;
    const checkSummary = latestRun.checkSummary;
    const protectedSystems = collectProtectedSystems(latestRun, config, audit);
    const recent = allRuns.slice(0, 3).map((r) => {
      const s = r.evaluation?.status ?? r.status;
      return `- ${truncate(r.task, 56)} (${s})`;
    });
    const nextAction =
      checkSummary?.nextSafeAction ??
      latestRun.evaluation?.nextSafeAction ??
      "runtrim check";
    const proofState =
      checkSummary
        ? checkSummary.verificationDebt.length > 0
          ? "verification debt"
          : "checked"
        : latestRun.evaluation
        ? latestRun.evaluation.missingProofItems.length > 0
          ? "verification debt"
          : "checked"
        : "needs check";

    console.log(BOLD("Project"));
    console.log(chalk.white(audit.projectName || cwd));
    console.log("");
    console.log(BOLD("Current state"));
    console.log(chalk.white(latestRun.evaluation?.memorySummary || `Latest run is ${status}.`));
    console.log("");
    console.log(BOLD("Latest run"));
    console.log(chalk.white(`- Task: ${truncate(latestRun.task, 72)}`));
    console.log(chalk.white(`- Status: ${status}`));
    console.log(chalk.white(`- Proof: ${proofState}`));
    console.log(chalk.white(`- Next: ${nextAction}`));
    console.log("");
    console.log(BOLD("Protected systems"));
    console.log(chalk.white((protectedSystems.length ? protectedSystems : ["auth", "middleware", "database", "env/secrets", "billing", "webhooks", "migrations"]).join(", ")));
    console.log("");
    console.log(BOLD("Recent context"));
    if (recent.length > 0) {
      for (const line of recent) console.log(chalk.white(line));
    } else {
      console.log(chalk.white("No recent memory items yet."));
    }
    console.log("");
    console.log(BOLD("Continuation"));
    const noChangesState =
      status === "no_changes_detected" ||
      (latestRun.checkSummary?.changedFilesCount ?? latestRun.evaluation?.changedFiles?.length ?? 0) === 0;
    if (noChangesState) {
      console.log(chalk.white("No continuation prompt needed yet. Run `runtrim continue --reason usage_limit` when context runs out."));
    } else if (latestPrompt) {
      const compact = latestPrompt.replace(/\s+/g, " ").trim();
      const isDrift = /scope drift detected/i.test(compact);
      if (isDrift) {
        console.log(chalk.white("Scope drift detected. Run `runtrim check` before continuing."));
      } else if (compact.length > 160) {
        console.log(chalk.white(truncate(compact, 160)));
      } else {
        console.log(chalk.white(compact));
      }
      await copyToClipboardSafe(latestPrompt);
    } else {
      console.log(chalk.white("No continuation prompt yet. Run `runtrim continue --reason usage_limit` when context runs out."));
    }
    console.log("");
    console.log(BOLD("Useful commands"));
    console.log(chalk.white('- runtrim go "your task"'));
    console.log(chalk.white("- runtrim panel --monitor"));
    console.log(chalk.white("- runtrim check"));
    console.log(chalk.white("- runtrim continue --reason usage_limit"));
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

// ── Local Bridge usage tracking (no-token mode) ───────────────────────────────

const GLOBAL_USAGE_FILE = path.join(os.homedir(), ".runtrim", "usage.json");
const FREE_BRIDGE_LIMIT_LOCAL = 5;

function currentUsagePeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function loadLocalUsageRuns(): Record<string, number> {
  try {
    const raw = JSON.parse(fs.readFileSync(GLOBAL_USAGE_FILE, "utf-8")) as { bridgeRuns?: Record<string, number> };
    return raw.bridgeRuns ?? {};
  } catch { return {}; }
}

function saveLocalUsageRuns(bridgeRuns: Record<string, number>): void {
  const dir = path.dirname(GLOBAL_USAGE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(GLOBAL_USAGE_FILE, JSON.stringify({ bridgeRuns }, null, 2), "utf-8");
}

/** Check limit then increment. Returns { allowed, used }. */
function checkAndIncrementLocalUsage(): { allowed: boolean; used: number } {
  const period = currentUsagePeriod();
  const runs   = loadLocalUsageRuns();
  const used   = runs[period] ?? 0;
  if (used >= FREE_BRIDGE_LIMIT_LOCAL) {
    return { allowed: false, used };
  }
  runs[period] = used + 1;
  saveLocalUsageRuns(runs);
  return { allowed: true, used: used + 1 };
}

function localUsageThisMonth(): number {
  const period = currentUsagePeriod();
  return loadLocalUsageRuns()[period] ?? 0;
}

function printBridgeLimitMessage(used: number): void {
  console.log("");
  console.log(chalk.red.bold("  Free Bridge limit reached."));
  console.log("");
  console.log(chalk.white(`  You have used ${used} local guarded run${used === 1 ? "" : "s"} this month.`));
  console.log(DIM("  Upgrade to Pro for unlimited Bridge Mode, cloud sync, project memory,"));
  console.log(DIM("  reports, and continuation history."));
  console.log("");
  console.log(chalk.white("  https://www.runtrim.com/pricing"));
  console.log("");
}

// ── Global auth helpers ───────────────────────────────────────────────────────

const GLOBAL_AUTH_DIR  = path.join(os.homedir(), ".runtrim");
const GLOBAL_AUTH_FILE = path.join(GLOBAL_AUTH_DIR, "auth.json");

interface GlobalAuth {
  token: string;
  storedAt: string;
  email?: string;
}

type CloudSyncResult = {
  status: "synced" | "skipped_no_token" | "skipped_invalid_token" | "skipped_no_runs" | "failed";
  syncedRuns?: number;
  error?: string;
  details?: string;
};

function loadGlobalAuth(): GlobalAuth | null {
  if (!fs.existsSync(GLOBAL_AUTH_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(GLOBAL_AUTH_FILE, "utf-8")) as GlobalAuth;
  } catch {
    return null;
  }
}

function saveGlobalAuth(auth: GlobalAuth): void {
  if (!fs.existsSync(GLOBAL_AUTH_DIR)) {
    fs.mkdirSync(GLOBAL_AUTH_DIR, { recursive: true });
  }
  fs.writeFileSync(GLOBAL_AUTH_FILE, JSON.stringify(auth, null, 2));
}

function resolveApiBase(config: RunTrimConfig): string {
  const url = config.dashboardUrl?.trim();
  if (!url || url.startsWith("http://localhost")) {
    return "https://www.runtrim.com";
  }
  try {
    return new URL(url).origin;
  } catch {
    return "https://www.runtrim.com";
  }
}

async function syncRunsToCloud(input: {
  cwd: string;
  config: RunTrimConfig;
  projectName: string;
  projectAudit: ReturnType<typeof loadProjectAudit> | null;
  memoryMarkdown: string;
  runs: ReturnType<typeof loadAllRuns>;
  markPendingRunIds?: string[];
}): Promise<CloudSyncResult> {
  const { cwd, config, projectName, projectAudit, memoryMarkdown, runs, markPendingRunIds } = input;
  const globalAuth = loadGlobalAuth();
  const rawToken = globalAuth?.token ?? config.syncToken ?? null;

  if (!rawToken) return { status: "skipped_no_token" };
  if (!rawToken.startsWith("rt_live_")) return { status: "skipped_invalid_token" };
  if (runs.length === 0) return { status: "skipped_no_runs" };

  try {
    const payload = buildSyncPayload({
      cwd,
      projectName,
      config,
      projectAudit: projectAudit ?? null,
      memoryMarkdown: memoryMarkdown ?? "",
      runs,
    });
    const apiBase = resolveApiBase(config);
    const res = await fetch(`${apiBase}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawToken}` },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({})) as {
      ok?: boolean;
      syncedRuns?: number;
      error?: string;
      details?: string;
    };

    if (!res.ok || !body.ok) {
      if (markPendingRunIds && markPendingRunIds.length > 0) {
        for (const id of markPendingRunIds) updateRun(id, { pendingSync: true }, cwd);
      }
      return {
        status: "failed",
        error: body.error,
        details: body.details,
      };
    }

    for (const run of runs) {
      if (run.pendingSync) updateRun(run.id, { pendingSync: false }, cwd);
    }

    return {
      status: "synced",
      syncedRuns: body.syncedRuns ?? payload.runs.length,
    };
  } catch {
    if (markPendingRunIds && markPendingRunIds.length > 0) {
      for (const id of markPendingRunIds) updateRun(id, { pendingSync: true }, cwd);
    }
    return { status: "failed" };
  }
}

// ── runtrim login ─────────────────────────────────────────────────────────────

program
  .command("login")
  .description("Connect this machine to your RunTrim cloud account")
  .option("--token <token>", "CLI token (skip interactive prompt)")
  .action(async (opts: { token?: string }) => {
    console.log("");
    console.log(BOLD("RunTrim") + DIM("  connect to cloud"));
    console.log("");

    const cwd = process.cwd();

    // Check existing auth
    const existing = loadGlobalAuth();
    if (existing && !opts.token) {
      console.log(DIM("  Already connected."));
      if (existing.email) {
        console.log(DIM("  Account   ") + chalk.white(existing.email));
      }
      console.log(DIM("  Token     ") + chalk.white("rt_live_..."));
      console.log("");
      console.log(DIM("  To reconnect, run: ") + GO_ACCENT("runtrim login --token <new-token>"));
      console.log("");
      return;
    }

    console.log(DIM("  Get your CLI token from:"));
    console.log("  " + GO_ACCENT("https://www.runtrim.com/app/connect"));
    console.log("");

    let rawToken = opts.token?.trim() ?? "";

    if (!rawToken) {
      const answer = await prompts({
        type: "text",
        name: "token",
        message: "Paste your CLI token",
      });
      rawToken = (answer.token as string | undefined)?.trim() ?? "";
    }

    if (!rawToken || !rawToken.startsWith("rt_live_")) {
      console.log(chalk.yellow("  Invalid token. Tokens start with rt_live_"));
      console.log("");
      return;
    }

    const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    const apiBase = resolveApiBase(config);
    const verifyUrl = `${apiBase}/api/cli-token/verify`;

    const spinner = oraFactory({ text: "  Verifying token...", color: "blue" }).start();

    let email: string | undefined;
    try {
      const res = await fetch(verifyUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      const body = await res.json() as { ok?: boolean; email?: string; error?: string };
      if (!res.ok || !body.ok) {
        spinner.fail("  Invalid token. " + (body.error ?? ""));
        console.log("");
        return;
      }
      email = body.email as string | undefined;
      spinner.succeed("  Token verified.");
    } catch {
      spinner.fail("  Could not reach RunTrim server. Check your connection.");
      console.log("");
      return;
    }

    saveGlobalAuth({ token: rawToken, storedAt: new Date().toISOString(), email });

    console.log("");
    if (email) {
      console.log(ACCENT.bold("  Connected as ") + chalk.white(email));
    } else {
      console.log(ACCENT.bold("  Connected to RunTrim cloud."));
    }
    console.log(DIM("  Token stored in ") + chalk.white("~/.runtrim/auth.json"));
    console.log("");
    console.log(DIM("  Next: navigate to a project and run ") + GO_ACCENT("runtrim sync"));
    console.log("");
  });

// ── runtrim finish ────────────────────────────────────────────────────────────

program
  .command("finish")
  .description("Bridge Mode: evaluate agent output, check scope, mark run completed, and sync")
  .option("--no-sync", "Skip cloud sync even if a CLI token is configured")
  .action(async (options: { sync?: boolean }) => {
    const cwd = process.cwd();

    console.log("");
    console.log(GO_ACCENT.bold("RunTrim finish"));
    console.log("");

    // ── Find latest active bridge run ─────────────────────────────────────
    const allRuns = loadAllRuns(cwd);
    const activeRun = allRuns.find((r) => r.status === "guarded" || r.status === "checked");

    if (!activeRun) {
      console.log(chalk.yellow("  No active RunTrim session found."));
      console.log(DIM("  Start a new session with: runtrim go \"<task>\""));
      console.log("");
      return;
    }

    const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    const projectAudit = loadProjectAudit(cwd);
    const projectName = projectAudit?.projectName ?? path.basename(cwd);

    console.log(DIM("  Run     ") + chalk.white(truncate(activeRun.task, 60)));
    console.log(DIM("  Run ID  ") + chalk.white(activeRun.id));
    console.log("");

    // ── Git diff ──────────────────────────────────────────────────────────
    const allChangedFiles = dedupeFiles(await getGitDiff(cwd));

    // ── Split RunTrim-owned files from agent files ─────────────────────────
    // RunTrim writes bridge/protocol files during `runtrim go`. These must not
    // be counted as agent code changes or trigger false scope drift.
    const sessionManagedFiles = activeRun.bridgeManagedFiles ?? [];

    // Static patterns always owned by RunTrim
    function isRuntrimOwned(f: string): boolean {
      const norm = f.replace(/\\/g, "/").toLowerCase();
      // Any .runtrim/ directory file (contracts, memory, bridge, prompts, etc.)
      if (norm.startsWith(".runtrim/")) return true;
      // Root protocol file
      if (norm === "runtrim.md") return true;
      // Session-specific files logged by writeBridgeFiles
      if (sessionManagedFiles.some(
        (m) => m.replace(/\\/g, "/").toLowerCase() === norm
      )) return true;
      return false;
    }

    const runtrimFiles: string[] = [];
    const agentFiles:   string[] = [];

    for (const f of allChangedFiles) {
      if (isRuntrimOwned(f)) {
        runtrimFiles.push(f);
      } else {
        agentFiles.push(f);
      }
    }

    // All scope evaluation runs only on agent-changed files
    const changedFiles = agentFiles;
    const maxFiles = inferMaxFilesFromScope(
      activeRun.contract.contract?.relevantScope ?? [],
      config.maxFilesPerRun
    );

    // ── Scope evaluation (agent files only) ───────────────────────────────
    const scope = evaluateWatchState({
      changedFiles,
      run: activeRun,
      maxFilesPerRun: maxFiles,
      strict: false,
    });

    const evaluation = evaluateAgentOutput(null, changedFiles, {
      task: activeRun.task,
      relevantScope:  activeRun.contract.contract?.relevantScope ?? [],
      sensitiveScope: activeRun.contract.contract?.sensitiveScope ?? [],
      forbiddenScope: activeRun.contract.contract?.forbiddenScope ?? [],
      runStatus: activeRun.status,
    });

    // ── Derive scope drift status ─────────────────────────────────────────
    let scopeDriftStatus = "passed";
    if (scope.forbiddenFiles.length > 0)       scopeDriftStatus = "forbidden_touched";
    else if (scope.outOfScopeFiles.length > 0)  scopeDriftStatus = "out_of_scope";
    else if (evaluation.scopeDriftRisk === "high" || evaluation.scopeDriftRisk === "medium")
      scopeDriftStatus = "drift_detected";

    // ── Report summary ────────────────────────────────────────────────────
    const forbiddenCount = scope.forbiddenFiles.length;
    const reportParts: string[] = [];
    if (changedFiles.length === 0) {
      reportParts.push("No agent changes detected.");
    } else {
      reportParts.push(`${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"} changed.`);
    }
    if (forbiddenCount > 0) {
      reportParts.push(`${forbiddenCount} forbidden file${forbiddenCount === 1 ? "" : "s"} touched.`);
    } else if (changedFiles.length > 0) {
      reportParts.push("No forbidden systems touched.");
    }
    if (scopeDriftStatus === "passed" && changedFiles.length > 0) {
      reportParts.push("Changes within contract.");
    }
    if (evaluation.memorySummary) reportParts.push(evaluation.memorySummary);
    const reportSummary = reportParts.join(" ");

    // ── Continuation pack ─────────────────────────────────────────────────
    const continuationPack = evaluation.nextGuardedPrompt || null;
    if (continuationPack) {
      const contDir = getConfigDir(cwd);
      if (!fs.existsSync(contDir)) fs.mkdirSync(contDir, { recursive: true });
      fs.writeFileSync(path.join(contDir, "continuation-prompt.md"), continuationPack, "utf-8");
    }

    // ── Update run record ─────────────────────────────────────────────────
    const evalRecord: RunEvaluationRecord = {
      ...evaluation,
      nextPrompt:     evaluation.nextGuardedPrompt,
      nextSafePrompt: evaluation.nextGuardedPrompt,
      nextSafeAction: evaluation.nextSafeAction,
      memorySummary:  evaluation.memorySummary,
      evaluatedAt:    evaluation.evaluatedAt,
    };

    updateRun(activeRun.id, {
      status: "completed",
      evaluation: evalRecord,
      scopeDriftStatus,
      reportSummary,
      watchStatus: scope.status,
      watchWarnings: scope.warnings,
      watchChangedFiles: agentFiles, // only agent changes, not RunTrim protocol files
    }, cwd);

    // Write memory from updated runs
    const freshRuns = loadAllRuns(cwd);
    const updatedRun = freshRuns.find((r) => r.id === activeRun.id) ?? activeRun;
    writeMemoryFromRuns(updatedRun, freshRuns, config, cwd);

    // ── Restore resting-state protocol ───────────────────────────────────
    // Archive session files before overwriting them
    archiveContract(cwd, activeRun.id);
    archiveMemory(cwd, activeRun.id);
    // Reset to canonical/resting state so agents never see stale session data
    writeCanonicalRuntrimMd(cwd, projectName);
    writeRestingContract(cwd);
    writeRestingMemory(cwd);
    // Remove legacy bridge blocks from agent instruction files (CLAUDE.md, AGENTS.md)
    const bridgeRemovals: string[] = [];
    if (removeBridgeBlock(path.join(cwd, "CLAUDE.md")))  bridgeRemovals.push("CLAUDE.md");
    if (removeBridgeBlock(path.join(cwd, "AGENTS.md")))  bridgeRemovals.push("AGENTS.md");

    // ── Cloud sync ────────────────────────────────────────────────────────
    let cloudSync: CloudSyncResult = { status: "skipped_no_token" };
    if (options.sync !== false) {
      const memoryMarkdown = (() => { try { return readMemory(cwd); } catch { return null; } })();
      cloudSync = await syncRunsToCloud({
        cwd,
        config,
        projectName,
        projectAudit: projectAudit ?? null,
        memoryMarkdown: memoryMarkdown ?? "",
        runs: freshRuns,
        markPendingRunIds: [activeRun.id],
      });
    }

    // ── Output ────────────────────────────────────────────────────────────
    const scopeColor = scopeDriftStatus === "passed" ? chalk.green
      : scopeDriftStatus === "forbidden_touched" ? chalk.red
      : chalk.yellow;

    const riskAfter = activeRun.contract.wasteRiskAfter ?? "medium";
    const riskColor = ({ low: chalk.green, medium: chalk.yellow, high: chalk.hex("#FF8C00"), critical: chalk.red } as Record<string, typeof chalk>)[riskAfter] ?? chalk.white;

    console.log(GO_ACCENT.bold("Run"));
    console.log(chalk.white("  " + truncate(activeRun.task, 70)));
    console.log("");

    // Agent-changed files (what matters for drift/risk)
    if (changedFiles.length > 0) {
      console.log(GO_ACCENT.bold("Changed files"));
      for (const f of changedFiles.slice(0, 8)) {
        const isForbidden = scope.forbiddenFiles.includes(f);
        const isSensitive = scope.sensitiveFiles.includes(f);
        const marker = isForbidden ? chalk.red(" [forbidden]") : isSensitive ? chalk.yellow(" [sensitive]") : "";
        console.log(chalk.white("  - " + f) + marker);
      }
      if (changedFiles.length > 8) {
        console.log(DIM(`  ... and ${changedFiles.length - 8} more`));
      }
      console.log("");
    } else {
      console.log(GO_ACCENT.bold("Changed files"));
      console.log(DIM("  No agent changes detected."));
      console.log("");
    }

    // RunTrim-managed files (shown separately, excluded from drift)
    if (runtrimFiles.length > 0) {
      console.log(GO_ACCENT.bold("RunTrim files"));
      for (const f of runtrimFiles) {
        console.log(DIM("  - " + f));
      }
      console.log("");
    }

    console.log(GO_ACCENT.bold("Scope"));
    if (changedFiles.length === 0) {
      console.log(chalk.green("  No agent changes to evaluate."));
    } else {
      console.log(scopeColor("  " + (scopeDriftStatus === "passed" ? "Passed" : scopeDriftStatus === "forbidden_touched" ? "Failed — forbidden files touched" : "Drift detected")));
    }
    console.log("");

    console.log(GO_ACCENT.bold("Risk"));
    console.log(riskColor("  " + riskAfter));
    console.log("");

    console.log(GO_ACCENT.bold("Report"));
    console.log(chalk.white("  " + reportSummary));
    console.log("");

    if (continuationPack) {
      console.log(GO_ACCENT.bold("Continuation"));
      console.log(chalk.white("  Saved to .runtrim/continuation-prompt.md"));
      console.log("");
    }

    if (evaluation.nextSafeAction && evaluation.nextSafeAction !== "Run is ready to continue.") {
      console.log(GO_ACCENT.bold("Next safest step"));
      console.log(chalk.white("  " + evaluation.nextSafeAction));
      console.log("");
    }

    if (options.sync !== false) {
      console.log(GO_ACCENT.bold("Cloud sync"));
      if (cloudSync.status === "synced") {
        console.log(chalk.white("  Completed run synced."));
      } else if (cloudSync.status === "failed") {
        console.log(chalk.yellow("  Failed. Run saved locally. Use runtrim sync later."));
      } else if (cloudSync.status === "skipped_no_token" || cloudSync.status === "skipped_invalid_token") {
        console.log(DIM("  Skipped. Run runtrim login to connect your dashboard."));
      } else {
        console.log(DIM("  Skipped."));
      }
      console.log("");
    }

    // ── Protocol resting state ─────────────────────────────────────────────
    console.log(GO_ACCENT.bold("Protocol"));
    console.log(DIM("  ") + chalk.white("RUNTRIM.md restored"));
    console.log(DIM("  ") + chalk.white("latest contract archived"));
    console.log(DIM("  ") + chalk.white("current memory reset"));
    if (bridgeRemovals.length > 0) {
      for (const f of bridgeRemovals) {
        console.log(DIM("  ") + chalk.white(`${f} bridge block removed`));
      }
    }
    console.log("");
  });

// ── runtrim sync ──────────────────────────────────────────────────────────────

program
  .command("sync")
  .description("Sync local run history and project memory to your RunTrim dashboard")
  .option("--dry-run", "Show what would be synced without uploading")
  .action(async (opts: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  cloud sync"));
    console.log("");

    const config = configExists(cwd) ? loadConfig(cwd) : DEFAULT_CONFIG;
    const apiBase  = resolveApiBase(config);
    const syncUrl  = `${apiBase}/api/sync`;

    const runs = loadAllRuns(cwd);
    if (runs.length === 0) {
      console.log(DIM("  No local runs found in this directory."));
      console.log(DIM("  Run ") + GO_ACCENT('runtrim go "your task"') + DIM(" first to create runs."));
      console.log("");
      return;
    }

    const projectAudit = loadProjectAudit(cwd);
    const projectName = projectAudit?.projectName ?? path.basename(cwd);
    const memoryMarkdown = (() => {
      try { return readMemory(cwd); } catch { return ""; }
    })();

    const payload = buildSyncPayload({
      cwd,
      projectName,
      config,
      projectAudit: projectAudit ?? null,
      memoryMarkdown: memoryMarkdown ?? "",
      runs,
    });

    console.log(DIM("  Project    ") + chalk.white(payload.project.name));
    console.log(DIM("  Runs       ") + chalk.white(String(payload.runs.length)));
    console.log(DIM("  API        ") + chalk.white(syncUrl));
    console.log("");

    if (opts.dryRun) {
      console.log(ACCENT.bold("  Dry run � nothing uploaded."));
      console.log("");
      return;
    }

    const spinner = oraFactory({ text: "  Syncing...", color: "blue" }).start();

    try {
      const result = await syncRunsToCloud({
        cwd,
        config,
        projectName,
        projectAudit: projectAudit ?? null,
        memoryMarkdown: memoryMarkdown ?? "",
        runs,
      });

      if (result.status !== "synced") {
        spinner.fail("  Sync failed.");
        console.log("");
        if (result.status === "skipped_no_token") {
          console.log(chalk.yellow("  No CLI token found."));
          console.log(DIM("  Run ") + GO_ACCENT("runtrim login") + DIM(" to connect cloud sync."));
          console.log(DIM("  Local CLI still works without a token."));
        } else if (result.status === "skipped_invalid_token") {
          console.log(chalk.yellow("  Stored token format is invalid. Re-run: runtrim login"));
        } else if (result.error) {
          console.log(chalk.red("  Error: ") + chalk.white(result.error));
          if (result.details) console.log(chalk.red("  Details: ") + chalk.white(result.details));
        } else {
          console.log(chalk.yellow("  Failed. Run saved locally. Use runtrim sync later."));
        }
        console.log("");
        return;
      }

      spinner.succeed("  Sync complete.");
      console.log("");
      const syncedRuns = result.syncedRuns ?? payload.runs.length;
      console.log(ACCENT.bold("  Synced") + chalk.white(`  ${syncedRuns} run${syncedRuns === 1 ? "" : "s"}`));
      console.log("");
      console.log(DIM("  View at  ") + GO_ACCENT(`${apiBase}/app`));
      console.log("");
    } catch {
      spinner.fail("  Network error. Check your connection.");
      console.log("");
    }
  });
program.parse(process.argv);

