#!/usr/bin/env node

import { Command } from "commander";
import chalk, { type ChalkInstance } from "chalk";
import ora from "ora";
import prompts from "prompts";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";

import {
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG,
  getConfigDir,
  getRunsDir,
  configExists,
  detectProjectInfo,
} from "../src/lib/runtrim-config.ts";
import { auditTask, detectProjectContext } from "../src/lib/run-audit.ts";
import { generateContract } from "../src/lib/run-contract.ts";
import { saveRun, loadLatestRun, loadAllRuns, updateRun } from "../src/lib/run-storage.ts";
import { getGitDiff, evaluateAgentOutput } from "../src/lib/run-evaluation.ts";
import { formatRisk, formatStatus, formatScore, formatDate, truncate } from "../src/lib/format.ts";

const ACCENT = chalk.hex("#C8901A");
const DIM = chalk.gray;
const BOLD = chalk.white.bold;

const program = new Command();

program
  .name("runtrim")
  .description("CLI guard layer for AI coding runs")
  .version("0.1.0");

// ─── INIT ────────────────────────────────────────────────────────────────────

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

// ─── GUARD ───────────────────────────────────────────────────────────────────

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

    // ── BLOCKED MEGA-RUN PATH ─────────────────────────────────────────────────
    if (contract.isBlocked && contract.splitReport) {
      const sr = contract.splitReport;

      console.log(DIM("  " + "─".repeat(49)));
      console.log(chalk.red.bold("  SPLIT REQUIRED"));
      console.log(DIM("  " + "─".repeat(49)));
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
      console.log(DIM("  " + "─".repeat(49)));
      console.log(DIM("  RECOMMENDED SPLIT"));
      console.log(DIM("  " + "─".repeat(49)));
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
      console.log(DIM("  " + "─".repeat(49)));
      console.log(DIM("  NEXT SAFE PROMPT"));
      console.log(DIM("  " + "─".repeat(49)));
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
      run.status = "blocked" as typeof run.status;
      console.log("");
      console.log(DIM("  Run saved: .runtrim/runs/" + run.id + ".json  (status: blocked)"));
      console.log("");
      console.log(DIM("  Next:  ") + chalk.white('runtrim guard "<one system at a time>"'));
      console.log("");
      return;
    }

    // ── NORMAL GUARDED PATH ───────────────────────────────────────────────────
    const riskBefore = riskColors[audit.wasteRiskBefore] ?? chalk.white;
    const riskAfter = riskColors[contract.wasteRiskAfter] ?? chalk.green;
    const scoreDelta = contract.promptScoreAfter - audit.promptScoreBefore;
    const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  AUDIT REPORT"));
    console.log(DIM("  " + "─".repeat(49)));
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
    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  GUARDED CONTRACT"));
    console.log(DIM("  " + "─".repeat(49)));
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
      console.log(DIM("  " + "─".repeat(49)));
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

// ─── CHECK ───────────────────────────────────────────────────────────────────

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

    console.log(DIM("  Latest run:  ") + chalk.white(truncate(run.task, 55)));
    console.log(DIM("  Guarded at:  ") + chalk.white(formatDate(run.createdAt)));
    console.log("");

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

    const forbiddenScope = run.contract.contract?.forbiddenScope ?? [];
    const evaluation = evaluateAgentOutput(agentOutput, changedFiles, forbiddenScope, run.task);

    updateRun(run.id, { evaluation, status: "checked" }, cwd);

    const statusColors: Record<string, ChalkInstance> = {
      passed: chalk.green,
      partial: chalk.yellow,
      needs_verification: chalk.hex("#FF8C00"),
      drift_detected: chalk.red,
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
    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  EVALUATION"));
    console.log(DIM("  " + "─".repeat(49)));
    console.log("");
    console.log(DIM("  Status         ") + statusColor(formatStatus(evaluation.status).toUpperCase()));
    console.log(DIM("  Contract score ") + chalk.white(formatScore(evaluation.contractScore)));
    console.log(DIM("  Scope drift    ") + driftColor(evaluation.scopeDriftRisk.toUpperCase()));
    console.log("");

    if (evaluation.driftedFiles.length > 0) {
      console.log(chalk.red("  Drifted files:"));
      for (const f of evaluation.driftedFiles) console.log(chalk.red("    x " + f));
      console.log("");
    }

    if (evaluation.missingProofItems.length > 0) {
      console.log(chalk.yellow("  Missing:"));
      for (const item of evaluation.missingProofItems) console.log(DIM("    - " + item));
      console.log("");
    }

    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  NEXT GUARDED PROMPT"));
    console.log(DIM("  " + "─".repeat(49)));
    console.log("");
    for (const line of evaluation.nextGuardedPrompt.split("\n")) {
      console.log(DIM("  " + line));
    }
    console.log("");

    try {
      await clipboard.write(evaluation.nextGuardedPrompt);
      console.log(ACCENT.bold("  Next prompt copied to clipboard."));
    } catch {
      // ignore
    }

    console.log("");
  });

// ─── REPORT ──────────────────────────────────────────────────────────────────

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

    const totalTokens = runs.reduce((sum, r) => {
      const n = parseInt(r.contract.estimatedTokensTrimmed.replace(/[^\d]/g, ""), 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);

    const avgRiskReduction = Math.round(
      runs.reduce((sum, r) => sum + (r.contract.riskReductionPercent ?? 0), 0) / runs.length
    );

    const driftWarnings = runs.filter(
      (r) =>
        r.evaluation?.scopeDriftRisk === "high" || r.evaluation?.scopeDriftRisk === "medium"
    ).length;

    const latestRun = runs[0];

    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  PROJECT REPORT"));
    console.log(DIM("  " + "─".repeat(49)));
    console.log("");
    console.log(DIM("  Runs guarded           ") + chalk.white(String(runs.length)));
    console.log(
      DIM("  Est. tokens trimmed    ") + ACCENT("~" + totalTokens.toLocaleString("en-US") + " (estimated)")
    );
    console.log(DIM("  Avg. risk reduction    ") + chalk.white(avgRiskReduction + "%"));
    console.log(
      DIM("  Scope drift warnings   ") +
        (driftWarnings > 0 ? chalk.yellow(String(driftWarnings)) : chalk.green("0"))
    );
    console.log("");
    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  RUN HISTORY"));
    console.log(DIM("  " + "─".repeat(49)));
    console.log("");

    for (const run of runs.slice(0, 10)) {
      const statusColor =
        run.evaluation
          ? (statusColors[run.evaluation.status] ?? DIM)
          : DIM;
      const status = run.evaluation
        ? formatStatus(run.evaluation.status)
        : formatStatus(run.status);

      console.log(
        DIM("  " + formatDate(run.createdAt) + "  ") +
          chalk.white(truncate(run.task, 38).padEnd(40)) +
          "  " +
          statusColor(status)
      );
    }

    console.log("");
    console.log(DIM("  " + "─".repeat(49)));
    console.log(DIM("  LATEST RUN STATUS"));
    console.log(DIM("  " + "─".repeat(49)));
    console.log("");
    console.log(DIM("  Task:  ") + chalk.white(truncate(latestRun.task, 60)));
    console.log(DIM("  Risk:  ") + chalk.white(formatRisk(latestRun.audit.wasteRiskBefore)));

    if (latestRun.evaluation?.status === "drift_detected") {
      console.log("");
      console.log(chalk.red("  x Scope drift detected. Resolve before continuing."));
    } else if (latestRun.evaluation?.status === "passed") {
      console.log("");
      console.log(chalk.green("  + Ready for next guarded run."));
    } else {
      console.log("");
      console.log(DIM("  - Run runtrim check after your agent completes."));
    }

    console.log("");
  });

const statusColors: Record<string, ChalkInstance> = {
  passed: chalk.green,
  partial: chalk.yellow,
  needs_verification: chalk.hex("#FF8C00"),
  drift_detected: chalk.red,
};

program.parse(process.argv);
