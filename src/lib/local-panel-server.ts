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
  let audit: ReturnType<typeof loadProjectAudit> = null;
  try {
    audit = loadProjectAudit(cwd);
  } catch {
    audit = null;
  }
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
  const pollMs = monitorDefault ? 1500 : 0;
  const safeJson = (value: unknown) =>
    JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const commandMap = {
    start: "runtrim start",
    init: "runtrim init",
    refresh: "refresh",
    check: "runtrim finish",
    memory: "runtrim memory",
    continueUsageLimit: "runtrim continue --reason usage_limit",
    prepareNewRun: 'runtrim agent "your task" --copy',
    restore: "runtrim restore",
    restorePreview: "runtrim restore last --preview",
    approve: 'runtrim approve "Allow editing <path> for this run only"',
    mcpInstructions: "runtrim mcp instructions",
    watch: "runtrim watch",
    panelNoOpen: "runtrim panel --no-open",
  } as const;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RunTrim Local Panel</title>
  <style>
    :root{
      --bg:#07071A;
      --card:#0C0D22;
      --card2:#090918;
      --line:rgba(255,255,255,0.09);
      --line2:rgba(255,255,255,0.06);
      --text:#EDEEFF;
      --muted:#9AA7B6;
      --muted2:#6870A0;
      --brand:#7C6DFA;
      --ok:#4DE8B0;
      --warn:#F0BF72;
      --stop:#F87171;
    }
    *{box-sizing:border-box;min-width:0}
    html,body{margin:0;padding:0;overflow-x:hidden}
    body{
      font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      min-height:100vh;
      color:var(--text);
      background:
        radial-gradient(980px 500px at 60% 10%, rgba(124,109,250,0.12), transparent 68%),
        radial-gradient(760px 300px at 12% -6%, rgba(91,139,255,0.08), transparent 70%),
        radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px),
        radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px),
        0 0 / 34px 34px,
        17px 17px / 34px 34px,
        var(--bg);
    }
    .app{max-width:1240px;margin:0 auto;padding:24px 16px 22px}
    .shell{display:flex;flex-direction:column;gap:16px;min-height:calc(100vh - 46px)}
    .topbar{
      border:1px solid var(--line);
      border-radius:12px;
      background:linear-gradient(180deg, rgba(14,16,34,0.95), rgba(10,11,27,0.95));
      padding:12px 16px;
      box-shadow:0 8px 24px rgba(0,0,0,0.25);
    }
    .row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-mark{
      width:22px;height:22px;border-radius:6px;background:#0A0B1F;border:1px solid rgba(124,109,250,0.22);position:relative;overflow:hidden;
    }
    .brand-mark::before,.brand-mark::after{content:"";position:absolute;background:linear-gradient(160deg,#6E8DFF 0%,#7A4DFF 100%)}
    .brand-mark::before{left:5px;top:4px;width:12px;height:3px;box-shadow:0 0 0 999px transparent}
    .brand-mark::after{left:5px;top:4px;width:3px;height:14px}
    .brand-leg{position:absolute;left:8px;top:10px;width:9px;height:9px;background:linear-gradient(160deg,#6E8DFF 0%,#7A4DFF 100%);clip-path:polygon(0 0,3px 0,9px 9px,6px 9px)}
    .title{font-size:17px;font-weight:700;letter-spacing:0}
    .project{margin-top:3px;font-size:13px;color:#C5CEE1}
    .path{margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted2);font-size:11px}
    .badges{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
    .badge{
      border:1px solid var(--line);
      background:rgba(255,255,255,0.03);
      color:#B8C2DA;
      border-radius:999px;
      padding:4px 10px;
      font-size:11px;
      white-space:nowrap;
    }
    .badge.live{border-color:rgba(77,232,176,0.35);color:var(--ok);background:rgba(77,232,176,0.09)}
    .hero{
      border:1px solid rgba(124,109,250,0.42);
      border-radius:12px;
      background:
        radial-gradient(680px 280px at 8% -24%, rgba(124,109,250,0.15), transparent 72%),
        linear-gradient(180deg, rgba(14,16,36,0.98), rgba(10,11,27,0.98));
      box-shadow:0 0 0 1px rgba(124,109,250,0.16), 0 18px 34px rgba(0,0,0,0.30);
      padding:18px;
    }
    .hero-title{font-size:22px;font-weight:700;letter-spacing:0}
    .hero-state{
      font-size:28px;
      font-weight:700;
      color:#EDEEFF;
      letter-spacing:0;
      line-height:1;
      margin-top:6px;
    }
    .hero-reason{margin-top:8px;font-size:13px;color:#A9B4CC;max-width:78ch;line-height:1.5}
    .hero-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .status-rail{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap}
    .status-chip{
      display:inline-flex;
      align-items:center;
      border:1px solid var(--line2);
      border-radius:999px;
      padding:6px 10px;
      background:rgba(255,255,255,0.015);
      font-size:12px;
      color:#C8D3E9;
      line-height:1.2;
    }
    .status-chip strong{font-weight:600;color:#E2E8F8}
    .cmd-hero{
      margin-top:14px;
      border:1px solid rgba(124,109,250,0.42);
      border-radius:10px;
      background:#0D1024;
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:10px;
      padding:10px 11px;
      box-shadow:0 0 0 1px rgba(124,109,250,0.09);
    }
    .cmd-hero code{
      font-size:14px;
      color:#D7CFFF;
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      white-space:nowrap;
      overflow:auto;
      max-width:100%;
    }
    .cmd-hero .btn{flex-shrink:0;min-width:76px}
    .why-panel{
      margin-top:14px;
      border:1px solid var(--line2);
      border-radius:10px;
      background:rgba(255,255,255,0.015);
      padding:10px 12px;
    }
    .why-k{font-size:10px;text-transform:uppercase;letter-spacing:0.09em;color:var(--muted2)}
    .why-v{font-size:12px;color:#B7C4DE;margin-top:4px;line-height:1.5}
    .hero-status{
      font-size:13px;
      border-radius:999px;
      padding:4px 10px;
    }
    .kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .kpi{
      border:1px solid var(--line);
      border-radius:9px;
      background:var(--card);
      padding:9px 10px;
      min-height:76px;
      position:relative;
      overflow:hidden;
    }
    .kpi::before{
      content:"";
      position:absolute;
      left:0;top:0;bottom:0;width:2px;
      background:rgba(124,109,250,0.55);
    }
    .kpi .label{font-size:10px;text-transform:uppercase;letter-spacing:0.09em;color:var(--muted2)}
    .kpi .value{margin-top:6px;font-size:20px;font-weight:700;line-height:1.05}
    .kpi .sub{margin-top:5px;font-size:11px;color:var(--muted)}
    .grid{display:grid;grid-template-columns:1fr;gap:14px}
    .main-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:14px}
    .stack{display:grid;gap:14px}
    .card{
      border:1px solid var(--line);
      border-radius:10px;
      background:var(--card);
      padding:22px;
    }
    .card h2{margin:0;font-size:17px;letter-spacing:0}
    .sub{margin-top:6px;color:var(--muted);font-size:12px;line-height:1.5}
    .kv{margin-top:16px;display:grid;grid-template-columns:170px 1fr;gap:10px;font-size:13px}
    .k{color:var(--muted)}
    .v{color:#DBE2F5}
    .status{
      display:inline-flex;align-items:center;border-radius:999px;border:1px solid var(--line2);
      padding:2px 8px;font-size:11px;font-weight:600;text-transform:capitalize
    }
    .ok{color:var(--ok);border-color:rgba(77,232,176,0.32);background:rgba(77,232,176,0.08)}
    .warn{color:var(--warn);border-color:rgba(240,191,114,0.32);background:rgba(240,191,114,0.1)}
    .stop{color:var(--stop);border-color:rgba(248,113,113,0.32);background:rgba(248,113,113,0.1)}
    .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .chip{border:1px solid var(--line2);border-radius:999px;padding:4px 8px;background:var(--card2);font-size:11px;color:#B4C0D8}
    .paths{display:grid;gap:8px;margin-top:12px}
    .path-item{
      background:var(--card2);border:1px solid var(--line2);border-radius:9px;padding:8px 10px;min-height:34px;display:flex;align-items:center;
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:#A8B5CE;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis
    }
    .runs{
      display:grid;
      gap:10px;
      margin-top:16px;
      position:relative;
      padding-left:12px;
    }
    .runs::before{
      content:"";
      position:absolute;
      left:3px;
      top:4px;
      bottom:4px;
      width:1px;
      background:linear-gradient(to bottom, rgba(124,109,250,0.34), rgba(124,109,250,0.06));
    }
    .run{
      border:1px solid var(--line2);background:var(--card2);border-radius:10px;padding:10px 11px;
      display:grid;grid-template-columns:auto minmax(0,1.6fr) auto auto auto;gap:8px;align-items:center
    }
    .run:hover{border-color:rgba(124,109,250,0.32)}
    .run-dot{width:8px;height:8px;border-radius:999px;background:#7C6DFA;box-shadow:0 0 0 1px rgba(124,109,250,0.24);position:relative;left:-8px}
    .run-dot.warn{background:#F0BF72;box-shadow:0 0 0 1px rgba(240,191,114,0.24)}
    .run-dot.stop{background:#F87171;box-shadow:0 0 0 1px rgba(248,113,113,0.24)}
    .task{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:#D5DDF0}
    .muted{color:var(--muted);font-size:12px}
    .actions{margin-top:14px;display:flex;gap:8px;flex-wrap:wrap}
    .btn{
      border:1px solid rgba(124,109,250,0.34);
      background:#131A32;
      color:#DCE4FF;
      border-radius:8px;
      padding:7px 10px;
      font-size:12px;
      cursor:pointer;
    }
    .btn-primary{
      background:linear-gradient(180deg,#7C6DFA,#6F60EC);
      color:#fff;
      border-color:rgba(124,109,250,0.65);
      font-weight:700;
      padding:9px 12px;
    }
    .btn-primary:hover{background:linear-gradient(180deg,#8677FF,#7665F0);border-color:rgba(124,109,250,0.82)}
    .btn:hover{border-color:rgba(124,109,250,0.64);background:#192344}
    .btn.ghost{border-color:var(--line);background:transparent;color:#A9B5CF}
    .watch-msg{
      margin-top:12px;
      font-size:12px;
      color:#AAB5CF;
    }
    .quick{
      display:grid;
      gap:10px;
      margin-top:16px;
    }
    .quick-row{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      flex-wrap:wrap;
      gap:10px;
      padding:10px 11px;
      border:1px solid var(--line2);
      border-radius:10px;
      background:var(--card2);
      transition:border-color 120ms ease, background 120ms ease;
    }
    .quick-row:hover{
      border-color:rgba(124,109,250,0.35);
      background:#10132A;
    }
    .quick-label{font-size:12px;color:#D8E0F1;font-weight:600}
    .quick-purpose{font-size:11px;color:#8897B2;margin-top:3px}
    .quick-cmd{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#96A5C4;font-size:11px;margin-top:6px}
    .quick-row .btn{padding:6px 8px;font-size:11px;align-self:center;flex-shrink:0}
    .quick-main{min-width:0;flex:1}
    .quick-cmd{
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      max-width:100%;
      display:block;
    }
    .recovery-note{
      margin-top:12px;
      border:1px solid var(--line2);
      border-radius:10px;
      padding:10px;
      background:rgba(255,255,255,0.015);
      color:#c1c9dc;
      font-size:12px;
      line-height:1.5;
    }
    .smart{
      border:1px solid rgba(124,109,250,0.24);
      background:rgba(124,109,250,0.07);
      border-radius:10px;padding:9px 12px;font-size:12px;color:#D3DBF5
    }
    .empty{
      border:1px solid var(--line);border-radius:14px;background:var(--card);padding:24px;min-height:300px;
      display:flex;flex-direction:column;justify-content:center
    }
    .empty h2{margin:0;font-size:28px;letter-spacing:-0.02em}
    .empty p{margin:8px 0 0;color:var(--muted);font-size:14px;max-width:620px}
    .footer{
      margin-top:auto;padding-top:8px;border-top:1px solid var(--line2);font-size:12px;color:#74809B
    }
    .sr{position:absolute;left:-10000px}
    @media (max-width:1120px){ .main-grid{grid-template-columns:1fr} .grid{grid-template-columns:1fr} }
    @media (max-width:760px){
      .app{padding:14px}
      .kpis{grid-template-columns:1fr}
      .main-grid{grid-template-columns:1fr}
      .kv{grid-template-columns:1fr}
      .run{grid-template-columns:auto 1fr auto}
      .cmd-hero{padding:8px 9px}
      .status-rail{gap:6px}
      .status-chip{font-size:11px;padding:5px 8px}
      .hide-sm{display:none}
      .empty h2{font-size:24px}
      .hero-title{font-size:20px}
      .actions .btn{width:100%}
      .quick-row{flex-direction:column}
      .quick-row .btn{width:100%}
      .cmd-hero .btn{width:100%}
    }
  </style>
</head>
<body>
  <div class="app" id="app">Loading RunTrim local panel...</div>
  <script>
    const COMMANDS = ${safeJson(commandMap)};
    const monitorDefault = ${monitorDefault ? "true" : "false"};
    const monitorFromQuery = new URLSearchParams(location.search).get("monitor") === "1";
    const monitor = monitorFromQuery || monitorDefault;
    const pollMs = monitor ? 1500 : ${pollMs};
    let copyResetTimer = null;

    function s(v){return (v ?? "").toString();}
    function escapeHtml(v){return s(v).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}
    function esc(v){return escapeHtml(v);}
    function statusClass(status){
      const x=(status||"").toLowerCase();
      if(x==="safe"||x==="passed") return "ok";
      if(x==="warning"||x==="caution"||x==="partial"||x==="needs_verification") return "warn";
      if(x==="stop"||x==="drift_detected"||x==="blocked"||x==="split_required"||x==="limit_exceeded") return "stop";
      return "";
    }
    async function copyCmd(btn, cmd){
      try {
        await navigator.clipboard.writeText(cmd);
        const original = btn.textContent;
        btn.textContent = "Copied";
        if (copyResetTimer) clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => { btn.textContent = original; }, 1200);
      } catch {}
    }
    function trimPath(p){
      const v = s(p);
      if(v.length <= 72) return v;
      return "..." + v.slice(v.length - 69);
    }
    function runStatusPill(label, raw){
      const c = statusClass(raw || label);
      return '<span class="status '+c+'">'+esc(label)+'</span>';
    }
    function asArray(value){
      if (Array.isArray(value)) return value.filter(Boolean);
      if (!value) return [];
      return s(value).split(/[;,]/).map((v) => v.trim()).filter(Boolean);
    }
    function smartStep(state){
      if(!state.initialized) return "Run runtrim start to initialize this repo.";
      if((state.watchState?.changedFilesCount || 0) > 0) return "Run runtrim check. Local files changed and should be verified before continuing.";
      if((state.latestRun?.missingProofCount || 0) > 0) return "Verification debt is open. Complete proof items before new scope.";
      if(state.latestRun?.promptState === "guarded prompt available") return "Guarded prompt available. Continue with runtrim continue --reason usage_limit if a session stopped.";
      if(!state.latestRun) return "Start your first scoped run with " + COMMANDS.prepareNewRun + ".";
      return state.latestRun?.nextSafeAction || "Run runtrim check for an updated state snapshot.";
    }
    function renderEmpty(state){
      return ''
      +'<div class="shell">'
      +'<div class="topbar">'
      +'<div class="row"><div><div class="brand"><span class="brand-mark"><span class="brand-leg"></span></span><div class="title">RunTrim Local Panel</div></div><div class="project">'+esc(state.projectName || "Current repository")+'</div><div class="path">'+esc(trimPath(state.repoPath))+'</div></div>'
      +'<div class="badges"><span class="badge">Local</span><span class="badge">Snapshot</span><span class="badge">Source code stays local</span></div></div>'
      +'</div>'
      +'<div class="empty">'
      +'<h2>Start local run control</h2>'
      +'<p>Start the guided flow or initialize manually. Source code stays local.</p>'
      +'<div class="actions">'
      +'<button class="btn" data-command="'+esc(COMMANDS.start)+'"><code>runtrim start</code></button>'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.init)+'"><code>runtrim init</code></button>'
      +'</div>'
      +'</div>'
      +'<div class="footer">Source code stays local. Panel reads RunTrim metadata and git status only.</div>'
      +'</div>';
    }
    function render(state){
      if(!state.initialized){ return renderEmpty(state); }
      const ws = state.watchState || {};
      const watchStatus = ws.statusLabel || "safe";
      const recent = (state.recentRuns||[]).slice(0,5).map((r)=>'<div class="run"><span class="run-dot '+(statusClass(r.statusRaw || r.statusLabel) || '')+'"></span><div class="task">'+esc(r.task)+'</div><div>'+runStatusPill(r.statusLabel, r.statusRaw)+'</div><div class="muted hide-sm">'+esc(r.createdAtLabel)+'</div><div class="muted hide-sm">'+esc((r.statusRaw||"").toLowerCase().includes("blocked") ? "restore available" : "local record")+'</div></div>').join("");
      const changedFiles = (ws.changedFiles||[]).slice(0,5);
      const changedList = changedFiles.map((f)=>'<div class="path-item">'+esc(f)+'</div>').join("");
      const protectedAreas = asArray(state.protectedAreas).slice(0,10).map((v)=>'<span class="chip">'+esc(v)+'</span>').join("");
      const memoryProtected = asArray(state.memory.protectedAreas).slice(0,10).map((v)=>'<span class="chip">'+esc(v)+'</span>').join("");
      const currentProtected = protectedAreas || memoryProtected || '<span class="chip">auth</span><span class="chip">middleware</span><span class="chip">database</span><span class="chip">env/secrets</span><span class="chip">billing</span><span class="chip">webhooks</span>';
      const modeBadge = state.agentMode === "command" ? "Command mode" : "Copy mode";
      const watchHint = watchStatus === "warning"
        ? "Review touched files before continuing."
        : watchStatus === "stop"
        ? "Stop and contain drift before any new edits."
        : ((ws.changedFilesCount || 0) > 0 ? "Changes detected. Run runtrim check." : "No local changes detected.");
      const heroReason = state.latestRun?.heroReason || "Finish verification keeps local runs trustworthy.";
      const verdictRaw = String(state.latestRun?.statusRaw || state.latestRun?.statusLabel || "").toLowerCase();
      const hasLatest = Boolean(state.latestRun);
      const isBlocked = verdictRaw.includes("blocked") || verdictRaw.includes("split_required") || verdictRaw.includes("drift_detected");
      const isWarn = !isBlocked && (verdictRaw.includes("warn") || verdictRaw.includes("warning") || verdictRaw.includes("needs_verification") || verdictRaw.includes("partial") || verdictRaw.includes("guarded"));
      const latestTitle = !hasLatest
        ? "Start a guarded run"
        : isBlocked
        ? "Latest run needs review"
        : isWarn
        ? "Latest run needs attention"
        : "Latest run verified";
      const latestBody = !hasLatest
        ? "Create a guarded run, then finish verification to record a trusted result."
        : isBlocked
        ? "RunTrim recorded this run, but it should not be treated as trusted work until reviewed, approved or restored."
        : isWarn
        ? "Review warnings and finish verification before you continue with new scope."
        : "Finish verification captured a trusted local result for this run.";
      const heroPrimary = !hasLatest ? COMMANDS.prepareNewRun : (isBlocked ? COMMANDS.restore : COMMANDS.check);
      const heroSecondary = !hasLatest ? COMMANDS.check : (isBlocked ? COMMANDS.restorePreview : COMMANDS.memory);
      const riskLabel = state.latestRun?.riskLabel || "n/a";
      const latestRestorePoint = state.recentRuns?.[0]?.createdAtLabel || "not recorded yet";
      const autoStatus = state.latestRun ? (state.syncTokenPresent ? "Ready" : "Partial") : "Not connected";
      const operatorNote = isBlocked
        ? "Latest run needs review. Preview recovery before continuing."
        : isWarn
        ? "Review warnings before starting new scope."
        : "Ready for the next guarded run.";
      return ''
      +'<div class="shell">'
      +'<div class="topbar">'
      +'<div class="row"><div><div class="brand"><span class="brand-mark"><span class="brand-leg"></span></span><div class="title">RunTrim Local Panel</div></div><div class="project">'+esc(state.projectName)+'</div><div class="path">'+esc(trimPath(state.repoPath))+'</div></div>'
      +'<div class="badges">'
      +'<span class="badge">Local</span>'
      +'<span class="badge '+(monitor ? 'live' : '')+'">'+(monitor ? 'Live' : 'Snapshot')+'</span>'
      +'<span class="badge">'+esc(modeBadge)+'</span>'
      +'<span class="badge">Source code stays local</span>'
      +(monitor ? '' : '<button class="btn ghost" data-action="refresh">Refresh</button>')
      +'</div></div>'
      +'</div>'
      +'<div class="hero">'
      +'<div class="hero-head"><div><div class="hero-title">'+esc(latestTitle)+'</div><div class="hero-reason">'+esc(latestBody)+'</div></div><div class="hero-status '+(statusClass(state.latestRun?.statusRaw || state.latestRun?.statusLabel || "safe") || '')+' status">'+esc(hasLatest ? (state.latestRun?.statusLabel || "not recorded yet") : "not recorded yet")+'</div></div>'
      +'<div class="cmd-hero"><code>'+esc(heroPrimary)+'</code><button class="btn btn-primary" data-command="'+esc(heroPrimary)+'">Copy</button></div>'
      +'<div class="cmd-hero"><code>'+esc(heroSecondary)+'</code><button class="btn ghost" data-command="'+esc(heroSecondary)+'">Copy</button></div>'
      +'<div class="status-rail">'
      +'<span class="status-chip"><strong>Task:</strong>&nbsp;'+esc(state.latestRun?.task || "Not available")+'</span>'
      +'<span class="status-chip">'+esc(state.latestRun?.promptState === "guarded prompt available" ? "Guarded prompt ready" : (state.latestRun?.promptState || "No continuation prompt yet"))+'</span>'
      +'<span class="status-chip">'+esc(state.latestRun?.proofState || "Not available")+'</span>'
      +'<span class="status-chip"><strong>Risk:</strong>&nbsp;'+esc(riskLabel)+'</span>'
      +'<span class="status-chip"><strong>'+esc(state.latestRun?.changedFilesCount ?? "n/a")+'</strong>&nbsp;files</span>'
      +'</div>'
      +'<div class="why-panel"><div class="why-k">Why this is next</div><div class="why-v">'+esc(heroReason)+'</div></div>'
      +'<div class="actions">'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.memory)+'"><code>runtrim memory</code></button>'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.continueUsageLimit)+'"><code>runtrim continue --reason usage_limit</code></button>'
      +'</div>'
      +'</div>'
      +'<div class="kpis">'
      +'<div class="kpi"><div class="label">Runs guarded</div><div class="value">'+esc(state.metrics.runsGuarded)+'</div><div class="sub">This repo</div></div>'
      +'<div class="kpi"><div class="label">Tokens trimmed</div><div class="value">~'+esc(state.metrics.tokensTrimmedLabel)+'</div><div class="sub">Local estimate</div></div>'
      +'<div class="kpi"><div class="label">Verification debt</div><div class="value">'+esc(state.metrics.verificationDebt ?? 0)+'</div><div class="sub">Missing proof items</div></div>'
      +'<div class="kpi"><div class="label">Drift warnings</div><div class="value">'+esc(state.metrics.driftWarnings)+'</div><div class="sub">Guardrail pressure</div></div>'
      +'</div>'
      +'<div class="grid">'
      +'<div class="card"><h2>Recovery</h2><div class="sub">Recover without spending another agent run.</div>'
      +'<div class="kv"><div class="k">Latest restore point</div><div class="v">'+esc(latestRestorePoint)+'</div></div>'
      +'<div class="kv"><div class="k">Restore status</div><div class="v">'+runStatusPill(isBlocked ? "needs review" : "available", isBlocked ? "blocked" : "safe")+'</div></div>'
      +'<div class="actions">'
      +'<button class="btn btn-primary" data-command="'+esc(COMMANDS.restore)+'"><code>runtrim restore</code></button>'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.restorePreview)+'"><code>runtrim restore last --preview</code></button>'
      +'</div>'
      +'<div class="recovery-note">File recovery happens locally through the CLI.</div>'
      +'</div>'
      +'<div class="card"><h2>Agent Autopilot</h2><div class="sub">Contract and safety readiness for AI coding agents</div>'
      +'<div class="kv"><div class="k">Status</div><div class="v">'+runStatusPill(autoStatus, autoStatus)+'</div></div>'
      +'<div class="chips"><span class="chip">Contract before edits</span><span class="chip">Project memory</span><span class="chip">Risky path checks</span><span class="chip">Finish guidance</span><span class="chip">MCP tools</span><span class="chip">Agent rules</span></div>'
      +'<div class="actions"><button class="btn ghost" data-command="'+esc(COMMANDS.mcpInstructions)+'"><code>runtrim mcp instructions</code></button></div>'
      +'</div>'
      +'</div>'
      +'<div class="main-grid">'
      +'<div class="stack">'
      +'<div class="card"><h2>Memory layer</h2><div class="sub">Project context carried across runs</div>'
      +'<div class="kv"><div class="k">Current state</div><div class="v">'+esc(state.memory.currentState || "No memory state captured yet.")+'</div></div>'
      +'<div class="kv"><div class="k">Guard policy</div><div class="v"><div class="chips">'+currentProtected+'</div></div></div>'
      +'<div class="kv"><div class="k">Still missing</div><div class="v">'+esc(state.memory.stillMissing || "No open proof items recorded.")+'</div></div>'
      +'<div class="kv"><div class="k">Continuation prompt</div><div class="v"><code>'+esc(state.memory.nextSafePromptPreview || "No continuation prompt yet")+'</code></div></div>'
      +'</div>'
      +'<div class="card"><h2>Recent activity</h2><div class="sub">Latest local run activity</div><div class="runs">'+(recent || '<div class="sub">No runs yet.</div>')+'</div></div>'
      +'</div>'
      +'<div class="stack">'
      +'<div class="card"><h2>Drift monitor</h2><div class="sub">'+(monitor ? "Live monitor updates every 1500ms" : "Snapshot view of current repo diff")+'</div>'
      +'<div class="kv"><div class="k">Status</div><div class="v">'+runStatusPill(watchStatus, ws.statusRaw||"")+'</div></div>'
      +'<div class="chips">'
      +'<span class="chip">changed: '+esc(ws.changedFilesCount ?? 0)+'</span>'
      +'<span class="chip">allowed: '+esc(ws.allowedCount ?? 0)+'</span>'
      +'<span class="chip">sensitive: '+esc(ws.sensitiveCount ?? 0)+'</span>'
      +'<span class="chip">forbidden: '+esc(ws.forbiddenCount ?? 0)+'</span>'
      +'</div>'
      +'<div class="watch-msg">'+esc((ws.changedFilesCount || 0) > 0 ? (String(ws.changedFilesCount) + " files changed. " + (watchStatus === "stop" ? "Stop and contain drift before any new edits." : watchHint)) : watchHint)+'</div>'
      +(changedList ? '<div class="paths">'+changedList+'</div>' : '<div class="sub">No changed files detected.</div>')
      +'</div>'
      +'<div class="card"><h2>Command palette</h2><div class="sub">Copy and run in your terminal</div>'
      +'<div class="quick">'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Prepare new run</div><div class="quick-purpose">Create a guarded run handoff</div><div class="quick-cmd">'+esc(COMMANDS.prepareNewRun)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.prepareNewRun)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Check latest</div><div class="quick-purpose">Run finish verification</div><div class="quick-cmd">'+esc(COMMANDS.check)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.check)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Recover</div><div class="quick-purpose">Local restore from guarded run metadata</div><div class="quick-cmd">'+esc(COMMANDS.restore)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.restore)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Preview recovery</div><div class="quick-purpose">Inspect restore before apply</div><div class="quick-cmd">'+esc(COMMANDS.restorePreview)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.restorePreview)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Show memory</div><div class="quick-purpose">Resume with project memory</div><div class="quick-cmd">'+esc(COMMANDS.memory)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.memory)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">Continue after limit</div><div class="quick-purpose">Create local continuation prompt (no agent tokens)</div><div class="quick-cmd">'+esc(COMMANDS.continueUsageLimit)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.continueUsageLimit)+'">Copy</button></div>'
      +'<div class="quick-row"><div class="quick-main"><div class="quick-label">MCP instructions</div><div class="quick-purpose">Connect MCP tooling for Agent Autopilot</div><div class="quick-cmd">'+esc(COMMANDS.mcpInstructions)+'</div></div><button class="btn ghost" data-command="'+esc(COMMANDS.mcpInstructions)+'">Copy</button></div>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'<div class="smart"><strong>Operator note:</strong> '+esc(operatorNote)+'</div>'
      +'<div class="footer">Source code stays local. Panel reads RunTrim metadata and git status only.</div>'
      +'</div>';
    }
    function renderErrorState(message){
      return ''
      +'<div class="shell">'
      +'<div class="topbar">'
      +'<div class="row"><div><div class="brand"><span class="brand-mark"><span class="brand-leg"></span></span><div class="title">RunTrim Local Panel</div></div><div class="project">Local panel</div><div class="path">Unable to load current repository metadata</div></div>'
      +'<div class="badges"><span class="badge">Local</span><span class="badge">Snapshot</span><span class="badge">Source code stays local</span></div></div>'
      +'</div>'
      +'<div class="empty">'
      +'<h2>Could not load local panel state</h2>'
      +'<p>The panel opened, but local metadata could not be read.</p>'
      +'<p class="sub" style="margin-top:10px">'+esc(message || "Try refreshing or run runtrim start.")+'</p>'
      +'<div class="actions">'
      +'<button class="btn" data-action="refresh">Retry</button>'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.start)+'"><code>runtrim start</code></button>'
      +'<button class="btn ghost" data-command="'+esc(COMMANDS.panelNoOpen)+'"><code>runtrim panel --no-open</code></button>'
      +'</div>'
      +'</div>'
      +'<div class="footer">Source code stays local. Panel reads RunTrim metadata and git status only.</div>'
      +'</div>';
    }
    async function fetchStateWithTimeout(timeoutMs){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch('/api/state', { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('State request failed with ' + res.status);
        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('State response was not valid JSON');
        }
        return data;
      } finally {
        clearTimeout(timeout);
      }
    }
    async function refreshData(){
      try{
        const data = await fetchStateWithTimeout(5000);
        try {
          document.getElementById('app').innerHTML = render(data);
        } catch (renderErr) {
          console.error("runtrim panel render error", renderErr);
          document.getElementById('app').innerHTML = renderErrorState("The panel could not render local state.");
        }
      }catch(err){
        console.error("runtrim panel state fetch error", err);
        document.getElementById('app').innerHTML = renderErrorState("Try refreshing or run runtrim start.");
      }
    }
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const actionButton = target.closest("[data-action]");
      if (actionButton?.getAttribute("data-action") === "refresh") {
        refreshData();
        return;
      }
      const button = target.closest("[data-command]");
      if (!button) return;
      copyCmd(button, button.getAttribute("data-command") || "");
    });
    window.addEventListener("error", (event) => {
      console.error("runtrim panel boot error", event?.error || event?.message || event);
      const app = document.getElementById('app');
      if (app) app.innerHTML = renderErrorState("A panel script error occurred during startup.");
    });
    refreshData();
    if (monitor && pollMs > 0) setInterval(refreshData, pollMs);
  </script>
</body>
</html>`;
}

async function getPanelState(cwd: string, monitorMode: boolean) {
  const warnings: string[] = [];
  let initialized = false;
  let config = DEFAULT_CONFIG;
  let projectAudit: ReturnType<typeof loadProjectAudit> = null;
  let runs: ReturnType<typeof loadAllRuns> = [];
  let latest: ReturnType<typeof loadLatestRun> = null;
  let registry: ReturnType<typeof loadGlobalRegistry> = {
    version: 2,
    stateVersion: 2,
    plan: "free",
    machineInstallId: "",
    createdAt: "",
    updatedAt: "",
    trackedRepos: [],
    lastKnownRepo: null,
    integrity: { algorithm: "sha256-local-seal-v1", seal: "" },
    telemetry: {
      enabled: false,
      anonymousId: "",
    },
  };
  let memoryRaw: string | null = null;
  let gitChangedFiles: string[] = [];

  try {
    initialized = configExists(cwd);
  } catch {
    warnings.push("config_exists_failed");
  }
  try {
    config = initialized ? loadConfig(cwd) : DEFAULT_CONFIG;
  } catch {
    warnings.push("config_load_failed");
    config = DEFAULT_CONFIG;
  }
  try {
    projectAudit = loadProjectAudit(cwd);
  } catch {
    warnings.push("project_audit_failed");
    projectAudit = null;
  }
  try {
    runs = loadAllRuns(cwd);
  } catch {
    warnings.push("runs_load_failed");
    runs = [];
  }
  try {
    latest = loadLatestRun(cwd);
  } catch {
    warnings.push("latest_run_load_failed");
    latest = null;
  }
  try {
    registry = loadGlobalRegistry();
  } catch {
    warnings.push("global_registry_failed");
    registry = {
      version: 2,
      stateVersion: 2,
      plan: "free",
      machineInstallId: "",
      createdAt: "",
      updatedAt: "",
      trackedRepos: [],
      lastKnownRepo: null,
      integrity: { algorithm: "sha256-local-seal-v1", seal: "" },
      telemetry: {
        enabled: false,
        anonymousId: "",
      },
    };
  }
  try {
    memoryRaw = readMemory(cwd);
  } catch {
    warnings.push("memory_read_failed");
    memoryRaw = null;
  }
  try {
    gitChangedFiles = await getGitDiff(cwd);
  } catch {
    warnings.push("git_diff_failed");
    gitChangedFiles = [];
  }
  const shouldComputeWatch = monitorMode || gitChangedFiles.length > 0;
  let watchState: Record<string, unknown> | null = null;

  if (shouldComputeWatch && latest) {
    try {
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
    } catch {
      warnings.push("watch_evaluation_failed");
    }
  }

  if (!watchState) {
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

  let totalTokens = 0;
  let driftWarnings = 0;
  let verificationDebt = 0;
  try {
    totalTokens = runs.reduce((sum, r) => sum + parseEstimatedNumber(r.contract.estimatedTokensTrimmed), 0);
  } catch {
    warnings.push("token_metrics_failed");
    totalTokens = 0;
  }
  try {
    driftWarnings = runs.filter(
      (r) => r.evaluation?.scopeDriftRisk === "high" || r.evaluation?.scopeDriftRisk === "medium"
    ).length;
  } catch {
    warnings.push("drift_metrics_failed");
    driftWarnings = 0;
  }
  try {
    verificationDebt = runs.reduce(
      (sum, r) => sum + (r.evaluation?.missingProofItems?.length ?? 0),
      0
    );
  } catch {
    warnings.push("verification_metrics_failed");
    verificationDebt = 0;
  }

  return {
    ok: true,
    error: warnings.length > 0 ? "partial_state" : undefined,
    warnings,
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
          lifecycleLabel:
            latest.status === "guarded"
              ? "Guarded"
              : latest.status === "checked"
              ? "Checked"
              : latest.status === "split_required"
              ? "Split required"
              : latest.status === "blocked"
              ? "Blocked"
              : latest.status === "completed"
              ? "Completed"
              : "In progress",
          changedFilesCount: latest.evaluation?.changedFiles?.length ?? latest.watchChangedFiles?.length ?? 0,
          riskLabel: (latest.evaluation?.scopeDriftRisk ?? latest.audit?.wasteRiskBefore ?? "n/a").replace(/_/g, " "),
          nextSafeAction: latest.evaluation?.nextSafeAction ?? "Run runtrim check to evaluate latest run.",
          promptState: latest.contract?.isBlocked
            ? "split required prompt"
            : fs.existsSync(path.join(getConfigDir(cwd), "latest-prompt.md"))
            ? "guarded prompt available"
            : "no continuation prompt yet",
          missingProofCount: latest.evaluation?.missingProofItems?.length ?? 0,
          missingProofLabel:
            latest.evaluation?.missingProofItems?.length
              ? `${latest.evaluation.missingProofItems.length} verification item(s) still missing`
              : "No missing proof recorded",
          proofState:
            latest.evaluation?.missingProofItems?.length && latest.evaluation.missingProofItems.length > 0
              ? "Proof pending"
              : latest.status === "guarded"
              ? "Needs check"
              : "Proof captured",
          heroReason:
            latest.status === "guarded"
              ? "Run runtrim check because the latest run is guarded and not checked yet."
              : latest.evaluation?.missingProofItems?.length
              ? "Run verification before starting new scope."
              : latest.evaluation?.status === "drift_detected"
              ? "Contain drift and review touched files before continuing."
              : "Use next safe action from the latest run summary.",
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
      verificationDebt,
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

    if (pathname === "/favicon.ico") {
      res.statusCode = 204;
      res.setHeader("cache-control", "public, max-age=3600");
      res.end();
      return;
    }

    if (pathname === "/api/state" || pathname === "/api/watch") {
      try {
        const state = await getPanelState(cwd, monitor);
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify(state));
      } catch {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.end(
          JSON.stringify({
            ok: true,
            error: "partial_state",
            warnings: ["state_route_failed"],
            initialized: false,
            projectName: path.basename(cwd),
            repoPath: path.resolve(cwd),
            mode: "local",
            monitor,
            stack: [],
            packageManager: "npm",
            planStatus: "FREE",
            syncEnabled: false,
            syncTokenPresent: false,
            agentMode: "copy",
            latestRun: null,
            recentRuns: [],
            memory: {
              currentState: "",
              protectedAreas: "",
              stillMissing: "",
              nextSafePromptPreview: "",
            },
            protectedAreas: [],
            metrics: {
              latestStatus: "baseline_initialized",
              runsGuarded: 0,
              runsBlocked: 0,
              tokensTrimmed: 0,
              tokensTrimmedLabel: "0",
              driftWarnings: 0,
              verificationDebt: 0,
            },
            watchState: {
              statusRaw: "safe",
              statusLabel: "safe",
              changedFilesCount: 0,
              allowedCount: 0,
              sensitiveCount: 0,
              forbiddenCount: 0,
              changedFiles: [],
              warnings: [],
              nextAction: "Run runtrim start.",
            },
            serverTime: new Date().toISOString(),
          })
        );
      }
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
