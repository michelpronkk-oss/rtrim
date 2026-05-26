"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, LogOut } from "lucide-react";
import { AdminPlanningContent } from "@/components/admin/admin-planning-dashboard";

type EarlyAccessEntry = {
  id: string;
  email: string | null;
  role: string | null;
  plan_interest: string | null;
  status: string | null;
  created_at: string;
};

type FunnelStep = {
  step: string;
  count: number;
  tracked: boolean;
  recommendedEvent?: string;
};

type RevenueSummary = {
  estimatedMrr: number;
  isEstimated: boolean;
  paidUsers: number;
  proCount: number;
  builderCount: number;
  teamCount: number;
  teamSeats: number | null;
  trialUsers: number;
  paymentIssueUsers: number;
};

type PlanSegment = {
  plan: "free" | "pro" | "builder" | "team" | "unknown";
  users: number;
  connectedCliUsers: number;
  recentlyActiveUsers7d: number;
};

type CliMetric = { label: string; count: number; tracked: boolean; recommendedEvent?: string };

type MetricsResponse = {
  ok: boolean;
  summary?: Record<string, number>;
  revenue?: RevenueSummary;
  planSegments?: PlanSegment[];
  funnel?: FunnelStep[];
  topPages?: Array<{ pagePath: string; views: number; uniqueUsers: number }>;
  cliMetrics?: CliMetric[];
  cliEvents?: Array<{ eventName: string; count: number; lastSeen: string }>;
  recentEvents?: Array<{ eventName: string; source: string; pagePath: string; createdAt: string; plan?: string }>;
  referrerBreakdown?: Array<{ source: string; count: number; limited?: boolean }>;
  trackingGaps?: Array<{ key: string; recommendedEvent: string; note: string }>;
  earlyAccess?: EarlyAccessEntry[];
};

type Tab = "overview" | "activity" | "planning";

function rel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmtMoney(v: number): string {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0C0D22] px-4 py-3">
      <p className="text-[11px] text-[#6D7398]">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-bold text-[#EDEEFF]">{value}</p>
      {note ? <p className="mt-1 text-[10px] text-[#4D5070]">{note}</p> : null}
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    const res = await fetch("/api/admin/metrics", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as MetricsResponse & { error?: string };
    if (!res.ok || !body.ok) {
      setError(body.error ?? "Could not load admin metrics.");
    } else {
      setData(body);
      setLastFetched(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const summary = data?.summary ?? {};
  const revenue = data?.revenue;
  const planSegments = data?.planSegments ?? [];
  const funnel = data?.funnel ?? [];
  const topPages = data?.topPages ?? [];
  const cliMetrics = data?.cliMetrics ?? [];
  const cliEvents = data?.cliEvents ?? [];
  const recentEvents = data?.recentEvents ?? [];
  const referrerBreakdown = data?.referrerBreakdown ?? [];
  const trackingGaps = data?.trackingGaps ?? [];
  const earlyAccess = data?.earlyAccess ?? [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  const planSegmentRows = useMemo(() => {
    const order = ["free", "pro", "builder", "team", "unknown"];
    const map = new Map(planSegments.map((r) => [r.plan, r]));
    return order.map((k) => map.get(k as PlanSegment["plan"]) ?? {
      plan: k as PlanSegment["plan"],
      users: 0,
      connectedCliUsers: 0,
      recentlyActiveUsers7d: 0,
    });
  }, [planSegments]);

  if (loading) {
    return <div className="min-h-screen bg-[#07071A] text-[#EDEEFF] p-6">Loading admin metrics...</div>;
  }

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#07071A]/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            <div className="min-w-0">
              <h1 className="text-[16px] font-semibold leading-tight">RunTrim</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7A83B3]">
                  Admin
                </span>
                <span className="text-[12px] text-[#7A83B3]">Growth console</span>
                {lastFetched ? (
                  <span className="font-mono text-[10px] text-[#4D5070]">updated {rel(lastFetched.toISOString())}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:justify-end">
            <button
              onClick={() => void load(true)}
              className="inline-flex items-center justify-center gap-1 rounded border border-white/10 px-2.5 py-1.5 text-[12px] text-[#8E95C3] hover:border-[#7C6DFA]/40 hover:text-[#C4B9FF]"
            >
              <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-1 rounded border border-white/10 px-2.5 py-1.5 text-[12px] text-[#8E95C3] hover:border-[#7C6DFA]/40 hover:text-[#C4B9FF]"
            >
              <LogOut className="size-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-5">
        {error ? (
          <div className="mb-4 rounded border border-[#FF6B6B]/40 bg-[#2A0E17] p-3 text-[12px] text-[#FF9AA9]">{error}</div>
        ) : null}

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {([
            ["overview", "Overview"],
            ["activity", "Activity"],
            ["planning", "Planning"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 rounded border px-3 py-1.5 text-[12px] ${
                tab === id
                  ? "border-[#7C6DFA]/60 bg-[#7C6DFA]/20 text-[#DAD2FF]"
                  : "border-white/10 text-[#7A83B3] hover:border-[#7C6DFA]/40 hover:text-[#C4B9FF]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "planning" ? (
          <div className="rounded-xl border border-white/10 bg-[#0B0C1E] p-2">
            <AdminPlanningContent />
          </div>
        ) : null}

        {tab === "overview" ? (
          <div className="space-y-5">
            <section>
              <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Top KPIs</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <StatCard label="Unique visitors 24h" value={summary.uniqueVisitors24h ?? 0} />
                <StatCard label="Unique visitors 7d" value={summary.uniqueVisitors7d ?? 0} />
                <StatCard label="Page views 7d" value={summary.pageViews7d ?? 0} />
                <StatCard label="Install CTA clicks 7d" value={summary.installCtaClicks7d ?? 0} />
                <StatCard label="Install command copies 7d" value={summary.installCommandCopies7d ?? 0} />
                <StatCard label="CLI starts 7d" value={summary.cliStarts7d ?? 0} />
                <StatCard label="Guarded runs 7d" value={summary.guardedRuns7d ?? 0} />
                <StatCard label="CLI finishes 7d" value={summary.cliFinishes7d ?? 0} />
                <StatCard label="Connected CLI users 7d" value={summary.cliConnectedUsers7d ?? 0} />
                <StatCard label="Paid users" value={summary.paidUsers ?? 0} />
                <StatCard
                  label="MRR"
                  value={fmtMoney(summary.mrr ?? 0)}
                  note={revenue?.isEstimated ? "Estimated MRR" : "Exact MRR"}
                />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Revenue</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="MRR" value={fmtMoney(revenue?.estimatedMrr ?? 0)} note={revenue?.isEstimated ? "Estimated MRR" : "Exact"} />
                  <StatCard label="Active paid users" value={revenue?.paidUsers ?? 0} />
                  <StatCard label="Pro users" value={revenue?.proCount ?? 0} />
                  <StatCard label="Builder users" value={revenue?.builderCount ?? 0} />
                  <StatCard label="Team users" value={revenue?.teamCount ?? 0} note={revenue?.teamSeats != null ? `${revenue.teamSeats} seats` : "seats unavailable"} />
                  <StatCard label="Trial users" value={revenue?.trialUsers ?? 0} />
                  <StatCard label="Payment issues" value={revenue?.paymentIssueUsers ?? 0} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">User Segmentation</h3>
                <div className="space-y-1">
                  {planSegmentRows.map((row) => (
                    <div key={row.plan} className="grid grid-cols-4 gap-2 rounded px-2 py-2 text-[12px] hover:bg-white/[0.02]">
                      <span className="font-mono text-[#AEB6D7]">{row.plan}</span>
                      <span className="font-mono text-[#EDEEFF]">{row.users}</span>
                      <span className="font-mono text-[#7C86B4]">CLI {row.connectedCliUsers}</span>
                      <span className="font-mono text-[#7C86B4]">active {row.recentlyActiveUsers7d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Current Conversion Funnel (7d)</h3>
                {funnel.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No funnel data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {funnel.map((step) => (
                      <div key={step.step}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#AEB6D7]">{step.step}</span>
                            {!step.tracked ? (
                              <span className="rounded border border-[#F0BF72]/30 bg-[#F0BF72]/10 px-1.5 py-0.5 text-[10px] text-[#F0BF72]">
                                Not tracked yet
                              </span>
                            ) : null}
                          </div>
                          <span className="font-mono text-[#EDEEFF]">{step.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
                          <div className="h-full rounded bg-gradient-to-r from-[#5B8BFF] to-[#7C6DFA]" style={{ width: `${Math.round((step.count / funnelMax) * 100)}%` }} />
                        </div>
                        {!step.tracked && step.recommendedEvent ? (
                          <p className="mt-1 text-[10px] text-[#6F78A6]">recommend: {step.recommendedEvent}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Tracking Gaps</h3>
                {trackingGaps.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No major gaps detected in current metrics.</p>
                ) : (
                  <div className="space-y-2">
                    {trackingGaps.map((gap) => (
                      <div key={gap.key} className="rounded border border-white/10 bg-white/[0.01] px-3 py-2">
                        <p className="font-mono text-[11px] text-[#D5DBF7]">{gap.key}</p>
                        <p className="text-[11px] text-[#7D87B5]">{gap.note}</p>
                        <p className="mt-1 text-[10px] text-[#6F78A6]">event: {gap.recommendedEvent}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "activity" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Traffic and Acquisition (7d)</h3>
                {referrerBreakdown.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No source data yet.</p>
                ) : (
                  <div className="space-y-1">
                    {referrerBreakdown.map((r) => (
                      <div key={r.source} className="flex items-center justify-between rounded px-2 py-1.5 text-[12px] hover:bg-white/[0.02]">
                        <span className="font-mono text-[#AEB6D7]">{r.source}</span>
                        <span className="font-mono text-[#EDEEFF]">{r.count}</span>
                      </div>
                    ))}
                    {summary.sourceAttributionLimited ? (
                      <p className="pt-2 text-[10px] text-[#6F78A6]">source attribution limited</p>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Top Pages (7d)</h3>
                {topPages.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No page data yet.</p>
                ) : (
                  <div className="space-y-1">
                    {topPages.map((p) => (
                      <div key={p.pagePath} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded px-2 py-1.5 text-[12px] hover:bg-white/[0.02]">
                        <span className="truncate font-mono text-[#AEB6D7]">{p.pagePath || "/"}</span>
                        <span className="font-mono text-[#EDEEFF]">{p.views}</span>
                        <span className="font-mono text-[#7C86B4]">{p.uniqueUsers} uniq</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">CLI Events (7d)</h3>
                {cliMetrics.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No CLI events yet. Track install command copy, then CLI start, then finish.</p>
                ) : (
                  <div className="space-y-1">
                    {cliMetrics.map((m) => (
                      <div key={m.label} className="grid grid-cols-[1fr_auto] gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#AEB6D7]">{m.label}</span>
                          {!m.tracked ? <span className="text-[10px] text-[#F0BF72]">not tracked yet</span> : null}
                        </div>
                        <span className="font-mono text-[#EDEEFF]">{m.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                {cliEvents.length > 0 ? (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="mb-1 text-[11px] text-[#6F78A6]">raw event names</p>
                    <div className="space-y-1">
                      {cliEvents.slice(0, 12).map((e) => (
                        <div key={e.eventName} className="flex items-center justify-between rounded px-2 py-1 text-[11px] hover:bg-white/[0.02]">
                          <span className="font-mono text-[#7D87B5]">{e.eventName}</span>
                          <span className="font-mono text-[#AEB6D7]">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
                <h3 className="mb-3 text-[14px] font-semibold">Recent Events</h3>
                {recentEvents.length === 0 ? (
                  <p className="text-[12px] text-[#5C638A]">No recent events.</p>
                ) : (
                  <div className="space-y-1">
                    {recentEvents.slice(0, 24).map((e, i) => (
                      <div key={`${e.eventName}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-white/[0.02]">
                        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[#7D87B5]">{e.source}</span>
                        <span className="truncate font-mono text-[#AEB6D7]">
                          {e.eventName}
                          {e.pagePath ? ` - ${e.pagePath}` : ""}
                          {e.plan ? ` - ${e.plan}` : ""}
                        </span>
                        <span className="font-mono text-[#66709E]">{rel(e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
              <h3 className="mb-3 text-[14px] font-semibold">Early Access (Historical)</h3>
              {earlyAccess.length === 0 ? (
                <p className="text-[12px] text-[#5C638A]">No historical early-access entries found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[#6F78A6]">
                        <th className="px-2 py-2 font-mono text-[10px] uppercase">Email</th>
                        <th className="px-2 py-2 font-mono text-[10px] uppercase">Plan/Role</th>
                        <th className="px-2 py-2 font-mono text-[10px] uppercase">Status</th>
                        <th className="px-2 py-2 font-mono text-[10px] uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earlyAccess.slice(0, 100).map((row) => (
                        <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-2 py-2 font-mono text-[#D8DDF5]">{row.email ?? "-"}</td>
                          <td className="px-2 py-2 text-[#AEB6D7]">{row.plan_interest || row.role || "-"}</td>
                          <td className="px-2 py-2 text-[#AEB6D7]">{row.status || "pending"}</td>
                          <td className="px-2 py-2 font-mono text-[#6F78A6]">{new Date(row.created_at).toLocaleDateString("en-US")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
