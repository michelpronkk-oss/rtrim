import fs from "fs";
import http from "http";
import path from "path";
import { execa } from "execa";
import { loadConfig, getConfigDir } from "./runtrim-config";
import { loadAllRuns, loadLatestRun, type RunRecord } from "./run-storage";
import { loadProjectAudit, getProjectAuditPath } from "./project-audit";
import { getGitDiff } from "./run-evaluation";
import { readProjectState } from "./run-project-state";
import { buildRiskMap, derivePanelState, groupChangedFiles } from "./panel-state";

export interface PanelStartOptions {
  cwd: string;
  port: number;
  openBrowser: boolean;
  once: boolean;
}

interface MemorySummary {
  currentFocus: string;
  protectedAreas: string[];
  stillMissing: string[];
  nextSafeAction: string;
  recentSummary: string[];
}

interface PanelRunSummary {
  id: string;
  task: string;
  status: string;
  decision: string;
  riskBefore: string;
  riskAfter: string;
  createdAt: string;
  changedFilesCount: number;
  nextAction: string;
}

interface PanelData {
  projectName: string;
  stack: string;
  localStatus: string;
  syncStatus: string;
  commandHint: string;
  refreshedAt: string;
  lastUpdated: string;
  latestTask: string;
  latestRunId: string;
  nextRecommendedAction: string;
  intelligence: ReturnType<typeof derivePanelState>;
  changedCount: number;
  sensitiveCount: number;
  forbiddenCount: number;
  watchWarnings: string[];
  metricHints: string[];
  nextSafePromptFull: string;
  continuationPrompt: string;
  latestPreparedPrompt: string;
  latestPromptPath: string;
  hasLatestPromptFile: boolean;
  changedFileGroups: ReturnType<typeof groupChangedFiles>["groups"];
  changedFilesTotal: number;
  memory: MemorySummary;
  recentRuns: PanelRunSummary[];
  riskMap: ReturnType<typeof buildRiskMap>;
  monitorActive: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function short(value: string, max = 120): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 3) + "...";
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("critical") || s.includes("drift") || s.includes("split")) return "critical";
  if (s.includes("warn") || s.includes("partial") || s.includes("needs")) return "warn";
  if (s.includes("clear") || s.includes("passed") || s.includes("ready")) return "clear";
  return "info";
}

function parseMemorySection(memory: string, title: string): string[] {
  const lines = memory.split(/\r?\n/);
  const out: string[] = [];
  let active = false;
  for (const line of lines) {
    if (line.trim() === `${title}:`) {
      active = true;
      continue;
    }
    if (active && /^[A-Z][A-Za-z ]+:$/.test(line.trim())) break;
    if (!active) continue;
    if (!line.trim()) {
      if (out.length > 0) break;
      continue;
    }
    out.push(line.replace(/^- /, "").trim());
  }
  return out;
}

function parseMemorySummary(memoryText: string): MemorySummary {
  return {
    currentFocus: parseMemorySection(memoryText, "Current state")[0] ?? "No memory state yet.",
    protectedAreas: parseMemorySection(memoryText, "Protected areas").slice(0, 8),
    stillMissing: parseMemorySection(memoryText, "Still missing").slice(0, 6),
    nextSafeAction: parseMemorySection(memoryText, "Next safe action")[0] ?? "runtrim start",
    recentSummary: parseMemorySection(memoryText, "Recent run summary").slice(0, 4),
  };
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    guarded: "Guarded",
    partial: "Partial",
    needs_verification: "Needs verification",
    drift_detected: "Drift detected",
    split_required: "Split required",
    blocked: "Split required",
    passed: "Passed",
    checked: "Checked",
    executed: "Executed",
    completed: "Completed",
    no_changes_detected: "Needs verification",
    no_runs_yet: "No runs yet",
  };
  return map[status] ?? status;
}

function formatTime(iso: string): string {
  if (!iso) return "n/a";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNow(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function decisionLabel(run: RunRecord): string {
  if (run.contract.isBlocked || run.status === "split_required" || run.status === "blocked") return "split required";
  const st = (run.evaluation?.status ?? run.status).toLowerCase();
  if (st.includes("drift")) return "drift";
  if (st.includes("partial")) return "partial";
  if (st.includes("passed")) return "passed";
  return "guarded";
}

function buildMetricHints(input: {
  changedCount: number;
  sensitiveCount: number;
  forbiddenCount: number;
  warningCount: number;
  verificationDebt: number;
  tokensTrimmed: number;
  contractScore: number | null;
  riskBefore: string;
  riskAfter: string;
}): string[] {
  return [
    `${input.changedCount} changed files. ${input.changedCount > 0 ? "Check before new edits." : "No local edit pressure."}`,
    `${input.sensitiveCount} sensitive files touched. ${input.sensitiveCount > 0 ? "Use verification-first mode." : "Sensitive scope is stable."}`,
    `${input.forbiddenCount} forbidden files touched. ${input.forbiddenCount > 0 ? "Contain now." : "No forbidden scope signal."}`,
    `${input.warningCount} watch warnings. ${input.warningCount > 0 ? "Do not continue blindly." : "Monitor signals are calm."}`,
    `${input.verificationDebt} proof gaps. ${input.verificationDebt > 0 ? "Collect evidence next." : "Verification debt is low."}`,
    `~${input.tokensTrimmed.toLocaleString("en-US")} tokens trimmed estimated.`,
    `Contract score ${input.contractScore ?? "n/a"}.`,
    `Risk moved ${input.riskBefore} -> ${input.riskAfter}.`,
  ];
}

async function collectPanelData(cwd: string): Promise<PanelData> {
  const configDir = getConfigDir(cwd);
  const config = loadConfig(cwd);
  const audit = loadProjectAudit(cwd);
  const runs = loadAllRuns(cwd);
  const latestRun = loadLatestRun(cwd);
  const projectState = readProjectState(cwd);
  const changedFiles = projectState?.changedFiles ?? (await getGitDiff(cwd));

  const memoryPath = path.join(configDir, "memory.md");
  const memoryText = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf-8") : "";
  const memory = parseMemorySummary(memoryText);

  const latestPromptPath = path.isAbsolute(config.lastPromptPath)
    ? config.lastPromptPath
    : path.join(cwd, config.lastPromptPath || ".runtrim/latest-prompt.md");
  const latestPreparedPrompt = fs.existsSync(latestPromptPath)
    ? fs.readFileSync(latestPromptPath, "utf-8").trim()
    : "";
  const continuationPath = path.join(configDir, "continuation-prompt.md");
  const continuationPrompt = fs.existsSync(continuationPath)
    ? fs.readFileSync(continuationPath, "utf-8").trim()
    : "";

  const intelligence = derivePanelState({
    cwd,
    latestRun,
    projectState,
    changedFiles,
    continuationPrompt,
    latestPrompt: latestPreparedPrompt,
  });
  const changedGrouped = groupChangedFiles(changedFiles, 10);
  const latestStatusRaw = (latestRun?.evaluation?.status ?? latestRun?.status ?? "no_runs_yet").toLowerCase();
  const statusLabel = getStatusLabel(latestStatusRaw);

  const recentRuns: PanelRunSummary[] = runs.slice(0, 8).map((run) => {
    const evalStatus = (run.evaluation?.status ?? run.status).toLowerCase();
    return {
      id: run.id,
      task: run.task,
      status: getStatusLabel(evalStatus),
      decision: decisionLabel(run),
      riskBefore: run.audit.wasteRiskBefore,
      riskAfter: run.contract.wasteRiskAfter,
      createdAt: formatTime(run.createdAt),
      changedFilesCount: run.evaluation?.changedFiles?.length ?? run.watchChangedFiles?.length ?? 0,
      nextAction: run.evaluation?.nextSafeAction ?? "runtrim check",
    };
  });

  const riskMap = buildRiskMap(config, projectState);
  const monitorUpdated = projectState?.updatedAt ? new Date(projectState.updatedAt).getTime() : 0;
  const monitorActive = Boolean(monitorUpdated && Date.now() - monitorUpdated < 15_000);
  const tokensTrimmed = runs.reduce((sum, r) => {
    const n = Number.parseInt(String(r.contract.estimatedTokensTrimmed).replace(/[^\d]/g, ""), 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const contractScore = latestRun?.evaluation?.contractScore ?? null;
  const riskBefore = latestRun?.audit?.wasteRiskBefore ?? "unknown";
  const riskAfter = latestRun?.contract?.wasteRiskAfter ?? "unknown";
  const sensitiveCount = projectState?.sensitiveTouched?.length ?? 0;
  const forbiddenCount = projectState?.forbiddenTouched?.length ?? 0;
  const warningCount = (projectState?.watchWarnings ?? latestRun?.watchWarnings ?? []).length;
  const verificationDebt = intelligence.verificationDebt;
  const metricHints = buildMetricHints({
    changedCount: changedGrouped.total,
    sensitiveCount,
    forbiddenCount,
    warningCount,
    verificationDebt,
    tokensTrimmed,
    contractScore,
    riskBefore,
    riskAfter,
  });

  return {
    projectName: audit?.projectName ?? path.basename(cwd),
    stack: audit?.detectedStack?.join(", ") || config.stack || "auto",
    localStatus: statusLabel,
    syncStatus: config.syncEnabled ? "Configured" : "Local only",
    commandHint: "runtrim start",
    refreshedAt: formatNow(),
    lastUpdated: formatTime(projectState?.updatedAt ?? latestRun?.createdAt ?? ""),
    latestTask: latestRun?.task ?? "No guarded task yet.",
    latestRunId: latestRun?.id ?? "n/a",
    nextRecommendedAction: intelligence.nextCommand,
    intelligence,
    changedCount: changedGrouped.total,
    sensitiveCount,
    forbiddenCount,
    watchWarnings: projectState?.watchWarnings ?? latestRun?.watchWarnings ?? [],
    metricHints,
    nextSafePromptFull:
      projectState?.nextSafePrompt ??
      latestRun?.evaluation?.nextPrompt ??
      latestRun?.evaluation?.nextSafePrompt ??
      latestRun?.evaluation?.nextGuardedPrompt ??
      "",
    continuationPrompt,
    latestPreparedPrompt,
    latestPromptPath,
    hasLatestPromptFile: fs.existsSync(latestPromptPath),
    changedFileGroups: changedGrouped.groups,
    changedFilesTotal: changedGrouped.total,
    memory,
    recentRuns,
    riskMap,
    monitorActive,
  };
}

function renderBadge(label: string, status: string): string {
  return `<span class="chip ${statusClass(status)}">${escapeHtml(label)}</span>`;
}

function renderPanelHtml(data: PanelData): string {
  const riskMapHtml = data.riskMap
    .map((item) => `<div class="risk-item"><div>${escapeHtml(item.key)}</div>${renderBadge(item.status, item.status)}<div class="muted">${escapeHtml(item.detail)}</div></div>`)
    .join("");

  const changedGroupsHtml = data.changedFileGroups.length
    ? data.changedFileGroups
        .map(
          (g) => `<div class="file-group"><div class="group">${escapeHtml(g.group)}</div><ul>${g.files
            .map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
            .join("")}</ul></div>`
        )
        .join("")
    : `<div class="muted">No local changes detected.</div>`;

  const timelineHtml = data.recentRuns.length
    ? data.recentRuns
        .map(
          (r) => `<div class="timeline-row">
            <div class="t-time">${escapeHtml(r.createdAt)}</div>
            <div class="t-body">
              <div class="t-main">${renderBadge(r.status, r.status)} ${renderBadge(r.decision, r.decision)} <span class="mono">${escapeHtml(short(r.task, 72))}</span></div>
              <div class="muted">Risk ${escapeHtml(r.riskBefore)} -> ${escapeHtml(r.riskAfter)} | Changed ${r.changedFilesCount} | Next ${escapeHtml(short(r.nextAction, 60))}</div>
            </div>
          </div>`
        )
        .join("")
    : `<div class="muted">No runs yet. Start with <code>runtrim prepare "your task"</code>.</div>`;

  const warningHtml = data.watchWarnings.length
    ? `<ul>${data.watchWarnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`
    : `<div class="muted">No active watch warnings.</div>`;

  const changedHint =
    data.changedFilesTotal > 10
      ? `Showing first 10 of ${data.changedFilesTotal}. Run runtrim check for full verification.`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RunTrim Local Panel</title>
  <style>
    :root { color-scheme: dark; --bg:#0f151b; --bg2:#131c23; --card:#18232d; --line:#273743; --text:#e4edf4; --muted:#95a8b7; --mint:#8fd8c6; --steel:#8ca8c2; --amber:#e5b86f; --coral:#e98479; }
    * { box-sizing:border-box; font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    body { margin:0; background:linear-gradient(180deg,var(--bg),var(--bg2)); color:var(--text); }
    .wrap { max-width:1250px; margin:18px auto; padding:0 14px 36px; }
    .bar,.card { border:1px solid var(--line); background:rgba(24,35,45,.95); border-radius:12px; }
    .bar { padding:14px 16px; margin-bottom:12px; }
    .card { padding:14px; }
    .grid { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:12px; }
    .c8{grid-column:span 8}.c4{grid-column:span 4}.c6{grid-column:span 6}.c12{grid-column:span 12}
    @media (max-width:1080px){.c8,.c4,.c6{grid-column:span 12}}
    .top { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start; }
    h1 { margin:0; font-size:20px; letter-spacing:.2px; }
    h2 { margin:0 0 9px; font-size:14px; letter-spacing:.15px; color:#cfdae3; }
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .meta { display:grid; grid-template-columns:150px 1fr; gap:5px 10px; margin-top:10px; font-size:12px; }
    .meta b { color:#a7bac8; font-weight:600; }
    .muted { color:var(--muted); font-size:12px; }
    .chip { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; padding:3px 9px; font-size:11px; margin:0 6px 6px 0; }
    .chip.clear { color:var(--mint); border-color:#37695d; }
    .chip.info { color:var(--steel); border-color:#395673; }
    .chip.warn { color:var(--amber); border-color:#6a5637; }
    .chip.critical { color:var(--coral); border-color:#6d3d38; }
    .head-actions{display:flex; gap:8px; align-items:center;}
    .btn{background:#1f2d39;border:1px solid #32495d;color:#d7e2ea;border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer}
    .btn:hover{border-color:#496885}
    .prompt{white-space:pre-wrap; background:#111a22; border:1px solid #243442; border-radius:8px; padding:10px; font-size:12px; color:#cfdbe5;}
    .metrics{display:grid;grid-template-columns:1fr;gap:7px}
    .metric{padding:7px;border:1px solid #243542;border-radius:8px;background:#141f28}
    .risk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    @media (max-width:980px){.risk-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    .risk-item{border:1px solid #243542;border-radius:8px;padding:8px;background:#141f28}
    .file-group{border:1px solid #243542;border-radius:8px;padding:8px;background:#141f28;margin-bottom:8px}
    .group{font-size:11px;color:#a9bccb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    ul{margin:6px 0 0 18px;padding:0} li{margin:4px 0;font-size:12px;color:#d0dbe5}
    .timeline-row{display:grid;grid-template-columns:130px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid #243542}
    .timeline-row:last-child{border-bottom:none}
    .t-time{font-size:11px;color:#9eb1c0}
    .footer{font-size:12px;color:#97abbb}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="bar">
      <div class="top">
        <div>
          <h1>RunTrim Local Panel</h1>
          <div class="muted">Local panel. No code is uploaded.</div>
        </div>
        <div class="head-actions">
          <button class="btn" onclick="manualRefresh()">Refresh</button>
          ${renderBadge(data.localStatus, data.intelligence.severity)}
          ${renderBadge(data.monitorActive ? "Monitor active" : "Monitor inactive", data.monitorActive ? "clear" : "warn")}
        </div>
      </div>
      <div class="meta">
        <b>Project</b><div class="mono">${escapeHtml(data.projectName)}</div>
        <b>Stack</b><div class="mono">${escapeHtml(data.stack)}</div>
        <b>Last updated</b><div class="mono">${escapeHtml(data.lastUpdated)}</div>
        <b>Refreshed</b><div class="mono"><span id="refresh-time">${escapeHtml(data.refreshedAt)}</span></div>
        <b>Sync</b><div class="mono">${escapeHtml(data.syncStatus)}</div>
        <b>Next recommended</b><div class="mono">${escapeHtml(data.nextRecommendedAction)}</div>
        <b>Hint</b><div class="mono">${escapeHtml(data.commandHint)}</div>
        <b>Run id</b><div class="mono">${escapeHtml(data.latestRunId)}</div>
      </div>
    </section>

    <div class="grid">
      <section class="card c8">
        <h2>Continue Where You Left Off</h2>
        <div class="meta">
          <b>Latest task</b><div class="mono">${escapeHtml(data.latestTask)}</div>
          <b>State</b><div>${escapeHtml(data.intelligence.statusLabel)}</div>
          <b>Current summary</b><div>${escapeHtml(data.intelligence.nextAction)}</div>
          <b>Next command</b><div class="mono">${escapeHtml(data.intelligence.nextCommand)}</div>
          <b>Reason</b><div>${escapeHtml(data.intelligence.nextReason)}</div>
          <b>Risk summary</b><div>${escapeHtml(data.intelligence.riskSummary)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;">
          <button class="btn" onclick='copyText(panel.nextSafePromptFull || panel.intelligence.promptPreview)'>Copy next prompt</button>
          <button class="btn" onclick='copyText(panel.continuationPrompt || "No continuation prompt available.")'>Copy continuation prompt</button>
          <button class="btn" onclick='copyText(panel.latestPreparedPrompt || "No latest prepared prompt available.")'>Copy latest prepared prompt</button>
        </div>
        <div class="prompt mono">${escapeHtml(data.intelligence.promptPreview)}</div>
        ${data.hasLatestPromptFile ? `<div class="muted" style="margin-top:8px">Latest prompt path: <span class="mono">${escapeHtml(data.latestPromptPath)}</span></div>` : `<div class="muted" style="margin-top:8px">No latest prompt file detected. Run <span class="mono">runtrim prepare "your task"</span>.</div>`}
      </section>

      <section class="card c4">
        <h2>Run Health</h2>
        <div class="metrics">
          ${data.metricHints.map((m) => `<div class="metric">${escapeHtml(m)}</div>`).join("")}
        </div>
      </section>

      <section class="card c6">
        <h2>Risk Map</h2>
        <div class="risk-grid">${riskMapHtml}</div>
      </section>

      <section class="card c6">
        <h2>Changed Files</h2>
        ${changedGroupsHtml}
        ${changedHint ? `<div class="muted">${escapeHtml(changedHint)}</div>` : ""}
        <div class="muted" style="margin-top:8px;">Paths only. No file contents are read.</div>
      </section>

      <section class="card c6">
        <h2>Recent Run Timeline</h2>
        ${timelineHtml}
      </section>

      <section class="card c6">
        <h2>Project Memory</h2>
        <div class="meta">
          <b>Current focus</b><div>${escapeHtml(data.memory.currentFocus)}</div>
          <b>Still missing</b><div>${escapeHtml(data.memory.stillMissing.join(", ") || "none")}</div>
          <b>Next safe action</b><div>${escapeHtml(data.memory.nextSafeAction)}</div>
          <b>Memory path</b><div class="mono">.runtrim/memory.md</div>
        </div>
        <div class="muted" style="margin-top:8px">Protected areas</div>
        <div style="margin-top:6px">${data.memory.protectedAreas.map((a) => renderBadge(a, "info")).join("") || renderBadge("none", "info")}</div>
        ${warningHtml}
      </section>

      <section class="card c12">
        <h2>Command Guide</h2>
        <div class="prompt mono">Prepare: runtrim prepare "your task"
Monitor: runtrim panel --monitor
Check: runtrim check
Recover: runtrim continue --reason usage_limit
Memory: runtrim memory</div>
      </section>
    </div>

    <footer class="bar footer" style="margin-top:12px">
      Local panel reads .runtrim metadata and git file paths only. Source code stays local.
    </footer>
  </div>
<script>
  const panel = ${JSON.stringify(data)};
  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value || "");
    } catch {
      window.prompt("Copy this text:", value || "");
    }
  }
  function manualRefresh() {
    window.location.reload();
  }
  setInterval(() => {
    const el = document.getElementById("refresh-time");
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString();
    }
    window.location.reload();
  }, 4000);
</script>
</body>
</html>`;
}

async function openUrl(url: string): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await execa("cmd", ["/c", "start", "", url], { windowsHide: true });
      return true;
    }
    if (process.platform === "darwin") {
      await execa("open", [url]);
      return true;
    }
    await execa("xdg-open", [url]);
    return true;
  } catch {
    return false;
  }
}

export async function startRunTrimPanel(options: PanelStartOptions): Promise<{
  url: string;
  opened: boolean;
  mode: "server" | "once";
  state: string;
  next: string;
}> {
  const { cwd, port, openBrowser, once } = options;
  const configDir = getConfigDir(cwd);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  const initial = await collectPanelData(cwd);

  if (once) {
    const html = renderPanelHtml(initial);
    const htmlPath = path.join(configDir, "panel.html");
    const dataPath = path.join(configDir, "panel-data.json");
    fs.writeFileSync(htmlPath, html, "utf-8");
    fs.writeFileSync(dataPath, JSON.stringify(initial, null, 2), "utf-8");
    const url = `file:///${htmlPath.replace(/\\/g, "/")}`;
    const opened = openBrowser ? await openUrl(url) : false;
    return { url, opened, mode: "once", state: initial.intelligence.statusLabel, next: initial.intelligence.nextCommand };
  }

  const server = http.createServer((req, res) => {
    void (async () => {
      if (!req.url || req.url === "/" || req.url.startsWith("/?")) {
        const data = await collectPanelData(cwd);
        const html = renderPanelHtml(data);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(html);
        return;
      }
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    })().catch(() => {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Panel render error");
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const url = `http://localhost:${port}`;
  const opened = openBrowser ? await openUrl(url) : false;
  return { url, opened, mode: "server", state: initial.intelligence.statusLabel, next: initial.intelligence.nextCommand };
}

export function panelReadPaths(cwd: string): string[] {
  return [
    path.join(cwd, ".runtrim/config.json"),
    getProjectAuditPath(cwd),
    path.join(cwd, ".runtrim/rules.md"),
    path.join(cwd, ".runtrim/memory.md"),
    path.join(cwd, ".runtrim/latest-prompt.md"),
    path.join(cwd, ".runtrim/continuation-prompt.md"),
    path.join(cwd, ".runtrim/project-state.json"),
    path.join(cwd, ".runtrim/internal/runs/*.json"),
    path.join(cwd, ".runtrim/runs/*.json"),
    "git diff file paths",
  ];
}
