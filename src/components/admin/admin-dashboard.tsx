"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, LogOut, Users, MousePointerClick, Terminal, Zap, Star, Clock, Globe } from "lucide-react";

type MetricsResponse = {
  ok: boolean;
  summary?: Record<string, number>;
  daily?: Array<Record<string, string | number>>;
  funnel?: Array<{ step: string; count: number }>;
  topPages?: Array<{ pagePath: string; views: number; uniqueUsers: number }>;
  cliEvents?: Array<{ eventName: string; count: number; lastSeen: string }>;
  earlyAccess?: Array<{
    email: string | null;
    role: string | null;
    agent: string | null;
    use_case: string | null;
    status: string | null;
    created_at: string;
  }>;
  earlyAccessTableFound?: boolean;
  recentEvents?: Array<{ eventName: string; source: string; pagePath: string; createdAt: string }>;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const styles: Record<string, string> = {
    approved: "bg-[#0D3D2A] text-[#4DE8B0] border-[#4DE8B0]/20",
    waitlisted: "bg-[#2A2010] text-[#F0BF72] border-[#F0BF72]/20",
    rejected: "bg-[#3D0D0D] text-[#FF6B6B] border-[#FF6B6B]/20",
    pending: "bg-[#1A1A30] text-[#8E95C3] border-[#8E95C3]/20",
  };
  const cls = styles[s] ?? styles.pending;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] ${cls}`}>
      {s}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isCli = source === "cli";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] ${isCli ? "border-[#7C6DFA]/20 bg-[#7C6DFA]/10 text-[#9E91FF]" : "border-white/10 bg-white/4 text-[#6870A0]"}`}>
      {isCli ? "CLI" : "web"}
    </span>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  accent?: string;
};

function StatCard({ label, value, accent = "#7C6DFA" }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-[#0C0D22] p-4">
      <div
        className="absolute left-0 top-0 h-full w-0.5 rounded-l-xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] leading-snug text-[#6870A0]">{label}</p>
      <p className="mt-2 text-[28px] font-bold tabular-nums tracking-tight text-[#EDEEFF]">{value.toLocaleString()}</p>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold text-[#EDEEFF]">{title}</h2>
      {sub && <p className="mt-0.5 text-[11px] text-[#4D5070]">{sub}</p>}
    </div>
  );
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-6 text-center text-[12px] text-[#4D5070]">{msg}</td>
    </tr>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    const res = await fetch("/api/admin/metrics", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as MetricsResponse & { error?: string };
    if (!res.ok || !body.ok) {
      setError(body.error || "Could not load metrics.");
    } else {
      setData(body);
      setLastFetched(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary ?? {};
  const daily = data?.daily ?? [];
  const funnel = data?.funnel ?? [];
  const topPages = data?.topPages ?? [];
  const cliEvents = data?.cliEvents ?? [];
  const earlyAccess = data?.earlyAccess ?? [];
  const recent = data?.recentEvents ?? [];
  const funnelMax = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#07071A]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-[16px] font-bold tracking-tight">RunTrim Admin</h1>
            {lastFetched && (
              <p className="font-mono text-[10px] text-[#3A3D5A]">
                updated {relTime(lastFetched.toISOString())}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-[#7380A3] transition-colors hover:border-white/20 hover:text-[#EDEEFF] disabled:opacity-40"
            >
              <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-[#7380A3] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              <LogOut className="size-3" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-white/6 bg-[#0C0D22]" />
              ))}
            </div>
            <div className="h-40 animate-pulse rounded-xl border border-white/6 bg-[#0C0D22]" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/5 p-4 text-[13px] text-[#FF6B6B]">
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">

            {/* ── Traffic stats ─────────────────────────────── */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Globe className="size-3.5 text-[#5B8BFF]" />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Traffic</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <StatCard label="Unique visitors 24h" value={summary.uniqueVisitors24h ?? 0} accent="#5B8BFF" />
                <StatCard label="Unique visitors 7d" value={summary.uniqueVisitors7d ?? 0} accent="#5B8BFF" />
                <StatCard label="Page views 7d" value={summary.pageViews7d ?? 0} accent="#5B8BFF" />
              </div>
            </section>

            {/* ── Conversion stats ──────────────────────────── */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <MousePointerClick className="size-3.5 text-[#4DE8B0]" />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Conversions</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2">
                <StatCard label="Install copies 7d" value={summary.installCopies7d ?? 0} accent="#4DE8B0" />
                <StatCard label="Early access requests 7d" value={summary.earlyAccessRequests7d ?? 0} accent="#F0BF72" />
              </div>
            </section>

            {/* ── CLI stats ─────────────────────────────────── */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Terminal className="size-3.5 text-[#7C6DFA]" />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">CLI activity (7d)</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <StatCard label="Starts" value={summary.cliStarts7d ?? 0} accent="#7C6DFA" />
                <StatCard label="Prepares" value={summary.cliPrepares7d ?? 0} accent="#7C6DFA" />
                <StatCard label="Checks" value={summary.cliChecks7d ?? 0} accent="#7C6DFA" />
                <StatCard label="Synced projects 30d" value={summary.syncedProjects30d ?? 0} accent="#9966FF" />
              </div>
            </section>

            {/* ── Funnel + Top pages ────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Funnel with visual bars */}
              <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
                <SectionHeader title="Conversion funnel" sub="Step-by-step drop-off" />
                {funnel.length === 0 ? (
                  <p className="text-[12px] text-[#4D5070]">No funnel data yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {funnel.map((f, i) => (
                      <div key={f.step}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] text-[#8E95C3]">{f.step}</span>
                          <span className="font-mono text-[12px] font-semibold text-[#EDEEFF]">{f.count.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round((f.count / funnelMax) * 100)}%`,
                              background: i === 0 ? "#5B8BFF" : i === 1 ? "#7C6DFA" : i === 2 ? "#4DE8B0" : "#F0BF72",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Top pages */}
              <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
                <SectionHeader title="Top pages" sub="Last 7 days" />
                {topPages.length === 0 ? (
                  <p className="text-[12px] text-[#4D5070]">No page data yet.</p>
                ) : (
                  <div className="space-y-1">
                    {topPages.map((p, i) => (
                      <div key={p.pagePath} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
                        <span className="w-4 shrink-0 font-mono text-[10px] text-[#3A3D5A]">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">
                          {p.pagePath || "/"}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[#EDEEFF]">{p.views.toLocaleString()}</span>
                        <span className="w-16 shrink-0 text-right font-mono text-[10px] text-[#4D5070]">
                          {p.uniqueUsers.toLocaleString()} uniq
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── CLI events + Recent events ────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* CLI events */}
              <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
                <SectionHeader title="CLI events" sub="All time, by event name" />
                <div className="space-y-1">
                  {cliEvents.length === 0 && (
                    <p className="text-[12px] text-[#4D5070]">No CLI events recorded yet.</p>
                  )}
                  {cliEvents.map((e) => (
                    <div key={e.eventName} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
                      <Terminal className="size-3 shrink-0 text-[#7C6DFA]/50" />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{e.eventName}</span>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-[#EDEEFF]">{e.count.toLocaleString()}</span>
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-[#4D5070]">
                        {relTime(e.lastSeen)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent events */}
              <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
                <SectionHeader title="Recent events" sub="Latest 20 across web and CLI" />
                <div className="space-y-1">
                  {recent.length === 0 && (
                    <p className="text-[12px] text-[#4D5070]">No recent events.</p>
                  )}
                  {recent.map((e, idx) => (
                    <div key={`${e.eventName}-${idx}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.02]">
                      <SourceBadge source={e.source} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{e.eventName}</span>
                      <span className="hidden shrink-0 max-w-[90px] truncate font-mono text-[10px] text-[#4D5070] sm:block">
                        {e.pagePath || "-"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#3A3D5A]">{relTime(e.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── Daily table ───────────────────────────────── */}
            <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
              <SectionHeader title="Daily activity" sub="Last 30 days" />
              <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
                <table className="w-full min-w-[680px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-white/8">
                      {["Date", "Visitors", "Page views", "Installs", "Early access", "CLI starts", "Prepares", "Checks"].map((h) => (
                        <th key={h} className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[#4D5070] first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length === 0 && <EmptyRow cols={8} msg="No daily data yet." />}
                    {daily.map((d, idx) => (
                      <tr key={`${d.date}-${idx}`} className="border-t border-white/6 transition-colors hover:bg-white/[0.015]">
                        <td className="py-2 pr-4 font-mono text-[11px] text-[#6870A0]">{String(d.date)}</td>
                        <td className="pr-4 tabular-nums">{Number(d.visitors ?? 0)}</td>
                        <td className="pr-4 tabular-nums">{Number(d.pageViews ?? 0)}</td>
                        <td className="pr-4 tabular-nums text-[#4DE8B0]">{Number(d.installCopies ?? 0) || <span className="text-[#3A3D5A]">-</span>}</td>
                        <td className="pr-4 tabular-nums text-[#F0BF72]">{Number(d.earlyAccess ?? 0) || <span className="text-[#3A3D5A]">-</span>}</td>
                        <td className="pr-4 tabular-nums text-[#9E91FF]">{Number(d.cliStarts ?? 0) || <span className="text-[#3A3D5A]">-</span>}</td>
                        <td className="pr-4 tabular-nums">{Number(d.cliPrepares ?? 0) || <span className="text-[#3A3D5A]">-</span>}</td>
                        <td className="tabular-nums">{Number(d.cliChecks ?? 0) || <span className="text-[#3A3D5A]">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Early access ─────────────────────────────── */}
            <section className="rounded-xl border border-white/8 bg-[#0C0D22] p-4 sm:p-5">
              <SectionHeader
                title={`Early access requests (${earlyAccess.length})`}
                sub="All signups, newest first"
              />
              {data?.earlyAccessTableFound === false ? (
                <p className="text-[12px] text-[#4D5070]">Early access table not found in database.</p>
              ) : earlyAccess.length === 0 ? (
                <p className="text-[12px] text-[#4D5070]">No early access requests yet.</p>
              ) : (
                <>
                  {/* Mobile: card view */}
                  <div className="space-y-2 md:hidden">
                    {earlyAccess.map((e, idx) => (
                      <div key={`${e.email}-${idx}`} className="rounded-lg border border-white/6 bg-[#090918] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate font-mono text-[11px] text-[#C8D4E0]">
                            {e.email || "-"}
                          </span>
                          <StatusBadge status={e.status} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#4D5070]">
                          {e.role && <span>{e.role}</span>}
                          {e.agent && <span>· {e.agent}</span>}
                          <span>· {fmtShort(e.created_at)}</span>
                        </div>
                        {e.use_case && (
                          <p className="mt-1.5 text-[11px] leading-snug text-[#5A6480]">{e.use_case}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block -mx-5 overflow-x-auto px-5">
                    <table className="w-full min-w-[700px] text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {["Email", "Role", "Agent", "Use case", "Status", "Signed up"].map((h) => (
                            <th key={h} className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[#4D5070]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {earlyAccess.map((e, idx) => (
                          <tr key={`${e.email}-${idx}`} className="border-t border-white/6 transition-colors hover:bg-white/[0.015]">
                            <td className="py-2 pr-4 font-mono text-[11px] text-[#C8D4E0]">{e.email || "-"}</td>
                            <td className="pr-4 text-[#8E95C3]">{e.role || "-"}</td>
                            <td className="pr-4 text-[#8E95C3]">{e.agent || "-"}</td>
                            <td className="max-w-[200px] truncate pr-4 text-[#6870A0]" title={e.use_case ?? ""}>{e.use_case || "-"}</td>
                            <td className="pr-4"><StatusBadge status={e.status} /></td>
                            <td className="font-mono text-[10px] text-[#4D5070]">{fmtFull(e.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
