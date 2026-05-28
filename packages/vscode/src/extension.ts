import * as fs from "node:fs";
import * as path from "node:path";
import { execFile, execFileSync } from "node:child_process";

const vscode: any = require("vscode");

// ---- types ----

type StatusState = "not_installed" | "no_project" | "ready" | "active" | "blocked";
type AgentOption = "Auto" | "Claude Code" | "Codex" | "Cursor" | "Custom";
type ModeOption = "Auto" | "Strict" | "UI only" | "Docs only";
type ConsolePhase = "idle" | "composing" | "active" | "blocked" | "limit" | "passed" | "warned";

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
  stylingSystem?: string;
  componentSystem?: string;
  riskZones: string[];
  riskPathCount?: number;
};

type BaselineSummary = {
  initializedAt?: string;
  gitBranch?: string;
  gitCommit?: string;
  safeFileCount?: number;
  totalFileCount?: number;
};

type ContractSummary = {
  status?: string;
  task?: string;
  scope?: string;
  blockedReason?: string;
  detectedSystems: string[];
};

type RunSummary = {
  id: string;
  task: string;
  date: string;
};

type ComposerState = {
  task: string;
  selectedAgent: AgentOption;
  selectedMode: ModeOption;
  usageLimitHit: boolean;
  activeTab: "run" | "history" | "rules";
};

// ---- constants ----

const COMMANDS = {
  newGuardedRun:    "runtrim.newGuardedRun",
  finishCheck:      "runtrim.finishCheck",
  doctor:           "runtrim.doctor",
  continuePrompt:   "runtrim.continuePrompt",
  refreshProjectDna:"runtrim.refreshProjectDna",
  openDashboard:    "runtrim.openDashboard",
  openControlPanel: "runtrim.openControlPanel"
};

const SETTINGS = {
  defaultAgent:       "runtrim.agent.defaultAgent",
  customCommand:      "runtrim.agent.customCommand",
  claudeCommand:      "runtrim.agent.claudeCommand",
  codexCommand:       "runtrim.agent.codexCommand",
  autoLaunchTerminal: "runtrim.agent.autoLaunchTerminal"
};

const LIMIT_PHRASES = [
  "context window", "context length", "token limit", "hit limit",
  "maximum context", "output limit", "context limit", "rate limit",
  "too many tokens", "truncated", "conversation too long"
];

let statusBarItem: any;
let outputChannel: any;
let controlPanel: any = null;
let composerState: ComposerState = {
  task: "",
  selectedAgent: "Auto",
  selectedMode: "Auto",
  usageLimitHit: false,
  activeTab: "run"
};

let lastFinishVerdict: "passed" | "warn" | "failed" | null = null;
let limitReason = "";

// ---- activation ----

export function activate(context: any): void {
  outputChannel = vscode.window.createOutputChannel("RunTrim");
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  statusBarItem.command = COMMANDS.openControlPanel;
  statusBarItem.show();
  context.subscriptions.push(outputChannel, statusBarItem);

  registerCommand(context, COMMANDS.openControlPanel, () => openControlPanel());
  registerCommand(context, COMMANDS.newGuardedRun,    () => runNewGuardedRun());
  registerCommand(context, COMMANDS.finishCheck,      () => runAndRefresh("finish",  ["finish"]));
  registerCommand(context, COMMANDS.doctor,           () => runAndRefresh("doctor",  ["doctor"]));
  registerCommand(context, COMMANDS.continuePrompt,   () => runAndRefresh("continue",["continue", "--reason", "usage_limit"]));
  registerCommand(context, COMMANDS.refreshProjectDna,() => runAndRefresh("start",   ["start", "--refresh-dna"]));
  registerCommand(context, COMMANDS.openDashboard, async () => {
    await vscode.env.openExternal(vscode.Uri.parse("https://www.runtrim.com/app"));
  });

  const cfg = vscode.workspace.getConfiguration("runtrim.agent");
  const def = cfg.get("defaultAgent", "Auto");
  if (isAgentOption(def)) composerState.selectedAgent = def;

  refreshStatusBar();
}

function registerCommand(context: any, id: string, cb: () => void | Promise<void>): void {
  context.subscriptions.push(vscode.commands.registerCommand(id, cb));
}

// ---- commands ----

async function runNewGuardedRun(): Promise<void> {
  const local = loadLocalState();
  if (!local.cliInstalled) return showInstallError();
  if (!local.dnaExists) return showNoProjectError();
  const task = await vscode.window.showInputBox({
    prompt: "Task for guarded run",
    placeHolder: "Fix checkout bug while preserving billing logic",
    ignoreFocusOut: true,
    validateInput: (v: string) => v.trim().length ? undefined : "Task is required."
  });
  if (!task) return;
  composerState.task = task;
  await runAndRefresh("agent", ["agent", task, "--copy"]);
}

async function runAndRefresh(name: string, args: string[]): Promise<void> {
  const local = loadLocalState();
  if (!local.cliInstalled) return showInstallError();
  if (!local.workspaceRoot) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }
  outputChannel.show(true);
  outputChannel.appendLine(`$ runtrim ${args.join(" ")}`);
  const result = await runRuntrim(args);
  if (result.stdout) outputChannel.appendLine(result.stdout);
  if (result.stderr) outputChannel.appendLine(result.stderr);
  outputChannel.appendLine("");

  if (result.notFound) return showInstallError();

  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (result.exitCode !== 0) {
    if (combined.includes("no project") || combined.includes("not initialized") || combined.includes("runtrim start")) {
      showNoProjectError();
    } else {
      void vscode.window.showWarningMessage(`RunTrim ${name} failed. Check the RunTrim output panel.`);
    }
  }

  // Detect finish verdict
  if (args[0] === "finish") {
    const upper = (result.stdout + "\n" + result.stderr).toUpperCase();
    if (/\bPASS\b/.test(upper)) {
      lastFinishVerdict = "passed";
    } else if (/\bWARN\b/.test(upper)) {
      lastFinishVerdict = "warn";
    } else if (/\b(FAIL|BLOCKED)\b/.test(upper) || result.exitCode !== 0) {
      lastFinishVerdict = "failed";
    }
  }

  // Detect limit phrases from any command output
  if (LIMIT_PHRASES.some((p) => combined.includes(p))) {
    composerState.usageLimitHit = true;
  }

  await refreshStatusBar(combined);
  refreshControlPanel();
}

async function runWithAgent(task: string, agent: AgentOption): Promise<void> {
  const local = loadLocalState();
  if (!local.cliInstalled) return showInstallError();
  if (!local.workspaceRoot) { void vscode.window.showErrorMessage("No workspace folder is open."); return; }
  if (!local.dnaExists) { void vscode.window.showWarningMessage("Project DNA missing. Run RunTrim: Refresh Project DNA first."); return; }

  lastFinishVerdict = null; // clear any previous verdict on new run

  outputChannel.show(true);
  outputChannel.appendLine(`$ runtrim agent "${task}" --copy`);
  const result = await runRuntrim(["agent", task, "--copy"]);
  if (result.stdout) outputChannel.appendLine(result.stdout);
  if (result.stderr) outputChannel.appendLine(result.stderr);
  outputChannel.appendLine("");

  if (result.notFound) { showInstallError(); return; }
  if (result.exitCode !== 0) {
    void vscode.window.showErrorMessage("Could not create guarded handoff. Check the RunTrim output channel.");
    await refreshStatusBar(`${result.stdout}\n${result.stderr}`);
    refreshControlPanel();
    return;
  }

  const handoffPath = path.join(local.workspaceRoot, ".runtrim", "agent", "latest.md");
  const handoff = readFile(handoffPath);
  if (!handoff) {
    void vscode.window.showWarningMessage("Handoff not found after runtrim agent. Try again.");
    refreshControlPanel();
    return;
  }

  void vscode.window.showInformationMessage(
    `Guarded run ready. Handoff copied. Paste it into ${agent === "Auto" ? "your selected agent" : agent}.`
  );
  await routeAgent(agent, task, handoff, local.workspaceRoot);
  await refreshStatusBar(`${result.stdout}\n${result.stderr}`);
  refreshControlPanel();
}

async function copyHandoff(): Promise<void> {
  const root = workspaceRoot();
  if (!root) { void vscode.window.showWarningMessage("No workspace folder is open."); return; }
  const handoff = readFile(path.join(root, ".runtrim", "agent", "latest.md"));
  if (!handoff) { void vscode.window.showWarningMessage("No handoff found. Start a guarded run first."); return; }
  await vscode.env.clipboard.writeText(handoff);
  void vscode.window.showInformationMessage("Guarded handoff copied. Source stays local.");
}

async function routeAgent(agent: AgentOption, task: string, handoff: string, projectRoot: string): Promise<void> {
  const cfg = vscode.workspace.getConfiguration();
  const customTpl  = String(cfg.get(SETTINGS.customCommand) ?? "").trim();
  const claudeTpl  = String(cfg.get(SETTINGS.claudeCommand) ?? "").trim();
  const codexTpl   = String(cfg.get(SETTINGS.codexCommand) ?? "").trim();
  const autoLaunch = cfg.get(SETTINGS.autoLaunchTerminal, true);
  const hasClaude  = commandExists("claude");
  const hasCodex   = commandExists("codex");

  const launch = async (tpl: string, name: string): Promise<boolean> => {
    if (!tpl) return false;
    const cmd = renderTpl(tpl, task, handoff, projectRoot);
    if (!cmd) return false;
    if (!autoLaunch) { await vscode.env.clipboard.writeText(handoff); void vscode.window.showInformationMessage(`${name} command ready. Handoff copied.`); return true; }
    const term = vscode.window.createTerminal({ name: `RunTrim ${name}`, cwd: projectRoot });
    term.show(true); term.sendText(cmd, true);
    return true;
  };

  if (agent === "Cursor") { await vscode.env.clipboard.writeText(handoff); void vscode.window.showInformationMessage("Handoff copied. Paste into Cursor Agent."); return; }
  if (agent === "Custom") { if (!customTpl) { await vscode.env.clipboard.writeText(handoff); void vscode.window.showWarningMessage("Set runtrim.agent.customCommand. Handoff copied."); } else await launch(customTpl, "Custom"); return; }
  if (agent === "Claude Code") { if (hasClaude && claudeTpl && await launch(claudeTpl, "Claude Code")) return; await vscode.env.clipboard.writeText(handoff); void vscode.window.showInformationMessage("Handoff copied. Paste into Claude Code."); return; }
  if (agent === "Codex") { if (hasCodex && codexTpl && await launch(codexTpl, "Codex")) return; await vscode.env.clipboard.writeText(handoff); void vscode.window.showInformationMessage("Handoff copied. Paste into Codex."); return; }
  if (customTpl && await launch(customTpl, "Auto")) return;
  if (hasClaude && claudeTpl && await launch(claudeTpl, "Claude Code")) return;
  if (hasCodex && codexTpl && await launch(codexTpl, "Codex")) return;
  await vscode.env.clipboard.writeText(handoff);
  void vscode.window.showInformationMessage(`Handoff copied. Paste into ${hasClaude ? "Claude Code" : hasCodex ? "Codex" : "your agent"}.`);
}

function renderTpl(tpl: string, task: string, handoff: string, root: string): string {
  const compact = handoff.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  return tpl
    .replace(/\{task\}/g, `"${task.replace(/"/g, '\\"')}"`)
    .replace(/\{handoff\}/g, `"${compact.replace(/"/g, '\\"')}"`)
    .replace(/\{projectRoot\}/g, `"${root.replace(/"/g, '\\"')}"`)
    .trim();
}

// ---- CLI ----

function runRuntrim(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number; notFound: boolean }> {
  return new Promise((resolve) => {
    execFile("runtrim", args, { cwd: workspaceRoot(), windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        resolve({ stdout: "", stderr: "", exitCode: 1, notFound: true });
        return;
      }
      const err = error as (NodeJS.ErrnoException & { exitCode?: number }) | null;
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: err?.exitCode ?? (error ? 1 : 0), notFound: false });
    });
  });
}

function commandExists(cmd: string): boolean {
  const which = process.platform === "win32" ? "where" : "which";
  try { return execFileSync(which, [cmd], { stdio: "pipe" }).toString().trim().length > 0; } catch { return false; }
}

// ---- error helpers ----

function showInstallError(): void {
  void vscode.window.showErrorMessage("RunTrim CLI is not installed. Run: npm install -g runtrim", "Copy command")
    .then((c: string | undefined) => { if (c) vscode.env.clipboard.writeText("npm install -g runtrim"); });
}

function showNoProjectError(): void {
  void vscode.window.showErrorMessage("No RunTrim project found. Run runtrim start in this project first.", "Open terminal")
    .then((c: string | undefined) => { if (c) vscode.commands.executeCommand("workbench.action.terminal.new"); });
}

// ---- status bar ----

async function refreshStatusBar(lastOutput = ""): Promise<void> {
  const local = loadLocalState();
  const state = deriveStatus(local, lastOutput);
  const map: Record<StatusState, { text: string; color?: string; tooltip: string }> = {
    not_installed: { text: "RunTrim: not installed", color: "statusBarItem.warningForeground", tooltip: "runtrim CLI not in PATH" },
    no_project:    { text: "RunTrim: no project",    color: "statusBarItem.warningForeground", tooltip: "No .runtrim project state found" },
    ready:         { text: "RunTrim: ready",          color: "#6ee7b7",                          tooltip: "Project initialized and ready" },
    active:        { text: "RunTrim: active",         color: "statusBarItem.prominentForeground", tooltip: "Active guarded contract exists" },
    blocked:       { text: "RunTrim: blocked",        color: "#f5a524",                          tooltip: "Contract is blocked" }
  };
  const v = map[state];
  statusBarItem.text = v.text;
  statusBarItem.color = v.color;
  statusBarItem.tooltip = v.tooltip;
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

// ---- local state ----

function loadLocalState(): LocalState {
  const root = workspaceRoot();
  const cliInstalled = commandExists("runtrim");
  if (!root) return { cliInstalled, dnaExists: false, baselineExists: false, latestContractExists: false };
  const rt = path.join(root, ".runtrim");
  const latestContract = path.join(rt, "contracts", "latest.md");
  return {
    cliInstalled, workspaceRoot: root,
    dnaExists:           fileExists(path.join(rt, "project-dna.md")),
    baselineExists:      fileExists(path.join(rt, "history", "baseline.json")),
    latestContractExists:fileExists(latestContract),
    contractStatus: fileExists(latestContract) ? findLine(latestContract, /^Status\s*:/i) : undefined
  };
}

function fileExists(p: string): boolean { try { return fs.statSync(p).isFile(); } catch { return false; } }
function dirExists(p: string): boolean  { try { return fs.statSync(p).isDirectory(); } catch { return false; } }

function findLine(filePath: string, pattern: RegExp): string | undefined {
  try { return fs.readFileSync(filePath, "utf8").split(/\r?\n/).find((l) => pattern.test(l)); } catch { return undefined; }
}

function workspaceRoot(): string | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }

// ---- parsers ----

function parseDna(filePath: string): DnaSummary | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const get = (key: string) => lines.find((l) => l.toLowerCase().startsWith(`- ${key.toLowerCase()}:`))?.replace(/^- [^:]+:\s*/i, "").trim();
    const riskStart = lines.findIndex((l) => /^## Risky zones/i.test(l));
    const riskEnd   = lines.findIndex((l, i) => i > riskStart && /^## /.test(l));
    const riskLines = riskStart >= 0
      ? lines.slice(riskStart + 1, riskEnd >= 0 ? riskEnd : undefined).filter((l) => l.trim().startsWith("- ")).map((l) => l.slice(2).trim())
      : [];
    const countLine = lines.find((l) => /high risk path count/i.test(l));
    const rpc = countLine ? parseInt(countLine.replace(/\D/g, ""), 10) : undefined;
    return {
      framework:      get("Framework"),
      packageManager: get("Package manager"),
      language:       get("Language"),
      stylingSystem:  get("Styling system"),
      componentSystem:get("Component system"),
      riskZones:      extractRiskCategories(riskLines),
      riskPathCount:  rpc !== undefined && !isNaN(rpc) ? rpc : undefined
    };
  } catch { return null; }
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
  for (const line of lines) for (const [pat, label] of patterns) if (pat.test(line)) found.add(label);
  return Array.from(found);
}

function parseBaseline(filePath: string): BaselineSummary | null {
  try {
    const d = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { initializedAt: d.initializedAt, gitBranch: d.gitBranch, gitCommit: d.gitCommit, safeFileCount: d.safeFileCount, totalFileCount: d.totalFileCount };
  } catch { return null; }
}

function parseContract(filePath: string): ContractSummary | null {
  try {
    const text  = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const getField = (pat: RegExp) => lines.find((l) => pat.test(l))?.replace(pat, "").trim();
    const status = getField(/^Status\s*:\s*/i);
    const task   = getField(/^Task\s*:\s*/i);
    const scope  = getField(/^(?:Allowed scope|Scope)\s*:\s*/i);
    const whyIdx = lines.findIndex((l) => /^Why blocked/i.test(l));
    const blockedReason = whyIdx >= 0
      ? lines.slice(whyIdx + 1, whyIdx + 5).filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).slice(0, 2).join("; ") || undefined
      : undefined;
    const systems = extractDetectedSystems(text);
    return { status: status?.toLowerCase(), task, scope, blockedReason, detectedSystems: systems };
  } catch { return null; }
}

function extractDetectedSystems(text: string): string[] {
  const m = text.match(/Detected systems:([\s\S]*?)(\n\n|\n##|$)/);
  if (!m) return [];
  return m[1].split(/\r?\n/).filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
}

function readRecentRuns(runsDir: string, count: number): RunSummary[] {
  try {
    const files = fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"));
    const runs: RunSummary[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(runsDir, file), "utf8");
        const d = JSON.parse(raw);
        if (d.task && d.createdAt) {
          runs.push({ id: d.id ?? file.replace(".json", ""), task: String(d.task).slice(0, 120), date: String(d.createdAt).slice(0, 10) });
        }
      } catch { /* skip malformed */ }
    }
    return runs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
  } catch { return []; }
}

// ---- phase ----

function derivePhase(local: LocalState, contract: ContractSummary | null): ConsolePhase {
  if (composerState.usageLimitHit) return "limit";
  if (lastFinishVerdict === "passed") return "passed";
  if (lastFinishVerdict === "warn")   return "warned";
  if (local.latestContractExists && contract) {
    if (contract.status === "blocked") return "blocked";
    if (contract.status === "active")  return "active";
  }
  if (composerState.task.trim()) return "composing";
  return "idle";
}

// ---- control panel ----

function openControlPanel(): void {
  if (controlPanel) { controlPanel.reveal(); refreshControlPanel(); return; }
  controlPanel = vscode.window.createWebviewPanel(
    "runtrim.control", "RunTrim", vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  refreshControlPanel();
  controlPanel.webview.onDidReceiveMessage(async (msg: any) => {
    try { await handleWebviewMessage(msg); } catch (err) { outputChannel.appendLine(`[panel error] ${String(err)}`); }
  });
  controlPanel.onDidDispose(() => { controlPanel = null; });
}

async function handleWebviewMessage(msg: any): Promise<void> {
  if (msg.command) { await vscode.commands.executeCommand(msg.command); refreshControlPanel(); return; }
  switch (msg.type) {
    case "composerChanged":
      composerState.task          = typeof msg.task === "string"        ? msg.task          : composerState.task;
      composerState.selectedAgent = isAgentOption(msg.selectedAgent)    ? msg.selectedAgent : composerState.selectedAgent;
      composerState.selectedMode  = isModeOption(msg.selectedMode)      ? msg.selectedMode  : composerState.selectedMode;
      break;
    case "startRun": {
      const task  = typeof msg.task  === "string" ? msg.task.trim()  : composerState.task.trim();
      const agent = isAgentOption(msg.agent)      ? msg.agent         : composerState.selectedAgent;
      composerState.task          = task;
      composerState.selectedAgent = agent;
      if (!task) { void vscode.window.showWarningMessage("Add a task before starting a guarded run."); return; }
      await runWithAgent(task, agent);
      break;
    }
    case "finishCheck":
      lastFinishVerdict = null;
      await runAndRefresh("finish", ["finish"]);
      break;
    case "doctor":     await runAndRefresh("doctor",  ["doctor"]); break;
    case "restore":    await runAndRefresh("restore", ["restore"]); break;
    case "refreshDna": await runAndRefresh("start",   ["start", "--refresh-dna"]); break;

    case "continueLimit":
      composerState.usageLimitHit = false;
      await runAndRefresh("continue", ["continue", "--reason", "usage_limit"]);
      break;

    case "clearLimit":
      composerState.usageLimitHit = false;
      limitReason = "";
      refreshControlPanel();
      break;

    case "clearFinish":
      lastFinishVerdict = null;
      refreshControlPanel();
      break;

    case "agentHitLimit": {
      const reasonItems = [
        { label: "context limit",       cliReason: "context_limit"  },
        { label: "usage limit",         cliReason: "usage_limit"    },
        { label: "rate limit",          cliReason: "rate_limit"     },
        { label: "agent stopped",       cliReason: "agent_stopped"  },
        { label: "manual continuation", cliReason: "usage_limit"    }
      ];
      const picked = await vscode.window.showQuickPick(
        reasonItems.map((r) => r.label),
        { title: "Why did the agent stop?", placeHolder: "Select a reason to generate the continuation handoff" }
      );
      if (!picked) return;
      limitReason = picked;
      composerState.usageLimitHit = true;
      const cliReason = reasonItems.find((r) => r.label === picked)?.cliReason ?? "usage_limit";
      await runAndRefresh("continue", ["continue", "--reason", cliReason]);
      break;
    }

    case "tabChanged":
      if (msg.tab === "run" || msg.tab === "history" || msg.tab === "rules") {
        composerState.activeTab = msg.tab;
        // No panel refresh — tab switch is pure DOM, just persist the state
      }
      break;

    case "copyHandoff": await copyHandoff(); break;
  }
}

function refreshControlPanel(): void {
  if (!controlPanel) return;
  controlPanel.webview.html = renderControlPanel();
}

// ---- render ----

function renderControlPanel(): string {
  const local = loadLocalState();
  const rt    = local.workspaceRoot ? path.join(local.workspaceRoot, ".runtrim") : "";
  const dna   = rt && local.dnaExists          ? parseDna(path.join(rt, "project-dna.md"))                       : null;
  const baseline = rt && local.baselineExists  ? parseBaseline(path.join(rt, "history", "baseline.json"))         : null;
  const contract = rt && local.latestContractExists ? parseContract(path.join(rt, "contracts", "latest.md"))      : null;

  if (!composerState.task.trim() && contract?.task) composerState.task = contract.task;

  const phase    = derivePhase(local, contract);
  const status   = deriveStatus(local, "");
  const shortRoot = local.workspaceRoot ? path.basename(local.workspaceRoot) : "no workspace";
  const branch   = baseline?.gitBranch ?? "main";

  // Counts for history badge
  const runsDir      = rt ? path.join(rt, "runs")               : "";
  const archiveDir   = rt ? path.join(rt, "contracts", "archive") : "";
  const runCount     = rt && dirExists(runsDir)    ? tryReadDir(runsDir).filter((f) => f.endsWith(".json")).length : 0;
  const archiveCount = rt && dirExists(archiveDir) ? tryReadDir(archiveDir).filter((f) => f.endsWith(".md")).length : 0;
  const histCount    = runCount + archiveCount;

  const recentRuns  = rt && dirExists(runsDir) ? readRecentRuns(runsDir, 8) : [];
  const rawDna      = rt && local.dnaExists ? readFile(path.join(rt, "project-dna.md")) : "";

  // DNA data embedded for client-side scope inference
  const dnaEmbed = {
    framework:      friendly(dna?.framework),
    language:       friendly(dna?.language),
    stylingSystem:  dna?.stylingSystem  ?? "",
    componentSystem:dna?.componentSystem ?? "",
    riskZones:      dna?.riskZones ?? [],
    riskPathCount:  dna?.riskPathCount ?? 0
  };

  const statusClass = status === "ready" || status === "active" ? "" : status === "blocked" ? " blocked" : " no_project";
  const statusLabel = status.replace(/_/g, " ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RunTrim</title>
<style>
:root {
  --bg:    #16181c;
  --bg-2:  #1e2126;
  --bg-3:  #232629;
  --bg-4:  #2a2d33;
  --l1: rgba(255,255,255,0.06);
  --l2: rgba(255,255,255,0.10);
  --l3: rgba(255,255,255,0.16);
  --fg-0: #f4f5f7;
  --fg-1: #c9ccd2;
  --fg-2: #8a8f98;
  --fg-3: #5a5f68;
  --fg-4: #3a3e46;
  --violet: #a78bfa;
  --mint:   #6ee7b7;
  --amber:  #f5a524;
  --rose:   #f87171;
  --sans: -apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",sans-serif;
  --mono: "Menlo","Monaco","Consolas",ui-monospace,monospace;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html,body { height:100%; overflow:hidden; }
body {
  font-family:var(--sans); font-size:13px; color:var(--fg-1);
  background:var(--bg);
  display:flex; flex-direction:column; height:100vh;
  -webkit-font-smoothing:antialiased;
}

/* === HEADER === */
.ph {
  padding:11px 13px; border-bottom:1px solid var(--l1);
  display:flex; align-items:center; gap:9px;
  background:linear-gradient(180deg,#1b1e24,var(--bg));
  flex:none;
}
.ph-logo { flex:none; }
.ph-title { display:flex; flex-direction:column; gap:1px; min-width:0; }
.ph-title .h { font-size:13.5px; font-weight:500; color:var(--fg-0); letter-spacing:-0.015em; }
.ph-title .h .dim { opacity:0.5; }
.ph-title .sub { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.06em; }
.ph-status {
  margin-left:auto;
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 9px; border-radius:999px;
  border:1px solid rgba(110,231,183,0.30);
  background:rgba(110,231,183,0.06);
  font-family:var(--mono); font-size:10px;
  color:var(--mint); letter-spacing:0.10em; text-transform:uppercase;
}
.ph-status .led { width:5px; height:5px; border-radius:50%; background:var(--mint); box-shadow:0 0 5px var(--mint); }
.ph-status.blocked { color:var(--amber); border-color:rgba(245,165,36,.30); background:rgba(245,165,36,.06); }
.ph-status.blocked .led { background:var(--amber); box-shadow:0 0 5px var(--amber); }
.ph-status.no_project,.ph-status.not_installed { color:var(--fg-3); border-color:var(--l2); background:transparent; }
.ph-status.no_project .led,.ph-status.not_installed .led { background:var(--fg-4); box-shadow:none; }
.ph-menu { width:24px; height:24px; display:grid; place-items:center; color:var(--fg-3); cursor:pointer; border-radius:4px; }
.ph-menu:hover { color:var(--fg-1); background:var(--bg-3); }

/* === TABS === */
.ptabs {
  display:flex; gap:2px; padding:4px 6px 0;
  border-bottom:1px solid var(--l1); background:#15181c; flex:none;
}
.pt {
  padding:6px 10px;
  font-family:var(--mono); font-size:10.5px; color:var(--fg-3);
  letter-spacing:0.08em; text-transform:uppercase;
  cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px;
  display:inline-flex; align-items:center; gap:5px;
}
.pt:hover { color:var(--fg-1); }
.pt.active { color:var(--fg-0); border-bottom-color:var(--violet); }
.pt .badge {
  font-size:9px; padding:1px 5px; border-radius:3px;
  background:rgba(167,139,250,0.12); color:var(--violet);
  border:1px solid rgba(167,139,250,0.25);
}

/* === TAB PANELS === */
.tab-panel {
  flex:1; overflow-y:auto; display:none;
  flex-direction:column; gap:9px;
  padding:12px 12px 10px;
}
.tab-panel.active { display:flex; }
.tab-panel::-webkit-scrollbar { width:5px; }
.tab-panel::-webkit-scrollbar-thumb { background:var(--bg-4); border-radius:3px; }

/* === DAY SEP === */
.day-sep {
  display:flex; align-items:center; gap:8px;
  font-family:var(--mono); font-size:9.5px;
  color:var(--fg-3); letter-spacing:0.12em; text-transform:uppercase;
}
.day-sep::before,.day-sep::after { content:""; flex:1; height:1px; background:var(--l1); }

/* === USER MESSAGE === */
.msg-user {
  align-self:flex-end; max-width:92%;
  padding:8px 11px;
  background:rgba(167,139,250,0.10);
  border:1px solid rgba(167,139,250,0.22);
  border-radius:8px 8px 2px 8px;
  color:var(--fg-0); font-size:12.5px; line-height:1.45;
}

/* === SYSTEM CARDS === */
.sys-card {
  display:flex; flex-direction:column;
  background:var(--bg-2); border:1px solid var(--l1);
  border-radius:8px; overflow:hidden;
}
.sys-head {
  display:flex; align-items:center; gap:7px;
  padding:8px 12px; border-bottom:1px solid var(--l1);
  background:#1c2025;
}
.ico { width:14px; height:14px; display:grid; place-items:center; color:var(--mint); flex:none; }
.ico.violet { color:var(--violet); }
.ico.amber  { color:var(--amber); }
.ico.rose   { color:var(--rose); }
.sys-label { font-family:var(--mono); font-size:10px; color:var(--fg-3); letter-spacing:0.10em; text-transform:uppercase; }
.sys-title { font-size:12.5px; font-weight:500; color:var(--fg-0); letter-spacing:-0.005em; }
.sys-right { margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--fg-3); white-space:nowrap; }

.sys-body { padding:9px 12px; display:flex; flex-direction:column; gap:7px; }
.line { display:grid; grid-template-columns:72px 1fr; gap:8px; align-items:start; font-size:12px; }
.line .k { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.07em; text-transform:uppercase; padding-top:2px; }
.line .v { display:flex; flex-wrap:wrap; gap:4px; align-items:center; color:var(--fg-0); min-width:0; }
.line .v code { font-family:var(--mono); font-size:11px; color:var(--fg-1); word-break:break-all; }
.copy { font-family:var(--mono); font-size:11px; color:var(--fg-1); line-height:1.5; }
.copy em { color:var(--mint); font-style:normal; }
.copy em.violet { color:var(--violet); }
.copy em.amber  { color:var(--amber); }
.copy em.rose   { color:var(--rose); }

/* === PILLS === */
.pill {
  display:inline-flex; align-items:center; gap:3px;
  padding:2px 6px; border-radius:4px;
  background:var(--bg-3); border:1px solid var(--l2);
  font-family:var(--mono); font-size:10.5px; color:var(--fg-1);
  line-height:1.2; white-space:nowrap;
}
.pill.scope  { color:var(--mint);   border-color:rgba(110,231,183,0.28); background:rgba(110,231,183,0.07); }
.pill.forbid { color:var(--rose);   border-color:rgba(248,113,113,0.28); background:rgba(248,113,113,0.07); }
.pill.mem    { color:var(--violet); border-color:rgba(167,139,250,0.28); background:rgba(167,139,250,0.07); }
.pill.warn   { color:var(--amber);  border-color:rgba(245,165,36,0.30);  background:rgba(245,165,36,0.07); }
.pill.muted  { color:var(--fg-2); }

/* === ACTIONS === */
.sys-actions { display:flex; gap:5px; flex-wrap:wrap; padding:8px 12px 10px; border-top:1px dashed var(--l1); }
.act {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 10px; border-radius:5px;
  background:var(--bg-3); border:1px solid var(--l2);
  color:var(--fg-1); font-size:11.5px; font-family:var(--sans); cursor:pointer;
}
.act:hover { background:var(--bg-4); color:var(--fg-0); }
.act.primary { background:rgba(110,231,183,0.10); color:var(--mint); border-color:rgba(110,231,183,0.35); }
.act.primary:hover { background:rgba(110,231,183,0.18); }
.act .kbd {
  font-family:var(--mono); font-size:9px; color:var(--fg-3);
  padding:1px 3px; border-radius:2px;
  background:rgba(255,255,255,0.04); border:1px solid var(--l1);
}
.act.primary .kbd { color:rgba(110,231,183,0.65); border-color:rgba(110,231,183,0.18); background:rgba(110,231,183,0.06); }

/* === TIMELINE === */
.timeline {
  display:flex; align-items:center; gap:5px;
  padding:7px 12px; border-top:1px dashed var(--l1);
  background:rgba(255,255,255,0.012);
  font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.06em;
}
.tl-step { display:inline-flex; align-items:center; gap:4px; }
.tl-step .dot { width:6px; height:6px; border-radius:50%; background:var(--bg-4); border:1px solid var(--l2); }
.tl-step.done .dot   { background:var(--mint);   border-color:var(--mint);   box-shadow:0 0 4px var(--mint); }
.tl-step.active .dot { background:var(--violet); border-color:var(--violet); box-shadow:0 0 4px var(--violet); animation:pulse 1.8s ease-in-out infinite; }
.tl-step.done .name   { color:var(--mint); }
.tl-step.active .name { color:var(--violet); }
.tl-sep { width:14px; height:1px; background:var(--l2); }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.55;transform:scale(0.85);} }

/* === COMPOSER === */
.composer {
  border-top:1px solid var(--l1);
  padding:9px 12px 12px;
  background:linear-gradient(180deg,#1b1e24,var(--bg));
  display:flex; flex-direction:column; gap:7px; flex:none;
}
.composer-input {
  background:var(--bg-2); border:1px solid var(--l2);
  border-radius:8px; padding:9px 11px;
  display:flex; flex-direction:column; gap:7px;
  transition:border-color 0.12s;
}
.composer-input:focus-within { border-color:rgba(167,139,250,0.40); }
.composer-input textarea {
  width:100%; border:0; background:transparent;
  color:var(--fg-0); font-family:var(--sans);
  font-size:12.5px; line-height:1.45; outline:none;
  resize:none; min-height:36px; padding:0;
}
.composer-input textarea::placeholder { color:var(--fg-3); }
.composer-tools { display:flex; align-items:center; gap:5px; }

/* Selectors */
.sel-wrap { position:relative; }
.selector {
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 8px; border:1px solid var(--l2);
  border-radius:5px; background:var(--bg-3);
  color:var(--fg-1); font-family:var(--mono); font-size:10.5px; cursor:pointer;
}
.selector:hover { color:var(--fg-0); border-color:var(--l3); }
.selector .k { color:var(--fg-3); letter-spacing:0.08em; text-transform:uppercase; font-size:9.5px; }
.selector svg { width:8px; height:8px; color:var(--fg-3); }
.sel-dd {
  position:absolute; bottom:calc(100% + 4px); left:0;
  background:var(--bg-3); border:1px solid var(--l2);
  border-radius:6px; padding:4px;
  display:none; flex-direction:column; gap:1px;
  z-index:200; min-width:120px;
  box-shadow:0 4px 16px rgba(0,0,0,0.5);
}
.sel-dd.open { display:flex; }
.sel-opt {
  padding:5px 9px; border-radius:4px; cursor:pointer;
  font-size:11px; font-family:var(--mono); color:var(--fg-1);
}
.sel-opt:hover { background:var(--bg-4); color:var(--fg-0); }
.sel-opt.active { color:var(--mint); }

.composer-foot { display:flex; align-items:center; gap:7px; }
.composer-hint {
  font-family:var(--mono); font-size:10px; color:var(--fg-3);
  letter-spacing:0.04em; display:inline-flex; align-items:center; gap:5px;
}
.composer-hint .kbd { padding:1px 4px; border-radius:3px; border:1px solid var(--l2); background:var(--bg-3); color:var(--fg-2); }
.composer-spacer { flex:1; }
.composer-primary {
  display:inline-flex; align-items:center; gap:7px;
  padding:6px 12px; border-radius:6px;
  background:var(--mint); color:#0a0c10;
  font-family:var(--sans); font-size:12px; font-weight:600;
  border:1px solid var(--mint); cursor:pointer; letter-spacing:-0.005em; white-space:nowrap;
}
.composer-primary:hover { background:#88efc4; }
.composer-primary .kbd {
  font-family:var(--mono); font-size:9px; color:rgba(10,12,16,0.5);
  padding:1px 4px; border-radius:3px; background:rgba(10,12,16,0.10);
}

/* === RULES TAB === */
.rules-group { display:flex; flex-direction:column; gap:2px; }
.rules-head { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.10em; text-transform:uppercase; padding:6px 2px 3px; }
.rules-card { background:var(--bg-2); border:1px solid var(--l1); border-radius:7px; overflow:hidden; }
.rrow { display:grid; grid-template-columns:100px 1fr; gap:10px; padding:7px 12px; align-items:start; font-size:11.5px; border-bottom:1px solid var(--l1); }
.rrow:last-child { border-bottom:0; }
.rrow .k { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.07em; text-transform:uppercase; padding-top:1px; }
.rrow .v { color:var(--fg-0); display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
details summary { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); cursor:pointer; list-style:none; padding:6px 12px; }
details summary::-webkit-details-marker { display:none; }
details summary::before { content:"+ "; }
details[open] summary::before { content:"- "; }
.raw-pre {
  font-family:var(--mono); font-size:10px; color:var(--fg-2); line-height:1.4;
  padding:8px 12px; border-top:1px solid var(--l1);
  max-height:180px; overflow:auto; white-space:pre-wrap; word-break:break-word;
}

/* === HISTORY TAB === */
.hist-item { background:var(--bg-2); border:1px solid var(--l1); border-radius:7px; padding:9px 12px; display:flex; flex-direction:column; gap:4px; }
.hist-task { font-size:12px; color:var(--fg-0); line-height:1.4; }
.hist-meta { font-family:var(--mono); font-size:10px; color:var(--fg-3); display:flex; gap:10px; flex-wrap:wrap; }
.empty-state { text-align:center; padding:32px 16px; font-family:var(--mono); font-size:10.5px; color:var(--fg-3); letter-spacing:0.06em; }

/* preview card hidden by default in IDLE */
#preview-card { display:none; }
</style>
</head>
<body>

<!-- HEADER -->
<header class="ph">
  <svg class="ph-logo" width="20" height="22" viewBox="10 10 74 80" fill="none">
    <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill="var(--violet)"/>
    <path d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z" fill="var(--fg-0)" fill-rule="evenodd"/>
  </svg>
  <div class="ph-title">
    <span class="h">Run<span class="dim">Trim</span></span>
    <span class="sub">guarded agent run</span>
  </div>
  <span class="ph-status${statusClass}"><span class="led"></span>${h(statusLabel)}</span>
  <span class="ph-menu" title="Open output channel" data-action="openOutput">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="3" r="1" fill="currentColor"/>
      <circle cx="7" cy="7" r="1" fill="currentColor"/>
      <circle cx="7" cy="11" r="1" fill="currentColor"/>
    </svg>
  </span>
</header>

<!-- TABS -->
<div class="ptabs">
  <span class="pt${composerState.activeTab === "run"     ? " active" : ""}" data-tab="run">Run</span>
  <span class="pt${composerState.activeTab === "history" ? " active" : ""}" data-tab="history">History${histCount > 0 ? ` <span class="badge">${histCount}</span>` : ""}</span>
  <span class="pt${composerState.activeTab === "rules"   ? " active" : ""}" data-tab="rules">Rules</span>
</div>

<!-- RUN TAB -->
<div class="tab-panel${composerState.activeTab === "run"     ? " active" : ""}" id="tab-run">
${renderRunTab(phase, local, dna, contract, shortRoot, branch)}
</div>

<!-- HISTORY TAB -->
<div class="tab-panel${composerState.activeTab === "history" ? " active" : ""}" id="tab-history">
${renderHistoryTab(recentRuns, archiveCount, baseline, shortRoot)}
</div>

<!-- RULES TAB -->
<div class="tab-panel${composerState.activeTab === "rules"   ? " active" : ""}" id="tab-rules">
${renderRulesTab(dna, rawDna, local)}
</div>

<!-- COMPOSER -->
<div class="composer">
  <div class="composer-input">
    <textarea id="task" placeholder="Ask RunTrim to prepare an agent run..." rows="2">${h(composerState.task)}</textarea>
    <div class="composer-tools">
      <div class="sel-wrap">
        <span class="selector" id="agent-sel">
          <span class="k">Agent</span>
          <span id="agent-val">${h(composerState.selectedAgent)}</span>
          <svg viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="sel-dd" id="agent-dd">
          ${["Auto","Claude Code","Codex","Cursor","Custom"].map((a) => `<div class="sel-opt${a === composerState.selectedAgent ? " active" : ""}" data-agent="${h(a)}">${h(a)}</div>`).join("")}
        </div>
      </div>
      <div class="sel-wrap">
        <span class="selector" id="mode-sel">
          <span class="k">Mode</span>
          <span id="mode-val">${h(composerState.selectedMode)}</span>
          <svg viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="sel-dd" id="mode-dd">
          ${["Auto","Strict","UI only","Docs only"].map((m) => `<div class="sel-opt${m === composerState.selectedMode ? " active" : ""}" data-mode="${h(m)}">${h(m)}</div>`).join("")}
        </div>
      </div>
    </div>
  </div>
  <div class="composer-foot">
    <span class="composer-hint"><span class="kbd">Enter</span> start run</span>
    <span class="composer-spacer"></span>
    <button class="composer-primary" data-action="startRun">Start guarded run <span class="kbd">Enter</span></button>
  </div>
</div>

<script>
(function() {
"use strict";
const vscode = acquireVsCodeApi();

// ── embedded state ──
const DNA = ${jsonSafe(dnaEmbed)};
const PHASE = ${jsonSafe(phase)};

const SCOPE_RULES = [
  { kw:["checkout","stripe","payment","billing","webhook","invoice","subscription","pricing"],
    scope:"checkout-api", protected:["env*","migrations/**","auth/**","billing/**","pricing/**"], mode:"Strict" },
  { kw:["mobile","layout","responsive","ui","component","page","design","style","tailwind","css","button","nav"],
    scope:"ui/layout",    protected:["auth/**","billing/**","middleware/**","env*"], mode:"UI only" },
  { kw:["copy","docs","readme","content","text","marketing","description","wording"],
    scope:"docs/content", protected:["src/**","billing/**","auth/**","env*"], mode:"Docs only" }
];
const DEFAULT_PROTECTED = ["env*","auth/**","billing/**","middleware/**","migrations/**"];

let selectedAgent = ${jsonSafe(composerState.selectedAgent)};
let selectedMode  = ${jsonSafe(composerState.selectedMode)};

// ── tabs ──
document.querySelectorAll(".pt").forEach(function(tab) {
  tab.addEventListener("click", function() {
    try {
      const tid = tab.getAttribute("data-tab");
      document.querySelectorAll(".pt").forEach(function(t) { t.classList.toggle("active", t.getAttribute("data-tab") === tid); });
      document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.toggle("active", p.id === "tab-" + tid); });
      vscode.postMessage({ type: "tabChanged", tab: tid });
    } catch(e) { console.error("tab", e); }
  });
});

// ── composer ──
const taskEl = document.getElementById("task");
let debounce = null;
function postComposer() {
  const task = taskEl ? taskEl.value : "";
  vscode.postMessage({ type:"composerChanged", task, selectedAgent, selectedMode });
  updatePreview(task);
}
if (taskEl) {
  taskEl.addEventListener("input", function() {
    clearTimeout(debounce);
    debounce = setTimeout(postComposer, 400);
    updatePreview(taskEl.value);
  });
  taskEl.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const task = taskEl.value.trim();
      if (task) vscode.postMessage({ type:"startRun", task, agent:selectedAgent });
    }
  });
}

// ── selectors ──
function bindSelector(selId, ddId, valId, dataAttr, onPick) {
  const sel = document.getElementById(selId);
  const dd  = document.getElementById(ddId);
  const val = document.getElementById(valId);
  if (!sel || !dd) return;
  sel.addEventListener("click", function(e) { e.stopPropagation(); dd.classList.toggle("open"); });
  dd.querySelectorAll(".sel-opt").forEach(function(opt) {
    opt.addEventListener("click", function(e) {
      e.stopPropagation();
      try {
        const v = opt.getAttribute(dataAttr);
        if (val) val.textContent = v;
        dd.querySelectorAll(".sel-opt").forEach(function(o) { o.classList.toggle("active", o.getAttribute(dataAttr) === v); });
        dd.classList.remove("open");
        onPick(v);
        postComposer();
        if (taskEl) updatePreview(taskEl.value);
      } catch(e2) { console.error("sel", e2); }
    });
  });
}
bindSelector("agent-sel","agent-dd","agent-val","data-agent", function(v) { selectedAgent = v; });
bindSelector("mode-sel", "mode-dd", "mode-val", "data-mode",  function(v) { selectedMode  = v; });
document.addEventListener("click", function() {
  document.querySelectorAll(".sel-dd").forEach(function(d) { d.classList.remove("open"); });
});

// ── action buttons ──
document.querySelectorAll("[data-action]").forEach(function(el) {
  el.addEventListener("click", function() {
    try {
      const action = el.getAttribute("data-action");
      if (action === "startRun") {
        const task = taskEl ? taskEl.value.trim() : "";
        vscode.postMessage({ type:"startRun", task, agent:selectedAgent });
      } else if (action === "openOutput") {
        vscode.postMessage({ command:"workbench.action.output.toggleOutput" });
      } else {
        vscode.postMessage({ type: action });
      }
    } catch(e) { console.error("action", e); }
  });
});
document.querySelectorAll("[data-cmd]").forEach(function(el) {
  el.addEventListener("click", function() { vscode.postMessage({ command: el.getAttribute("data-cmd") }); });
});

// ── preview ──
function updatePreview(task) {
  const card = document.getElementById("preview-card");
  const body = document.getElementById("preview-body");
  if (!card || !body) return;
  task = (task || "").trim();
  if (!task) { card.style.display = "none"; return; }

  const lower = task.toLowerCase();
  let rule = null;
  for (var i = 0; i < SCOPE_RULES.length; i++) {
    if (SCOPE_RULES[i].kw.some(function(k) { return lower.includes(k); })) { rule = SCOPE_RULES[i]; break; }
  }
  const scopeLabel = rule ? rule.scope : "auto";
  const protectedZones = rule ? rule.protected : DEFAULT_PROTECTED;
  const suggestedMode  = rule ? rule.mode  : "Auto";
  const dnaRisk = DNA.riskZones.slice();

  var html = "";
  html += "<div class='line'><span class='k'>Task</span><span class='v'><code>" + esc(task.slice(0,80)) + "</code></span></div>";
  html += "<div class='line'><span class='k'>Scope</span><span class='v'><span class='pill scope'>" + esc(scopeLabel) + "</span></span></div>";
  html += "<div class='line'><span class='k'>Protected</span><span class='v'>";
  protectedZones.forEach(function(z) { html += "<span class='pill forbid'>" + esc(z) + "</span>"; });
  html += "</span></div>";
  if (dnaRisk.length) {
    html += "<div class='line'><span class='k'>DNA</span><span class='v'>";
    if (DNA.framework) html += "<span class='pill mem'>" + esc(DNA.framework) + "</span>";
    if (DNA.language)  html += "<span class='pill mem'>" + esc(DNA.language)  + "</span>";
    if (dnaRisk.length) html += "<span class='pill mem'>risk: " + esc(dnaRisk.join(", ")) + "</span>";
    html += "</span></div>";
  }
  html += "<div class='line'><span class='k'>Agent</span><span class='v'><code>" + esc(selectedAgent) + "</code></span></div>";
  html += "<div class='line'><span class='k'>Mode</span><span class='v'><code>" + esc(selectedMode === "Auto" && suggestedMode !== "Auto" ? suggestedMode + " (suggested)" : selectedMode) + "</code></span></div>";
  html += "<div class='line'><span class='k'>Finish</span><span class='v'><span class='pill'>scope held</span><span class='pill'>no risky writes</span></span></div>";

  body.innerHTML = html;
  card.style.display = "";
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// init preview if task already set
if (taskEl && taskEl.value.trim()) updatePreview(taskEl.value);
})();
</script>
</body>
</html>`;
}

// ---- run tab ----

function renderRunTab(
  phase: ConsolePhase,
  local: LocalState,
  dna: DnaSummary | null,
  contract: ContractSummary | null,
  shortRoot: string,
  branch: string
): string {
  const task = composerState.task.trim() || contract?.task || "";

  switch (phase) {
    case "idle":
      return renderIdleCards(local, dna, shortRoot);

    case "composing":
      return `
<div class="msg-user">${h(task)}</div>
<div class="sys-card" id="preview-card">
  <div class="sys-head">
    <span class="ico">${icoDoc()}</span>
    <span class="sys-label">contract prepared</span>
    <span class="sys-right">${h(shortRoot)} · ${h(branch)}</span>
  </div>
  <div class="sys-body" id="preview-body"></div>
  <div class="sys-actions">
    <button class="act primary" data-action="startRun">Start guarded run <span class="kbd">⌘↵</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
  </div>
</div>`;

    case "active":
      return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico violet">${icoRunning()}</span>
    <span class="sys-label">run active</span>
    <span class="sys-right">${h(shortRoot)}</span>
  </div>
  <div class="sys-body">
    <div class="copy"><em class="violet">Agent running.</em> Scope is held by the active contract.</div>
    ${contract?.scope ? `<div class="line"><span class="k">Scope</span><span class="v"><span class="pill scope">${h(contract.scope)}</span></span></div>` : ""}
  </div>
  <div class="timeline">
    <span class="tl-step done"><span class="dot"></span><span class="name">contract</span></span>
    <span class="tl-sep"></span>
    <span class="tl-step active"><span class="dot"></span><span class="name">agent</span></span>
    <span class="tl-sep"></span>
    <span class="tl-step"><span class="dot"></span><span class="name">finish</span></span>
    <span class="tl-sep"></span>
    <span class="tl-step"><span class="dot"></span><span class="name">verdict</span></span>
  </div>
</div>
<div class="sys-card">
  <div class="sys-head">
    <span class="ico amber">${icoWarn()}</span>
    <span class="sys-label">finish check needed</span>
  </div>
  <div class="sys-body">
    <div class="copy">Complete your edits, then run finish check to verify scope was held and no risky writes occurred.</div>
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="finishCheck">Run finish check <span class="kbd">⌘F</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
    <button class="act" data-action="agentHitLimit">Agent hit limit</button>
  </div>
</div>`;

    case "blocked":
      return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico rose">${icoBlocked()}</span>
    <span class="sys-label">run blocked</span>
    <span class="sys-right">split required</span>
  </div>
  <div class="sys-body">
    <div class="copy">RunTrim blocked this run because it spans multiple high-risk systems. Split into separate focused runs.</div>
    ${contract?.detectedSystems?.length
      ? `<div class="line"><span class="k">Systems</span><span class="v">${contract.detectedSystems.map((s) => `<span class="pill forbid">${h(s)}</span>`).join("")}</span></div>`
      : ""}
    ${contract?.blockedReason
      ? `<div class="copy" style="margin-top:2px"><em class="amber">${h(contract.blockedReason)}</em></div>`
      : ""}
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="doctor">Run doctor</button>
    ${local.baselineExists ? `<button class="act" data-action="restore">Restore to baseline</button>` : ""}
    <button class="act" data-action="finishCheck">Finish check anyway</button>
  </div>
</div>`;

    case "limit":
      return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoContinue()}</span>
    <span class="sys-label">continuation ready</span>
    <span class="sys-right">${h(limitReason || "context limit")}</span>
  </div>
  <div class="sys-body">
    <div class="copy">Agent reached ${h(limitReason || "context or usage limit")}. RunTrim prepared a safe continuation prompt to resume where it left off.</div>
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="continueLimit">Continue in new session <span class="kbd">⌘⇧↵</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
    <button class="act" data-action="clearLimit">Clear</button>
  </div>
</div>`;

    case "passed":
      return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoCheck()}</span>
    <span class="sys-label">finish verdict</span>
    <span class="sys-right">PASS</span>
  </div>
  <div class="sys-body">
    <div class="copy"><em>Scope held.</em> No risky writes detected. Contract complete.</div>
    <div class="timeline">
      <span class="tl-step done"><span class="dot"></span><span class="name">contract</span></span>
      <span class="tl-sep"></span>
      <span class="tl-step done"><span class="dot"></span><span class="name">agent</span></span>
      <span class="tl-sep"></span>
      <span class="tl-step done"><span class="dot"></span><span class="name">finish</span></span>
      <span class="tl-sep"></span>
      <span class="tl-step done"><span class="dot"></span><span class="name">verdict</span></span>
    </div>
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="clearFinish">New guarded run</button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
  </div>
</div>`;

    case "warned":
      return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico amber">${icoWarn()}</span>
    <span class="sys-label">finish verdict</span>
    <span class="sys-right">WARN</span>
  </div>
  <div class="sys-body">
    <div class="copy"><em class="amber">Warnings detected.</em> Review the RunTrim output channel before continuing.</div>
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="finishCheck">Run finish check again</button>
    ${local.baselineExists ? `<button class="act" data-action="restore">Restore to baseline</button>` : ""}
    <button class="act" data-action="clearFinish">Accept and continue</button>
  </div>
</div>`;
  }
}

function renderIdleCards(local: LocalState, dna: DnaSummary | null, shortRoot: string): string {
  const tech = [friendly(dna?.framework), friendly(dna?.language), dna?.stylingSystem].filter(Boolean).join(" · ");
  const risk = dna?.riskZones ?? [];
  const countPart = dna?.riskPathCount ? ` · ${dna.riskPathCount} paths` : "";
  return `
<div class="day-sep">ready</div>
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoDna()}</span>
    <span class="sys-label">project ready</span>
    <span class="sys-right">${h(shortRoot)}</span>
  </div>
  <div class="sys-body">
    ${tech ? `<div class="line"><span class="k">Stack</span><span class="v"><code>${h(tech)}</code></span></div>` : ""}
    ${risk.length ? `<div class="line"><span class="k">Protected</span><span class="v">${risk.map((z) => `<span class="pill forbid">${h(z)}</span>`).join("")}${countPart ? `<span class="pill muted">${h(countPart.slice(3))}</span>` : ""}</span></div>` : ""}
    <div class="line"><span class="k">CLI</span><span class="v"><code>${local.cliInstalled ? "connected" : "not installed"}</code></span></div>
    ${!local.cliInstalled ? `<div class="copy"><em class="amber">Install with: npm install -g runtrim</em></div>` : ""}
    ${!local.dnaExists ? `<div class="copy"><em class="amber">Run runtrim start to initialize this project.</em></div>` : ""}
  </div>
</div>
<div id="preview-card" class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoDoc()}</span>
    <span class="sys-label">contract prepared</span>
    <span class="sys-right">${h(shortRoot)}</span>
  </div>
  <div class="sys-body" id="preview-body"></div>
  <div class="sys-actions">
    <button class="act primary" data-action="startRun">Start guarded run <span class="kbd">⌘↵</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
  </div>
</div>`;
}

// ---- history tab ----

function renderHistoryTab(recentRuns: RunSummary[], archiveCount: number, baseline: BaselineSummary | null, shortRoot: string): string {
  if (!recentRuns.length && !baseline && !archiveCount) {
    return `<div class="empty-state">No run history found yet.<br>Start a guarded run to begin tracking.</div>`;
  }

  let out = "";

  if (baseline) {
    const date   = baseline.initializedAt?.slice(0, 10) ?? "unknown";
    const branch = baseline.gitBranch ?? "unknown";
    const commit = (baseline.gitCommit ?? "").slice(0, 8) || "unknown";
    const files  = `${baseline.safeFileCount ?? "?"} / ${baseline.totalFileCount ?? "?"} files`;
    out += `
<div class="day-sep">baseline</div>
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoRestore()}</span>
    <span class="sys-label">baseline snapshot</span>
    <span class="sys-right">${h(shortRoot)}</span>
  </div>
  <div class="sys-body">
    <div class="line"><span class="k">Captured</span><span class="v"><code>${h(date)}</code></span></div>
    <div class="line"><span class="k">Branch</span><span class="v"><code>${h(branch)} · ${h(commit)}</code></span></div>
    <div class="line"><span class="k">Files</span><span class="v"><code>${h(files)}</code></span></div>
  </div>
</div>`;
  }

  if (recentRuns.length) {
    out += `<div class="day-sep">recent runs</div>`;
    for (const run of recentRuns) {
      out += `
<div class="hist-item">
  <div class="hist-task">${h(run.task)}</div>
  <div class="hist-meta"><span>${h(run.date)}</span><span>${h(run.id.slice(0, 8))}</span></div>
</div>`;
    }
  }

  if (archiveCount > recentRuns.length) {
    out += `<div class="hist-item" style="opacity:.5"><div class="hist-task">${archiveCount - recentRuns.length} older contracts in archive</div></div>`;
  }

  return out;
}

// ---- rules tab ----

function renderRulesTab(dna: DnaSummary | null, rawDna: string, local: LocalState): string {
  if (!dna && !rawDna) {
    return `<div class="empty-state">Project DNA not found.<br>Run runtrim start in your workspace to initialize.</div>`;
  }

  let out = "";

  if (dna) {
    out += `
<div class="rules-group">
  <div class="rules-head">Environment</div>
  <div class="rules-card">
    ${dna.framework      ? `<div class="rrow"><span class="k">Framework</span><span class="v"><span class="pill mem">${h(friendly(dna.framework))}</span></span></div>` : ""}
    ${dna.packageManager ? `<div class="rrow"><span class="k">Package mgr</span><span class="v"><code>${h(dna.packageManager)}</code></span></div>` : ""}
    ${dna.language       ? `<div class="rrow"><span class="k">Language</span><span class="v"><span class="pill mem">${h(friendly(dna.language))}</span></span></div>` : ""}
    ${dna.stylingSystem  ? `<div class="rrow"><span class="k">Styling</span><span class="v"><code>${h(dna.stylingSystem)}</code></span></div>` : ""}
    ${dna.componentSystem? `<div class="rrow"><span class="k">Components</span><span class="v"><code>${h(dna.componentSystem)}</code></span></div>` : ""}
  </div>
</div>`;

    if (dna.riskZones.length) {
      const count = dna.riskPathCount ?? 0;
      out += `
<div class="rules-group">
  <div class="rules-head">Protected zones</div>
  <div class="rules-card">
    <div class="rrow"><span class="k">Risk zones</span><span class="v">${dna.riskZones.map((z) => `<span class="pill forbid">${h(z)}</span>`).join("")}</span></div>
    ${count ? `<div class="rrow"><span class="k">Path count</span><span class="v"><code>${count} risky paths</code></span></div>` : ""}
  </div>
</div>`;
    }
  }

  if (rawDna) {
    out += `
<div class="rules-group">
  <div class="rules-head">Project DNA</div>
  <div class="rules-card">
    <details>
      <summary>View raw DNA</summary>
      <pre class="raw-pre">${h(rawDna.slice(0, 3000))}</pre>
    </details>
    <div class="sys-actions" style="padding:6px 12px 8px;">
      <button class="act" data-action="refreshDna">Refresh DNA</button>
    </div>
  </div>
</div>`;
  }

  if (!local.cliInstalled) {
    out += `<div class="hist-item"><div class="hist-task" style="color:var(--amber)">RunTrim CLI not found. Install: npm install -g runtrim</div></div>`;
  }

  return out;
}

// ---- inline SVG icons ----

function icoCheck(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function icoDoc(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 1v3h3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5 7h4M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoRunning(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`;
}
function icoWarn(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M7 4v4M7 10v0.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoBlocked(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoContinue(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function icoRestore(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 4l-1 3 3 1M2 7a5 5 0 109-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}
function icoDna(): string {
  return `<svg viewBox="0 0 14 14" fill="none"><path d="M4 2c0 4 6 4 6 8M10 2c0 4-6 4-6 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4 5h6M4 9h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}

// ---- helpers ----

function friendly(input: string | undefined): string {
  if (!input) return "";
  const map: Record<string, string> = {
    nextjs: "Next.js", typescript: "TypeScript", javascript: "JavaScript",
    tailwindcss: "Tailwind", tailwind: "Tailwind"
  };
  return map[input.toLowerCase()] ?? input.charAt(0).toUpperCase() + input.slice(1);
}

function readFile(p: string): string {
  try { return fs.readFileSync(p, "utf8").trim(); } catch { return ""; }
}

function tryReadDir(p: string): string[] {
  try { return fs.readdirSync(p); } catch { return []; }
}

function h(input: string): string {
  return String(input)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function jsonSafe(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function isAgentOption(v: unknown): v is AgentOption {
  return v === "Auto" || v === "Claude Code" || v === "Codex" || v === "Cursor" || v === "Custom";
}

function isModeOption(v: unknown): v is ModeOption {
  return v === "Auto" || v === "Strict" || v === "UI only" || v === "Docs only";
}

export function deactivate(): void { return; }
