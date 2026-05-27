import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Agent Autopilot",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
  current_period_end: string | null;
};

type RunRow = {
  task: string | null;
  risk_after: string | null;
  risk_before: string | null;
  missing_proof_items: string[] | null;
  estimated_tokens_trimmed: number | null;
  estimated_tokens_saved: number | null;
  estimated_dollars_standard: number | null;
  estimated_cost_saved: number | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
};

type ProjectRow = {
  id: string;
  name: string | null;
};

function toTimeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function runSortTime(run: RunRow): number {
  return (
    toTimeMs(run.evaluated_at_local) ||
    toTimeMs(run.created_at_local) ||
    toTimeMs(run.created_at) ||
    toTimeMs(run.synced_at)
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "P";
  const parts = name.trim().split(/[-_\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const PANEL_AGENTS = [
  { glyph: "CC", name: "Claude Code", sub: "anthropic claude-sonnet", mode: "mcp" as const, on: true },
  { glyph: "Cu", name: "Cursor", sub: "editor agent", mode: "mcp" as const, on: true },
  { glyph: "Cx", name: "Codex", sub: "openai codex", mode: "copy" as const, on: true },
  { glyph: "G", name: "ChatGPT", sub: "openai gpt-4o", mode: "copy" as const, on: false },
];

const FINISH_CHECKS = [
  { label: "no forbidden writes", note: "auto · always on" },
  { label: "scope held", note: "block if run crosses scope boundary" },
  { label: "tests pass", note: "runs npm test when available" },
  { label: "diff < 400 lines", note: "soft cap · review if exceeded" },
];

export default async function ProjectAgentPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();

  let profile: ProfileRow | null = null;
  let runs: RunRow[] = [];
  let topProject: ProjectRow | null = null;

  if (supabase) {
    const [profileResult, runResult, projectResult] = await Promise.all([
      supabase
        .from("runtrim_profiles")
        .select("plan, plan_status, current_period_end")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("runtrim_runs")
        .select("task, risk_after, risk_before, missing_proof_items, estimated_tokens_trimmed, estimated_tokens_saved, estimated_dollars_standard, estimated_cost_saved, created_at_local, evaluated_at_local, created_at, synced_at")
        .eq("user_id", user.id)
        .limit(25),
      supabase
        .from("runtrim_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    profile = (profileResult.data as ProfileRow | null) ?? null;
    runs = (runResult.data as RunRow[] | null) ?? [];
    topProject = (projectResult.data as ProjectRow | null) ?? null;
  }

  runs.sort((a, b) => runSortTime(b) - runSortTime(a));

  const rawPlan = profile?.plan ?? "free";
  const planStatus = profile?.plan_status ?? null;
  const periodEnd = profile?.current_period_end ?? null;
  const effectivePlan = effectivePlanId(rawPlan, planStatus, periodEnd);
  const canUseAgent = effectivePlan !== "free";


  const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

  const projectName = topProject?.name ?? null;
  const projectInitials = getInitials(projectName);

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    background: "#0c0e11",
    overflow: "hidden",
    marginBottom: 16,
  };
  const panelHeadStyle: React.CSSProperties = {
    padding: "13px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  };

  return (
    <div style={{ maxWidth: "92rem", margin: "0 auto" }}>

      {/* Page head */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.14em", textTransform: "uppercase" }}>agent autopilot</span>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "#f4f5f7" }}>Project Agent</h1>
        <p style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
          Configure how RunTrim wraps your coding agent inside this project. Scope, forbidden paths, finish checks, memory, and runtime — all on disk under{" "}
          <code style={{ ...MONO, color: "#a78bfa", fontSize: 12 }}>.runtrim/agent.toml</code>.
        </p>
      </div>

      {/* Project selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "#0c0e11", marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg, #1a1f2a, #11141a)", border: "1px solid rgba(255,255,255,0.10)", display: "grid", placeItems: "center", color: "#a78bfa", ...MONO, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {projectInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {projectName ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projectName}
              </div>
              <div style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginTop: 2, letterSpacing: "0.02em" }}>
                configuring agent for this project · {runs.length} runs
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7" }}>No project connected</div>
              <div style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginTop: 2 }}>
                run <span style={{ color: "#a78bfa" }}>runtrim start</span> in a project directory to connect it
              </div>
            </>
          )}
        </div>
        {canUseAgent && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, ...MONO, fontSize: 10.5, color: "#6ee7b7", padding: "2px 8px", borderRadius: 4, background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.25)", whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7", flexShrink: 0 }} />
            live
          </span>
        )}
      </div>

      {/* Config panels */}
      <div>

        {/* LEFT: Config panels */}
        <div>

          {/* Allowed scope */}
          <div style={panelStyle}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#6ee7b7", background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.25)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>Allowed scope</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>glob patterns</span>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  not configured
                </span>
              </div>
            </div>
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 12.5, color: "#5a5f68", margin: 0 }}>No scope rules set yet.</p>
              <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginTop: 6 }}>
                Add allowed paths in{" "}
                <span style={{ color: "#a78bfa" }}>.runtrim/agent.toml</span>
              </p>
            </div>
          </div>

          {/* Forbidden paths */}
          <div style={panelStyle}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.28)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 10l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Forbidden paths</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>auto-block writes</span>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ ...MONO, fontSize: 10, color: "#f87171", padding: "2px 8px", borderRadius: 4, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f87171", flexShrink: 0 }} />
                  enforced
                </span>
              </div>
            </div>
            <div>
              {[
                { path: ".env*", note: "no read · no write" },
                { path: "migrations/**", note: "no write" },
              ].map((r) => (
                <div key={r.path} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "9px 16px", borderBottom: "1px dashed rgba(255,255,255,0.04)" }}>
                  <span style={{ ...MONO, fontSize: 12.5, color: "#f87171", letterSpacing: "-0.005em" }}>{r.path}</span>
                  <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.04em" }}>{r.note}</span>
                </div>
              ))}
              <div style={{ padding: "10px 16px" }}>
                <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: 0 }}>
                  Add more forbidden paths in{" "}
                  <span style={{ color: "#a78bfa" }}>.runtrim/agent.toml</span>
                </p>
              </div>
            </div>
          </div>

          {/* Finish check */}
          <div style={panelStyle}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#6ee7b7", background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.25)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M4 6.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Finish check</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>verdict gate</span>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ ...MONO, fontSize: 10, color: "#6ee7b7", padding: "2px 8px", borderRadius: 4, background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.25)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", flexShrink: 0 }} />
                  {FINISH_CHECKS.length} / {FINISH_CHECKS.length}
                </span>
              </div>
            </div>
            <div>
              {FINISH_CHECKS.map((r, i) => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "9px 16px", borderBottom: i < FINISH_CHECKS.length - 1 ? "1px dashed rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ ...MONO, fontSize: 12.5, color: "#f4f5f7", letterSpacing: "-0.005em" }}>{r.label}</span>
                  <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.04em" }}>{r.note}</span>
                  <span style={{ ...MONO, fontSize: 10.5, color: "#6ee7b7", padding: "2px 7px", borderRadius: 3, background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.25)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>on</span>
                </div>
              ))}
            </div>
          </div>

          {/* Memory */}
          <div style={panelStyle}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#a78bfa", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.28)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4h7M3 7h7M3 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Memory</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>carried across runs</span>
              <div style={{ marginLeft: "auto" }}>
                {runs.length > 0 ? (
                  <span style={{ ...MONO, fontSize: 10, color: "#a78bfa", padding: "2px 8px", borderRadius: 4, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa", flexShrink: 0 }} />
                    {runs.length} runs
                  </span>
                ) : (
                  <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    no runs yet
                  </span>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "9px 16px", borderBottom: "1px dashed rgba(255,255,255,0.04)" }}>
                <span style={{ ...MONO, fontSize: 12.5, color: "#f4f5f7" }}>runs/last-3</span>
                <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>most recent 3 finished runs</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "9px 16px", borderBottom: "1px dashed rgba(255,255,255,0.04)" }}>
                <span style={{ ...MONO, fontSize: 12.5, color: "#f4f5f7" }}>repo.map</span>
                <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>trimmed file tree + key exports</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "9px 16px" }}>
                <span style={{ ...MONO, fontSize: 12.5, color: "#f4f5f7" }}>conventions.md</span>
                <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>your project&apos;s coding rules</span>
              </div>
            </div>
          </div>

          {/* Token budget */}
          <div style={panelStyle}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#f5a524", background: "rgba(245,165,36,0.08)", border: "1px solid rgba(245,165,36,0.25)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M2 5h9M2 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Token budget</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>per run · soft caps</span>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Context budget", cap: "100k", pct: 38, color: "violet" },
                { label: "Output budget", cap: "20k", pct: 0, color: "amber" },
                { label: "Tool calls", cap: "50", pct: 0, color: "mint" },
              ].map((b) => (
                <div key={b.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, ...MONO, fontSize: 11, color: "#8a8f98", letterSpacing: "0.04em" }}>
                    <span>{b.label}</span>
                    <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>{b.cap}</strong>
                    <span style={{ marginLeft: "auto", color: "#5a5f68" }}>— / {b.cap}</span>
                  </div>
                  <div style={{ height: 6, background: "#16191e", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <i style={{ display: "block", height: "100%", borderRadius: 3, width: `${b.pct}%`, background: b.color === "violet" ? "linear-gradient(90deg, #5b50e0, #a78bfa)" : b.color === "amber" ? "linear-gradient(90deg, #f5a524, #ffba49)" : "linear-gradient(90deg, #34c98a, #6ee7b7)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connected agents */}
          <div style={{ ...panelStyle, marginBottom: 0 }}>
            <div style={panelHeadStyle}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", color: "#8a8f98", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="9" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="M1 11c0-1.5 1.3-2.5 3-2.5M6 11c0-1.5 1.3-2.5 3-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Connected agents</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>
                {PANEL_AGENTS.filter(a => a.on).length} enabled · 1 default
              </span>
            </div>
            <div>
              {PANEL_AGENTS.map((a, i) => (
                <div key={a.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto auto", gap: 12, alignItems: "center", padding: "11px 16px", borderBottom: i < PANEL_AGENTS.length - 1 ? "1px dashed rgba(255,255,255,0.04)" : "none", opacity: a.on ? 1 : 0.5 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: "#16191e", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", ...MONO, fontSize: 11, fontWeight: 600, color: "#f4f5f7" }}>
                    {a.glyph}
                  </span>
                  <span style={{ fontSize: 13, color: "#f4f5f7", display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                    {a.name}
                    <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>· {a.sub}</span>
                  </span>
                  <span style={{ ...MONO, fontSize: 10.5, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.06em", textTransform: "uppercase" as const, ...(a.mode === "mcp" ? { color: "#a78bfa", background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.25)" } : { color: "#6ee7b7", background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.25)" }) }}>
                    {a.mode}
                  </span>
                  <div style={{ width: 32, height: 18, borderRadius: 999, position: "relative", ...(a.on ? { background: "rgba(167,139,250,0.20)", border: "1px solid rgba(167,139,250,0.40)" } : { background: "#16191e", border: "1px solid rgba(255,255,255,0.10)" }) }}>
                    <span style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", top: 2, left: a.on ? 16 : 2, background: a.on ? "#a78bfa" : "#5a5f68", transition: "left 0.15s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>


      </div>
    </div>
  );
}
