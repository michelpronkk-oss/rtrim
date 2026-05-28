import * as fs from "node:fs";
import * as path from "node:path";
import { execFile, execFileSync } from "node:child_process";

const vscode: any = require("vscode");

type StatusState = "not_installed" | "no_project" | "ready" | "active" | "blocked";
type AgentOption = "Auto" | "Claude Code" | "Codex" | "Cursor" | "Custom";
type ModeOption = "Auto" | "Strict" | "UI only" | "Docs only";

type LocalState = {
  cliInstalled: boolean;
  workspaceRoot?: string;
  dnaExists: boolean;
  baselineExists: boolean;
  latestContractExists: boolean;
  contractStatus?: string;
};

type DnaSummary = {
  framework?: string;
  packageManager?: string;
  language?: string;
  riskZones: string[];
  riskPathCount?: number;
};

type ContractSummary = {
  status?: string;
  task?: string;
  scope?: string;
  blockedReason?: string;
};

type ComposerState = {
  task: string;
  selectedAgent: AgentOption;
  selectedMode: ModeOption;
  preview: string;
  nextAction: string;
};

const COMMANDS = {
  newGuardedRun: "runtrim.newGuardedRun",
  finishCheck: "runtrim.finishCheck",
  doctor: "runtrim.doctor",
  continuePrompt: "runtrim.continuePrompt",
  refreshProjectDna: "runtrim.refreshProjectDna",
  openDashboard: "runtrim.openDashboard",
  openControlPanel: "runtrim.openControlPanel"
};

const SETTINGS = {
  defaultAgent: "runtrim.agent.defaultAgent",
  customCommand: "runtrim.agent.customCommand",
  claudeCommand: "runtrim.agent.claudeCommand",
  codexCommand: "runtrim.agent.codexCommand",
  autoLaunchTerminal: "runtrim.agent.autoLaunchTerminal"
};

let statusBarItem: any;
let outputChannel: any;
let controlPanel: any = null;
let composerState: ComposerState = {
  task: "",
  selectedAgent: "Auto",
  selectedMode: "Auto",
  preview: "",
  nextAction: "Compose a guarded run, then build a contract preview."
};

export function activate(context: any): void {
  outputChannel = vscode.window.createOutputChannel("RunTrim");
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  statusBarItem.command = COMMANDS.openControlPanel;
  statusBarItem.show();
  context.subscriptions.push(outputChannel, statusBarItem);

  registerCommand(context, COMMANDS.openControlPanel, () => openControlPanel());
  registerCommand(context, COMMANDS.newGuardedRun, () => runNewGuardedRun());
  registerCommand(context, COMMANDS.finishCheck, () => runAndRefresh("finish", ["finish"]));
  registerCommand(context, COMMANDS.doctor, () => runAndRefresh("doctor", ["doctor"]));
  registerCommand(context, COMMANDS.continuePrompt, () => runAndRefresh("continue", ["continue", "--reason", "usage_limit"]));
  registerCommand(context, COMMANDS.refreshProjectDna, () => runAndRefresh("start", ["start", "--refresh-dna"]));
  registerCommand(context, COMMANDS.openDashboard, async () => {
    await vscode.env.openExternal(vscode.Uri.parse("https://www.runtrim.com/app"));
  });

  const cfg = vscode.workspace.getConfiguration("runtrim.agent");
  const configuredDefaultAgent = cfg.get("defaultAgent", "Auto");
  if (isAgentOption(configuredDefaultAgent)) {
    composerState.selectedAgent = configuredDefaultAgent;
  }

  refreshStatusBar();
}

function registerCommand(context: any, id: string, callback: () => void | Promise<void>): void {
  context.subscriptions.push(vscode.commands.registerCommand(id, callback));
}

async function runNewGuardedRun(): Promise<void> {
  const local = loadLocalState();
  if (!local.cliInstalled) return showInstallError();
  if (!local.dnaExists) return showNoProjectError();
  const task = await vscode.window.showInputBox({
    prompt: "Task for guarded run",
    placeHolder: "Fix onboarding copy while preserving billing logic",
    ignoreFocusOut: true,
    validateInput: (v: string) => (v.trim().length ? undefined : "Task is required.")
  });
  if (!task) return;
  await runAndRefresh("agent", ["agent", task, "--copy"]);
}

async function runAndRefresh(name: string, args: string[]): Promise<void> {
  const local = loadLocalState();
  if (!local.cliInstalled) return showInstallError();
  if (!local.workspaceRoot) {
    void vscode.window.showErrorMessage("No workspace folder is open. Open a project folder first.");
    return;
  }

  outputChannel.show(true);
  outputChannel.appendLine(`$ runtrim ${args.join(" ")}`);
  const result = await runRuntrim(args);
  if (result.stdout) outputChannel.appendLine(result.stdout);
  if (result.stderr) outputChannel.appendLine(result.stderr);
  outputChannel.appendLine("");

  if (result.notFound) return showInstallError();
  if (result.exitCode !== 0) {
    const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
    if (combined.includes("no project") || combined.includes("not initialized") || combined.includes("runtrim start")) {
      showNoProjectError();
    } else {
      void vscode.window.showWarningMessage(`RunTrim ${name} failed. Check the RunTrim output panel.`);
    }
  }

  await refreshStatusBar(`${result.stdout}\n${result.stderr}`);
  refreshControlPanel();
}

async function buildContractPreview(): Promise<void> {
  const local = loadLocalState();
  const task = composerState.task.trim();
  if (!task) {
    void vscode.window.showWarningMessage("Add a task first to build a contract preview.");
    return;
  }

  const root = local.workspaceRoot ? path.basename(local.workspaceRoot) : "no workspace";
  const dna = local.workspaceRoot && local.dnaExists
    ? parseDna(path.join(local.workspaceRoot, ".runtrim", "project-dna.md"))
    : null;
  const risky = dna?.riskZones.length ? dna.riskZones.join(", ") : "none detected";
  const dnaState = local.dnaExists ? "active" : "missing";
  const behavior = likelyBehavior(composerState.selectedAgent);
  const nextAction = !local.cliInstalled
    ? "Install RunTrim CLI with npm install -g runtrim."
    : !local.workspaceRoot
      ? "Open a project folder and build contract again."
      : !local.dnaExists
        ? "Run Refresh Project DNA, then build contract again."
        : "Run with Agent to generate guarded handoff and route it safely.";

  composerState.preview = [
    `Task: ${task}`,
    `Selected agent: ${composerState.selectedAgent}`,
    `Mode: ${composerState.selectedMode}`,
    `Project DNA: ${dnaState}`,
    `Workspace: ${root}`,
    `Risky zones: ${risky}`,
    `Likely behavior: ${behavior}`,
    `Next action: ${nextAction}`
  ].join("\n");
  composerState.nextAction = nextAction;
  refreshControlPanel();
}

async function runWithAgent(): Promise<void> {
  const local = loadLocalState();
  const task = composerState.task.trim();
  if (!task) {
    void vscode.window.showWarningMessage("Add a task before Run with Agent.");
    return;
  }
  if (!local.cliInstalled) return showInstallError();
  if (!local.workspaceRoot) {
    void vscode.window.showErrorMessage("No workspace folder is open. Open a project folder first.");
    return;
  }
  if (!local.dnaExists) {
    void vscode.window.showWarningMessage("Project DNA is missing. Run RunTrim: Refresh Project DNA first.");
    return;
  }

  const routedTask = composerState.selectedMode === "Auto"
    ? task
    : `${task} [mode: ${composerState.selectedMode}]`;

  outputChannel.show(true);
  outputChannel.appendLine(`$ runtrim agent "${routedTask}" --copy`);
  const result = await runRuntrim(["agent", routedTask, "--copy"]);
  if (result.stdout) outputChannel.appendLine(result.stdout);
  if (result.stderr) outputChannel.appendLine(result.stderr);
  outputChannel.appendLine("");

  if (result.exitCode !== 0 || result.notFound) {
    if (result.notFound) showInstallError();
    else void vscode.window.showErrorMessage("Could not create guarded handoff. Check the RunTrim output channel.");
    await refreshStatusBar(`${result.stdout}\n${result.stderr}`);
    refreshControlPanel();
    return;
  }

  const handoffPath = path.join(local.workspaceRoot, ".runtrim", "agent", "latest.md");
  const handoff = readFile(handoffPath);
  if (!handoff) {
    void vscode.window.showWarningMessage("Guarded handoff was not found after runtrim agent. Try Build Contract again.");
    await refreshStatusBar();
    refreshControlPanel();
    return;
  }

  const routed = await routeAgent(composerState.selectedAgent, task, handoff, local.workspaceRoot);
  composerState.nextAction = routed;
  await refreshStatusBar(`${result.stdout}\n${result.stderr}`);
  refreshControlPanel();
}

async function copyHandoff(): Promise<void> {
  const root = workspaceRoot();
  if (!root) {
    void vscode.window.showWarningMessage("No workspace folder is open.");
    return;
  }
  const handoff = readFile(path.join(root, ".runtrim", "agent", "latest.md"));
  if (!handoff) {
    void vscode.window.showWarningMessage("No guarded handoff found. Run Build Contract then Run with Agent.");
    return;
  }
  await vscode.env.clipboard.writeText(handoff);
  void vscode.window.showInformationMessage("Guarded handoff copied. Source stays local.");
}

async function routeAgent(
  selectedAgent: AgentOption,
  task: string,
  handoff: string,
  projectRoot: string
): Promise<string> {
  const cfg = vscode.workspace.getConfiguration();
  const customTemplate = (cfg.get(SETTINGS.customCommand) ?? "").trim();
  const claudeTemplate = (cfg.get(SETTINGS.claudeCommand) ?? "").trim();
  const codexTemplate = (cfg.get(SETTINGS.codexCommand) ?? "").trim();
  const autoLaunchTerminal = cfg.get(SETTINGS.autoLaunchTerminal, true);
  const hasClaude = commandExists("claude");
  const hasCodex = commandExists("codex");

  const launch = async (template: string, name: string): Promise<boolean> => {
    if (!template) return false;
    const rendered = renderCommandTemplate(template, task, handoff, projectRoot);
    if (!rendered) return false;
    if (!autoLaunchTerminal) {
      await vscode.env.clipboard.writeText(handoff);
      void vscode.window.showInformationMessage(`${name} command ready. Guarded handoff copied. Paste into your local agent.`);
      return true;
    }
    const terminal = vscode.window.createTerminal({ name: `RunTrim ${name}`, cwd: projectRoot });
    terminal.show(true);
    terminal.sendText(rendered, true);
    outputChannel.appendLine(`[launch] ${name}: ${rendered}`);
    return true;
  };

  if (selectedAgent === "Cursor") {
    await vscode.env.clipboard.writeText(handoff);
    void vscode.window.showInformationMessage("Guarded handoff copied. Open Cursor Agent and paste it.");
    return "Paste handoff into Cursor Agent, then run finish check after edits.";
  }

  if (selectedAgent === "Custom") {
    if (!customTemplate) {
      void vscode.window.showWarningMessage("Set runtrim.agent.customCommand to launch Custom agent. Guarded handoff copied.");
      await vscode.env.clipboard.writeText(handoff);
      return "Configure runtrim.agent.customCommand or paste handoff manually.";
    }
    const launched = await launch(customTemplate, "Custom");
    return launched ? "Custom command launched from local terminal." : "Could not launch Custom command. Use Copy Handoff.";
  }

  if (selectedAgent === "Claude Code") {
    if (hasClaude && claudeTemplate && await launch(claudeTemplate, "Claude Code")) {
      return "Claude Code command launched from local terminal.";
    }
    await vscode.env.clipboard.writeText(handoff);
    void vscode.window.showInformationMessage("Guarded handoff copied. Paste into Claude Code.");
    return hasClaude
      ? "Claude CLI detected, but no configured command template. Paste handoff manually."
      : "Claude CLI not detected. Paste handoff into Claude Code.";
  }

  if (selectedAgent === "Codex") {
    if (hasCodex && codexTemplate && await launch(codexTemplate, "Codex")) {
      return "Codex command launched from local terminal.";
    }
    await vscode.env.clipboard.writeText(handoff);
    void vscode.window.showInformationMessage("Guarded handoff copied. Paste into Codex.");
    return hasCodex
      ? "Codex CLI detected, but no configured command template. Paste handoff manually."
      : "Codex CLI not detected. Paste handoff into Codex.";
  }

  if (customTemplate && await launch(customTemplate, "Auto")) {
    return "Auto used configured custom command.";
  }
  if (hasClaude && claudeTemplate && await launch(claudeTemplate, "Claude Code")) {
    return "Auto routed to Claude Code command.";
  }
  if (hasCodex && codexTemplate && await launch(codexTemplate, "Codex")) {
    return "Auto routed to Codex command.";
  }

  await vscode.env.clipboard.writeText(handoff);
  const fallback = hasClaude ? "Claude Code" : hasCodex ? "Codex" : "your selected local agent";
  void vscode.window.showInformationMessage(`Guarded handoff copied. Paste into ${fallback}.`);
  return "Auto fallback used safe handoff copy.";
}

function renderCommandTemplate(template: string, task: string, handoff: string, projectRoot: string): string {
  const compactHandoff = handoff.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  return template
    .replace(/\{task\}/g, shellSafe(task))
    .replace(/\{handoff\}/g, shellSafe(compactHandoff))
    .replace(/\{projectRoot\}/g, shellSafe(projectRoot))
    .trim();
}

function shellSafe(input: string): string {
  return `"${input.replace(/"/g, '\\"')}"`;
}

function commandExists(command: string): boolean {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const output = execFileSync(cmd, [command], { stdio: "pipe" }).toString();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

function runRuntrim(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number; notFound: boolean }> {
  return new Promise((resolve) => {
    execFile("runtrim", args, { cwd: workspaceRoot(), windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        resolve({ stdout: "", stderr: "", exitCode: 1, notFound: true });
        return;
      }
      const err = error as (NodeJS.ErrnoException & { exitCode?: number }) | null;
      const exitCode = err?.exitCode ?? (error ? 1 : 0);
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode, notFound: false });
    });
  });
}

function showInstallError(): void {
  void vscode.window
    .showErrorMessage("RunTrim CLI is not installed. Run: npm install -g runtrim", "Copy command")
    .then((choice: string | undefined) => {
      if (choice) vscode.env.clipboard.writeText("npm install -g runtrim");
    });
}

function showNoProjectError(): void {
  void vscode.window
    .showErrorMessage("No RunTrim project found. Run runtrim start in this project first.", "Open terminal")
    .then((choice: string | undefined) => {
      if (choice) vscode.commands.executeCommand("workbench.action.terminal.new");
    });
}

async function refreshStatusBar(lastOutput = ""): Promise<void> {
  const local = loadLocalState();
  const state = deriveStatus(local, lastOutput);
  const map: Record<StatusState, { text: string; color?: string; tooltip: string }> = {
    not_installed: { text: "RunTrim: not installed", color: "statusBarItem.warningForeground", tooltip: "runtrim CLI is not in PATH" },
    no_project: { text: "RunTrim: no project", color: "statusBarItem.warningForeground", tooltip: "No .runtrim project state found in this workspace" },
    ready: { text: "RunTrim: ready", color: "#7ce6c0", tooltip: "RunTrim project is initialized and ready" },
    active: { text: "RunTrim: active", color: "statusBarItem.prominentForeground", tooltip: "An active guarded contract exists" },
    blocked: { text: "RunTrim: blocked", color: "#e9bb6f", tooltip: "Contract is blocked or finish check reported blocked" }
  };
  const view = map[state];
  statusBarItem.text = view.text;
  statusBarItem.color = view.color;
  statusBarItem.tooltip = view.tooltip;
}

function deriveStatus(local: LocalState, lastOutput: string): StatusState {
  if (!local.cliInstalled) return "not_installed";
  if (!local.workspaceRoot || !local.dnaExists) return "no_project";
  const contract = (local.contractStatus ?? "").toLowerCase();
  const output = lastOutput.toLowerCase();
  if (contract.includes("blocked") || output.includes("blocked")) return "blocked";
  if (contract.includes("active")) return "active";
  return "ready";
}

function loadLocalState(): LocalState {
  const root = workspaceRoot();
  const cliInstalled = commandExists("runtrim");
  if (!root) return { cliInstalled, dnaExists: false, baselineExists: false, latestContractExists: false };

  const runtrimRoot = path.join(root, ".runtrim");
  const dnaFile = path.join(runtrimRoot, "project-dna.md");
  const baselineFile = path.join(runtrimRoot, "history", "baseline.json");
  const latestContractFile = path.join(runtrimRoot, "contracts", "latest.md");
  return {
    cliInstalled,
    workspaceRoot: root,
    dnaExists: fileExists(dnaFile),
    baselineExists: fileExists(baselineFile),
    latestContractExists: fileExists(latestContractFile),
    contractStatus: fileExists(latestContractFile) ? findLine(latestContractFile, /^Status\s*:/i) : undefined
  };
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function findLine(filePath: string, pattern: RegExp): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).find((line) => pattern.test(line));
  } catch {
    return undefined;
  }
}

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function parseDna(filePath: string): DnaSummary | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const extract = (key: string): string | undefined => {
      const line = lines.find((l) => l.toLowerCase().startsWith(`- ${key.toLowerCase()}:`));
      return line?.replace(/^- [^:]+:\s*/i, "").trim();
    };
    const riskStart = lines.findIndex((l) => /^## Risky zones/i.test(l));
    const riskEnd = lines.findIndex((l, i) => i > riskStart && /^## /.test(l));
    const riskLines = riskStart >= 0
      ? lines.slice(riskStart + 1, riskEnd >= 0 ? riskEnd : undefined).filter((l) => l.trim().startsWith("- ")).map((l) => l.slice(2).trim())
      : [];
    const countLine = lines.find((l) => /high risk path count/i.test(l));
    const riskPathCount = countLine ? parseInt(countLine.replace(/\D/g, ""), 10) : undefined;
    return {
      framework: extract("Framework"),
      packageManager: extract("Package manager"),
      language: extract("Language"),
      riskZones: extractRiskCategories(riskLines),
      riskPathCount: riskPathCount !== undefined && !isNaN(riskPathCount) ? riskPathCount : undefined
    };
  } catch {
    return null;
  }
}

function extractRiskCategories(lines: string[]): string[] {
  const patterns: [RegExp, string][] = [
    [/auth|signout|signin|session/i, "auth"],
    [/billing|subscription/i, "billing"],
    [/middleware|proxy/i, "middleware"],
    [/migration/i, "migrations"],
    [/\.env|\.pem|\.key/i, "env"],
    [/webhook/i, "webhooks"]
  ];
  const found = new Set<string>();
  for (const line of lines) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(line)) found.add(label);
    }
  }
  return Array.from(found);
}

function parseContract(filePath: string): ContractSummary | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const getField = (pattern: RegExp): string | undefined => lines.find((l) => pattern.test(l))?.replace(pattern, "").trim();
    const status = getField(/^Status\s*:\s*/i);
    const task = getField(/^Task\s*:\s*/i);
    const scope = getField(/^(?:Allowed scope|Scope)\s*:\s*/i);
    const whyIdx = lines.findIndex((l) => /^Why blocked/i.test(l));
    const blockedReason = whyIdx >= 0
      ? lines.slice(whyIdx + 1, whyIdx + 5).filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).slice(0, 2).join("; ") || undefined
      : undefined;
    return { status: status?.toLowerCase(), task, scope, blockedReason };
  } catch {
    return null;
  }
}

function openControlPanel(): void {
  if (controlPanel) {
    controlPanel.reveal();
    refreshControlPanel();
    return;
  }
  controlPanel = vscode.window.createWebviewPanel("runtrim.control", "RunTrim Agent Launcher", vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true
  });
  refreshControlPanel();
  controlPanel.webview.onDidReceiveMessage(async (msg: any) => {
    if (msg.command) {
      await vscode.commands.executeCommand(msg.command);
      refreshControlPanel();
      return;
    }
    if (msg.type === "composerChanged") {
      composerState.task = typeof msg.task === "string" ? msg.task : composerState.task;
      composerState.selectedAgent = isAgentOption(msg.selectedAgent) ? msg.selectedAgent : composerState.selectedAgent;
      composerState.selectedMode = isModeOption(msg.selectedMode) ? msg.selectedMode : composerState.selectedMode;
      return;
    }
    if (msg.type === "buildContract") {
      await buildContractPreview();
      return;
    }
    if (msg.type === "runWithAgent") {
      await runWithAgent();
      return;
    }
    if (msg.type === "copyHandoff") {
      await copyHandoff();
      return;
    }
  });
  controlPanel.onDidDispose(() => {
    controlPanel = null;
  });
}

function refreshControlPanel(): void {
  if (!controlPanel) return;
  controlPanel.webview.html = renderControlPanel();
}

function renderControlPanel(): string {
  const local = loadLocalState();
  const state = deriveStatus(local, "");
  const shortRoot = local.workspaceRoot ? path.basename(local.workspaceRoot) : "no workspace";
  const runtrimDir = local.workspaceRoot ? path.join(local.workspaceRoot, ".runtrim") : "";
  const dna = runtrimDir && local.dnaExists ? parseDna(path.join(runtrimDir, "project-dna.md")) : null;
  const contract = runtrimDir && local.latestContractExists ? parseContract(path.join(runtrimDir, "contracts", "latest.md")) : null;
  const contractStatus = contract?.status ?? "none";
  const riskLine = dna?.riskZones.length ? `${dna.riskZones.join(", ")}${dna.riskPathCount ? ` (${dna.riskPathCount} paths)` : ""}` : "none detected";
  const currentNext = composerState.preview ? composerState.nextAction : suggestNextAction(local, state);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
:root {
  color-scheme: dark;
  --bg: #0d1114;
  --card: #121920;
  --line: #20303a;
  --text: #d9e3ea;
  --muted: #8ba1b3;
  --mint: #52d9b5;
  --mint-dim: #2c5f56;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 10px; font-family: "Segoe UI", "IBM Plex Sans", sans-serif;
  background: radial-gradient(130% 130% at 0% 0%, #1c242c 0%, var(--bg) 45%);
  color: var(--text); overflow-x: hidden;
}
.wrap { display: grid; gap: 8px; min-width: 0; }
.card {
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border: 1px solid var(--line); border-radius: 10px; padding: 10px; min-width: 0;
}
.title { font-size: 13px; font-weight: 700; }
.muted { color: var(--muted); font-size: 11px; }
.label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 6px; }
textarea {
  width: 100%; min-height: 78px; resize: vertical; border-radius: 8px; border: 1px solid var(--line);
  background: #0f151a; color: var(--text); padding: 8px; font-family: inherit; font-size: 12px;
}
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  border: 1px solid #2c3f4d; color: #b8cad7; background: #13202a; border-radius: 999px; padding: 5px 9px;
  font-size: 11px; cursor: pointer; user-select: none;
}
.pill.on { border-color: var(--mint-dim); color: var(--mint); background: rgba(82,217,181,0.08); }
.row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.btn {
  width: 100%; border-radius: 8px; border: 1px solid #2a3944; padding: 8px; font-size: 12px; cursor: pointer;
  background: #15212a; color: #bad0df;
}
.btn.primary { border-color: var(--mint-dim); color: #05241d; background: var(--mint); font-weight: 700; }
.btn:hover { filter: brightness(1.08); }
.kv { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; padding: 2px 0; }
.pre {
  font-family: Consolas, "Courier New", monospace; white-space: pre-wrap; word-break: break-word;
  font-size: 11px; background: #0f151a; border: 1px solid var(--line); border-radius: 8px; padding: 8px;
}
@media (max-width: 380px) {
  .row { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="title">RunTrim Agent Launcher</div>
    <div class="muted">${h(shortRoot)} · source stays local</div>
  </div>

  <div class="card">
    <div class="label">Task</div>
    <textarea id="task" placeholder="Describe the guarded run...">${h(composerState.task)}</textarea>
    <div style="height:8px"></div>
    <div class="label">Selected agent</div>
    <div class="pills" id="agentPills">${renderAgentPills(composerState.selectedAgent)}</div>
    <div style="height:8px"></div>
    <div class="label">Mode</div>
    <div class="pills" id="modePills">${renderModePills(composerState.selectedMode)}</div>
    <div style="height:10px"></div>
    <div class="row">
      <button class="btn" data-action="buildContract">Build Contract</button>
      <button class="btn primary" data-action="runWithAgent">Run with Agent</button>
      <button class="btn" data-action="copyHandoff">Copy Handoff</button>
    </div>
  </div>

  <div class="card">
    <div class="label">Contract preview</div>
    <div class="pre">${h(composerState.preview || "Build contract to preview task, selected agent, mode, Project DNA, risky zones, and next action.")}</div>
  </div>

  <div class="card">
    <div class="label">Current state</div>
    <div class="kv"><span>RunTrim CLI</span><span>${local.cliInstalled ? "connected" : "missing"}</span></div>
    <div class="kv"><span>Project DNA</span><span>${local.dnaExists ? "active" : "missing"}</span></div>
    <div class="kv"><span>Risky zones</span><span>${h(riskLine)}</span></div>
    <div class="kv"><span>Active run</span><span>${h(contractStatus)}</span></div>
    <div class="kv"><span>Selected mode</span><span>${h(composerState.selectedMode)}</span></div>
  </div>

  <div class="card">
    <div class="label">Next action</div>
    <div class="muted">${h(currentNext)}</div>
  </div>

  <div class="card">
    <div class="label">Finish actions</div>
    <div class="row">
      <button class="btn" data-cmd="${COMMANDS.finishCheck}">Finish Check</button>
      <button class="btn" data-cmd="${COMMANDS.refreshProjectDna}">Refresh Project DNA</button>
      <button class="btn" data-cmd="${COMMANDS.doctor}">Doctor</button>
    </div>
    <div style="height:6px"></div>
    <div class="row">
      <button class="btn" data-cmd="${COMMANDS.newGuardedRun}">New Guarded Run</button>
      <button class="btn" data-cmd="${COMMANDS.continuePrompt}">Continue Prompt</button>
      <button class="btn" data-cmd="${COMMANDS.openDashboard}">Open Dashboard</button>
    </div>
  </div>
</div>

<script>
const vscode = acquireVsCodeApi();
let selectedAgent = ${JSON.stringify(composerState.selectedAgent)};
let selectedMode = ${JSON.stringify(composerState.selectedMode)};

function postComposer() {
  const task = document.getElementById("task").value;
  vscode.postMessage({ type: "composerChanged", task, selectedAgent, selectedMode });
}
function bindPills() {
  document.querySelectorAll("[data-agent]").forEach((el) => {
    el.addEventListener("click", () => { selectedAgent = el.getAttribute("data-agent"); postComposer(); location.reload(); });
  });
  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.addEventListener("click", () => { selectedMode = el.getAttribute("data-mode"); postComposer(); location.reload(); });
  });
}
document.getElementById("task").addEventListener("input", postComposer);
document.querySelectorAll("button[data-action]").forEach((el) => {
  el.addEventListener("click", () => { postComposer(); vscode.postMessage({ type: el.getAttribute("data-action") }); });
});
document.querySelectorAll("button[data-cmd]").forEach((el) => {
  el.addEventListener("click", () => vscode.postMessage({ command: el.getAttribute("data-cmd") }));
});
bindPills();
</script>
</body>
</html>`;
}

function renderAgentPills(selected: AgentOption): string {
  return ["Auto", "Claude Code", "Codex", "Cursor", "Custom"]
    .map((v) => `<button class="pill ${v === selected ? "on" : ""}" data-agent="${h(v)}">${h(v)}</button>`)
    .join("");
}

function renderModePills(selected: ModeOption): string {
  return ["Auto", "Strict", "UI only", "Docs only"]
    .map((v) => `<button class="pill ${v === selected ? "on" : ""}" data-mode="${h(v)}">${h(v)}</button>`)
    .join("");
}

function likelyBehavior(agent: AgentOption): string {
  if (agent === "Cursor") return "copy handoff with Cursor instructions";
  if (agent === "Custom") return "launch configured custom command or show setup guidance";
  if (agent === "Claude Code" || agent === "Codex") return "launch local terminal only with configured command template";
  return "prefer configured command template, then detected CLI with template, else copy handoff";
}

function suggestNextAction(local: LocalState, state: StatusState): string {
  if (!local.cliInstalled) return "Install the RunTrim CLI: npm install -g runtrim";
  if (!local.workspaceRoot) return "Open a project folder to start a guarded run.";
  if (!local.dnaExists) return "Run RunTrim: Refresh Project DNA.";
  if (state === "blocked") return "Run Doctor, resolve blockers, then run finish check.";
  if (state === "active") return "Run with Agent or continue edits, then finish check.";
  return "Compose a task and build contract preview.";
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function h(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function isAgentOption(v: string): v is AgentOption {
  return v === "Auto" || v === "Claude Code" || v === "Codex" || v === "Cursor" || v === "Custom";
}

function isModeOption(v: string): v is ModeOption {
  return v === "Auto" || v === "Strict" || v === "UI only" || v === "Docs only";
}

export function deactivate(): void {
  return;
}
