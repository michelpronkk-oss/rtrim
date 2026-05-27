import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Activity, Layers, TrendingDown, Zap, Clock, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getEntitlements, currentPeriod, effectivePlanId } from "@/lib/entitlements";
import { planOrder } from "@/lib/plans";
import { trialEligible } from "@/lib/billing-cta";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";
import { CopyButton } from "@/components/app/copy-button";

export const metadata: Metadata = {
  title: "AI Run Control Room",
  robots: { index: false, follow: false },
};

// ── Types ──────────────────────────────────────────────────────────────────────

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
  bridge_runs_used: number | null;
  bridge_runs_period: string | null;
  current_period_end: string | null;
  cli_token_created_at: string | null;
  payment_subscription_id: string | null;
};

type RecentRunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  changed_files: Array<string | { path?: string | null }> | null;
  watch_changed_files: Array<string | { path?: string | null }> | null;
  agent: string | null;
  model: string | null;
  allowed_scope: string | null;
  forbidden_scope: string | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
};

type AggRunRow = {
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
};

type ProjectRow = { id: string; name: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTimeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function runSortTime(run: RecentRunRow): number {
  return (
    toTimeMs(run.evaluated_at_local) ??
    toTimeMs(run.created_at_local) ??
    toTimeMs(run.created_at) ??
    toTimeMs(run.synced_at) ??
    0
  );
}

function relativeTime(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = diff / 60_000;
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24)   return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ── Data fetcher ───────────────────────────────────────────────────────────────

async function getDashboardData(userId: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const [
    profileResult,
    runCountResult,
    runAggResult,
    projectsResult,
    recentRunResult,
  ] = await Promise.all([
    supabase
      .from("runtrim_profiles")
      .select("plan, plan_status, bridge_runs_used, bridge_runs_period, current_period_end, cli_token_created_at, payment_subscription_id")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("runtrim_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("runtrim_runs")
      .select("estimated_tokens_trimmed, estimated_dollars_standard")
      .eq("user_id", userId),

    supabase
      .from("runtrim_projects")
      .select("id, name")
      .eq("user_id", userId),

    supabase
      .from("runtrim_runs")
      .select("id, task, status, risk_before, risk_after, changed_files, watch_changed_files, agent, model, allowed_scope, forbidden_scope, created_at_local, evaluated_at_local, created_at, synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(12),
  ]);

  const profile    = profileResult.data as ProfileRow | null;
  const totalRuns  = runCountResult.count ?? 0;
  const aggRuns    = (runAggResult.data   ?? []) as AggRunRow[];
  const projects   = (projectsResult.data ?? []) as ProjectRow[];
  const recentRuns = (recentRunResult.data ?? []) as RecentRunRow[];

  const rawPlan    = profile?.plan || "free";
  const rawStatus  = profile?.plan_status ?? null;
  const plan       = effectivePlanId(rawPlan, rawStatus);
  const planStatus = rawStatus;
  const periodEnd  = profile?.current_period_end ?? null;
  const period     = currentPeriod();
  const ents       = getEntitlements(plan);
  const runsUsed   = profile?.bridge_runs_period === period
    ? (profile.bridge_runs_used ?? 0) : 0;
  const runsLimit  = ents.bridgeRunsPerMonth;

  const hasConnectedCli = !!(profile?.cli_token_created_at);
  const hasCompletedRun = recentRuns.some((r) => {
    const s = (r.status ?? "").toLowerCase();
    return s === "guarded" || s === "passed" || s === "completed";
  });

  const totalTokens   = aggRuns.reduce((s, r) => s + (r.estimated_tokens_trimmed  ?? 0), 0);
  const totalCost     = aggRuns.reduce((s, r) => s + (r.estimated_dollars_standard ?? 0), 0);
  const totalProjects = projects.length;

  recentRuns.sort((a, b) => runSortTime(b) - runSortTime(a));
  const lastRun =
    recentRuns.find((r) => {
      const s = (r.status ?? "").toLowerCase();
      return s === "guarded" || s === "completed" || s === "passed";
    }) ??
    recentRuns[0] ??
    null;

  const hasSubscription = !!(profile?.payment_subscription_id);

  return {
    plan, planStatus, periodEnd, runsUsed, runsLimit,
    totalRuns, totalProjects, totalTokens, totalCost,
    lastRun, hasConnectedCli, hasCompletedRun, recentRuns, hasSubscription,
  };
}

// ── Shared style consts ────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

function verdictColor(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "passed" || s === "completed") return "#6ee7b7";
  if (s === "blocked")                      return "#f87171";
  if (s === "warned" || s === "guarded")    return "#f5a524";
  return "#5a5f68";
}

function verdictClass(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "passed" || s === "completed") return "passed";
  if (s === "blocked")                      return "blocked";
  if (s === "warned")                       return "review";
  return "";
}

function gateLabel(currentPlan: string, requiredPlan: "pro" | "builder" | "team"): string {
  const ci = planOrder.indexOf(currentPlan as (typeof planOrder)[number]);
  const ri = planOrder.indexOf(requiredPlan);
  if (ci >= 0 && ci >= ri) return "Included";
  if (requiredPlan === "pro")     return "Pro required";
  if (requiredPlan === "builder") return "Builder required";
  return "Team required";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getDashboardData(user.id);

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `~${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `~${(n / 1_000).toFixed(0)}k`
    : String(n);

  const formatCost = (n: number) =>
    n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k`
    : n >= 0.01 ? `$${n.toFixed(2)}`
    : "$0.00";

  const plan            = data?.plan ?? "free";
  const planStatus      = data?.planStatus ?? null;
  const periodEnd       = data?.periodEnd ?? null;
  const isTrialing      = plan !== "free" && planStatus === "trialing";
  const isCanceledInPeriod = plan !== "free" && (planStatus === "canceled" || planStatus === "cancelled");
  const isPastDue       = planStatus === "past_due";
  const hasSubscription = data?.hasSubscription ?? false;
  const isTrialEligible = trialEligible({ plan, planStatus, paymentSubscriptionId: hasSubscription ? "present" : null });

  const hasConnectedCli = data?.hasConnectedCli ?? false;
  const hasProjects     = (data?.totalProjects ?? 0) > 0;
  const hasRuns         = (data?.totalRuns ?? 0) > 0;
  const hasCompletedRun = data?.hasCompletedRun ?? false;

  const stageDoneFlags = [
    hasConnectedCli,  // 01 Install CLI (proxy: if connected, binary is installed)
    hasConnectedCli,  // 02 Connect CLI
    hasProjects,      // 03 Init project
    hasRuns,          // 04 Connect MCP (proxy: first run implies MCP was attempted or bypassed)
    hasCompletedRun,  // 05 Guarded run + finish
  ];
  const doneCount  = stageDoneFlags.filter(Boolean).length;
  const isComplete = doneCount === 5;

  const runsUsed    = data?.runsUsed ?? 0;
  const runsLimit   = data?.runsLimit ?? 5;
  const isUnlimited = runsLimit === null;
  const isNearLimit = !isUnlimited && runsUsed >= (runsLimit - 1);
  const isAtLimit   = !isUnlimited && runsUsed >= runsLimit;

  const trialDaysLeft = (() => {
    if (!isTrialing || !periodEnd) return null;
    const diff = new Date(periodEnd).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  })();
  const trialEndLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const lastRun = data?.lastRun ?? null;
  const lastVerdict = lastRun?.status ?? null;
  const lastFinish = (() => {
    const s = (lastVerdict ?? "").toLowerCase();
    if (s === "passed" || s === "completed") return { label: "PASS", color: "#6ee7b7" };
    if (s === "guarded")                      return { label: "In progress", color: "#f5a524" };
    if (s === "blocked")                      return { label: "BLOCKED", color: "#f87171" };
    if (s === "warned" || s === "warn")       return { label: "WARN", color: "#f5a524" };
    return null;
  })();
  const latestChangedCount = lastRun
    ? [...(lastRun.changed_files ?? []), ...(lastRun.watch_changed_files ?? [])].length
    : 0;
  const latestRisk = lastRun?.risk_after ?? lastRun?.risk_before ?? null;

  const username = user.email ? user.email.split("@")[0] : "there";

  // Workspace health rows
  const healthRows = [
    {
      label: "CLI connected",
      note: hasConnectedCli ? "authenticated" : "runtrim login",
      status: hasConnectedCli ? "ok" : "warn",
    },
    {
      label: "Account verified",
      note: plan === "pro" ? "Pro plan" : plan === "builder" ? "Builder plan" : plan === "team" ? "Team plan" : "active",
      status: "ok" as const,
    },
    {
      label: "Project initialized",
      note: hasProjects ? `${data?.totalProjects ?? 0} project${(data?.totalProjects ?? 0) > 1 ? "s" : ""}` : "runtrim start",
      status: hasProjects ? "ok" : "warn",
    },
    {
      label: "Agent ready",
      note: hasConnectedCli ? "MCP optional" : "requires CLI",
      status: hasConnectedCli ? "ok" : "warn",
    },
    {
      label: "Restore metadata",
      note: hasRuns ? "available" : "syncs after first run",
      status: hasRuns ? "ok" : "neutral",
    },
  ];

  const workspaceStatusLabel = isComplete ? "ready" : hasConnectedCli ? "setup in progress" : "not configured";
  const workspaceStatusColor = isComplete ? "#6ee7b7" : hasConnectedCli ? "#f5a524" : "#f5a524";

  // Protection rows
  const protectionRows = [
    { label: "Source code never leaves machine", sub: "repo stays local by default", status: "ok" as const, state: "local" },
    { label: "Forbidden-path rules ready", sub: ".env*, prisma/migrations/**", status: (hasConnectedCli ? "ok" : "warn") as "ok" | "warn", state: hasConnectedCli ? "armed" : "pending" },
    { label: "Restore points", sub: "local snapshots before guarded runs", status: (hasRuns ? "ok" : "warn") as "ok" | "warn", state: hasRuns ? "on" : "not yet" },
    { label: "Cloud sync", sub: "metadata only · opt-in", status: (plan !== "free" ? "ok" : "warn") as "ok" | "warn", state: plan !== "free" ? "active" : "off" },
  ];

  const PIPELINE_STAGES = [
    { n: "01", label: "Install CLI",        desc: "Install the runtrim binary on your machine.",                             cmd: "npm install -g runtrim" },
    { n: "02", label: "Connect CLI",        desc: "Auth token paired. Dashboard can sync your runs.",                        cmd: "runtrim login" },
    { n: "03", label: "Init project",       desc: "Install memory, agent instructions, and MCP config files.",               cmd: "runtrim start" },
    { n: "04", label: "Connect MCP",        desc: "Connect agents via MCP. Not tracked remotely — run runtrim doctor.",      cmd: "runtrim mcp instructions" },
    { n: "05", label: "Guarded run + finish", desc: "Compile a contract, run it with your agent, finish check syncs proof.", cmd: 'runtrim agent "…" --copy' },
  ];

  const AGENT_TILES = [
    { icon: "C",   name: "Claude Code" },
    { icon: "Cx",  name: "Codex" },
    { icon: "Cu",  name: "Cursor" },
    { icon: "Gp",  name: "ChatGPT" },
    { icon: "Km",  name: "Kimi" },
    { icon: "Ds",  name: "DeepSeek" },
    { icon: "Gm",  name: "Gemini" },
    { icon: "···", name: "Bring your own" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-w-0 overflow-x-hidden" style={{ maxWidth: 1320 }}>

      {/* ── Subscription banners ─────────────────────────────────── */}
      {isCanceledInPeriod && (
        <div style={{ borderRadius: 10, border: "1px solid rgba(245,165,36,0.22)", background: "rgba(245,165,36,0.05)", padding: "14px 18px", marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: "rgba(245,165,36,0.7)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Subscription canceled</p>
              <p style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "#f4f5f7" }}>
                {periodEnd ? `Access continues until ${new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : "Your plan has been canceled."}
              </p>
              <p style={{ marginTop: 2, fontSize: 12, color: "#8a8f98" }}>Resubscribe to keep your features after this period.</p>
            </div>
            <Link href="/app/billing" style={{ flexShrink: 0, borderRadius: 8, border: "1px solid rgba(245,165,36,0.30)", background: "rgba(245,165,36,0.10)", padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#f5a524", textDecoration: "none" }}>
              Resubscribe
            </Link>
          </div>
        </div>
      )}

      {isPastDue && (
        <div style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.22)", background: "rgba(248,113,113,0.05)", padding: "14px 18px", marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: "rgba(248,113,113,0.7)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Payment failed</p>
              <p style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "#f4f5f7" }}>Your last payment did not go through.</p>
              <p style={{ marginTop: 2, fontSize: 12, color: "#8a8f98" }}>Update your payment method to avoid losing access.</p>
            </div>
            <a href="mailto:hello@runtrim.com?subject=RunTrim payment issue" style={{ flexShrink: 0, borderRadius: 8, border: "1px solid rgba(248,113,113,0.30)", background: "rgba(248,113,113,0.10)", padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#f87171", textDecoration: "none" }}>
              Contact support
            </a>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-5 mb-6">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
            <span style={{ color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)", padding: "1px 7px", borderRadius: 4, letterSpacing: "0.04em" }}>
              overview
            </span>
            <span>workspace · personal</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: "#f4f5f7", lineHeight: 1.1 }}>
            Welcome back, {username}.
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "#8a8f98", maxWidth: 560 }}>
            {isComplete
              ? "Control room active. Scope, verify, and recover any agent run."
              : `${5 - doneCount} step${5 - doneCount !== 1 ? "s" : ""} to complete setup. Install CLI, connect MCP, run a guarded task.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/app/install"
            style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, border: "1px solid rgba(255,255,255,0.16)", color: "#c9ccd2", textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}
            className="hover:border-white/30 hover:text-[#f4f5f7]"
          >
            View docs
          </Link>
          <Link
            href={isComplete ? "/app/runs" : "/app/connect"}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, background: "#f4f5f7", color: "#0b0d10", border: "1px solid #fff", textDecoration: "none" }}
            className="hover:bg-white"
          >
            {isComplete ? "Run history" : "Continue setup"}
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── Plan / usage banner ───────────────────────────────────── */}
      {plan === "free" ? (
        <div style={{ borderRadius: 10, border: `1px solid ${isAtLimit ? "rgba(248,113,113,0.20)" : isNearLimit ? "rgba(245,165,36,0.18)" : "rgba(255,255,255,0.06)"}`, background: isAtLimit ? "rgba(248,113,113,0.05)" : isNearLimit ? "rgba(245,165,36,0.05)" : "#0c0e11", padding: "14px 18px", marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={13} style={{ color: isAtLimit ? "#f87171" : isNearLimit ? "#f5a524" : "rgba(167,139,250,0.6)" }} />
                <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Guarded run usage</p>
              </div>
              <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: isAtLimit ? "#f87171" : isNearLimit ? "#f5a524" : "#f4f5f7" }}>
                {runsUsed} / {runsLimit} runs this month
              </p>
              {isAtLimit && <p style={{ marginTop: 2, fontSize: 12, color: "#8a8f98" }}>Free Bridge limit reached. Upgrade for unlimited runs.</p>}
              {isNearLimit && !isAtLimit && <p style={{ marginTop: 2, fontSize: 12, color: "#8a8f98" }}>{runsLimit - runsUsed} run{runsLimit - runsUsed === 1 ? "" : "s"} remaining.</p>}
            </div>
            {isTrialEligible ? (
              <ProCheckoutButton label="Start 3-day Pro trial" className="shrink-0 rounded-lg bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60" />
            ) : (
              <Link href="/app/billing" style={{ flexShrink: 0, borderRadius: 8, background: "#a78bfa", padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#0b0d10", textDecoration: "none" }}>
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      ) : isTrialing ? (
        <div style={{ borderRadius: 10, border: "1px solid rgba(167,139,250,0.22)", background: "rgba(167,139,250,0.05)", padding: "14px 18px", marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={13} style={{ color: "rgba(167,139,250,0.7)" }} />
                <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Pro Trial active</p>
              </div>
              <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "#f4f5f7" }}>Pro trial active — full access enabled.</p>
              {trialDaysLeft !== null && trialEndLabel && (
                <p style={{ marginTop: 2, fontSize: 12, color: "#8a8f98" }}>
                  {trialDaysLeft === 0 ? "Trial ends today." : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left. Converts to Pro on ${trialEndLabel}.`}
                </p>
              )}
            </div>
            <Link href="/app/billing" style={{ flexShrink: 0, borderRadius: 8, border: "1px solid rgba(167,139,250,0.30)", background: "rgba(167,139,250,0.10)", padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#a78bfa", textDecoration: "none" }}>
              View plan
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Activation pipeline ───────────────────────────────────── */}
      {isComplete ? (
        <div style={{ borderRadius: 10, border: "1px solid rgba(110,231,183,0.16)", background: "rgba(110,231,183,0.04)", padding: "13px 18px", marginBottom: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 8px #6ee7b7", flexShrink: 0 }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7" }}>
                Activation complete. Agent Autopilot is active.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link href="/app/runs" style={{ ...MONO, fontSize: 12, color: "#6ee7b7", textDecoration: "none" }} className="hover:text-[#f4f5f7] transition-colors">
                View run history
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "linear-gradient(180deg, #0e1116, #0a0c10)", overflow: "hidden", marginBottom: 20 }}>
          {/* Pipeline header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>Activation</span>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.08em" }}>· {doneCount} of 5 complete</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, ...MONO, fontSize: 11, color: "#8a8f98", letterSpacing: "0.06em", width: "100%" }} className="sm:w-auto">
              <div style={{ width: 120, maxWidth: "100%", height: 4, background: "#1c2026", borderRadius: 2, overflow: "hidden", flexShrink: 1 }}>
                <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #7c5cff, #a78bfa)", width: `${(doneCount / 5) * 100}%`, transition: "width 0.4s ease" }} />
              </div>
              <span>{Math.round((doneCount / 5) * 100)}%</span>
            </div>
          </div>
          {/* Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-white/[0.06]">
            {PIPELINE_STAGES.map((stage, i) => {
              const status = stageDoneFlags[i] ? "done" : (i === 0 || !!stageDoneFlags[i - 1]) ? "active" : "future";
              const isDone    = status === "done";
              const isActive  = status === "active";
              const isFuture  = status === "future";
              return (
                <div
                  key={stage.n}
                  className="border-t border-white/[0.06] lg:border-t-0"
                  style={{ padding: "20px 18px 18px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.08em" }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: isDone ? "#6ee7b7" : isActive ? "#a78bfa" : "#1c2026",
                      border: isDone ? "none" : isActive ? "none" : "1px solid rgba(255,255,255,0.10)",
                      boxShadow: isDone ? "0 0 8px #6ee7b7" : isActive ? "0 0 8px #a78bfa" : "none",
                    }} />
                    <span>{stage.n} {isDone ? "/ done" : isActive ? "/ current" : "/ pending"}</span>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: isFuture ? "rgba(244,245,247,0.45)" : "#f4f5f7", letterSpacing: "-0.005em" }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: 12.5, color: isFuture ? "rgba(138,143,152,0.5)" : "#8a8f98", lineHeight: 1.4 }}>
                    {stage.desc}
                  </span>
                  <div style={{
                    marginTop: "auto", paddingTop: 10,
                    display: "flex", alignItems: "center", gap: 6,
                    ...MONO, fontSize: 11.5,
                    color: isDone ? "#5a5f68" : isFuture ? "rgba(244,245,247,0.25)" : "#c9ccd2",
                    opacity: isFuture ? 0.5 : 1,
                  }}>
                    <span style={{ color: isDone ? "#6ee7b7" : "#a78bfa" }}>$</span>
                    <span className="truncate">{stage.cmd}</span>
                  </div>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {[0, 1, 2, 3].map((j) => (
                      <span key={j} style={{ flex: 1, height: 2, borderRadius: 1, background: (isDone || (isActive && j === 3)) ? (isActive && j === 3 ? "#a78bfa" : "#6ee7b7") : "#1c2026" }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hero row: contract surface + workspace health ─────────── */}
      <div className="grid grid-cols-1 gap-4 mb-5 lg:grid-cols-[1.4fr_1fr]">

        {/* Run contract surface */}
        <div style={{
          background: "linear-gradient(180deg, #0e1116, #0a0c10)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          overflow: "hidden",
          ...MONO,
          fontSize: 12.5,
          color: "#c9ccd2",
        }}>
          {/* Surface header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg, #14171c, #0d1014)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#2a2e36" }} />)}
            </div>
            <span style={{ fontSize: 11, color: "#8a8f98", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              runtrim · run contract
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a5f68" }}>
              {lastRun ? <>run <b style={{ color: "#c9ccd2", fontWeight: 500 }}>#{lastRun.id.slice(-4)}</b></> : <>awaiting <b style={{ color: "#c9ccd2", fontWeight: 500 }}>first run</b></>}
            </span>
          </div>

          {!lastRun ? (
            /* Empty state */
            <div style={{ padding: "36px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M8 10h8M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-sans), ui-sans-serif", fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", margin: 0 }}>
                No active runs yet
              </h3>
              <p style={{ fontFamily: "var(--font-sans), ui-sans-serif", fontSize: 13.5, color: "#8a8f98", maxWidth: 380, lineHeight: 1.5, margin: 0 }}>
                Once you compile your first contract, the live surface — scope, memory, token budget, finish check, verdict — appears right here.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px 8px 14px", borderRadius: 7, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", maxWidth: "100%" }}>
                <span style={{ color: "#a78bfa" }}>$</span>
                <span style={{ color: "#c9ccd2", overflowX: "auto", whiteSpace: "nowrap", maxWidth: "100%" }}>runtrim agent &quot;fix checkout webhook&quot; --copy</span>
                <CopyButton text='runtrim agent "fix checkout webhook" --copy' />
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5a524", boxShadow: "0 0 6px #f5a524" }} />
                requires <code style={{ color: "#8a8f98" }}>runtrim start</code> first
              </span>
            </div>
          ) : (
            /* Populated contract surface */
            <div>
              {[
                { k: "Task",    v: lastRun.task ?? "Untitled" },
                { k: "Agent",   v: lastRun.agent ?? lastRun.model ?? "—" },
                { k: "Scope",   v: lastRun.allowed_scope ?? "—" },
                { k: "Forbid",  v: lastRun.forbidden_scope ?? "—" },
                { k: "Verdict", v: lastVerdict?.toUpperCase() ?? "—", color: verdictColor(lastRun.status) },
                { k: "Files",   v: String(latestChangedCount) },
                { k: "Risk",    v: latestRisk?.toUpperCase() ?? "—", color: latestRisk === "high" ? "#f87171" : latestRisk === "medium" ? "#f5a524" : "#6ee7b7" },
              ].map(({ k, v, color }) => (
                <div key={k} className="grid grid-cols-1 sm:grid-cols-[120px_1fr]" style={{ gap: 8, padding: "9px 16px", borderBottom: "1px dashed rgba(255,255,255,0.04)", alignItems: "center" }}>
                  <span style={{ fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</span>
                  <span style={{ color: color ?? "#f4f5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{v}</span>
                </div>
              ))}
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
                <Link href={`/app/runs/${lastRun.id}`} style={{ ...MONO, fontSize: 11, color: "#a78bfa", textDecoration: "none" }} className="hover:text-[#c9ccd2] transition-colors">
                  Open run →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Workspace health side card */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>
              Workspace health
            </span>
            <div style={{
              marginLeft: "auto",
              display: "inline-flex", alignItems: "center", gap: 6,
              ...MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              color: workspaceStatusColor,
              padding: "3px 8px", borderRadius: 999,
              background: `${workspaceStatusColor}0f`,
              border: `1px solid ${workspaceStatusColor}40`,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
              {workspaceStatusLabel}
            </div>
          </div>
          {healthRows.map(({ label, note, status }) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: status === "ok" ? "rgba(110,231,183,0.08)" : status === "warn" ? "rgba(245,165,36,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${status === "ok" ? "rgba(110,231,183,0.25)" : status === "warn" ? "rgba(245,165,36,0.28)" : "rgba(255,255,255,0.06)"}`,
                display: "grid", placeItems: "center",
                color: status === "ok" ? "#6ee7b7" : status === "warn" ? "#f5a524" : "#5a5f68",
                fontSize: 10, ...MONO,
              }}>
                {status === "ok" ? "✓" : status === "warn" ? "!" : "·"}
              </div>
              <span style={{ fontSize: 12.5, color: "#f4f5f7" }}>{label}</span>
              <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Runs",
            icon: <Activity size={12} style={{ color: "#a78bfa" }} />,
            value: String(data?.totalRuns ?? 0),
            unit: "all-time",
            delta: hasRuns ? null : "awaiting first run",
          },
          {
            label: "Projects",
            icon: <Layers size={12} style={{ color: "#a78bfa" }} />,
            value: String(data?.totalProjects ?? 0),
            unit: "tracked",
            delta: hasProjects ? null : "none initialized",
          },
          {
            label: "Tokens trimmed",
            icon: <TrendingDown size={12} style={{ color: "#a78bfa" }} />,
            value: data && (data.totalTokens > 0) ? formatTokens(data.totalTokens) : "0",
            unit: "vs unguarded",
            delta: hasRuns ? null : "tracked per run",
          },
          {
            label: "Est. cost saved",
            icon: <Shield size={12} style={{ color: "#a78bfa" }} />,
            value: data && (data.totalCost > 0) ? formatCost(data.totalCost) : "$0.00",
            unit: undefined,
            delta: hasRuns ? null : "first month",
          },
        ].map(({ label, icon, value, unit, delta }) => (
          <div key={label} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
              {icon}
              {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, color: hasRuns ? "#f4f5f7" : "#5a5f68", letterSpacing: "-0.025em", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 6 }}>
              {value}
              {unit && <span style={{ fontSize: 14, color: "#5a5f68", fontWeight: 400 }}>{unit}</span>}
            </div>
            {delta && <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em", marginTop: 6 }}>{delta}</p>}
          </div>
        ))}
      </div>

      {/* ── Recent runs feed ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em" }}>Recent runs</h2>
        <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.06em" }}>workspace</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }} className="sm:w-auto">
          {["All", "Passed", "Blocked"].map((chip, i) => (
            <span
              key={chip}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 9px",
                border: `1px solid ${i === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)"}`,
                borderRadius: 5, fontSize: 12,
                color: i === 0 ? "#f4f5f7" : "#8a8f98",
                background: i === 0 ? "#16191e" : "#0c0e11",
              }}
            >
              {i === 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7" }} />}
              {chip}
            </span>
          ))}
          <Link href="/app/runs" style={{ ...MONO, fontSize: 11, color: "#5a5f68", textDecoration: "none" }} className="hover:text-[#c9ccd2] transition-colors">
            View all →
          </Link>
        </div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden", marginBottom: 20 }}>
        {/* Table header */}
        <div className="hidden sm:grid" style={{ gridTemplateColumns: "32px 1.4fr 1fr 100px 80px 110px 90px", gap: 14, padding: "10px 16px", background: "#111317", ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span />
          <span>Task</span>
          <span>Scope / Agent</span>
          <span>Agent</span>
          <span>Files</span>
          <span>Verdict</span>
          <span style={{ textAlign: "right" }}>When</span>
        </div>

        {!hasRuns ? (
          /* Empty state */
          <div style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "#111317", border: "1px solid rgba(255,255,255,0.10)", display: "grid", placeItems: "center", color: "#5a5f68" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", margin: 0 }}>No runs synced yet</p>
            <p style={{ fontSize: 13, color: "#8a8f98", maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
              Compile a contract locally with the CLI, then the next finish syncs the run here with task, scope, diff, and verdict.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {(['runtrim agent "your task" --copy', "runtrim finish"] as const).map((cmd) => (
                <div key={cmd} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 12px", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, background: "#16191e", ...MONO, fontSize: 12, color: "#c9ccd2" }}>
                  <span style={{ color: "#a78bfa" }}>$</span>
                  <span>{cmd}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Run rows */
          (data?.recentRuns ?? []).slice(0, 8).map((run) => {
            const changedCount = [...(run.changed_files ?? []), ...(run.watch_changed_files ?? [])].length;
            const when = toTimeMs(run.evaluated_at_local) ?? toTimeMs(run.created_at_local) ?? toTimeMs(run.created_at) ?? toTimeMs(run.synced_at);
            const ledColor = verdictColor(run.status);
            const vclass = verdictClass(run.status);
            return (
              <Link
                key={run.id}
                href={`/app/runs/${run.id}`}
                style={{ textDecoration: "none" }}
                className="block hover:bg-white/[0.02] transition-colors"
              >
                {/* Mobile row */}
                <div className="sm:hidden" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: ledColor, boxShadow: `0 0 6px ${ledColor}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#f4f5f7", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.task ?? "Untitled"}</span>
                    <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", flexShrink: 0 }}>{relativeTime(when)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingLeft: 18 }}>
                    <span style={{
                      ...MONO, fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
                      color: vclass === "passed" ? "#6ee7b7" : vclass === "blocked" ? "#f87171" : vclass === "review" ? "#f5a524" : "#8a8f98",
                      background: vclass === "passed" ? "rgba(110,231,183,0.07)" : vclass === "blocked" ? "rgba(248,113,113,0.07)" : vclass === "review" ? "rgba(245,165,36,0.07)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${vclass === "passed" ? "rgba(110,231,183,0.28)" : vclass === "blocked" ? "rgba(248,113,113,0.28)" : vclass === "review" ? "rgba(245,165,36,0.30)" : "rgba(255,255,255,0.10)"}`,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                      {run.status?.toUpperCase() ?? "—"}
                    </span>
                    <span style={{ ...MONO, fontSize: 11, color: "#8a8f98" }}>{changedCount} files</span>
                  </div>
                </div>

                {/* Desktop row */}
                <div className="hidden sm:grid" style={{ gridTemplateColumns: "32px 1.4fr 1fr 100px 80px 110px 90px", gap: 14, padding: "12px 16px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: ledColor, boxShadow: `0 0 6px ${ledColor}` }} />
                  </div>
                  <div>
                    <span style={{ color: "#f4f5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginRight: 8 }}>#{run.id.slice(-4)}</span>
                      {run.task ?? "Untitled"}
                    </span>
                  </div>
                  <span style={{ ...MONO, fontSize: 12, color: "#8a8f98", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {run.allowed_scope ?? "—"}
                  </span>
                  <span style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {run.agent ?? run.model ?? "—"}
                  </span>
                  <span style={{ ...MONO, fontSize: 12, color: "#8a8f98", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {changedCount}
                  </span>
                  <span style={{
                    ...MONO, fontSize: 10.5, padding: "2px 8px", borderRadius: 4, display: "inline-block",
                    color: vclass === "passed" ? "#6ee7b7" : vclass === "blocked" ? "#f87171" : vclass === "review" ? "#f5a524" : "#8a8f98",
                    background: vclass === "passed" ? "rgba(110,231,183,0.07)" : vclass === "blocked" ? "rgba(248,113,113,0.07)" : vclass === "review" ? "rgba(245,165,36,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${vclass === "passed" ? "rgba(110,231,183,0.28)" : vclass === "blocked" ? "rgba(248,113,113,0.28)" : vclass === "review" ? "rgba(245,165,36,0.30)" : "rgba(255,255,255,0.10)"}`,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    alignSelf: "flex-start",
                  }}>
                    {run.status?.toUpperCase() ?? "—"}
                  </span>
                  <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", textAlign: "right" }}>
                    {relativeTime(when)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Protection + Agents ───────────────────────────────────── */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* Protection card */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Protection</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", marginTop: 2 }}>Local-first</p>
            </div>
            <div style={{
              marginLeft: "auto",
              display: "inline-flex", alignItems: "center", gap: 6,
              ...MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#6ee7b7", padding: "3px 8px", borderRadius: 999,
              background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.25)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
              active
            </div>
          </div>
          <div style={{ padding: "6px 0" }}>
            {protectionRows.map(({ label, sub, status, state }) => (
              <div key={label} style={{ padding: "11px 16px", display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 12, alignItems: "center", borderBottom: "1px dashed rgba(255,255,255,0.04)" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center",
                  ...MONO, fontSize: 11,
                  color: status === "ok" ? "#6ee7b7" : "#f5a524",
                  background: status === "ok" ? "rgba(110,231,183,0.08)" : "rgba(245,165,36,0.08)",
                  border: `1px solid ${status === "ok" ? "rgba(110,231,183,0.25)" : "rgba(245,165,36,0.28)"}`,
                }}>
                  {status === "ok" ? "✓" : "!"}
                </div>
                <div>
                  <p style={{ fontSize: 13, color: "#f4f5f7", margin: 0 }}>{label}</p>
                  <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.06em", margin: "2px 0 0" }}>{sub}</p>
                </div>
                <span style={{
                  ...MONO, fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
                  background: status === "ok" ? "rgba(110,231,183,0.06)" : "rgba(245,165,36,0.06)",
                  border: `1px solid ${status === "ok" ? "rgba(110,231,183,0.25)" : "rgba(245,165,36,0.25)"}`,
                  color: status === "ok" ? "#6ee7b7" : "#f5a524",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  {state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agents card */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Agents</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", marginTop: 2 }}>8 supported</p>
            </div>
            <div style={{
              marginLeft: "auto",
              display: "inline-flex", alignItems: "center", gap: 6,
              ...MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#f5a524", padding: "3px 8px", borderRadius: 999,
              background: "rgba(245,165,36,0.06)", border: "1px solid rgba(245,165,36,0.25)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
              {hasConnectedCli ? "available" : "not configured"}
            </div>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {AGENT_TILES.map(({ icon, name }) => (
              <div
                key={name}
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8, background: "#111317",
                  padding: 10, display: "flex", flexDirection: "column", gap: 6,
                  minHeight: 80,
                  opacity: hasConnectedCli ? 1 : 0.5,
                  borderStyle: hasConnectedCli ? "solid" : "dashed",
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 5,
                  background: "#16191e", border: "1px solid rgba(255,255,255,0.10)",
                  display: "grid", placeItems: "center",
                  ...MONO, fontSize: 10.5, fontWeight: 600, color: "#f4f5f7",
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>{name}</span>
                <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 5, ...MONO, fontSize: 9.5, color: "#5a5f68", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#5a5f68" }} />
                  available
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CI Gate note (Builder/Team) ───────────────────────────── */}
      {(plan === "builder" || plan === "team") && (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, background: "#0c0e11", padding: "14px 18px", marginBottom: 14 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>CI Gate</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7", marginTop: 4 }}>Block risky AI-generated PRs before merge.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <CopyButton text="runtrim ci setup" label="Copy setup" />
              <Link href="/app/install" style={{ display: "inline-flex", alignItems: "center", borderRadius: 7, border: "1px solid rgba(255,255,255,0.10)", padding: "6px 12px", fontSize: 12, color: "#c9ccd2", textDecoration: "none" }}>
                Open guide
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Cloud sync status ─────────────────────────────────────── */}
      <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, background: "#0e1116", padding: "14px 18px" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7" }}>
              {plan === "free"
                ? "Cloud sync and restore metadata require Pro."
                : "Auto-sync is active on your plan."}
            </p>
            <p style={{ marginTop: 3, fontSize: 12, color: "#5a5f68", lineHeight: 1.5 }}>
              {plan === "free"
                ? "Free includes local setup, memory, and guarded runs. Upgrade to Pro to unlock cloud run history."
                : "Run runtrim finish from any project to sync the run report, verdict, and restore metadata here."}
            </p>
          </div>
          <Link
            href="/app/connect"
            style={{ display: "inline-flex", alignItems: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#8a8f98", textDecoration: "none", flexShrink: 0 }}
            className="hover:border-white/20 hover:text-[#f4f5f7] transition-colors"
          >
            {hasConnectedCli ? "Manage CLI" : "Connect CLI"}
          </Link>
        </div>
      </div>

    </div>
  );
}
