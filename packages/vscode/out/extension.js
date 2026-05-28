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
// ---- constants ----
const COMMANDS = {
    newGuardedRun: "runtrim.newGuardedRun",
    finishCheck: "runtrim.finishCheck",
    doctor: "runtrim.doctor",
    continuePrompt: "runtrim.continuePrompt",
    refreshProjectDna: "runtrim.refreshProjectDna",
    openDashboard: "runtrim.openDashboard",
    openControlPanel: "runtrim.openControlPanel",
    connectAgent: "runtrim.connectAgent",
    checkMcpConnection: "runtrim.checkMcpConnection",
    showMcpInstructions: "runtrim.showMcpInstructions",
    copyMcpConfig: "runtrim.copyMcpConfig"
};
const SETTINGS = {
    defaultAgent: "runtrim.agent.defaultAgent",
    customCommand: "runtrim.agent.customCommand",
    claudeCommand: "runtrim.agent.claudeCommand",
    codexCommand: "runtrim.agent.codexCommand",
    autoLaunchTerminal: "runtrim.agent.autoLaunchTerminal",
    autoFinishAfterControlledRun: "runtrim.agent.autoFinishAfterControlledRun"
};
const LIMIT_PHRASES = [
    "context window", "context length", "token limit", "hit limit",
    "maximum context", "output limit", "context limit", "rate limit",
    "too many tokens", "truncated", "conversation too long"
];
let statusBarItem;
let outputChannel;
let controlPanel = null;
// undefined = not yet resolved; null = not found; string = resolved path
let resolvedCliPath = undefined;
let composerState = {
    task: "",
    selectedAgent: "Auto",
    selectedMode: "Auto",
    usageLimitHit: false,
    activeTab: "run"
};
let lastFinishVerdict = null;
let limitReason = "";
let lastCommandResult = null;
let mcpState = null;
let mcpUxNotice = "";
let runtrimStatusJson = null;
let runtrimRestoreJson = null;
let runtrimJsonCheckedAt = 0;
let lastRunStartedFromPanel = false;
let lastRouteKind = null;
let lastSelectedAgent = null;
let lastTask = "";
let lifecycleState = {
    currentRunId: "",
    currentTask: "",
    selectedAgent: null,
    selectedMode: null,
    routeKind: null,
    processRunning: false,
    agentExitCode: null,
    lastAgentOutputTail: "",
    autoFinishStarted: false,
    autoFinishResult: null
};
const MCP_CACHE_TTL = 45000; // 45 s â€” re-probe when stale
const RUNTRIM_JSON_CACHE_TTL = 15000;
// ---- activation ----
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
    registerCommand(context, COMMANDS.connectAgent, () => connectAgentFlow());
    registerCommand(context, COMMANDS.checkMcpConnection, () => checkMcpConnection(true));
    registerCommand(context, COMMANDS.showMcpInstructions, () => showMcpInstructions());
    registerCommand(context, COMMANDS.copyMcpConfig, () => copyMcpConfig());
    const cfg = vscode.workspace.getConfiguration("runtrim.agent");
    const def = cfg.get("defaultAgent", "Auto");
    if (isAgentOption(def))
        composerState.selectedAgent = def;
    // Reset CLI cache when runtrim.cli.path setting changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("runtrim.cli.path")) {
            resolvedCliPath = undefined;
            void refreshStatusBar();
            refreshControlPanel();
        }
    }));
    refreshStatusBar();
}
function registerCommand(context, id, cb) {
    context.subscriptions.push(vscode.commands.registerCommand(id, cb));
}
// ---- commands ----
async function runNewGuardedRun() {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    if (!local.dnaExists)
        return showNoProjectError();
    const task = await vscode.window.showInputBox({
        prompt: "Task for guarded run",
        placeHolder: "Fix checkout bug while preserving billing logic",
        ignoreFocusOut: true,
        validateInput: (v) => v.trim().length ? undefined : "Task is required."
    });
    if (!task)
        return;
    composerState.task = task;
    await runAndRefresh("agent", ["agent", task, "--copy"]);
}
async function runAndRefresh(name, args) {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    if (!local.workspaceRoot) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
    }
    lastCommandResult = null; // clear previous result card
    outputChannel.show(true);
    let cmd = `runtrim ${args.join(" ")}`;
    if (args[0] === "finish")
        cmd = "runtrim finish --json";
    if (args[0] === "continue")
        cmd = `runtrim continue ${args.slice(1).join(" ")} --json`;
    outputChannel.appendLine(`$ ${cmd}`);
    const result = args[0] === "finish"
        ? await runRuntrimArgs("finish", ["--json"])
        : args[0] === "continue"
            ? await runRuntrimArgs("continue", [...args.slice(1), "--json"])
            : await runRuntrimArgs(args[0] ?? "", args.slice(1));
    if (result.stdout)
        outputChannel.appendLine(result.stdout);
    if (result.stderr)
        outputChannel.appendLine(result.stderr);
    outputChannel.appendLine("");
    if (result.notFound)
        return showInstallError();
    const combined = `${result.stdout}\n${result.stderr}`;
    const lower = combined.toLowerCase();
    if (result.exitCode !== 0) {
        if (lower.includes("no project") || lower.includes("not initialized") || lower.includes("runtrim start")) {
            showNoProjectError();
        }
        else {
            // Show error card inside the panel instead of only a toast
            lastCommandResult = {
                kind: "error",
                success: false,
                errorTitle: `RunTrim ${name} failed`,
                errorDetail: extractError(combined),
                suggestedFix: suggestFix(combined)
            };
            void vscode.window.showWarningMessage(`RunTrim ${name} failed. Check the RunTrim output panel.`);
        }
    }
    // Detect finish verdict
    if (args[0] === "finish") {
        try {
            const payload = JSON.parse(result.stdout.trim());
            if (payload.ok === false || payload.error) {
                lastFinishVerdict = "failed";
                lastCommandResult = {
                    kind: "error",
                    success: false,
                    errorTitle: payload.error?.code ? `Finish error: ${payload.error.code}` : "Finish check failed",
                    errorDetail: payload.error?.message ?? extractError(combined),
                    suggestedFix: payload.restore?.guidance ?? (local.baselineExists ? "Review output and run restore guidance." : "Review output channel for full logs.")
                };
            }
            else {
                const verdict = (payload.verdict ?? "unknown").toLowerCase();
                if (verdict === "pass") {
                    lastFinishVerdict = "passed";
                    lastCommandResult = null;
                }
                else if (verdict === "warn") {
                    lastFinishVerdict = "warn";
                    lastCommandResult = {
                        kind: "doctor",
                        success: true,
                        snippet: [payload.rawSummary, ...(payload.warnings ?? []).slice(0, 2)].filter(Boolean).join(" · ").slice(0, 220)
                    };
                }
                else {
                    lastFinishVerdict = "failed";
                    lastCommandResult = {
                        kind: "error",
                        success: false,
                        errorTitle: `Finish verdict: ${(payload.verdict ?? "unknown").toUpperCase()}`,
                        errorDetail: [payload.rawSummary, ...(payload.blockedFiles ?? []).slice(0, 2)].filter(Boolean).join(" · "),
                        suggestedFix: payload.restore?.guidance ?? payload.continuation?.command ?? "Review finish output details in RunTrim output."
                    };
                }
            }
        }
        catch {
            const upper = combined.toUpperCase();
            if (/\bPASS\b/.test(upper)) {
                lastFinishVerdict = "passed";
                lastCommandResult = null;
            }
            else if (/\bWARN\b/.test(upper)) {
                lastFinishVerdict = "warn";
                lastCommandResult = null;
            }
            else if (/\b(FAIL|BLOCKED)\b/.test(upper) || result.exitCode !== 0) {
                lastFinishVerdict = "failed";
                if (!lastCommandResult) {
                    lastCommandResult = {
                        kind: "error",
                        success: false,
                        errorTitle: "Finish check failed",
                        errorDetail: extractError(combined),
                        suggestedFix: local.baselineExists ? "Review the output, then restore to baseline if needed." : "Review the output channel for full details."
                    };
                }
            }
        }
    }
    if (args[0] === "continue") {
        try {
            const payload = JSON.parse(result.stdout.trim());
            if (payload.ok === false || payload.error) {
                lastCommandResult = {
                    kind: "error",
                    success: false,
                    errorTitle: payload.error?.code ? `Continue error: ${payload.error.code}` : "Continuation failed",
                    errorDetail: payload.error?.message ?? extractError(combined),
                    suggestedFix: "Check RunTrim output and retry continuation."
                };
            }
            else {
                const parts = [payload.reason, payload.summary, payload.nextAction].filter((v) => typeof v === "string" && v.trim().length > 0);
                lastCommandResult = { kind: "doctor", success: true, snippet: parts.join(" · ").slice(0, 220) };
            }
        }
        catch {
            // fallback remains legacy behavior
        }
    }
    // Detect limit phrases
    if (LIMIT_PHRASES.some((p) => lower.includes(p))) {
        composerState.usageLimitHit = true;
    }
    // Doctor â€” show brief result card
    if (args[0] === "doctor" && !lastCommandResult) {
        const snippet = combined.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join(" Â· ").slice(0, 200);
        lastCommandResult = {
            kind: "doctor",
            success: result.exitCode === 0,
            snippet: snippet || undefined
        };
    }
    // DNA refresh â€” show brief result card
    if (args[0] === "start" && args.includes("--refresh-dna") && !lastCommandResult) {
        lastCommandResult = { kind: "dna", success: result.exitCode === 0 };
    }
    await refreshRuntrimJsonState(true);
    await refreshStatusBar(lower);
    refreshControlPanel();
}
async function runWithAgent(task, agent) {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    if (!local.workspaceRoot) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
    }
    if (!local.dnaExists) {
        void vscode.window.showWarningMessage("Project DNA missing. Run RunTrim: Refresh Project DNA first.");
        return;
    }
    lastFinishVerdict = null;
    lastCommandResult = null;
    lastRunStartedFromPanel = true;
    lastSelectedAgent = agent;
    lastTask = task;
    lifecycleState.currentTask = task;
    lifecycleState.selectedAgent = agent;
    lifecycleState.selectedMode = composerState.selectedMode;
    lifecycleState.processRunning = false;
    lifecycleState.agentExitCode = null;
    lifecycleState.autoFinishStarted = false;
    lifecycleState.autoFinishResult = null;
    lifecycleState.lastAgentOutputTail = "";
    outputChannel.show(true);
    outputChannel.appendLine(`$ runtrim agent "${task}" --copy`);
    const result = await runRuntrimArgs("agent", [task, "--copy"]);
    if (result.stdout)
        outputChannel.appendLine(result.stdout);
    if (result.stderr)
        outputChannel.appendLine(result.stderr);
    outputChannel.appendLine("");
    if (result.notFound) {
        showInstallError();
        return;
    }
    if (result.exitCode !== 0) {
        const combined = result.stdout + "\n" + result.stderr;
        lastCommandResult = {
            kind: "error",
            success: false,
            errorTitle: "Guarded run failed",
            errorDetail: extractError(combined),
            suggestedFix: suggestFix(combined)
        };
        void vscode.window.showErrorMessage("Could not create guarded handoff. Check the RunTrim output channel.");
        await refreshStatusBar(combined.toLowerCase());
        refreshControlPanel();
        return;
    }
    lifecycleState.currentRunId = parseRunId(result.stdout + "\n" + result.stderr);
    const agentHandoffPath = path.join(local.workspaceRoot, ".runtrim", "agent", "latest.md");
    const handoff = readFile(agentHandoffPath);
    if (!handoff) {
        lastCommandResult = {
            kind: "error",
            success: false,
            errorTitle: "Handoff not found",
            errorDetail: "runtrim agent completed but the handoff file was not created.",
            suggestedFix: "Try again or run runtrim start --refresh-dna first."
        };
        void vscode.window.showWarningMessage("Handoff not found after runtrim agent. Try again.");
        refreshControlPanel();
        return;
    }
    const bridgePath = path.join(local.workspaceRoot, ".runtrim", "bridge", "latest-extension-handoff.md");
    try {
        fs.mkdirSync(path.dirname(bridgePath), { recursive: true });
        fs.writeFileSync(bridgePath, handoff, "utf8");
        outputChannel.appendLine(`[handoff] saved to ${bridgePath}`);
    }
    catch (e) {
        outputChannel.appendLine(`[handoff] bridge file not written: ${String(e)}`);
    }
    const freshContract = parseContract(path.join(local.workspaceRoot, ".runtrim", "contracts", "latest.md"));
    const mcp = await detectMcpState();
    const routeResult = await routeAgent(agent, task, handoff, bridgePath, local.workspaceRoot, mcp.status);
    lastRouteKind = routeResult.routeKind;
    lifecycleState.routeKind = routeResult.routeKind;
    lifecycleState.processRunning = routeResult.processRunning;
    lastCommandResult = {
        kind: "agent",
        success: true,
        task,
        agent,
        scope: freshContract?.scope ?? undefined,
        launched: routeResult.launched,
        agentLaunched: routeResult.agentName,
        mcpStatus: mcp.status,
        routeKind: routeResult.routeKind
    };
    await refreshRuntrimJsonState(true);
    await refreshStatusBar(`${result.stdout}\n${result.stderr}`.toLowerCase());
    refreshControlPanel();
    if (routeResult.completionPromise) {
        void observeControlledLaunchCompletion(routeResult.completionPromise);
    }
}
async function copyHandoff() {
    const root = workspaceRoot();
    if (!root) {
        void vscode.window.showWarningMessage("No workspace folder is open.");
        return;
    }
    const handoff = readFile(path.join(root, ".runtrim", "agent", "latest.md"));
    if (!handoff) {
        void vscode.window.showWarningMessage("No handoff found. Start a guarded run first.");
        return;
    }
    await vscode.env.clipboard.writeText(handoff);
    void vscode.window.showInformationMessage("Guarded handoff copied. Source stays local.");
}
async function routeAgent(agent, task, handoff, handoffPath, projectRoot, mcpStatus = "unknown") {
    const cfg = vscode.workspace.getConfiguration();
    const customTpl = String(cfg.get(SETTINGS.customCommand) ?? "").trim();
    const claudeTpl = String(cfg.get(SETTINGS.claudeCommand) ?? "").trim();
    const codexTpl = String(cfg.get(SETTINGS.codexCommand) ?? "").trim();
    const defaultCfg = String(cfg.get(SETTINGS.defaultAgent) ?? "Auto").trim();
    const adapters = buildAdapterCatalog({
        selectedAgent: agent,
        defaultAgent: defaultCfg,
        claudeTpl,
        codexTpl,
        customTpl,
        mcpStatus
    });
    const selectedAdapter = resolveSelectedAdapter(adapters, agent);
    const launchControlled = async (tpl, name) => {
        const cmd = renderTpl(tpl, task, handoff, handoffPath, projectRoot);
        if (!cmd.trim())
            return null;
        outputChannel.appendLine(`[route] ${name}: controlled launch — ${cmd.slice(0, 140)}`);
        const completionPromise = runControlledCommand(cmd, projectRoot);
        return {
            launched: true,
            agentName: name,
            routeKind: "controlled_process",
            processRunning: true,
            completionPromise
        };
    };
    const copyFallback = async (reason) => {
        await vscode.env.clipboard.writeText(handoff);
        outputChannel.appendLine(`[route] copy fallback — ${reason}`);
    };
    const settingsPrompt = async (label, key) => {
        const choice = await vscode.window.showInformationMessage(`Handoff copied. Paste into ${label}. Set ${key} in settings to launch automatically.`, "Open settings");
        if (choice)
            vscode.commands.executeCommand("workbench.action.openSettings", key);
    };
    if (selectedAdapter.id === "cursor") {
        await copyFallback("Cursor uses copy-paste handoff");
        if (selectedAdapter.routeType === "mcp") {
            void vscode.window.showInformationMessage(selectedAdapter.userFacingMessage);
            return { launched: false, agentName: "Cursor", routeKind: "mcp_ready", processRunning: false };
        }
        void vscode.window.showInformationMessage(selectedAdapter.userFacingMessage);
        return { launched: false, agentName: "Cursor", routeKind: "copy_handoff", processRunning: false };
    }
    if (selectedAdapter.id === "custom") {
        if (!selectedAdapter.commandTemplate) {
            await copyFallback("Custom: no command configured");
            const choice = await vscode.window.showWarningMessage("Set runtrim.agent.customCommand to launch your agent automatically. Handoff copied.", "Open settings");
            if (choice)
                vscode.commands.executeCommand("workbench.action.openSettings", SETTINGS.customCommand);
            return { launched: false, agentName: "Custom", routeKind: "fallback", processRunning: false };
        }
        const launched = await launchControlled(selectedAdapter.commandTemplate, "Custom");
        return launched ?? { launched: false, agentName: "Custom", routeKind: "fallback", processRunning: false };
    }
    if (selectedAdapter.id === "claude") {
        if (selectedAdapter.commandTemplate) {
            const launched = await launchControlled(selectedAdapter.commandTemplate, "Claude Code");
            if (launched)
                return launched;
        }
        await copyFallback("Claude Code: no command template");
        void settingsPrompt("Claude Code", SETTINGS.claudeCommand);
        return { launched: false, agentName: "Claude Code", routeKind: "fallback", processRunning: false };
    }
    if (selectedAdapter.id === "codex") {
        if (selectedAdapter.commandTemplate) {
            const launched = await launchControlled(selectedAdapter.commandTemplate, "Codex");
            if (launched)
                return launched;
        }
        await copyFallback("Codex: no command template");
        void settingsPrompt("Codex", SETTINGS.codexCommand);
        return { launched: false, agentName: "Codex", routeKind: "fallback", processRunning: false };
    }
    if (selectedAdapter.id === "auto") {
        if (selectedAdapter.commandTemplate) {
            const launchName = selectedAdapter.label.includes("Claude") ? "Claude Code" :
                selectedAdapter.label.includes("Codex") ? "Codex" :
                    "Custom";
            const launched = await launchControlled(selectedAdapter.commandTemplate, launchName);
            if (launched)
                return launched;
        }
        if (selectedAdapter.routeType === "mcp") {
            await copyFallback("Auto selected MCP-ready route");
            void vscode.window.showInformationMessage("MCP ready. Your connected agent can use RunTrim tools. Run finish check when edits are done.");
            return { launched: false, agentName: "Auto", routeKind: "mcp_ready", processRunning: false };
        }
    }
    await copyFallback(`safe handoff fallback: ${selectedAdapter.fallbackMessage}`);
    void vscode.window.showInformationMessage("Handoff copied. Paste into your connected agent workflow. Run finish check when edits are done.");
    return { launched: false, agentName: "Auto", routeKind: "fallback", processRunning: false };
}
function buildAdapterCatalog(input) {
    const mcpReady = input.mcpStatus === "configured";
    const adapters = [
        {
            id: "cursor",
            label: "Cursor",
            routeType: mcpReady ? "mcp" : "handoff",
            readiness: "ready",
            canAutoLaunch: false,
            canAutoFinish: false,
            requiresSetup: false,
            userFacingMessage: mcpReady
                ? "MCP ready. Your connected Cursor workflow can use RunTrim tools."
                : "Handoff copied. Paste into your connected agent workflow.",
            fallbackMessage: "safe handoff fallback",
            limitations: "No direct Cursor dispatch from extension."
        },
        {
            id: "claude",
            label: "Claude Code",
            routeType: input.claudeTpl ? "process" : "handoff",
            readiness: input.claudeTpl ? "ready" : "needs_setup",
            canAutoLaunch: Boolean(input.claudeTpl),
            canAutoFinish: Boolean(input.claudeTpl),
            requiresSetup: !input.claudeTpl,
            setupAction: SETTINGS.claudeCommand,
            commandTemplate: input.claudeTpl || undefined,
            userFacingMessage: input.claudeTpl ? "Launching controlled process." : "Handoff copied. Paste into Claude Code.",
            fallbackMessage: "Claude template missing",
            limitations: "No direct Claude dispatch without configured template."
        },
        {
            id: "codex",
            label: "Codex",
            routeType: input.codexTpl ? "process" : "handoff",
            readiness: input.codexTpl ? "ready" : "needs_setup",
            canAutoLaunch: Boolean(input.codexTpl),
            canAutoFinish: Boolean(input.codexTpl),
            requiresSetup: !input.codexTpl,
            setupAction: SETTINGS.codexCommand,
            commandTemplate: input.codexTpl || undefined,
            userFacingMessage: input.codexTpl ? "Launching controlled process." : "Handoff copied. Paste into Codex.",
            fallbackMessage: "Codex template missing",
            limitations: "No direct Codex dispatch without configured template."
        },
        {
            id: "custom",
            label: "Custom",
            routeType: input.customTpl ? "process" : "handoff",
            readiness: input.customTpl ? "ready" : "needs_setup",
            canAutoLaunch: Boolean(input.customTpl),
            canAutoFinish: Boolean(input.customTpl),
            requiresSetup: !input.customTpl,
            setupAction: SETTINGS.customCommand,
            commandTemplate: input.customTpl || undefined,
            userFacingMessage: input.customTpl ? "Launching controlled process." : "Handoff copied. Configure custom command for process control.",
            fallbackMessage: "Custom template missing",
            limitations: "Custom process control requires a template."
        },
        {
            id: "mcp",
            label: "Connected MCP agent",
            routeType: "mcp",
            readiness: mcpReady ? "ready" : "unavailable",
            canAutoLaunch: false,
            canAutoFinish: false,
            requiresSetup: !mcpReady,
            userFacingMessage: "MCP ready. Your connected agent can use RunTrim tools.",
            fallbackMessage: "MCP not configured",
            limitations: "No lifecycle events available yet for auto-finish."
        }
    ];
    const autoProcess = (input.defaultAgent === "Claude Code" && input.claudeTpl) ? { label: "Auto -> Claude Code", tpl: input.claudeTpl } :
        (input.defaultAgent === "Codex" && input.codexTpl) ? { label: "Auto -> Codex", tpl: input.codexTpl } :
            (input.defaultAgent === "Custom" && input.customTpl) ? { label: "Auto -> Custom", tpl: input.customTpl } :
                input.claudeTpl ? { label: "Auto -> Claude Code", tpl: input.claudeTpl } :
                    input.codexTpl ? { label: "Auto -> Codex", tpl: input.codexTpl } :
                        input.customTpl ? { label: "Auto -> Custom", tpl: input.customTpl } :
                            null;
    adapters.unshift({
        id: "auto",
        label: autoProcess?.label ?? (mcpReady ? "Auto -> MCP" : "Auto -> handoff"),
        routeType: autoProcess ? "process" : (mcpReady ? "mcp" : "handoff"),
        readiness: "ready",
        canAutoLaunch: Boolean(autoProcess),
        canAutoFinish: Boolean(autoProcess),
        requiresSetup: false,
        commandTemplate: autoProcess?.tpl,
        userFacingMessage: autoProcess ? "Launching controlled process." : (mcpReady ? "MCP ready." : "safe handoff fallback"),
        fallbackMessage: "No ready process adapter",
        limitations: "Falls back safely to handoff when no process route is ready."
    });
    return adapters;
}
function resolveSelectedAdapter(adapters, selectedAgent) {
    const map = {
        "Auto": "auto",
        "Cursor": "cursor",
        "Claude Code": "claude",
        "Codex": "codex",
        "Custom": "custom"
    };
    const id = map[selectedAgent];
    return adapters.find((a) => a.id === id) ?? adapters[0];
}
function parseRunId(text) {
    const match = text.match(/Run ID\s+([A-Za-z0-9_-]+)/i);
    return match?.[1] ?? "";
}
function appendAgentTail(chunk) {
    const current = `${lifecycleState.lastAgentOutputTail}\n${chunk}`.trim();
    lifecycleState.lastAgentOutputTail = current.slice(-4000);
}
function detectLimitFromText(text) {
    const lower = text.toLowerCase();
    if (lower.includes("context limit") || lower.includes("maximum context") || lower.includes("conversation too long"))
        return "context_limit";
    if (lower.includes("usage limit"))
        return "usage_limit";
    if (lower.includes("rate limit"))
        return "rate_limit";
    if (lower.includes("maximum tokens") || lower.includes("token limit"))
        return "context_limit";
    if (lower.includes("agent stopped"))
        return "agent_stopped";
    if (lower.includes("split required"))
        return "split_required";
    return null;
}
function runControlledCommand(command, cwd) {
    return new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)(command, { cwd, shell: true, windowsHide: true });
        const onData = (prefix, data) => {
            const text = data.toString();
            outputChannel.append(text);
            appendAgentTail(`${prefix}${text}`);
            const detected = detectLimitFromText(text);
            if (detected) {
                composerState.usageLimitHit = true;
                limitReason = detected.replace(/_/g, " ");
            }
            refreshControlPanel();
        };
        child.stdout?.on("data", (d) => onData("", d));
        child.stderr?.on("data", (d) => onData("[stderr] ", d));
        child.on("error", (err) => {
            outputChannel.appendLine(`[agent process error] ${err.message}`);
            appendAgentTail(`[agent process error] ${err.message}`);
            resolve(1);
        });
        child.on("close", (code) => resolve(code ?? 1));
    });
}
async function observeControlledLaunchCompletion(completionPromise) {
    const exitCode = await completionPromise;
    lifecycleState.processRunning = false;
    lifecycleState.agentExitCode = exitCode;
    const detectedLimitReason = detectLimitFromText(lifecycleState.lastAgentOutputTail);
    if (detectedLimitReason) {
        composerState.usageLimitHit = true;
        limitReason = detectedLimitReason.replace(/_/g, " ");
        await runAndRefresh("continue", ["continue", "--reason", detectedLimitReason]);
    }
    const autoFinishEnabled = vscode.workspace.getConfiguration().get(SETTINGS.autoFinishAfterControlledRun, true);
    if (!autoFinishEnabled) {
        refreshControlPanel();
        return;
    }
    lifecycleState.autoFinishStarted = true;
    refreshControlPanel();
    outputChannel.appendLine(`[auto-finish] Agent finished with exit code ${exitCode}. Running runtrim finish...`);
    const finishResult = await runRuntrimArgs("finish", ["--json"]);
    const combined = `${finishResult.stdout}\n${finishResult.stderr}`;
    if (finishResult.stdout)
        outputChannel.appendLine(finishResult.stdout);
    if (finishResult.stderr)
        outputChannel.appendLine(finishResult.stderr);
    outputChannel.appendLine("");
    try {
        const payload = JSON.parse((finishResult.stdout || "").trim());
        const verdict = (payload.verdict ?? "unknown").toLowerCase();
        lifecycleState.autoFinishResult = verdict === "pass" ? "pass" : verdict === "warn" ? "warn" : verdict === "blocked" ? "blocked" : "unknown";
        if (lifecycleState.autoFinishResult === "pass") {
            lastFinishVerdict = "passed";
            lastCommandResult = null;
        }
        else if (lifecycleState.autoFinishResult === "warn") {
            lastFinishVerdict = "warn";
            lastCommandResult = {
                kind: "doctor",
                success: true,
                snippet: [payload.rawSummary, ...(payload.warnings ?? []).slice(0, 2)].filter(Boolean).join(" · ").slice(0, 220)
            };
        }
        else {
            lastFinishVerdict = "failed";
            lastCommandResult = {
                kind: "error",
                success: false,
                errorTitle: `Finish verdict: ${(payload.verdict ?? "unknown").toUpperCase()}`,
                errorDetail: [payload.rawSummary, ...(payload.blockedFiles ?? []).slice(0, 2)].filter(Boolean).join(" · "),
                suggestedFix: payload.restore?.guidance ?? payload.continuation?.command ?? "Open output for full logs."
            };
        }
    }
    catch {
        const upper = combined.toUpperCase();
        lifecycleState.autoFinishResult = /\bPASS\b/.test(upper)
            ? "pass"
            : /\bWARN\b/.test(upper)
                ? "warn"
                : /\bBLOCKED\b/.test(upper)
                    ? "blocked"
                    : "unknown";
        if (lifecycleState.autoFinishResult === "pass") {
            lastFinishVerdict = "passed";
            lastCommandResult = null;
        }
        else if (lifecycleState.autoFinishResult === "warn") {
            lastFinishVerdict = "warn";
            lastCommandResult = null;
        }
        else {
            lastFinishVerdict = "failed";
            const restoreAvailable = /\bruntrim restore\b/i.test(combined) || loadLocalState().baselineExists;
            lastCommandResult = {
                kind: "error",
                success: false,
                errorTitle: "Finish check failed",
                errorDetail: extractError(combined),
                suggestedFix: restoreAvailable
                    ? "Review risk output, then run runtrim restore if needed."
                    : "Restore guidance unavailable. Open Output for full logs."
            };
        }
    }
    lifecycleState.autoFinishStarted = false;
    await refreshRuntrimJsonState(true);
    await refreshStatusBar(combined.toLowerCase());
    refreshControlPanel();
}
function renderTpl(tpl, task, handoff, handoffPath, root) {
    const compact = handoff.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
    const safeQ = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    return tpl
        .replace(/\{task\}/g, safeQ(task))
        .replace(/\{handoff\}/g, safeQ(compact))
        .replace(/\{handoffPath\}/g, safeQ(handoffPath))
        .replace(/\{projectRoot\}/g, safeQ(root))
        .trim();
}
// ---- CLI ----
function runRuntrimArgs(command, args) {
    return new Promise((resolve) => {
        if (!command.trim()) {
            resolve({ stdout: "", stderr: "Missing runtrim command.", exitCode: 1, notFound: false });
            return;
        }
        const cli = resolveCli();
        if (!cli) {
            resolve({ stdout: "", stderr: "", exitCode: 1, notFound: true });
            return;
        }
        const cwd = workspaceRoot();
        if (!cwd) {
            resolve({ stdout: "", stderr: "No workspace folder is open.", exitCode: 1, notFound: false });
            return;
        }
        const onDone = (error, stdout, stderr) => {
            if (error && error.code === "ENOENT") {
                resolvedCliPath = undefined; // path disappeared â€” reset cache
                resolve({ stdout: "", stderr: "", exitCode: 1, notFound: true });
                return;
            }
            const err = error;
            resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: err?.exitCode ?? (error ? 1 : 0), notFound: false });
        };
        const fullArgs = [command, ...args];
        if (process.platform === "win32" && cli.toLowerCase().endsWith(".cmd")) {
            // Execute the .cmd directly with an argument array so task text stays one argument.
            (0, node_child_process_1.execFile)(cli, fullArgs, { cwd, windowsHide: true, shell: true }, onDone);
            return;
        }
        (0, node_child_process_1.execFile)(cli, fullArgs, { cwd, windowsHide: true }, onDone);
    });
}
async function runRuntrimJson(command, args) {
    const result = await runRuntrimArgs(command, args);
    const raw = `${result.stdout || ""}${result.stderr ? `\n${result.stderr}` : ""}`.trim();
    if (result.notFound)
        return { ok: false, raw, error: "runtrim_not_found" };
    if (result.exitCode !== 0 && !raw)
        return { ok: false, raw, error: `runtrim_${command}_failed` };
    try {
        const parsed = JSON.parse(result.stdout.trim());
        return { ok: true, data: parsed, raw };
    }
    catch {
        return { ok: false, raw, error: "invalid_json" };
    }
}
async function refreshRuntrimJsonState(force = false) {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return;
    const now = Date.now();
    if (!force && runtrimStatusJson && now - runtrimJsonCheckedAt < RUNTRIM_JSON_CACHE_TTL)
        return;
    const statusRes = await runRuntrimJson("status", ["--json"]);
    if (statusRes.ok && statusRes.data) {
        runtrimStatusJson = statusRes.data;
    }
    else {
        runtrimStatusJson = null;
        if (statusRes.raw)
            outputChannel.appendLine(`[status --json fallback] ${statusRes.error ?? "failed"}`);
    }
    const restoreRes = await runRuntrimJson("restore", ["--status", "--json"]);
    if (restoreRes.ok && restoreRes.data) {
        runtrimRestoreJson = restoreRes.data;
    }
    else {
        runtrimRestoreJson = null;
        if (restoreRes.raw)
            outputChannel.appendLine(`[restore --status --json fallback] ${restoreRes.error ?? "failed"}`);
    }
    runtrimJsonCheckedAt = Date.now();
}
// ---- CLI resolution (Windows .cmd aware) ----
function resolveCli() {
    if (resolvedCliPath !== undefined)
        return resolvedCliPath;
    // 1. Configured path
    try {
        const cfgPath = String(vscode.workspace.getConfiguration("runtrim.cli").get("path") ?? "").trim();
        if (cfgPath && fileExists(cfgPath)) {
            resolvedCliPath = cfgPath;
            logCli(`resolved via config: ${cfgPath}`);
            return resolvedCliPath;
        }
    }
    catch { /* vscode not ready yet */ }
    // 2. PATH via where/which
    try {
        const which = process.platform === "win32" ? "where.exe" : "which";
        const lines = (0, node_child_process_1.execFileSync)(which, ["runtrim"], { stdio: "pipe" })
            .toString().trim().split(/\r?\n/).filter(Boolean);
        const best = selectBestPath(lines);
        if (best && fileExists(best)) {
            resolvedCliPath = best;
            logCli(`resolved via PATH: ${best}`);
            return resolvedCliPath;
        }
    }
    catch { /* not in PATH */ }
    // 3-5. Windows-specific fallbacks
    if (process.platform === "win32") {
        for (const c of winCandidates()) {
            if (fileExists(c)) {
                resolvedCliPath = c;
                logCli(`resolved via Windows fallback: ${c}`);
                return resolvedCliPath;
            }
        }
    }
    resolvedCliPath = null;
    logCli("CLI not found. Install: npm install -g runtrim");
    return null;
}
function selectBestPath(lines) {
    if (process.platform !== "win32")
        return lines[0];
    // Prefer .cmd, then anything that is not .ps1
    return lines.find((l) => l.toLowerCase().endsWith(".cmd"))
        ?? lines.find((l) => !l.toLowerCase().endsWith(".ps1"))
        ?? lines[0];
}
function winCandidates() {
    const out = [];
    if (process.env.APPDATA)
        out.push(path.join(process.env.APPDATA, "npm", "runtrim.cmd"));
    if (process.env.USERPROFILE)
        out.push(path.join(process.env.USERPROFILE, "AppData", "Roaming", "npm", "runtrim.cmd"));
    try {
        const prefix = (0, node_child_process_1.execFileSync)("npm", ["prefix", "-g"], { stdio: "pipe" }).toString().trim();
        if (prefix)
            out.push(path.join(prefix, "runtrim.cmd"));
    }
    catch { /* npm unavailable */ }
    return out;
}
function logCli(msg) {
    if (outputChannel)
        outputChannel.appendLine(`[RunTrim CLI] ${msg}`);
}
function extractError(combined) {
    const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return (lines.find((l) => /\berror\b/i.test(l)) ?? lines[0] ?? "Unknown error").slice(0, 200);
}
function suggestFix(combined) {
    const lower = combined.toLowerCase();
    if (lower.includes("no project") || lower.includes("not initialized"))
        return "Run runtrim start in this workspace to initialize the project.";
    if (lower.includes("blocked") || lower.includes("split required"))
        return "Split the task into separate single-system runs.";
    if (lower.includes("project-dna") || lower.includes("dna missing"))
        return "Run RunTrim: Refresh Project DNA.";
    return "Check the RunTrim output channel for full logs.";
}
// ---- error helpers ----
function showInstallError() {
    void vscode.window
        .showErrorMessage("RunTrim CLI not found. Install: npm install -g runtrim, or set runtrim.cli.path in VS Code settings.", "Copy install command", "Open settings")
        .then((c) => {
        if (c === "Copy install command")
            vscode.env.clipboard.writeText("npm install -g runtrim");
        if (c === "Open settings")
            vscode.commands.executeCommand("workbench.action.openSettings", "runtrim.cli.path");
    });
}
function showNoProjectError() {
    void vscode.window.showErrorMessage("No RunTrim project found. Run runtrim start in this project first.", "Open terminal")
        .then((c) => { if (c)
        vscode.commands.executeCommand("workbench.action.terminal.new"); });
}
// ---- MCP detection and commands ----
async function detectMcpState() {
    const now = Date.now();
    if (mcpState && now - mcpState.checkedAt < MCP_CACHE_TTL)
        return mcpState;
    if (resolveCli() === null) {
        mcpState = { status: "unavailable", checkedAt: now };
        return mcpState;
    }
    try {
        const result = await runRuntrimArgs("mcp", ["config", "--print"]);
        if (result.notFound) {
            mcpState = { status: "unavailable", checkedAt: now };
        }
        else if (result.exitCode === 0 && result.stdout.trim()) {
            mcpState = { status: "configured", configSnippet: result.stdout.trim().slice(0, 120), checkedAt: now };
            logCli("MCP configured");
        }
        else {
            mcpState = { status: "not_configured", checkedAt: now };
            logCli("MCP not configured (mcp config --print returned no output)");
        }
    }
    catch {
        mcpState = { status: "not_configured", checkedAt: now };
    }
    return mcpState;
}
async function showMcpInstructions() {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    outputChannel.show(true);
    outputChannel.appendLine("$ runtrim mcp instructions");
    const result = await runRuntrimArgs("mcp", ["instructions"]);
    if (result.stdout)
        outputChannel.appendLine(result.stdout);
    if (result.stderr)
        outputChannel.appendLine(result.stderr);
    outputChannel.appendLine("");
    if (result.exitCode !== 0) {
        void vscode.window.showWarningMessage("Could not retrieve MCP instructions. Check RunTrim output channel.");
    }
}
function getMcpAgentCopy(target) {
    switch (target) {
        case "Cursor / Cursor Studio":
            return [
                "Copy the RunTrim MCP config.",
                "Add it to your Cursor MCP settings.",
                "Restart or reload Cursor if needed.",
                "Then open your agent/chat workflow and RunTrim tools should be available."
            ];
        case "Claude Desktop":
            return [
                "Copy the Claude Desktop MCP snippet.",
                "Add it to Claude Desktop MCP config.",
                "Restart Claude Desktop."
            ];
        case "Claude Code":
            return [
                "Use runtrim mcp instructions for this environment.",
                "If Claude Code MCP is unsupported here, use the handoff copy fallback."
            ];
        default:
            return [
                "Copy the generic JSON config.",
                "Add it to your MCP client settings.",
                "Restart or reload the MCP client."
            ];
    }
}
async function checkMcpConnection(showToast = false) {
    mcpState = null;
    const next = await detectMcpState();
    if (showToast) {
        if (next.status === "configured") {
            void vscode.window.showInformationMessage("MCP config is ready.");
        }
        else if (next.status === "unavailable") {
            void vscode.window.showWarningMessage("RunTrim CLI not found or MCP config unavailable.");
        }
        else {
            void vscode.window.showWarningMessage("MCP not configured. Use Connect agent.");
        }
    }
    refreshControlPanel();
}
async function connectAgentFlow() {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    const picked = await vscode.window.showQuickPick(["Cursor / Cursor Studio", "Claude Desktop", "Claude Code", "Generic MCP client"], { title: "Connect agent", placeHolder: "Choose an agent setup target" });
    if (!picked)
        return;
    if (picked === "Claude Code") {
        await showMcpInstructions();
    }
    await copyMcpConfig();
    const steps = getMcpAgentCopy(picked);
    mcpUxNotice = "Config copied. Paste it into your agent MCP settings, then restart or reload the agent. Next: Check connection.";
    void vscode.window.showInformationMessage(`${picked}: ${steps.join(" ")}`);
    refreshControlPanel();
}
async function copyMcpConfig() {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    outputChannel.show(true);
    outputChannel.appendLine("$ runtrim mcp config --print");
    const result = await runRuntrimArgs("mcp", ["config", "--print"]);
    if (result.stdout)
        outputChannel.appendLine(result.stdout);
    if (result.stderr)
        outputChannel.appendLine(result.stderr);
    outputChannel.appendLine("");
    if (result.exitCode !== 0 || !result.stdout.trim()) {
        void vscode.window.showWarningMessage("No MCP config found. Run runtrim mcp instructions to set up.");
        return;
    }
    await vscode.env.clipboard.writeText(result.stdout.trim());
    // Refresh cached state
    mcpState = { status: "configured", configSnippet: result.stdout.trim().slice(0, 120), checkedAt: Date.now() };
    mcpUxNotice = "Config copied. Paste it into your agent MCP settings, then restart or reload the agent. Next: Check connection.";
    void vscode.window.showInformationMessage("Config copied.");
    refreshControlPanel();
}
async function viewRawMcpConfig() {
    const local = loadLocalState();
    if (!local.cliInstalled)
        return showInstallError();
    outputChannel.show(true);
    outputChannel.appendLine("$ runtrim mcp config --print");
    const result = await runRuntrimArgs("mcp", ["config", "--print"]);
    if (result.stdout)
        outputChannel.appendLine(result.stdout);
    if (result.stderr)
        outputChannel.appendLine(result.stderr);
    outputChannel.appendLine("");
    if (result.exitCode !== 0 || !result.stdout.trim()) {
        void vscode.window.showWarningMessage("No MCP config found. Run runtrim mcp instructions to set up.");
        return;
    }
    void vscode.window.showInformationMessage("Raw MCP config printed in the RunTrim output channel.");
}
// ---- status bar ----
async function refreshStatusBar(lastOutput = "") {
    const local = loadLocalState();
    const state = deriveStatus(local, lastOutput);
    const map = {
        not_installed: { text: "RunTrim: not installed", color: "statusBarItem.warningForeground", tooltip: "runtrim CLI not in PATH" },
        no_project: { text: "RunTrim: no project", color: "statusBarItem.warningForeground", tooltip: "No .runtrim project state found" },
        ready: { text: "RunTrim: ready", color: "#6ee7b7", tooltip: "Project initialized and ready" },
        active: { text: "RunTrim: active", color: "statusBarItem.prominentForeground", tooltip: "Active guarded contract exists" },
        blocked: { text: "RunTrim: blocked", color: "#f5a524", tooltip: "Contract is blocked" }
    };
    const v = map[state];
    statusBarItem.text = v.text;
    statusBarItem.color = v.color;
    statusBarItem.tooltip = v.tooltip;
}
function deriveStatus(local, lastOutput) {
    if (!local.cliInstalled)
        return "not_installed";
    if (!local.workspaceRoot || !local.dnaExists)
        return "no_project";
    const jsonContractStatus = (runtrimStatusJson?.contract?.status ?? "").toLowerCase();
    const jsonRunVerdict = (runtrimStatusJson?.run?.verdict ?? "").toLowerCase();
    if (jsonContractStatus === "blocked" || jsonRunVerdict === "blocked")
        return "blocked";
    if (jsonContractStatus === "active")
        return "active";
    const contract = (local.contractStatus ?? "").toLowerCase();
    const output = lastOutput.toLowerCase();
    if (contract.includes("blocked") || output.includes("blocked"))
        return "blocked";
    if (contract.includes("active"))
        return "active";
    return "ready";
}
// ---- local state ----
function loadLocalState() {
    const root = workspaceRoot();
    const cliInstalled = resolveCli() !== null;
    if (!root)
        return { cliInstalled, dnaExists: false, baselineExists: false, latestContractExists: false };
    const rt = path.join(root, ".runtrim");
    const latestContract = path.join(rt, "contracts", "latest.md");
    const fromJson = runtrimStatusJson;
    const dnaExistsFromJson = fromJson?.projectDna?.exists === true;
    const contractExistsFromJson = fromJson?.contract?.exists === true;
    const contractStatusFromJson = fromJson?.contract?.status ?? undefined;
    const baselineFromJsonKnown = typeof runtrimRestoreJson?.available === "boolean";
    const baselineFromJson = runtrimRestoreJson?.available === true;
    return {
        cliInstalled, workspaceRoot: root,
        dnaExists: dnaExistsFromJson || fileExists(path.join(rt, "project-dna.md")),
        baselineExists: baselineFromJsonKnown ? baselineFromJson : fileExists(path.join(rt, "history", "baseline.json")),
        latestContractExists: contractExistsFromJson || fileExists(latestContract),
        contractStatus: contractStatusFromJson ?? (fileExists(latestContract) ? findLine(latestContract, /^Status\s*:/i) : undefined)
    };
}
function fileExists(p) { try {
    return fs.statSync(p).isFile();
}
catch {
    return false;
} }
function dirExists(p) { try {
    return fs.statSync(p).isDirectory();
}
catch {
    return false;
} }
function findLine(filePath, pattern) {
    try {
        return fs.readFileSync(filePath, "utf8").split(/\r?\n/).find((l) => pattern.test(l));
    }
    catch {
        return undefined;
    }
}
function workspaceRoot() { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
// ---- parsers ----
function parseDna(filePath) {
    try {
        const text = fs.readFileSync(filePath, "utf8");
        const lines = text.split(/\r?\n/);
        const get = (key) => lines.find((l) => l.toLowerCase().startsWith(`- ${key.toLowerCase()}:`))?.replace(/^- [^:]+:\s*/i, "").trim();
        const riskStart = lines.findIndex((l) => /^## Risky zones/i.test(l));
        const riskEnd = lines.findIndex((l, i) => i > riskStart && /^## /.test(l));
        const riskLines = riskStart >= 0
            ? lines.slice(riskStart + 1, riskEnd >= 0 ? riskEnd : undefined).filter((l) => l.trim().startsWith("- ")).map((l) => l.slice(2).trim())
            : [];
        const countLine = lines.find((l) => /high risk path count/i.test(l));
        const rpc = countLine ? parseInt(countLine.replace(/\D/g, ""), 10) : undefined;
        return {
            framework: get("Framework"),
            packageManager: get("Package manager"),
            language: get("Language"),
            stylingSystem: get("Styling system"),
            componentSystem: get("Component system"),
            riskZones: extractRiskCategories(riskLines),
            riskPathCount: rpc !== undefined && !isNaN(rpc) ? rpc : undefined
        };
    }
    catch {
        return null;
    }
}
function extractRiskCategories(lines) {
    const patterns = [
        [/auth|signout|signin|session/i, "auth"],
        [/billing|subscription/i, "billing"],
        [/middleware|proxy/i, "middleware"],
        [/migration/i, "migrations"],
        [/\.env|\.pem|\.key/i, "env"],
        [/webhook/i, "webhooks"]
    ];
    const found = new Set();
    for (const line of lines)
        for (const [pat, label] of patterns)
            if (pat.test(line))
                found.add(label);
    return Array.from(found);
}
function parseBaseline(filePath) {
    try {
        const d = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return { initializedAt: d.initializedAt, gitBranch: d.gitBranch, gitCommit: d.gitCommit, safeFileCount: d.safeFileCount, totalFileCount: d.totalFileCount };
    }
    catch {
        return null;
    }
}
function parseContract(filePath) {
    try {
        const text = fs.readFileSync(filePath, "utf8");
        const lines = text.split(/\r?\n/);
        const getField = (pat) => lines.find((l) => pat.test(l))?.replace(pat, "").trim();
        const status = getField(/^Status\s*:\s*/i);
        const task = getField(/^Task\s*:\s*/i);
        const scope = getField(/^(?:Allowed scope|Scope)\s*:\s*/i);
        const whyIdx = lines.findIndex((l) => /^Why blocked/i.test(l));
        const blockedReason = whyIdx >= 0
            ? lines.slice(whyIdx + 1, whyIdx + 5).filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).slice(0, 2).join("; ") || undefined
            : undefined;
        const systems = extractDetectedSystems(text);
        return { status: status?.toLowerCase(), task, scope, blockedReason, detectedSystems: systems };
    }
    catch {
        return null;
    }
}
function extractDetectedSystems(text) {
    const m = text.match(/Detected systems:([\s\S]*?)(\n\n|\n##|$)/);
    if (!m)
        return [];
    return m[1].split(/\r?\n/).filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
}
function readRecentRuns(runsDir, count) {
    try {
        const files = fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"));
        const runs = [];
        for (const file of files) {
            try {
                const raw = fs.readFileSync(path.join(runsDir, file), "utf8");
                const d = JSON.parse(raw);
                if (d.task && d.createdAt) {
                    runs.push({ id: d.id ?? file.replace(".json", ""), task: String(d.task).slice(0, 120), date: String(d.createdAt).slice(0, 10) });
                }
            }
            catch { /* skip malformed */ }
        }
        return runs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
    }
    catch {
        return [];
    }
}
// ---- phase ----
function derivePhase(local, contract) {
    const jsonPhase = (runtrimStatusJson?.run?.phase ?? "").toLowerCase();
    if (jsonPhase === "continuation_ready")
        return "limit";
    if (jsonPhase === "passed")
        return "passed";
    if (jsonPhase === "warn")
        return "warned";
    if (jsonPhase === "blocked")
        return "blocked";
    if (jsonPhase === "active" || jsonPhase === "finish_needed")
        return "active";
    if (composerState.usageLimitHit)
        return "limit";
    if (lastFinishVerdict === "passed")
        return "passed";
    if (lastFinishVerdict === "warn")
        return "warned";
    if (local.latestContractExists && contract) {
        if (contract.status === "blocked")
            return "blocked";
        if (contract.status === "active")
            return "active";
    }
    if (composerState.task.trim())
        return "composing";
    return "idle";
}
// ---- control panel ----
function openControlPanel() {
    if (controlPanel) {
        controlPanel.reveal();
        refreshControlPanel();
        return;
    }
    controlPanel = vscode.window.createWebviewPanel("runtrim.control", "RunTrim", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
    refreshControlPanel();
    // Detect MCP state in background; refresh panel once we know
    void detectMcpState().then(() => refreshControlPanel());
    void refreshRuntrimJsonState(true).then(() => {
        void refreshStatusBar();
        refreshControlPanel();
    });
    controlPanel.webview.onDidReceiveMessage(async (msg) => {
        try {
            await handleWebviewMessage(msg);
        }
        catch (err) {
            outputChannel.appendLine(`[panel error] ${String(err)}`);
        }
    });
    controlPanel.onDidDispose(() => { controlPanel = null; });
}
async function handleWebviewMessage(msg) {
    if (msg.command) {
        await vscode.commands.executeCommand(msg.command);
        refreshControlPanel();
        return;
    }
    switch (msg.type) {
        case "composerChanged":
            composerState.task = typeof msg.task === "string" ? msg.task : composerState.task;
            composerState.selectedAgent = isAgentOption(msg.selectedAgent) ? msg.selectedAgent : composerState.selectedAgent;
            composerState.selectedMode = isModeOption(msg.selectedMode) ? msg.selectedMode : composerState.selectedMode;
            break;
        case "startRun": {
            const task = typeof msg.task === "string" ? msg.task.trim() : composerState.task.trim();
            const agent = isAgentOption(msg.agent) ? msg.agent : composerState.selectedAgent;
            composerState.task = task;
            composerState.selectedAgent = agent;
            if (!task) {
                void vscode.window.showWarningMessage("Add a task before starting a guarded run.");
                return;
            }
            await runWithAgent(task, agent);
            break;
        }
        case "finishCheck":
            lastFinishVerdict = null;
            await runAndRefresh("finish", ["finish"]);
            break;
        case "doctor":
            await runAndRefresh("doctor", ["doctor"]);
            break;
        case "restore":
            await runAndRefresh("restore", ["restore"]);
            break;
        case "refreshDna":
            await runAndRefresh("start", ["start", "--refresh-dna"]);
            break;
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
        case "clearResult":
            lastCommandResult = null;
            refreshControlPanel();
            break;
        case "agentHitLimit": {
            const reasonItems = [
                { label: "context limit", cliReason: "context_limit" },
                { label: "usage limit", cliReason: "usage_limit" },
                { label: "rate limit", cliReason: "rate_limit" },
                { label: "agent stopped", cliReason: "agent_stopped" },
                { label: "manual continuation", cliReason: "usage_limit" }
            ];
            const picked = await vscode.window.showQuickPick(reasonItems.map((r) => r.label), { title: "Why did the agent stop?", placeHolder: "Select a reason to generate the continuation handoff" });
            if (!picked)
                return;
            limitReason = picked;
            composerState.usageLimitHit = true;
            const cliReason = reasonItems.find((r) => r.label === picked)?.cliReason ?? "usage_limit";
            await runAndRefresh("continue", ["continue", "--reason", cliReason]);
            break;
        }
        case "tabChanged":
            if (msg.tab === "run" || msg.tab === "history" || msg.tab === "rules") {
                composerState.activeTab = msg.tab;
                // No panel refresh â€” tab switch is pure DOM, just persist the state
            }
            break;
        case "connectAgent":
            await connectAgentFlow();
            break;
        case "checkMcpConnection":
            await checkMcpConnection(true);
            break;
        case "viewRawMcpConfig":
            await viewRawMcpConfig();
            break;
        case "copyRawMcpConfig":
            await copyMcpConfig();
            break;
        case "copyHandoff":
            await copyHandoff();
            break;
        case "showMcpInstructions":
            await showMcpInstructions();
            break;
        case "copyMcpConfig":
            await connectAgentFlow();
            break;
    }
}
function refreshControlPanel() {
    if (!controlPanel)
        return;
    controlPanel.webview.html = renderControlPanel();
}
// ---- render ----
function renderControlPanel() {
    const local = loadLocalState();
    const rt = local.workspaceRoot ? path.join(local.workspaceRoot, ".runtrim") : "";
    const statusDna = runtrimStatusJson?.projectDna;
    const statusContract = runtrimStatusJson?.contract;
    const statusRun = runtrimStatusJson?.run;
    const dnaFromJson = statusDna
        ? {
            framework: statusDna.framework ?? undefined,
            packageManager: statusDna.packageManager ?? undefined,
            language: statusDna.language ?? undefined,
            stylingSystem: statusDna.stylingSystem ?? undefined,
            componentSystem: statusDna.componentSystem ?? undefined,
            riskZones: Array.isArray(statusDna.riskZones) ? statusDna.riskZones : []
        }
        : null;
    const contractFromJson = statusContract
        ? {
            status: statusContract.status ?? undefined,
            task: statusContract.task ?? undefined,
            scope: statusContract.allowedScope?.[0],
            blockedReason: statusRun?.reason ?? undefined,
            detectedSystems: []
        }
        : null;
    const dna = dnaFromJson ?? (rt && local.dnaExists ? parseDna(path.join(rt, "project-dna.md")) : null);
    const baseline = rt && local.baselineExists ? parseBaseline(path.join(rt, "history", "baseline.json")) : null;
    const contract = contractFromJson ?? (rt && local.latestContractExists ? parseContract(path.join(rt, "contracts", "latest.md")) : null);
    if (!composerState.task.trim() && contract?.task)
        composerState.task = contract.task;
    const phase = derivePhase(local, contract);
    const status = deriveStatus(local, "");
    const shortRoot = local.workspaceRoot ? path.basename(local.workspaceRoot) : "no workspace";
    const branch = baseline?.gitBranch ?? "main";
    // Counts for history badge
    const runsDir = rt ? path.join(rt, "runs") : "";
    const archiveDir = rt ? path.join(rt, "contracts", "archive") : "";
    const runCount = rt && dirExists(runsDir) ? tryReadDir(runsDir).filter((f) => f.endsWith(".json")).length : 0;
    const archiveCount = rt && dirExists(archiveDir) ? tryReadDir(archiveDir).filter((f) => f.endsWith(".md")).length : 0;
    const histCount = runCount + archiveCount;
    const recentRuns = rt && dirExists(runsDir) ? readRecentRuns(runsDir, 8) : [];
    const rawDna = rt && local.dnaExists ? readFile(path.join(rt, "project-dna.md")) : "";
    // DNA data embedded for client-side scope inference
    const dnaEmbed = {
        framework: friendly(dna?.framework),
        language: friendly(dna?.language),
        stylingSystem: dna?.stylingSystem ?? "",
        componentSystem: dna?.componentSystem ?? "",
        riskZones: dna?.riskZones ?? [],
        riskPathCount: dna?.riskPathCount ?? 0
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
  <span class="pt${composerState.activeTab === "run" ? " active" : ""}" data-tab="run">Run</span>
  <span class="pt${composerState.activeTab === "history" ? " active" : ""}" data-tab="history">History${histCount > 0 ? ` <span class="badge">${histCount}</span>` : ""}</span>
  <span class="pt${composerState.activeTab === "rules" ? " active" : ""}" data-tab="rules">Rules</span>
</div>

<!-- RUN TAB -->
<div class="tab-panel${composerState.activeTab === "run" ? " active" : ""}" id="tab-run">
${renderRunTab(phase, local, dna, contract, shortRoot, branch)}
</div>

<!-- HISTORY TAB -->
<div class="tab-panel${composerState.activeTab === "history" ? " active" : ""}" id="tab-history">
${renderHistoryTab(recentRuns, archiveCount, baseline, shortRoot)}
</div>

<!-- RULES TAB -->
<div class="tab-panel${composerState.activeTab === "rules" ? " active" : ""}" id="tab-rules">
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
          ${["Auto", "Claude Code", "Codex", "Cursor", "Custom"].map((a) => `<div class="sel-opt${a === composerState.selectedAgent ? " active" : ""}" data-agent="${h(a)}">${h(a)}</div>`).join("")}
        </div>
      </div>
      <div class="sel-wrap">
        <span class="selector" id="mode-sel">
          <span class="k">Mode</span>
          <span id="mode-val">${h(composerState.selectedMode)}</span>
          <svg viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="sel-dd" id="mode-dd">
          ${["Auto", "Strict", "UI only", "Docs only"].map((m) => `<div class="sel-opt${m === composerState.selectedMode ? " active" : ""}" data-mode="${h(m)}">${h(m)}</div>`).join("")}
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

// â”€â”€ embedded state â”€â”€
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

// â”€â”€ tabs â”€â”€
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

// â”€â”€ composer â”€â”€
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

// â”€â”€ selectors â”€â”€
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

// â”€â”€ action buttons â”€â”€
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

// â”€â”€ preview â”€â”€
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
// ---- result cards ----
function renderTopCard() {
    const r = lastCommandResult;
    if (!r || r.kind === "agent")
        return ""; // agent result handled inline in "active" case
    if (r.kind === "error") {
        return `
<div class="sys-card" style="border-color:rgba(248,113,113,0.22);background:rgba(248,113,113,0.04);">
  <div class="sys-head">
    <span class="ico rose">${icoBlocked()}</span>
    <span class="sys-label">${h(r.errorTitle ?? "command failed")}</span>
  </div>
  <div class="sys-body">
    ${r.errorDetail ? `<div class="copy"><em class="rose">${h(r.errorDetail)}</em></div>` : ""}
    ${r.suggestedFix ? `<div class="copy" style="margin-top:4px">${h(r.suggestedFix)}</div>` : ""}
    <div class="copy" style="margin-top:4px;opacity:.5">Open RunTrim output channel for full logs.</div>
  </div>
  <div class="sys-actions">
    <button class="act" data-action="clearResult">Dismiss</button>
  </div>
</div>`;
    }
    if (r.kind === "doctor") {
        const color = r.success ? "" : " amber";
        return `
<div class="sys-card">
  <div class="sys-head">
    <span class="ico${color}">${r.success ? icoCheck() : icoWarn()}</span>
    <span class="sys-label">${r.success ? "doctor complete" : "doctor issues found"}</span>
  </div>
  <div class="sys-body">
    ${r.snippet ? `<div class="copy">${h(r.snippet)}</div>` : `<div class="copy" style="opacity:.6">See RunTrim output channel for full diagnostics.</div>`}
  </div>
  <div class="sys-actions">
    <button class="act" data-action="clearResult">Dismiss</button>
  </div>
</div>`;
    }
    if (r.kind === "dna") {
        return `
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${r.success ? icoDna() : icoWarn()}</span>
    <span class="sys-label">${r.success ? "project DNA refreshed" : "DNA refresh failed"}</span>
  </div>
  <div class="sys-body">
    <div class="copy" style="opacity:.7">${r.success ? "Project DNA is up to date." : "Check the RunTrim output channel for details."}</div>
  </div>
  <div class="sys-actions">
    <button class="act" data-action="clearResult">Dismiss</button>
  </div>
</div>`;
    }
    return "";
}
function renderRunTab(phase, local, dna, contract, shortRoot, branch) {
    const task = composerState.task.trim() || contract?.task || "";
    // Top-of-panel result card for error / doctor / dna (prepended to any phase)
    const topCard = renderTopCard();
    switch (phase) {
        case "idle":
            return topCard + renderIdleCards(local, dna, shortRoot);
        case "composing":
            return topCard + `
<div class="msg-user">${h(task)}</div>
<div class="sys-card" id="preview-card">
  <div class="sys-head">
    <span class="ico">${icoDoc()}</span>
    <span class="sys-label">contract prepared</span>
    <span class="sys-right">${h(shortRoot)} Â· ${h(branch)}</span>
  </div>
  <div class="sys-body" id="preview-body"></div>
  <div class="sys-actions">
    <button class="act primary" data-action="startRun">Start guarded run <span class="kbd">âŒ˜â†µ</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
  </div>
</div>`;
        case "active": {
            const r = lastRunStartedFromPanel && lastCommandResult?.kind === "agent" && lastCommandResult.success
                ? lastCommandResult
                : null;
            if (r) {
                const displayAgent = h(r.agentLaunched ?? r.agent ?? "your agent");
                const statusLabel = lifecycleState.processRunning ? "agent running" : (r.launched ? "agent launched" : "handoff ready");
                const isCursor = r.agent === "Cursor" || r.agentLaunched === "Cursor";
                const mcpReady = r.mcpStatus === "configured";
                const autoFinishEnabled = vscode.workspace.getConfiguration().get(SETTINGS.autoFinishAfterControlledRun, true);
                const runningControlled = lifecycleState.processRunning && r.routeKind === "controlled_process";
                const nextStep = runningControlled
                    ? `<em class="violet">Agent running.</em> Contract active via controlled process. ${autoFinishEnabled ? "Finish will run automatically when the agent exits." : "Run finish check when the agent exits."}`
                    : r.routeKind === "controlled_process"
                        ? `<em>Agent finished.</em> ${lifecycleState.autoFinishStarted ? "Running finish check." : "Run finish check when edits are done."}`
                        : isCursor && mcpReady
                            ? `<em>Handoff ready.</em> Contract active. MCP ready for Cursor Agent. Paste handoff, then run finish check.`
                            : `<em>Handoff ready.</em> Contract active with safe handoff fallback. Paste into your connected agent workflow, then run finish check.`;
                return `
${task ? `<div class="msg-user">${h(task)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoDoc()}</span>
    <span class="sys-label">handoff ready</span>
    <span class="sys-right">${statusLabel}</span>
  </div>
  <div class="sys-body">
    ${r.task ? `<div class="line"><span class="k">Task</span><span class="v"><code>${h(r.task.slice(0, 80))}</code></span></div>` : ""}
    ${r.agentLaunched || r.agent ? `<div class="line"><span class="k">Agent</span><span class="v"><code>${displayAgent}</code></span></div>` : ""}
    ${r.scope ? `<div class="line"><span class="k">Scope</span><span class="v"><span class="pill scope">${h(r.scope)}</span></span></div>` : ""}
    ${local.dnaExists ? `<div class="line"><span class="k">DNA</span><span class="v"><span class="pill mem">active</span></span></div>` : ""}
    ${r.mcpStatus === "configured"
                    ? `<div class="line"><span class="k">MCP</span><span class="v"><span class="pill scope">ready</span></span></div>`
                    : r.mcpStatus === "not_configured"
                        ? `<div class="line"><span class="k">MCP</span><span class="v"><span class="pill muted">not configured</span></span></div>`
                        : ""}
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
    <span class="sys-label">${runningControlled && autoFinishEnabled ? "auto finish pending" : "finish check needed"}</span>
  </div>
  <div class="sys-body">
    <div class="copy">${nextStep}</div>
  </div>
  <div class="sys-actions">
    ${runningControlled && autoFinishEnabled
                    ? `<button class="act primary" data-action="agentHitLimit">Agent hit limit</button>`
                    : `<button class="act primary" data-action="finishCheck">Run finish check</button>`}
    <button class="act" data-action="copyHandoff">Copy handoff</button>
    ${runningControlled && autoFinishEnabled ? "" : `<button class="act" data-action="agentHitLimit">Agent hit limit</button>`}
    <button class="act" data-action="clearResult" style="margin-left:auto;opacity:.5">Dismiss</button>
  </div>
</div>`;
            }
            const activeTask = task || lastTask;
            const hasAnyTask = activeTask.trim().length > 0;
            return topCard + `
${hasAnyTask ? `<div class="msg-user">${h(activeTask)}</div>` : ""}
<div class="sys-card">
  <div class="sys-head">
    <span class="ico violet">${icoDoc()}</span>
    <span class="sys-label">unfinished guarded run</span>
    <span class="sys-right">${h(shortRoot)}</span>
  </div>
  <div class="sys-body">
    <div class="copy">${hasAnyTask
                ? `Scope is still held by the active contract. Finish check is available when your agent edits are done.`
                : `Active contract found. Run finish check or copy handoff.`}</div>
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
    <span class="sys-label">finish check available</span>
  </div>
  <div class="sys-body">
    <div class="copy">Run finish check when edits are complete, or copy handoff to continue in ${h(lastSelectedAgent ?? "selected agent")}.</div>
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="finishCheck">Run finish check <span class="kbd">âŒ˜F</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
    <button class="act" data-action="agentHitLimit">Agent hit limit</button>
  </div>
</div>`;
        }
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
    <button class="act primary" data-action="continueLimit">Continue in new session <span class="kbd">âŒ˜â‡§â†µ</span></button>
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
function renderIdleCards(local, dna, shortRoot) {
    const tech = [friendly(dna?.framework), friendly(dna?.language), dna?.stylingSystem].filter(Boolean).join(" Â· ");
    const risk = dna?.riskZones ?? [];
    const countPart = dna?.riskPathCount ? ` Â· ${dna.riskPathCount} paths` : "";
    const mcpPanelStatus = mcpState?.status ?? "unknown";
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
    ${local.cliInstalled && mcpPanelStatus === "configured"
        ? `<div class="line"><span class="k">Agent connection</span><span class="v"><span class="pill scope">ready</span></span></div>`
        : local.cliInstalled && mcpPanelStatus === "not_configured"
            ? `<div class="line"><span class="k">Agent connection</span><span class="v"><span class="pill muted">not connected</span></span></div>`
            : local.cliInstalled && mcpPanelStatus === "unknown"
                ? `<div class="line"><span class="k">Agent connection</span><span class="v"><span class="pill muted">check connection</span></span></div>`
                : local.cliInstalled
                    ? `<div class="line"><span class="k">Agent connection</span><span class="v"><span class="pill muted">unavailable</span></span></div>`
                    : ""}
    ${!local.cliInstalled ? `<div class="copy"><em class="amber">Install with: npm install -g runtrim</em></div>` : ""}
    ${!local.dnaExists ? `<div class="copy"><em class="amber">Run runtrim start to initialize this project.</em></div>` : ""}
  </div>
</div>
<div class="sys-card">
  <div class="sys-head">
    <span class="ico">${icoDoc()}</span>
    <span class="sys-label">agent connection</span>
    <span class="sys-right">${mcpPanelStatus === "configured" ? "ready" : mcpPanelStatus === "not_configured" ? "not connected" : mcpPanelStatus === "unknown" ? "check connection" : "unavailable"}</span>
  </div>
  <div class="sys-body">
    <div class="copy">${mcpPanelStatus === "configured"
        ? "MCP config is ready. Your connected agent can use RunTrim MCP tools."
        : mcpPanelStatus === "not_configured"
            ? "Connect RunTrim to supported AI agents so they can use Project DNA, guarded contracts, finish checks and continuation tools."
            : mcpPanelStatus === "unknown"
                ? "Check connection to refresh MCP detection."
                : "RunTrim CLI not found or MCP config unavailable."}</div>
    ${mcpUxNotice ? `<div class="copy"><em>${h(mcpUxNotice)}</em></div>` : ""}
  </div>
  <div class="sys-actions">
    <button class="act primary" data-action="connectAgent">Connect agent</button>
    <button class="act" data-action="showMcpInstructions">Show instructions</button>
    <button class="act" data-action="checkMcpConnection">Check connection</button>
    <button class="act" data-action="viewRawMcpConfig">View config</button>
    <button class="act" data-action="copyRawMcpConfig">Copy raw config</button>
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
    <button class="act primary" data-action="startRun">Start guarded run <span class="kbd">âŒ˜â†µ</span></button>
    <button class="act" data-action="copyHandoff">Copy handoff</button>
  </div>
</div>`;
}
// ---- history tab ----
function renderHistoryTab(recentRuns, archiveCount, baseline, shortRoot) {
    if (!recentRuns.length && !baseline && !archiveCount) {
        return `<div class="empty-state">No run history found yet.<br>Start a guarded run to begin tracking.</div>`;
    }
    let out = "";
    if (baseline) {
        const date = baseline.initializedAt?.slice(0, 10) ?? "unknown";
        const branch = baseline.gitBranch ?? "unknown";
        const commit = (baseline.gitCommit ?? "").slice(0, 8) || "unknown";
        const files = `${baseline.safeFileCount ?? "?"} / ${baseline.totalFileCount ?? "?"} files`;
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
    <div class="line"><span class="k">Branch</span><span class="v"><code>${h(branch)} Â· ${h(commit)}</code></span></div>
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
function renderRulesTab(dna, rawDna, local) {
    if (!dna && !rawDna) {
        return `<div class="empty-state">Project DNA not found.<br>Run runtrim start in your workspace to initialize.</div>`;
    }
    let out = "";
    if (dna) {
        out += `
<div class="rules-group">
  <div class="rules-head">Environment</div>
  <div class="rules-card">
    ${dna.framework ? `<div class="rrow"><span class="k">Framework</span><span class="v"><span class="pill mem">${h(friendly(dna.framework))}</span></span></div>` : ""}
    ${dna.packageManager ? `<div class="rrow"><span class="k">Package mgr</span><span class="v"><code>${h(dna.packageManager)}</code></span></div>` : ""}
    ${dna.language ? `<div class="rrow"><span class="k">Language</span><span class="v"><span class="pill mem">${h(friendly(dna.language))}</span></span></div>` : ""}
    ${dna.stylingSystem ? `<div class="rrow"><span class="k">Styling</span><span class="v"><code>${h(dna.stylingSystem)}</code></span></div>` : ""}
    ${dna.componentSystem ? `<div class="rrow"><span class="k">Components</span><span class="v"><code>${h(dna.componentSystem)}</code></span></div>` : ""}
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
function icoCheck() {
    return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function icoDoc() {
    return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 1v3h3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5 7h4M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoRunning() {
    return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`;
}
function icoWarn() {
    return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M7 4v4M7 10v0.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoBlocked() {
    return `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function icoContinue() {
    return `<svg viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function icoRestore() {
    return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 4l-1 3 3 1M2 7a5 5 0 109-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}
function icoDna() {
    return `<svg viewBox="0 0 14 14" fill="none"><path d="M4 2c0 4 6 4 6 8M10 2c0 4-6 4-6 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4 5h6M4 9h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
// ---- helpers ----
function friendly(input) {
    if (!input)
        return "";
    const map = {
        nextjs: "Next.js", typescript: "TypeScript", javascript: "JavaScript",
        tailwindcss: "Tailwind", tailwind: "Tailwind"
    };
    return map[input.toLowerCase()] ?? input.charAt(0).toUpperCase() + input.slice(1);
}
function readFile(p) {
    try {
        return fs.readFileSync(p, "utf8").trim();
    }
    catch {
        return "";
    }
}
function tryReadDir(p) {
    try {
        return fs.readdirSync(p);
    }
    catch {
        return [];
    }
}
function h(input) {
    return String(input)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function jsonSafe(value) {
    return JSON.stringify(value).replace(/<\//g, "<\\/");
}
function isAgentOption(v) {
    return v === "Auto" || v === "Claude Code" || v === "Codex" || v === "Cursor" || v === "Custom";
}
function isModeOption(v) {
    return v === "Auto" || v === "Strict" || v === "UI only" || v === "Docs only";
}
function deactivate() { return; }
