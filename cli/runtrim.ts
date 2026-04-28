#!/usr/bin/env node

import { Command } from "commander";
import chalk, { type ChalkInstance } from "chalk";
import ora from "ora";
import prompts from "prompts";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";
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
import type { RunEvaluationRecord } from "../src/lib/run-storage.ts";
import { readMemory, writeMemoryFromRuns } from "../src/lib/run-memory.ts";

const ACCENT = chalk.hex("#C8901A");
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

program
  .name("runtrim")
  .description("CLI guard layer for AI coding runs")
  .version("0.1.0");

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ INIT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

program
  .command("init")
  .description("Initialize RunTrim in the current project")
  .action(async () => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  CLI guard layer for AI coding runs"));
    console.log("");

    if (configExists(cwd)) {
      console.log(chalk.yellow("  Config already exists at .runtrim/config.json"));
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: "Overwrite existing config?",
        initial: false,
      });
      if (!overwrite) {
        console.log(DIM("  Aborted."));
        console.log("");
        return;
      }
    }

    const spinner = ora({ text: "Detecting project...", color: "yellow" }).start();
    const projectInfo = detectProjectInfo(cwd);
    const projectContext = detectProjectContext(cwd);
    await new Promise((r) => setTimeout(r, 300));
    spinner.stop();

    const detected: string[] = [];
    if (projectContext.framework.length > 0)
      detected.push("Framework: " + projectContext.framework.join(", "));
    if (projectContext.hasSrc) detected.push("src/ directory found");
    if (projectContext.hasApp) detected.push("App Router detected");
    if (projectContext.hasPages) detected.push("Pages Router detected");
    if (projectContext.hasMiddleware) detected.push("Middleware file detected");
    if (projectContext.hasEnvFile) detected.push(".env file detected");

    if (detected.length > 0) {
      console.log(DIM("  Detected:"));
      for (const d of detected) console.log(DIM("    " + d));
      console.log("");
    }

    const config = { ...DEFAULT_CONFIG, ...projectInfo };

    const configDir = getConfigDir(cwd);
    const runsDir = getRunsDir(cwd);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });

    saveConfig(config, cwd);

    const gitignorePath = path.join(cwd, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      if (!content.includes(".runtrim/runs")) {
        fs.appendFileSync(gitignorePath, "\n# RunTrim run history\n.runtrim/runs/\n");
      }
    }

    console.log(ACCENT.bold("  RunTrim initialized."));
    console.log("");
    console.log(DIM("  .runtrim/config.json   ") + chalk.white("created"));
    console.log(DIM("  .runtrim/runs/         ") + chalk.white("created"));
    console.log("");
    console.log(DIM("  Next: ") + chalk.white('runtrim guard "your task here"'));
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

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ GUARD ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

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

    const auditSpinner = ora({ text: "Auditing task...", color: "yellow" }).start();
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
      const cwd = process.cwd();

      console.log("");
      console.log(BOLD("RunTrim") + DIM("  prepare"));
      console.log("");

      if (!configExists(cwd)) {
        console.log(chalk.yellow("  No config found. Run: runtrim init"));
        console.log("");
        return;
      }

      const config = loadConfig(cwd);
      const selectedAgent = (options.agent ?? config.defaultAgent ?? "claude").toLowerCase();
      const auditSpinner = ora({ text: "Auditing task...", color: "yellow" }).start();
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
  );

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ CHECK ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

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

    const diffSpinner = ora({ text: "Reading git diff...", color: "yellow" }).start();
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
      console.log(chalk.yellow("  No runs found. Run: runtrim guard \"your task\""));
      console.log("");
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
  .command("report")
  .description("Show a summary of all local RunTrim runs")
  .action(async () => {
    const cwd = process.cwd();

    console.log("");
    console.log(BOLD("RunTrim") + DIM("  report"));
    console.log("");

    const runs = loadAllRuns(cwd);

    if (runs.length === 0) {
      console.log(chalk.yellow("  No runs found. Run: runtrim guard \"your task\""));
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
    console.log(DIM("  Focus       ") + chalk.white(truncate(latestRun.contract.contract?.cleanedObjective ?? latestRun.task, 58)));
    console.log(DIM("  Status      ") + chalk.white(formatStatus(latestEval?.status ?? latestRun.status)));
    console.log(DIM("  Changed     ") + chalk.white(`${latestEval?.changedFiles?.length ?? 0} file${(latestEval?.changedFiles?.length ?? 0) === 1 ? "" : "s"}`));
    console.log(DIM("  Missing     ") + chalk.white((latestEval?.missingProofItems?.length ?? 0) > 0 ? latestEval?.missingProofItems?.join(", ") : "none"));
    console.log(DIM("  Next        ") + chalk.white(latestEval?.nextSafeAction ?? "Run runtrim check to evaluate latest run."));
    if (latestEval?.nextPrompt) {
      console.log(DIM("  Prompt      ") + chalk.white(truncate(latestEval.nextPrompt.replace(/\s+/g, " "), 92)));
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
