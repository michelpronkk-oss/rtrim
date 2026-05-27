"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, LogOut, ExternalLink, Activity, TrendingUp, CreditCard, Zap, Shield, Terminal } from "lucide-react";
import { AdminPlanningContent } from "@/components/admin/admin-planning-dashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function rel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtMoney(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

// ── Canonical funnel definition ───────────────────────────────────────────────

const CANONICAL_FUNNEL = [
  { key: "website_visit",          label: "Website visit",          source: "internal events"         },
  { key: "install_cta_clicked",    label: "Install CTA clicked",    source: "internal events"         },
  { key: "install_command_copied", label: "Install command copied", source: "internal events"         },
  { key: "cli_start",              label: "CLI start",              source: "internal events"         },
  { key: "guarded_run_created",    label: "Guarded run created",    source: "internal events"         },
  { key: "finish_completed",       label: "Finish completed",       source: "internal events"         },
  { key: "cli_connected",          label: "CLI connected",          source: "billing / profiles"      },
  { key: "checkout_started",       label: "Checkout started",       source: "billing events"          },
  { key: "subscription_active",    label: "Subscription active",    source: "billing / subscriptions" },
];

const EXPECTED_EVENTS = [
  { key: "install_cta_clicked",    source: "website"  },
  { key: "install_command_copied", source: "website"  },
  { key: "cli_start",              source: "CLI"      },
  { key: "cli_agent_prepare",      source: "CLI"      },
  { key: "cli_finish",             source: "CLI"      },
  { key: "cli_restore_preview",    source: "CLI"      },
  { key: "cli_restore_apply",      source: "CLI"      },
  { key: "cli_continue",           source: "CLI"      },
  { key: "cli_login_connected",    source: "CLI"      },
  { key: "checkout_started",       source: "billing"  },
  { key: "subscription_active",    source: "billing"  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, note, source, icon, dim,
}: {
  label: string;
  value: string | number;
  note?: string;
  source?: string;
  icon?: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 10,
      background: "#0c0e11",
      padding: "14px 16px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, color: dim ? "#5a5f68" : "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {value}
      </div>
      {note && <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em", marginTop: 6 }}>{note}</p>}
      {source && <p style={{ ...MONO, fontSize: 10, color: "#3a3e46", letterSpacing: "0.04em", marginTop: source && note ? 2 : 6 }}>{source}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function StatusDot({ ok, unknown }: { ok: boolean; unknown?: boolean }) {
  const color = unknown ? "#3a3e46" : ok ? "#6ee7b7" : "#f5a524";
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
      background: color,
      boxShadow: unknown ? "none" : `0 0 6px ${color}`,
    }} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [data,        setData]        = useState<MetricsResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState("");
  const [tab,         setTab]         = useState<Tab>("overview");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    const res  = await fetch("/api/admin/metrics", { cache: "no-store" });
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

  useEffect(() => { void load(); }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const summary          = data?.summary ?? {};
  const revenue          = data?.revenue;
  const planSegments     = data?.planSegments ?? [];
  const funnel           = data?.funnel ?? [];
  const topPages         = data?.topPages ?? [];
  const cliMetrics       = data?.cliMetrics ?? [];
  const cliEvents        = data?.cliEvents ?? [];
  const recentEvents     = data?.recentEvents ?? [];
  const referrerBreakdown = data?.referrerBreakdown ?? [];
  const trackingGaps     = data?.trackingGaps ?? [];
  const earlyAccess      = data?.earlyAccess ?? [];

  // Funnel: merge canonical steps with API data
  const funnelData = useMemo(() => {
    const apiMap = new Map(funnel.map((f) => [f.step, f]));
    return CANONICAL_FUNNEL.map((step) => {
      const match =
        apiMap.get(step.key) ??
        funnel.find((f) =>
          f.step.toLowerCase().replace(/\s+/g, "_") === step.key ||
          f.step === step.label
        );
      return {
        ...step,
        count:              match?.count ?? 0,
        tracked:            match?.tracked ?? false,
        recommendedEvent:   match?.recommendedEvent,
      };
    });
  }, [funnel]);

  const funnelMax = Math.max(1, ...funnelData.map((f) => f.count));

  // Tracking gaps: merge canonical expected events with API gaps + cliEvents
  const trackedNames = useMemo(() => new Set(cliEvents.map((e) => e.eventName)), [cliEvents]);
  const gapKeys      = useMemo(() => new Set(trackingGaps.map((g) => g.key)), [trackingGaps]);
  const eventStatuses = useMemo(() =>
    EXPECTED_EVENTS.map((e) => ({
      ...e,
      isTracked: trackedNames.has(e.key),
      isGap:     gapKeys.has(e.key),
      gap:       trackingGaps.find((g) => g.key === e.key),
    })),
    [trackedNames, gapKeys, trackingGaps]
  );

  // Plan segmentation rows — consistent order
  const planSegmentRows = useMemo(() => {
    const order = ["free", "pro", "builder", "team", "unknown"] as const;
    const map   = new Map(planSegments.map((r) => [r.plan, r]));
    return order.map((k) => map.get(k) ?? { plan: k, users: 0, connectedCliUsers: 0, recentlyActiveUsers7d: 0 });
  }, [planSegments]);

  const topPage     = topPages[0]?.pagePath ?? null;
  const hasRevenue  = revenue != null;
  const hasActivity = recentEvents.length > 0 || cliEvents.length > 0;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#08090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}>Loading metrics...</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#08090b", color: "#f4f5f7" }}>

      {/* Topbar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(8,9,11,0.88)",
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.10em", textTransform: "uppercase" }}>
              RunTrim Admin
            </span>
            {lastFetched && (
              <span style={{ ...MONO, fontSize: 10, color: "#3a3e46" }}>
                {rel(lastFetched.toISOString())}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => void load(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.10)", background: "transparent",
              color: "#8a8f98", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.10)", background: "transparent",
              color: "#8a8f98", fontSize: 12, textDecoration: "none",
            }}
          >
            <ExternalLink size={11} />
            Open site
          </a>
          <button
            onClick={logout}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.10)", background: "transparent",
              color: "#8a8f98", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <LogOut size={11} />
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            operator console
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.025em", color: "#f4f5f7", lineHeight: 1.1 }}>
            RunTrim Admin
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "#8a8f98" }}>
            Growth, activation and revenue console
          </p>
        </div>

        {/* Error */}
        {error ? (
          <div style={{ marginBottom: 20, borderRadius: 8, border: "1px solid rgba(248,113,113,0.28)", background: "rgba(248,113,113,0.05)", padding: "12px 16px", fontSize: 12, color: "#f87171" }}>
            {error}
          </div>
        ) : null}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 2 }}>
          {(["overview", "activity", "planning"] as const).map((id) => {
            const labels: Record<string, string> = { overview: "Overview", activity: "Activity", planning: "Planning" };
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flexShrink: 0,
                  height: 30, padding: "0 12px", borderRadius: 6,
                  border: `1px solid ${active ? "rgba(167,139,250,0.50)" : "rgba(255,255,255,0.10)"}`,
                  background: active ? "rgba(167,139,250,0.12)" : "transparent",
                  color: active ? "#a78bfa" : "#8a8f98",
                  fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.12s",
                }}
              >
                {labels[id]}
              </button>
            );
          })}
        </div>

        {/* ── Planning tab ──────────────────────────────────────────── */}
        {tab === "planning" ? (
          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "#0c0e11", padding: 8 }}>
            <AdminPlanningContent />
          </div>
        ) : null}

        {/* ── Overview tab ──────────────────────────────────────────── */}
        {tab === "overview" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Traffic */}
            <section>
              <SectionLabel>
                <Activity size={10} style={{ display: "inline", marginRight: 6 }} />
                Traffic
              </SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="Unique visitors 24h"
                  value={summary.uniqueVisitors24h ?? 0}
                  source="internal events"
                  dim={!summary.uniqueVisitors24h}
                />
                <KpiCard
                  label="Unique visitors 7d"
                  value={summary.uniqueVisitors7d ?? 0}
                  source="internal events"
                  dim={!summary.uniqueVisitors7d}
                />
                <KpiCard
                  label="Page views 7d"
                  value={summary.pageViews7d ?? 0}
                  source="internal events"
                  dim={!summary.pageViews7d}
                />
                <KpiCard
                  label="Top page"
                  value={topPage ?? "—"}
                  note={topPage ? `${topPages[0]?.views ?? 0} views` : undefined}
                  source="internal events"
                  dim={!topPage}
                />
              </div>
            </section>

            {/* Activation */}
            <section>
              <SectionLabel>
                <Zap size={10} style={{ display: "inline", marginRight: 6 }} />
                Activation
              </SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard label="Install CTA clicks 7d"     value={summary.installCtaClicks7d ?? 0}      source="internal events" dim={!summary.installCtaClicks7d} />
                <KpiCard label="Install copies 7d"         value={summary.installCommandCopies7d ?? 0}  source="internal events" dim={!summary.installCommandCopies7d} />
                <KpiCard label="CLI starts 7d"             value={summary.cliStarts7d ?? 0}             source="internal events" dim={!summary.cliStarts7d} />
                <KpiCard label="Guarded runs 7d"           value={summary.guardedRuns7d ?? 0}           source="internal events" dim={!summary.guardedRuns7d} />
                <KpiCard label="Finishes 7d"               value={summary.cliFinishes7d ?? 0}           source="internal events" dim={!summary.cliFinishes7d} />
                <KpiCard label="CLI connected users 7d"    value={summary.cliConnectedUsers7d ?? 0}     source="billing / profiles" dim={!summary.cliConnectedUsers7d} />
              </div>
            </section>

            {/* Revenue */}
            <section>
              <SectionLabel>
                <CreditCard size={10} style={{ display: "inline", marginRight: 6 }} />
                Revenue
              </SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <KpiCard
                  label={revenue?.isEstimated ? "Estimated MRR" : "MRR"}
                  value={fmtMoney(revenue?.estimatedMrr ?? 0)}
                  note={revenue?.isEstimated ? "derived from plan fields" : "from subscription records"}
                  source="billing"
                  dim={!(revenue?.estimatedMrr)}
                />
                <KpiCard label="Paid users"      value={revenue?.paidUsers ?? 0}    source="billing / subscriptions" dim={!(revenue?.paidUsers)} />
                <KpiCard label="Pro users"        value={revenue?.proCount ?? 0}     source="billing"                 dim={!(revenue?.proCount)} />
                <KpiCard label="Builder users"    value={revenue?.builderCount ?? 0} source="billing"                 dim={!(revenue?.builderCount)} />
                <KpiCard
                  label="Team users"
                  value={revenue?.teamCount ?? 0}
                  note={revenue?.teamSeats != null ? `${revenue.teamSeats} seats` : "seats not tracked"}
                  source="billing"
                  dim={!(revenue?.teamCount)}
                />
                <KpiCard label="Trial users"     value={revenue?.trialUsers ?? 0}         source="billing" dim={!(revenue?.trialUsers)} />
                <KpiCard label="Payment issues"  value={revenue?.paymentIssueUsers ?? 0}  source="billing" dim={!(revenue?.paymentIssueUsers)} />
              </div>
            </section>

            {/* Funnel + Tracking gaps */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Conversion funnel */}
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: 18 }}>
                <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  <TrendingUp size={10} style={{ display: "inline", marginRight: 6 }} />
                  Conversion funnel
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginBottom: 16, letterSpacing: "-0.005em" }}>
                  RunTrim activation pipeline
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {funnelData.map((step, i) => {
                    const prevCount = i > 0 ? funnelData[i - 1].count : null;
                    const pct = prevCount && prevCount > 0 ? Math.round((step.count / prevCount) * 100) : null;
                    return (
                      <div key={step.key}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", minWidth: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ fontSize: 12.5, color: step.tracked ? "#f4f5f7" : "#8a8f98" }}>{step.label}</span>
                            {!step.tracked && (
                              <span style={{ ...MONO, fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 6px", borderRadius: 3, border: "1px solid rgba(245,165,36,0.30)", background: "rgba(245,165,36,0.08)", color: "#f5a524" }}>
                                not tracked
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {pct !== null && step.tracked && (
                              <span style={{ ...MONO, fontSize: 10, color: "#5a5f68" }}>{pct}%</span>
                            )}
                            <span style={{ ...MONO, fontSize: 12, color: step.count > 0 ? "#f4f5f7" : "#5a5f68", minWidth: 28, textAlign: "right" }}>
                              {step.count}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 3, background: "#16191e", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 2,
                            background: step.tracked
                              ? "linear-gradient(90deg, #7c5cff, #a78bfa)"
                              : "rgba(255,255,255,0.08)",
                            width: `${Math.round((step.count / funnelMax) * 100)}%`,
                            transition: "width 0.4s ease",
                          }} />
                        </div>
                        <p style={{ ...MONO, fontSize: 10, color: "#3a3e46", marginTop: 3 }}>{step.source}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tracking gaps */}
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: 18 }}>
                <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  Tracking gaps
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginBottom: 14, letterSpacing: "-0.005em" }}>
                  Expected events
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {eventStatuses.map((e) => {
                    const statusLabel = e.isTracked ? "tracked" : e.isGap ? "missing" : "zero events";
                    const statusColor = e.isTracked ? "#6ee7b7" : e.isGap ? "#f87171" : "#f5a524";
                    return (
                      <div
                        key={e.key}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto auto",
                          gap: 10, alignItems: "center",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.04)",
                          background: "#080a0d",
                        }}
                      >
                        <span style={{ ...MONO, fontSize: 11, color: "#c9ccd2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.key}
                        </span>
                        <span style={{ ...MONO, fontSize: 9.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {e.source}
                        </span>
                        <span style={{
                          ...MONO, fontSize: 9.5, padding: "2px 7px", borderRadius: 4,
                          color: statusColor,
                          background: `${statusColor}12`,
                          border: `1px solid ${statusColor}30`,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User segmentation */}
            <section>
              <SectionLabel>User segmentation</SectionLabel>
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "120px 80px 80px 100px",
                  gap: 14, padding: "10px 16px",
                  background: "#111317",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase",
                }}>
                  <span>Plan</span>
                  <span>Users</span>
                  <span>CLI connected</span>
                  <span>Active 7d</span>
                </div>
                {planSegmentRows.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12, color: "#5a5f68" }}>
                    No synced users yet.
                  </div>
                ) : planSegmentRows.map((row) => {
                  const planColors: Record<string, string> = {
                    free: "#5a5f68", pro: "#a78bfa", builder: "#6ee7b7", team: "#f5a524", unknown: "#3a3e46",
                  };
                  return (
                    <div
                      key={row.plan}
                      style={{
                        display: "grid", gridTemplateColumns: "120px 80px 80px 100px",
                        gap: 14, padding: "11px 16px",
                        borderBottom: "1px dashed rgba(255,255,255,0.04)",
                        fontSize: 13, alignItems: "center",
                      }}
                    >
                      <span style={{ ...MONO, fontSize: 11, color: planColors[row.plan] ?? "#5a5f68", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {row.plan}
                      </span>
                      <span style={{ ...MONO, fontSize: 13, color: row.users > 0 ? "#f4f5f7" : "#5a5f68" }}>{row.users}</span>
                      <span style={{ ...MONO, fontSize: 13, color: row.connectedCliUsers > 0 ? "#6ee7b7" : "#5a5f68" }}>{row.connectedCliUsers}</span>
                      <span style={{ ...MONO, fontSize: 13, color: row.recentlyActiveUsers7d > 0 ? "#c9ccd2" : "#5a5f68" }}>{row.recentlyActiveUsers7d}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Data sources */}
            <section>
              <SectionLabel>
                <Shield size={10} style={{ display: "inline", marginRight: 6 }} />
                Data sources
              </SectionLabel>
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(
                    [
                      { label: "Internal event tracking", active: hasActivity,           unknown: false, note: hasActivity           ? "active" : "not detected" },
                      { label: "Billing data",            active: hasRevenue,            unknown: false, note: hasRevenue            ? "active" : "not detected" },
                      { label: "Vercel Analytics",        active: true,                  unknown: true,  note: "installed globally"                              },
                      { label: "CLI sync events",         active: cliEvents.length > 0,  unknown: false, note: cliEvents.length > 0  ? "active" : "not detected" },
                    ] as Array<{ label: string; active: boolean; unknown: boolean; note: string }>
                  ).map(({ label, active, unknown, note }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusDot ok={active} unknown={unknown} />
                        <span style={{ fontSize: 13, color: "#f4f5f7" }}>{label}</span>
                      </div>
                      <span style={{ ...MONO, fontSize: 11, color: active && !unknown ? "#6ee7b7" : unknown ? "#5a5f68" : "#f5a524" }}>
                        {note}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 14, lineHeight: 1.6, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  Vercel Analytics is installed globally. Use the Vercel dashboard for raw traffic data until a direct API import is connected. Internal events shown above reflect database-tracked actions only.
                </p>
              </div>
            </section>

          </div>
        ) : null}

        {/* ── Activity tab ──────────────────────────────────────────── */}
        {tab === "activity" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Traffic and acquisition */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Traffic and acquisition</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginTop: 2 }}>Source breakdown 7d</p>
                </div>
                <div style={{ padding: "10px 0" }}>
                  {referrerBreakdown.length === 0 ? (
                    <p style={{ padding: "16px", fontSize: 12, color: "#5a5f68" }}>No source data yet.</p>
                  ) : referrerBreakdown.map((r) => (
                    <div key={r.source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}>
                      <span style={{ ...MONO, fontSize: 12, color: "#c9ccd2" }}>{r.source}</span>
                      <span style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{r.count}</span>
                    </div>
                  ))}
                  {summary.sourceAttributionLimited ? (
                    <p style={{ ...MONO, fontSize: 10, color: "#3a3e46", padding: "8px 16px" }}>source attribution limited</p>
                  ) : null}
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Top pages</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginTop: 2 }}>7d</p>
                </div>
                <div style={{ padding: "10px 0" }}>
                  {topPages.length === 0 ? (
                    <p style={{ padding: "16px", fontSize: 12, color: "#5a5f68" }}>No page data yet.</p>
                  ) : topPages.map((p) => (
                    <div key={p.pagePath} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, padding: "8px 16px", alignItems: "center" }}>
                      <span style={{ ...MONO, fontSize: 12, color: "#c9ccd2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.pagePath || "/"}
                      </span>
                      <span style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{p.views}</span>
                      <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{p.uniqueUsers} uniq</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CLI events */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    <Terminal size={10} style={{ display: "inline", marginRight: 6 }} />
                    CLI events
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginTop: 2 }}>7d</p>
                </div>
                <div style={{ padding: "10px 0" }}>
                  {cliMetrics.length === 0 ? (
                    <p style={{ padding: "16px", fontSize: 12, color: "#5a5f68" }}>No CLI events yet.</p>
                  ) : cliMetrics.map((m) => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...MONO, fontSize: 12, color: "#c9ccd2" }}>{m.label}</span>
                        {!m.tracked && <span style={{ ...MONO, fontSize: 9.5, color: "#f5a524" }}>not tracked</span>}
                      </div>
                      <span style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{m.count}</span>
                    </div>
                  ))}
                  {cliEvents.length > 0 && (
                    <div style={{ margin: "10px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 0 0" }}>
                      {cliEvents.slice(0, 14).map((e) => (
                        <div key={e.eventName} style={{ display: "flex", justifyContent: "space-between", padding: "6px 16px" }}>
                          <span style={{ ...MONO, fontSize: 11, color: "#8a8f98" }}>{e.eventName}</span>
                          <span style={{ ...MONO, fontSize: 11, color: "#c9ccd2" }}>{e.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent events */}
              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent events</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginTop: 2 }}>Live stream</p>
                </div>
                <div style={{ padding: "6px 0" }}>
                  {recentEvents.length === 0 ? (
                    <p style={{ padding: "16px", fontSize: 12, color: "#5a5f68" }}>No recent events.</p>
                  ) : recentEvents.slice(0, 28).map((e, i) => (
                    <div key={`${e.eventName}-${i}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, padding: "7px 16px", alignItems: "center" }}>
                      <span style={{
                        ...MONO, fontSize: 9.5, padding: "2px 6px", borderRadius: 3,
                        border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98",
                        whiteSpace: "nowrap",
                      }}>
                        {e.source}
                      </span>
                      <span style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.eventName}{e.pagePath ? ` · ${e.pagePath}` : ""}{e.plan ? ` · ${e.plan}` : ""}
                      </span>
                      <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", whiteSpace: "nowrap" }}>{rel(e.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Early access — historical */}
            <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Early access</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", marginTop: 2 }}>Historical signups</p>
              </div>
              {earlyAccess.length === 0 ? (
                <p style={{ padding: "28px 16px", fontSize: 12, color: "#5a5f68", textAlign: "center" }}>
                  No historical early-access entries found.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Email", "Plan / Role", "Status", "Created"].map((h) => (
                          <th key={h} style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", padding: "10px 16px", textAlign: "left", fontWeight: 400 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {earlyAccess.slice(0, 100).map((row) => (
                        <tr key={row.id} style={{ borderBottom: "1px dashed rgba(255,255,255,0.04)" }}>
                          <td style={{ ...MONO, fontSize: 12, color: "#c9ccd2", padding: "9px 16px" }}>{row.email ?? "-"}</td>
                          <td style={{ fontSize: 12, color: "#8a8f98", padding: "9px 16px" }}>{row.plan_interest || row.role || "-"}</td>
                          <td style={{ fontSize: 12, color: "#8a8f98", padding: "9px 16px" }}>{row.status || "pending"}</td>
                          <td style={{ ...MONO, fontSize: 11, color: "#5a5f68", padding: "9px 16px" }}>
                            {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
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
