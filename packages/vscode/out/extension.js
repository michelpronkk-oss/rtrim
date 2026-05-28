"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_child_process_1 = require("node:child_process");
const vscode = require("vscode");
const COMMANDS = {
    newGuardedRun: "runtrim.newGuardedRun",
    finishCheck: "runtrim.finishCheck",
    doctor: "runtrim.doctor",
    continuePrompt: "runtrim.continuePrompt",
    refreshProjectDna: "runtrim.refreshProjectDna",
    openDashboard: "runtrim.openDashboard",
    openControlPanel: "runtrim.openControlPanel"
};
let statusBarItem;
let outputChannel;
function activate(context) {
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
    refreshStatusBar();
}
function registerCommand(context, id, callback) {
    context.subscriptions.push(vscode.commands.registerCommand(id, callback));
}
async function runNewGuardedRun() {
    const task = await vscode.window.showInputBox({
        prompt: "Task for runtrim agent",
        placeHolder: "Fix onboarding copy while preserving billing logic",
        ignoreFocusOut: true,
        validateInput: (value) => value.trim().length === 0 ? "Task is required." : undefined
    });
    if (!task) {
        return;
    }
    await runAndRefresh("agent", ["agent", task, "--copy"]);
}
async function runAndRefresh(name, args) {
    const result = await runRuntrim(args);
    outputChannel.show(true);
    outputChannel.appendLine(`$ runtrim ${args.join(" ")}`);
    outputChannel.appendLine(result.stdout || "");
    if (result.stderr) {
        outputChannel.appendLine(result.stderr);
    }
    outputChannel.appendLine("");
    if (result.exitCode !== 0) {
        void vscode.window.showWarningMessage(`RunTrim ${name} failed. See RunTrim output.`);
    }
    await refreshStatusBar(result.stdout + "\n" + result.stderr);
}
function runRuntrim(args) {
    return new Promise((resolve) => {
        (0, node_child_process_1.execFile)("runtrim", args, { cwd: workspaceRoot(), windowsHide: true }, (error, stdout, stderr) => {
            const code = error?.code;
            const exitCode = typeof code === "number" ? code : error ? 1 : 0;
            resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
        });
    });
}
async function refreshStatusBar(lastOutput = "") {
    const local = loadLocalState();
    const state = deriveStatus(local, lastOutput);
    const map = {
        not_installed: { text: "RunTrim: not installed", color: "statusBarItem.warningForeground", tooltip: "runtrim executable is not available in PATH" },
        no_project: { text: "RunTrim: no project", color: "statusBarItem.warningForeground", tooltip: "No local .runtrim project state was detected" },
        ready: { text: "RunTrim: ready", color: "#7ce6c0", tooltip: "RunTrim project state is present and ready" },
        active: { text: "RunTrim: active", color: "statusBarItem.prominentForeground", tooltip: "An active guarded contract exists" },
        blocked: { text: "RunTrim: blocked", color: "#e9bb6f", tooltip: "RunTrim reported blocked status or latest contract is blocked" }
    };
    const view = map[state];
    statusBarItem.text = view.text;
    statusBarItem.color = view.color;
    statusBarItem.tooltip = view.tooltip;
}
function deriveStatus(local, lastOutput) {
    if (!local.cliInstalled) {
        return "not_installed";
    }
    if (!local.workspaceRoot || !local.dnaExists) {
        return "no_project";
    }
    const contract = (local.contractStatus ?? "").toLowerCase();
    const output = lastOutput.toLowerCase();
    if (contract.includes("blocked") || output.includes("blocked")) {
        return "blocked";
    }
    if (contract.includes("active")) {
        return "active";
    }
    return "ready";
}
function loadLocalState() {
    const root = workspaceRoot();
    const cliInstalled = cliExists();
    if (!root) {
        return {
            cliInstalled,
            dnaExists: false,
            memoryExists: false,
            baselineExists: false,
            latestContractExists: false
        };
    }
    const runtrimRoot = path.join(root, ".runtrim");
    const dnaFile = path.join(runtrimRoot, "project-dna.md");
    const memoryFile = path.join(runtrimRoot, "memory", "current.md");
    const baselineFile = path.join(runtrimRoot, "history", "baseline.json");
    const latestContractFile = path.join(runtrimRoot, "contracts", "latest.md");
    return {
        cliInstalled,
        workspaceRoot: root,
        dnaExists: fileExists(dnaFile),
        memoryExists: fileExists(memoryFile),
        baselineExists: fileExists(baselineFile),
        latestContractExists: fileExists(latestContractFile),
        contractStatus: fileExists(latestContractFile) ? findLine(latestContractFile, /^Status\s*:/i) : undefined
    };
}
function cliExists() {
    const cmd = process.platform === "win32" ? "where" : "which";
    try {
        const output = require("node:child_process").execFileSync(cmd, ["runtrim"], { stdio: "pipe" }).toString();
        return output.trim().length > 0;
    }
    catch {
        return false;
    }
}
function fileExists(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    }
    catch {
        return false;
    }
}
function findLine(filePath, pattern) {
    try {
        const text = fs.readFileSync(filePath, "utf8");
        return text.split(/\r?\n/).find((line) => pattern.test(line));
    }
    catch {
        return undefined;
    }
}
function readCompact(filePath, fallback) {
    try {
        const raw = fs.readFileSync(filePath, "utf8").trim();
        return raw.length > 0 ? raw : fallback;
    }
    catch {
        return fallback;
    }
}
function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function openControlPanel() {
    const panel = vscode.window.createWebviewPanel("runtrim.control", "RunTrim", vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.webview.html = renderControlPanel();
    panel.webview.onDidReceiveMessage(async (msg) => {
        const command = msg.command;
        if (!command) {
            return;
        }
        await vscode.commands.executeCommand(command);
        panel.webview.html = renderControlPanel();
    });
}
function renderControlPanel() {
    const local = loadLocalState();
    const state = deriveStatus(local, "");
    const root = local.workspaceRoot ?? "No workspace";
    const runtrimDir = local.workspaceRoot ? path.join(local.workspaceRoot, ".runtrim") : "";
    const dnaText = runtrimDir ? readCompact(path.join(runtrimDir, "project-dna.md"), "Project DNA not found.") : "Project DNA not found.";
    const memoryText = runtrimDir ? readCompact(path.join(runtrimDir, "memory", "current.md"), "Current memory not found.") : "Current memory not found.";
    const historyText = runtrimDir ? readCompact(path.join(runtrimDir, "history", "baseline.json"), "History baseline not found.") : "History baseline not found.";
    const contractText = runtrimDir ? readCompact(path.join(runtrimDir, "contracts", "latest.md"), "No active contract.") : "No active contract.";
    const nextAction = suggestNextAction(local, state);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RunTrim</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}
.wrap {
  padding: 12px;
  display: grid;
  gap: 10px;
  max-width: 100%;
}
.card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 10px;
  background: color-mix(in srgb, var(--vscode-editor-background) 92%, #ffffff 8%);
}
.h {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.72;
  margin-bottom: 8px;
}
.row { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.pill {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.pill.ready { color: #7ce6c0; border-color: #7ce6c0; }
.pill.blocked { color: #e9bb6f; border-color: #e9bb6f; }
.meta { font-size: 12px; opacity: 0.8; word-break: break-word; }
.pre {
  margin: 0;
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
  line-height: 1.4;
  max-height: 144px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
button {
  border: 1px solid var(--vscode-panel-border);
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-radius: 6px;
  font-size: 12px;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}
button.primary {
  background: color-mix(in srgb, #7ce6c0 26%, var(--vscode-button-background) 74%);
  color: var(--vscode-button-foreground);
}
button:hover { filter: brightness(1.06); }
</style>
</head>
<body>
<div class="wrap">
  <section class="card">
    <div class="h">Current state</div>
    <div class="row">
      <strong>RunTrim</strong>
      <span class="pill ${state === "blocked" ? "blocked" : state === "ready" ? "ready" : ""}">${state.replace("_", " ")}</span>
    </div>
    <div class="meta">${escapeHtml(root)}</div>
  </section>
  <section class="card"><div class="h">Project DNA</div><pre class="pre">${escapeHtml(limit(dnaText))}</pre></section>
  <section class="card"><div class="h">History baseline</div><pre class="pre">${escapeHtml(limit(historyText))}</pre></section>
  <section class="card"><div class="h">Active run</div><pre class="pre">${escapeHtml(limit(contractText))}</pre></section>
  <section class="card"><div class="h">Next safest action</div><div class="meta">${escapeHtml(nextAction)}</div></section>
  <section class="card">
    <div class="h">Quick commands</div>
    <div class="actions">
      <button class="primary" data-command="${COMMANDS.newGuardedRun}">New Guarded Run</button>
      <button data-command="${COMMANDS.finishCheck}">Finish Check</button>
      <button data-command="${COMMANDS.doctor}">Doctor</button>
      <button data-command="${COMMANDS.continuePrompt}">Continue Prompt</button>
      <button data-command="${COMMANDS.refreshProjectDna}">Refresh Project DNA</button>
      <button data-command="${COMMANDS.openDashboard}">Open Dashboard</button>
    </div>
  </section>
</div>
<script>
const vscode = acquireVsCodeApi();
document.querySelectorAll('button[data-command]').forEach((el) => {
  el.addEventListener('click', () => vscode.postMessage({ command: el.getAttribute('data-command') }));
});
</script>
</body>
</html>`;
}
function suggestNextAction(local, state) {
    if (!local.cliInstalled) {
        return "Install the RunTrim CLI locally so this extension can execute guarded commands.";
    }
    if (!local.dnaExists) {
        return "Run `runtrim start` in this workspace to initialize local project state.";
    }
    if (state === "blocked") {
        return "Run `RunTrim: Doctor`, inspect output, and only then run `RunTrim: Finish Check`.";
    }
    if (state === "active") {
        return "Complete your scoped edits, then run `RunTrim: Finish Check` before ending the run.";
    }
    return "Start a new guarded run from the command palette with `RunTrim: New Guarded Run`.";
}
function limit(input) {
    return input.slice(0, 1200);
}
function escapeHtml(input) {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function deactivate() {
    return;
}
