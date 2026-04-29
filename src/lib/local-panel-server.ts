import fs from "fs";
import http from "http";
import net from "net";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { loadAllRuns, loadLatestRun } from "./run-storage";
import { configExists, DEFAULT_CONFIG, getConfigDir, loadConfig } from "./runtrim-config";
import { loadProjectAudit } from "./project-audit";
import { loadGlobalRegistry } from "./global-registry";
import { getGitDiff } from "./run-evaluation";
import { evaluateWatchState } from "./run-watch";

export interface StartLocalPanelServerOptions {
  monitor?: boolean;
  port?: number;
  open?: boolean;
  cwd?: string;
}

function parseEstimatedNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function truncate(text: string, max = 96): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function readMemory(cwd: string): string | null {
  const p = path.join(getConfigDir(cwd), "memory.md");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

function parseMemorySection(memory: string | null, title: string): string {
  if (!memory) return "";
  const lines = memory.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim().toLowerCase() === `${title.toLowerCase()}:`);
  if (idx === -1) return "";
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) break;
    out.push(line.replace(/^- /, ""));
  }
  return out.join(" ");
}

function readProjectName(cwd: string): string {
  const audit = loadProjectAudit(cwd);
  if (audit?.projectName) return audit.projectName;
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return path.basename(cwd);
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
    return pkg.name?.trim() || path.basename(cwd);
  } catch {
    return path.basename(cwd);
  }
}

function isoOrEmpty(value: string | undefined): string {
  return value ?? "";
}

function buildHtml(monitorDefault: boolean): string {
  const pollMs = monitorDefault ? 1500 : 5000;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RunTrim Local Panel</title>
  <style>
    :root{
      --bg:#07071a;
      --surface:#0d1022;
      --surface-2:#111528;
      --line:rgba(255,255,255,0.10);
      --line-soft:rgba(255,255,255,0.07);
      --text:#edeeff;
      --muted:#9aa7b6;
      --indigo:#7c6dfa;
      --indigo-soft:rgba(124,109,250,0.18);
      --ok:#4de8b0;
      --warn:#f0bf72;
      --stop:#f87171;
    }
    *{box-sizing:border-box;min-width:0}
    html,body{margin:0;padding:0;max-width:100%;overflow-x:hidden}
    body{
      font-family:var(--font-sans,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif);
      color:var(--text);
      min-height:100vh;
      padding:32px 20px 40px;
      background:
        radial-gradient(1200px 520px at 80% -10%, rgba(124,109,250,0.15), transparent 60%),
        radial-gradient(1000px 480px at 10% -10%, rgba(84,84,170,0.12), transparent 62%),
        var(--bg);
    }
    .app{max-width:1120px;margin:0 auto}
    .top{
      border:1px solid var(--line);
      border-radius:16px;
      background:linear-gradient(180deg,rgba(16,19,38,0.95),rgba(12,14,30,0.95));
      padding:18px 20px;
      box-shadow:0 12px 36px rgba(0,0,0,0.35);
    }
    .top-row{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start}
    .title{font-size:23px;font-weight:700;letter-spacing:-0.01em}
    .repo{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.55;word-break:break-all}
    .badges{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .badge{
      border:1px solid var(--line);
      border-radius:999px;
      background:rgba(255,255,255,0.03);
      color:#c8d2e8;
      font-size:12px;
      padding:4px 10px;
      white-space:nowrap;
    }
    .badge-live{border-color:rgba(77,232,176,0.45);color:#4de8b0;background:rgba(77,232,176,0.09)}
    .helper{margin-top:10px;color:var(--muted);font-size:12px}
    .kpi-grid{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .card{
      border:1px solid var(--line);
      border-radius:14px;
      background:var(--surface);
      padding:14px;
    }
    .kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7f8ba3}
    .kpi-value{margin-top:7px;font-size:22px;font-weight:700;line-height:1.2}
    .main-grid{
      margin-top:12px;
      display:grid;
      grid-template-columns:1.25fr 1fr;
      gap:12px;
      align-items:start;
    }
    .stack{
      display:grid;
      gap:12px;
      align-content:start;
      align-items:start;
    }
    h2{margin:0 0 10px 0;font-size:16px;font-weight:600;letter-spacing:-0.01em}
    .kv{display:grid;grid-template-columns:170px 1fr;gap:8px;padding:5px 0;font-size:13px}
    .k{color:var(--muted)}
    .v{color:#d7dff0}
    .status{
      display:inline-flex;align-items:center;
      border:1px solid var(--line-soft);
      border-radius:999px;padding:2px 9px;font-size:12px;font-weight:600;text-transform:capitalize;
    }
    .ok{color:var(--ok);border-color:rgba(77,232,176,0.35);background:rgba(77,232,176,0.08)}
    .warn{color:var(--warn);border-color:rgba(240,191,114,0.35);background:rgba(240,191,114,0.09)}
    .stop{color:var(--stop);border-color:rgba(248,113,113,0.35);background:rgba(248,113,113,0.09)}
    .btn-row{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
    button{
      border:1px solid rgba(124,109,250,0.38);
      border-radius:10px;
      background:#141a31;
      color:#dfe5ff;
      font-size:12px;
      padding:7px 10px;
      cursor:pointer;
    }
    button:hover{border-color:rgba(124,109,250,0.7);background:#171f3d}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .files{margin-top:8px;display:grid;gap:6px}
    .file{
      border:1px solid var(--line-soft);
      background:var(--surface-2);
      border-radius:10px;
      padding:6px 8px;
      font-size:12px;
      color:#aab7cb;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .runs-list{display:grid;gap:8px}
    .run{
      border:1px solid var(--line-soft);
      border-radius:10px;
      background:var(--surface-2);
      padding:10px;
      display:grid;
      grid-template-columns:minmax(0,1.7fr) minmax(0,.8fr) minmax(0,.7fr) minmax(0,1fr);
      gap:8px;
      align-items:center;
      font-size:12px;
    }
    .task{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e3e8f7}
    .muted{color:var(--muted)}
    .empty{
      margin-top:14px;
      border:1px solid var(--line);
      border-radius:16px;
      background:var(--surface);
      padding:26px;
      box-shadow:0 10px 28px rgba(0,0,0,0.28);
    }
    .empty h2{font-size:21px;margin-bottom:8px}
    .empty p{margin:0;color:var(--muted);font-size:13px}
    .note{margin-top:8px;color:var(--muted);font-size:12px}
    .footer{
      margin-top:14px;
      padding-top:10px;
      border-top:1px solid var(--line-soft);
      color:#7d89a1;
      font-size:12px;
    }
    @media (max-width:1060px){
      .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .main-grid{grid-template-columns:1fr}
    }
    @media (max-width:760px){
      .app{padding:14px}
      .kv{grid-template-columns:1fr}
      .run{grid-template-columns:1fr 1fr}
      .title{font-size:20px}
    }
  </style>
</head>
<body>
  <div class="app" id="app">Loading RunTrim local panel...</div>
  <script>
    const monitorDefault = ${monitorDefault ? "true" : "false"};
    const monitorFromQuery = new URLSearchParams(location.search).get("monitor") === "1";
    const monitor = monitorFromQuery || monitorDefault;
    const pollMs = monitor ? 1500 : ${pollMs};

    function s(v){return (v ?? "").toString();}
    function esc(v){return s(v).replace(/[&<>"]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]));}
    function statusClass(status){
      const x=(status||"").toLowerCase();
      if(x==="safe"||x==="passed") return "ok";
      if(x==="warning"||x==="caution"||x==="partial"||x==="needs_verification") return "warn";
      if(x==="stop"||x==="drift_detected"||x==="blocked"||x==="split_required"||x==="limit_exceeded") return "stop";
      return "";
    }
    function copyCmd(cmd){navigator.clipboard?.writeText(cmd).catch(()=>{});}
    function runStatusPill(label, raw){
      const c = statusClass(raw || label);
      return '<span class="status '+c+'">'+esc(label)+'</span>';
    }
    function renderEmpty(state){
      return ''
      +'<div class="top">'
      +'<div class="top-row"><div><div class="title">RunTrim Local Panel</div><div class="repo">'+esc(state.repoPath)+'</div></div>'
      +'<div class="badges"><span class="badge">Local</span><span class="badge">Snapshot</span></div></div>'
      +'<div class="helper">Source code stays local</div>'
      +'</div>'
      +'<div class="empty">'
      +'<h2>RunTrim is not initialized in this repo yet.</h2>'
      +'<p>Start the guided flow or initialize manually.</p>'
      +'<div class="btn-row"><button onclick="copyCmd(\\'runtrim start\\')"><code>runtrim start</code></button><button onclick="copyCmd(\\'runtrim init\\')"><code>runtrim init</code></button></div>'
      +'<div class="note">Repo: '+esc(state.repoPath)+'</div>'
      +'</div>';
    }
    function render(state){
      if(!state.initialized){ return renderEmpty(state); }
      const status = state.latestRun?.statusLabel || "No runs";
      const ws = state.watchState || {};
      const watchStatus = ws.statusLabel || "safe";
      const recent = (state.recentRuns||[]).map((r)=>'<div class="run"><div class="task">'+esc(r.task)+'</div><div>'+runStatusPill(r.statusLabel, r.statusRaw)+'</div><div class="muted">'+esc(r.riskLabel)+'</div><div class="muted">'+esc(r.createdAtLabel)+'</div></div>').join("");
      const changedFiles = ws.changedFiles||[];
      const changedList = changedFiles.slice(0,6).map((f)=>'<div class="file"><code>'+esc(f)+'</code></div>').join("");
      const changedOverflow = changedFiles.length > 6 ? '<div class="note">+'+String(changedFiles.length - 6)+' more files</div>' : '';
      return ''
      +'<div class="top">'
      +'<div class="top-row"><div><div class="title">RunTrim Local Panel</div><div class="repo">'+esc(state.projectName)+'<br>'+esc(state.repoPath)+'</div></div>'
      +'<div class="badges"><span class="badge">Local</span><span class="badge '+(monitor ? 'badge-live' : '')+'">'+(monitor ? 'Live' : 'Snapshot')+'</span></div></div>'
      +'<div class="helper">Source code stays local</div>'
      +'</div>'
      +'<div class="kpi-grid">'
      +'<div class="card"><div class="kpi-label">Latest status</div><div class="kpi-value">'+esc(status)+'</div></div>'
      +'<div class="card"><div class="kpi-label">Runs guarded</div><div class="kpi-value">'+esc(state.metrics.runsGuarded)+'</div></div>'
      +'<div class="card"><div class="kpi-label">Tokens trimmed</div><div class="kpi-value">~'+esc(state.metrics.tokensTrimmedLabel)+'</div></div>'
      +'<div class="card"><div class="kpi-label">Drift warnings</div><div class="kpi-value">'+esc(state.metrics.driftWarnings)+'</div></div>'
      +'</div>'
      +'<div class="main-grid">'
      +'<div class="stack">'
      +'<div class="card"><h2 class="h">Continue where you left off</h2>'
      +'<div class="kv"><div class="k">Latest task</div><div class="v">'+esc(state.latestRun?.task || "No guarded runs yet")+'</div></div>'
      +'<div class="kv"><div class="k">Current status</div><div class="v">'+runStatusPill(status, state.latestRun?.statusRaw||"")+'</div></div>'
      +'<div class="kv"><div class="k">Next safe action</div><div class="v">'+esc(state.latestRun?.nextSafeAction || "Run runtrim prepare for a scoped task.")+'</div></div>'
      +'<div class="kv"><div class="k">Changed files</div><div class="v">'+esc(state.latestRun?.changedFilesCount ?? 0)+'</div></div>'
      +'<div class="kv"><div class="k">Prompt state</div><div class="v">'+esc(state.latestRun?.promptState || "No prompt generated yet")+'</div></div>'
      +'<div class="btn-row"><button onclick="copyCmd(\\'runtrim check\\')"><code>runtrim check</code></button><button onclick="copyCmd(\\'runtrim memory\\')"><code>runtrim memory</code></button><button onclick="copyCmd(\\'runtrim continue --reason usage_limit\\')"><code>runtrim continue --reason usage_limit</code></button></div>'
      +'</div>'
      +'<div class="card"><h2 class="h">Memory</h2>'
      +'<div class="kv"><div class="k">Current state</div><div class="v">'+esc(state.memory.currentState || "No memory state captured yet.")+'</div></div>'
      +'<div class="kv"><div class="k">Protected areas</div><div class="v">'+esc(state.memory.protectedAreas || "auth, middleware, database schema, env/secrets")+'</div></div>'
      +'<div class="kv"><div class="k">Still missing</div><div class="v">'+esc(state.memory.stillMissing || "No open proof items recorded.")+'</div></div>'
      +'<div class="kv"><div class="k">Next safe prompt</div><div class="v"><code>'+esc(state.memory.nextSafePromptPreview || "n/a")+'</code></div></div>'
      +'</div>'
      +'</div>'
      +'<div class="stack">'
      +'<div class="card"><h2 class="h">Watch</h2>'
      +'<div class="kv"><div class="k">Status</div><div class="v">'+runStatusPill(watchStatus, ws.statusRaw||"")+'</div></div>'
      +'<div class="kv"><div class="k">Changed files</div><div class="v">'+esc(ws.changedFilesCount ?? 0)+'</div></div>'
      +'<div class="kv"><div class="k">Allowed</div><div class="v">'+esc(ws.allowedCount ?? 0)+'</div></div>'
      +'<div class="kv"><div class="k">Sensitive</div><div class="v">'+esc(ws.sensitiveCount ?? 0)+'</div></div>'
      +'<div class="kv"><div class="k">Forbidden</div><div class="v">'+esc(ws.forbiddenCount ?? 0)+'</div></div>'
      +(changedList ? '<div class="section"><div class="k">Latest changed paths</div><div class="files">'+changedList+'</div>'+changedOverflow+'</div>' : '<div class="note">No changed files detected</div>')
      +'</div>'
      +'<div class="card"><h2 class="h">Recent runs</h2><div class="runs-list">'+(recent || '<div class="note">No runs yet.</div>')+'</div></div>'
      +'</div>'
      +'</div>'
      +'<div class="footer">Source code stays local. Refreshes from local RunTrim metadata.</div>';
    }
    async function refresh(){
      try{
        const res = await fetch('/api/state');
        const data = await res.json();
        document.getElementById('app').innerHTML = render(data);
      }catch(err){
        document.getElementById('app').innerHTML = '<div class="empty"><h2 class="h">Panel load error</h2><p class="muted">Could not load local state.</p></div>';
      }
    }
    refresh();
    setInterval(refresh, pollMs);
  </script>
</body>
</html>`;
}

async function getPanelState(cwd: string, monitorMode: boolean) {
  const initialized = configExists(cwd);
  const config = initialized ? loadConfig(cwd) : DEFAULT_CONFIG;
  const projectAudit = loadProjectAudit(cwd);
  const runs = loadAllRuns(cwd);
  const latest = loadLatestRun(cwd);
  const registry = loadGlobalRegistry();
  const memoryRaw = readMemory(cwd);
  const gitChangedFiles = await getGitDiff(cwd);
  const shouldComputeWatch = monitorMode || gitChangedFiles.length > 0;
  let watchState: Record<string, unknown> | null = null;

  if (shouldComputeWatch && latest) {
    const watch = evaluateWatchState({
      changedFiles: gitChangedFiles,
      run: latest,
      maxFilesPerRun: config.maxFilesPerRun,
      strict: config.riskSensitivity === "high",
    });
    watchState = {
      statusRaw: watch.status,
      statusLabel:
        watch.status === "safe"
          ? "safe"
          : watch.status === "caution"
          ? "warning"
          : "stop",
      changedFilesCount: watch.changedFiles.length,
      allowedCount: watch.relevantFiles.length,
      sensitiveCount: watch.sensitiveFiles.length,
      forbiddenCount: watch.forbiddenFiles.length,
      changedFiles: watch.changedFiles.slice(0, 12),
      warnings: watch.warnings,
      nextAction: watch.nextAction,
    };
  } else {
    watchState = {
      statusRaw: "safe",
      statusLabel: "safe",
      changedFilesCount: gitChangedFiles.length,
      allowedCount: 0,
      sensitiveCount: 0,
      forbiddenCount: 0,
      changedFiles: gitChangedFiles.slice(0, 12),
      warnings: [],
      nextAction: gitChangedFiles.length > 0 ? "Run runtrim check." : "No local file changes detected.",
    };
  }

  const totalTokens = runs.reduce((sum, r) => sum + parseEstimatedNumber(r.contract.estimatedTokensTrimmed), 0);
  const driftWarnings = runs.filter(
    (r) => r.evaluation?.scopeDriftRisk === "high" || r.evaluation?.scopeDriftRisk === "medium"
  ).length;

  return {
    ok: true,
    initialized,
    projectName: readProjectName(cwd),
    repoPath: path.resolve(cwd),
    mode: "local",
    monitor: monitorMode,
    stack: projectAudit?.detectedStack ?? [],
    packageManager: projectAudit?.packageManager ?? config.packageManager ?? "npm",
    planStatus: (registry.plan || "free").toUpperCase(),
    syncEnabled: config.syncEnabled === true,
    syncTokenPresent: Boolean(config.syncToken),
    agentMode: config.agentMode,
    latestRun: latest
      ? {
          id: latest.id,
          task: latest.task,
          statusRaw: latest.evaluation?.status ?? latest.status,
          statusLabel: latest.evaluation?.status
            ? latest.evaluation.status.replace(/_/g, " ")
            : latest.status.replace(/_/g, " "),
          changedFilesCount: latest.evaluation?.changedFiles?.length ?? latest.watchChangedFiles?.length ?? 0,
          nextSafeAction: latest.evaluation?.nextSafeAction ?? "Run runtrim check to evaluate latest run.",
          promptState: latest.contract?.isBlocked
            ? "split required prompt"
            : fs.existsSync(path.join(getConfigDir(cwd), "latest-prompt.md"))
            ? "guarded prompt available"
            : "prompt not generated",
        }
      : null,
    recentRuns: runs.slice(0, 5).map((r) => ({
      id: r.id,
      task: truncate(r.task, 72),
      statusRaw: r.evaluation?.status ?? r.status,
      statusLabel: (r.evaluation?.status ?? r.status).replace(/_/g, " "),
      riskLabel: (r.evaluation?.scopeDriftRisk ?? r.audit.wasteRiskBefore ?? "none").replace(/_/g, " "),
      createdAt: isoOrEmpty(r.createdAt),
      createdAtLabel: new Date(r.createdAt).toLocaleString("en-US"),
    })),
    memory: {
      currentState: parseMemorySection(memoryRaw, "Current state"),
      protectedAreas: parseMemorySection(memoryRaw, "Protected areas"),
      stillMissing: parseMemorySection(memoryRaw, "Still missing"),
      nextSafePromptPreview: truncate(parseMemorySection(memoryRaw, "Next safe prompt"), 140),
    },
    protectedAreas: projectAudit?.protectedAreas ?? [],
    metrics: {
      latestStatus: latest?.evaluation?.status ?? latest?.status ?? "baseline_initialized",
      runsGuarded: runs.length,
      runsBlocked: runs.filter((r) => r.status === "blocked" || r.status === "split_required").length,
      tokensTrimmed: totalTokens,
      tokensTrimmedLabel: totalTokens.toLocaleString("en-US"),
      driftWarnings,
    },
    watchState,
    serverTime: new Date().toISOString(),
  };
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = Math.max(1, startPort | 0);
  for (let i = 0; i < 20; i += 1) {
    const open = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, "127.0.0.1");
    });
    if (open) return port;
    port += 1;
  }
  throw new Error("Could not find an available localhost port.");
}

function openBrowser(url: string): void {
  const platform = os.platform();
  try {
    if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // fail silently
  }
}

export async function startLocalPanelServer(
  options: StartLocalPanelServerOptions = {}
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const monitor = Boolean(options.monitor);
  const preferredPort = options.port ?? 4269;
  const shouldOpen = options.open !== false;
  const port = await findAvailablePort(preferredPort);

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", `http://localhost:${port}`);
    const pathname = requestUrl.pathname;

    if (pathname === "/api/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === "/api/state" || pathname === "/api/watch") {
      const state = await getPanelState(cwd, monitor);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(JSON.stringify(state));
      return;
    }

    if (pathname === "/") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(buildHtml(monitor));
      return;
    }

    res.statusCode = 404;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const panelUrl = `http://localhost:${port}${monitor ? "/?monitor=1" : "/"}`;
  console.log("");
  console.log("RunTrim local panel");
  console.log(`URL: ${panelUrl}`);
  console.log("Source code stays local.");
  console.log("");

  if (shouldOpen) {
    try {
      openBrowser(panelUrl);
    } catch {
      // non-fatal
    }
  }

  await new Promise<void>((resolve) => {
    const shutdown = () => {
      server.close(() => resolve());
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
