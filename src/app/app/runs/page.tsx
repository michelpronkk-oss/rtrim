import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Runs",
  robots: { index: false, follow: false },
};

type RunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  estimated_tokens_trimmed: number | null;
  estimated_tokens_saved: number | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
  project_id: string | null;
  changed_files: string[] | null;
  missing_proof_items: string[] | null;
  raw_report: string | null;
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function toTimeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function runSortTime(run: RunRow): number {
  return (
    toTimeMs(run.evaluated_at_local) ??
    toTimeMs(run.created_at_local) ??
    toTimeMs(run.created_at) ??
    toTimeMs(run.synced_at) ??
    0
  );
}

function relativeTime(run: RunRow): string {
  const ms =
    toTimeMs(run.evaluated_at_local) ??
    toTimeMs(run.created_at_local) ??
    toTimeMs(run.created_at) ??
    toTimeMs(run.synced_at);
  if (!ms) return "-";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d`;
  const wks = Math.floor(days / 7);
  if (wks < 8) return `${wks}w`;
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTokens(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

type Verdict = "passed" | "review" | "blocked" | "live" | "dim";

function getVerdict(status: string | null): Verdict {
  const s = (status ?? "").toLowerCase().trim();
  if (s === "guarded" || s === "passed") return "passed";
  if (s === "partial") return "review";
  if (s === "failed" || s === "blocked" || s === "split") return "blocked";
  if (s === "live" || s === "running" || s === "active") return "live";
  return "dim";
}

const VERDICT_STYLE: Record<Verdict, React.CSSProperties> = {
  passed:  { color: "#6ee7b7", background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.28)" },
  review:  { color: "#f5a524", background: "rgba(245,165,36,0.08)",  border: "1px solid rgba(245,165,36,0.30)" },
  blocked: { color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.28)" },
  live:    { color: "#a78bfa", background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.28)" },
  dim:     { color: "#8a8f98", background: "#16191e",                 border: "1px solid rgba(255,255,255,0.08)" },
};

const LED_COLOR: Record<Verdict, string> = {
  passed:  "#6ee7b7",
  review:  "#f5a524",
  blocked: "#f87171",
  live:    "#a78bfa",
  dim:     "#3a3e46",
};

function VerdictBadge({ verdict, label }: { verdict: Verdict; label?: string }) {
  const text = label ?? (verdict === "dim" ? "—" : verdict);
  return (
    <span style={{
      ...MONO, fontSize: 10.5, padding: "3px 8px", borderRadius: 4,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
      display: "inline-block", whiteSpace: "nowrap" as const,
      ...VERDICT_STYLE[verdict],
    }}>
      {text}
    </span>
  );
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  const allRuns: RunRow[] = [];
  const projectMap: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_runs")
      .select(
        "id, task, status, risk_before, risk_after, estimated_tokens_trimmed, estimated_tokens_saved, created_at_local, evaluated_at_local, created_at, synced_at, project_id, changed_files, missing_proof_items, raw_report"
      )
      .eq("user_id", user.id)
      .limit(100);

    if (data) allRuns.push(...(data as RunRow[]));
    allRuns.sort((a, b) => runSortTime(b) - runSortTime(a));

    const projectIds = [...new Set(allRuns.map((r) => r.project_id).filter(Boolean))] as string[];
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("runtrim_projects")
        .select("id, name")
        .in("id", projectIds);
      if (projects) {
        for (const p of projects as { id: string; name: string | null }[]) {
          if (p.id) projectMap[p.id] = p.name ?? "Unnamed";
        }
      }
    }
  }

  // Stats
  const totalRuns = allRuns.length;
  const passedCount = allRuns.filter((r) => getVerdict(r.status) === "passed").length;
  const reviewCount = allRuns.filter((r) => getVerdict(r.status) === "review").length;
  const blockedCount = allRuns.filter((r) => getVerdict(r.status) === "blocked").length;
  const liveCount = allRuns.filter((r) => getVerdict(r.status) === "live").length;
  const passRate = totalRuns > 0 ? ((passedCount / totalRuns) * 100).toFixed(1) : "0";
  const totalTokens = allRuns.reduce((s, r) => s + (r.estimated_tokens_trimmed ?? r.estimated_tokens_saved ?? 0), 0);

  // Filtered runs
  const activeFilter = (filter ?? "all").toLowerCase();
  const runs = activeFilter === "all" ? allRuns
    : activeFilter === "live" ? allRuns.filter((r) => getVerdict(r.status) === "live")
    : activeFilter === "passed" ? allRuns.filter((r) => getVerdict(r.status) === "passed")
    : activeFilter === "review" ? allRuns.filter((r) => getVerdict(r.status) === "review")
    : activeFilter === "blocked" ? allRuns.filter((r) => getVerdict(r.status) === "blocked")
    : allRuns;

  const filterChips = [
    { key: "all",     label: "All",     count: totalRuns,   color: "#8a8f98" },
    { key: "live",    label: "Live",    count: liveCount,   color: "#a78bfa" },
    { key: "passed",  label: "Passed",  count: passedCount, color: "#6ee7b7" },
    { key: "review",  label: "Review",  count: reviewCount, color: "#f5a524" },
    { key: "blocked", label: "Blocked", count: blockedCount, color: "#f87171" },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-hidden" style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Page head */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.14em", textTransform: "uppercase" }}>runs · workspace · last 30 days</span>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "#f4f5f7" }}>Runs</h1>
        <p style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.6, maxWidth: 560 }}>
          Every guarded run records the task, scope, agent, diff, and finish verdict. Click any row to see the full contract and restore point.
        </p>
      </div>

      {totalRuns === 0 ? (
        /* Empty state */
        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "#0c0e11", padding: "32px 24px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(167,139,250,0.22)", background: "rgba(167,139,250,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12 6 6 0 000-12z" stroke="#a78bfa" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f4f5f7", marginBottom: 6 }}>No guarded runs yet.</h2>
          <p style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.7, maxWidth: 440, marginBottom: 20 }}>
            Start with a task in any project. Finish it, then sync to see the contract, risk score, token savings, and continuation pack here.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360, marginBottom: 20 }}>
            {["runtrim start", "runtrim agent \"fix a small bug\" --copy", "runtrim finish"].map((cmd) => (
              <div key={cmd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", background: "#080a0d" }}>
                <span style={{ ...MONO, fontSize: 10, color: "rgba(167,139,250,0.6)" }}>$</span>
                <code style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", flex: 1 }}>{cmd}</code>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/app/connect" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", fontSize: 13, color: "#a3aebd", textDecoration: "none" }}>
              Connect CLI
            </Link>
            <a href="/app/install" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, color: "#5a5f68", textDecoration: "none" }}>
              View install guide
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Runs · this month", value: String(totalRuns), unit: "total", delta: null },
              { label: "Pass rate · first attempt", value: `${passRate}%`, unit: null, delta: null },
              { label: "Tokens trimmed", value: formatTokens(totalTokens), unit: "vs unguarded", delta: null },
              { label: "Scope violations", value: String(blockedCount), unit: null, delta: `contained ${blockedCount} attempts`, valueColor: blockedCount === 0 ? "#6ee7b7" : "#f87171" },
            ].map((s) => (
              <div key={s.label} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontSize: 26, fontWeight: 500, color: s.valueColor ?? "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 6 }}>
                  {s.value}
                  {s.unit && <span style={{ fontSize: 13, color: "#5a5f68", fontWeight: 400 }}>{s.unit}</span>}
                </span>
                {s.delta && <span style={{ ...MONO, fontSize: 11, color: blockedCount === 0 ? "#6ee7b7" : "#5a5f68", letterSpacing: "0.04em" }}>{s.delta}</span>}
              </div>
            ))}
          </div>

          {/* Section head + filter chips */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f7", margin: 0, marginRight: 4 }}>Recent runs</h2>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{runs.length} results</span>
            <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 4, width: "100%" }} className="sm:w-auto">
              {filterChips.map((chip) => {
                const isActive = activeFilter === chip.key;
                return (
                  <Link
                    key={chip.key}
                    href={chip.key === "all" ? "/app/runs" : `/app/runs?filter=${chip.key}`}
                    style={{
                      ...MONO, fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${isActive ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"}`,
                      background: isActive ? "#16191e" : "transparent",
                      color: isActive ? "#f4f5f7" : "#8a8f98",
                      display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                    }}
                  >
                    {chip.label}
                    {chip.count > 0 && (
                      <span style={{ color: isActive ? chip.color : "#5a5f68" }}>{chip.count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Runs table */}
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, background: "#0c0e11", overflow: "hidden", marginBottom: 24 }}>
            {/* Table header — desktop */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "28px 1.4fr 1.2fr 100px 80px 110px 90px",
              gap: 14, padding: "10px 16px",
              background: "#111317", borderBottom: "1px solid rgba(255,255,255,0.06)",
            }} className="hidden md:grid">
              {["", "Task", "Scope", "Agent", "Files", "Verdict", "When"].map((h, i) => (
                <span key={i} style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", letterSpacing: "0.10em", textTransform: "uppercase", textAlign: i === 6 ? "right" : "left" }}>{h}</span>
              ))}
            </div>

            {runs.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <p style={{ ...MONO, fontSize: 12, color: "#3a3e46" }}>No {activeFilter} runs found.</p>
              </div>
            ) : (
              runs.map((run, i) => {
                const verdict = getVerdict(run.status);
                const ledColor = LED_COLOR[verdict];
                const projectName = run.project_id ? (projectMap[run.project_id] ?? null) : null;
                const filesChanged = run.changed_files?.length ?? 0;
                const when = relativeTime(run);
                const isLast = i === runs.length - 1;

                return (
                  <Link
                    key={run.id}
                    href={`/app/runs/${run.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                    }}
                    className="group hover:bg-white/[0.025] transition-colors"
                  >
                    {/* Mobile card */}
                    <div className="md:hidden" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ledColor, boxShadow: `0 0 6px ${ledColor}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {run.task ?? "Untitled run"}
                        </span>
                        <VerdictBadge verdict={verdict} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 18 }}>
                        {projectName && (
                          <span style={{ ...MONO, fontSize: 10.5, padding: "2px 7px", borderRadius: 4, background: "#16191e", border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98" }}>
                            {projectName}
                          </span>
                        )}
                        <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>
                          {filesChanged} file{filesChanged !== 1 ? "s" : ""}
                        </span>
                        <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{when}</span>
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div
                      className="hidden md:grid"
                      style={{
                        gridTemplateColumns: "28px 1.4fr 1.2fr 100px 80px 110px 90px",
                        gap: 14, padding: "12px 16px", alignItems: "center",
                      }}
                    >
                      {/* LED */}
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ledColor, boxShadow: `0 0 6px ${ledColor}` }} />
                      </span>

                      {/* Task + ID */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                        <span style={{ fontSize: 13, color: "#f4f5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {run.task ?? "Untitled run"}
                        </span>
                        <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.04em" }}>
                          {run.id.slice(0, 8)} · {projectName ?? "no project"}
                        </span>
                      </div>

                      {/* Scope (project as pill) */}
                      <span style={{ overflow: "hidden" }}>
                        {projectName ? (
                          <span style={{ ...MONO, fontSize: 11.5, padding: "2px 7px", borderRadius: 4, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.22)", color: "#c4b5fd", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {projectName}
                          </span>
                        ) : (
                          <span style={{ ...MONO, fontSize: 11.5, color: "#3a3e46" }}>—</span>
                        )}
                      </span>

                      {/* Agent */}
                      <span style={{ ...MONO, fontSize: 11.5, color: "#8a8f98", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 4, background: "#16191e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#f4f5f7", flexShrink: 0 }}>RT</span>
                        runtrim
                      </span>

                      {/* Files */}
                      <span style={{ ...MONO, fontSize: 12, color: "#8a8f98", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: verdict === "blocked" ? "#f87171" : "#8a8f98" }}>{filesChanged}</span>
                      </span>

                      {/* Verdict */}
                      <span><VerdictBadge verdict={verdict} /></span>

                      {/* When */}
                      <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", textAlign: "right" }}>{when}</span>
                    </div>
                  </Link>
                );
              })
            )}

            {/* Pagination footer */}
            {runs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "#111317" }}>
                <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>showing {runs.length} of {totalRuns}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
