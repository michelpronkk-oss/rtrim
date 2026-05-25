import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Activity, Layers, TrendingDown, Zap, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getEntitlements, currentPeriod, effectivePlanId } from "@/lib/entitlements";
import { planOrder } from "@/lib/plans";
import { trialEligible } from "@/lib/billing-cta";
import { OnboardingChecklist } from "@/components/app/onboarding-checklist";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";

export const metadata: Metadata = {
  title: "Overview | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
  bridge_runs_used: number | null;
  bridge_runs_period: string | null;
  current_period_end: string | null;
  cli_token_created_at: string | null;
  payment_subscription_id: string | null;
};

// Only the fields needed for the "Last guarded run" card
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
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
};

// Only the two numeric columns needed for aggregate sums
type AggRunRow = {
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
};

type ProjectRow = { id: string; name: string | null };

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

async function getDashboardData(userId: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  // ── Five parallel queries ──────────────────────────────────────────────
  // 1. Profile (plan + bridge usage)
  // 2. Exact run count — no data fetched, just the integer
  // 3. Aggregate columns across ALL runs (no artificial limit)
  //    Note: Supabase default server limit is ~1 000 rows; sufficient for beta.
  // 4. All projects (count is small)
  // 5. Last 10 runs for the "Last guarded run" card only
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
      .select("id, task, status, risk_before, risk_after, changed_files, watch_changed_files, agent, model, created_at_local, evaluated_at_local, created_at, synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(12),
  ]);

  const profile    = profileResult.data as ProfileRow | null;
  const totalRuns  = runCountResult.count ?? 0;
  const aggRuns    = (runAggResult.data   ?? []) as AggRunRow[];
  const projects   = (projectsResult.data ?? []) as ProjectRow[];
  const recentRuns = (recentRunResult.data ?? []) as RecentRunRow[];

  const rawPlan     = profile?.plan || "free";
  const rawStatus   = profile?.plan_status ?? null;
  const plan        = effectivePlanId(rawPlan, rawStatus);
  const planStatus  = rawStatus;
  const periodEnd   = profile?.current_period_end ?? null;
  const period      = currentPeriod();
  const ents        = getEntitlements(plan);
  const runsUsed    = profile?.bridge_runs_period === period
    ? (profile.bridge_runs_used ?? 0)
    : 0;
  const runsLimit   = ents.bridgeRunsPerMonth;

  // Onboarding state
  const hasConnectedCli  = !!(profile?.cli_token_created_at);
  const hasCompletedRun  = recentRuns.some((r) => {
    const s = (r.status ?? "").toLowerCase();
    return s === "guarded" || s === "passed" || s === "completed";
  });

  // Aggregate across ALL synced runs (not capped at 50)
  const totalTokens   = aggRuns.reduce((s, r) => s + (r.estimated_tokens_trimmed  ?? 0), 0);
  const totalCost     = aggRuns.reduce((s, r) => s + (r.estimated_dollars_standard ?? 0), 0);
  const totalProjects = projects.length;

  // Most recent "interesting" run for the card
  recentRuns.sort((a, b) => runSortTime(b) - runSortTime(a));
  const lastRun =
    recentRuns.find((r) => {
      const s = (r.status ?? "").toLowerCase();
      return s === "guarded" || s === "completed" || s === "passed";
    }) ??
    recentRuns[0] ??
    null;

  const hasSubscription = !!(profile?.payment_subscription_id);

  return { plan, planStatus, periodEnd, runsUsed, runsLimit, totalRuns, totalProjects, totalTokens, totalCost, lastRun, hasConnectedCli, hasCompletedRun, recentRuns, hasSubscription };
}

const RISK_BADGE: Record<string, string> = {
  low:    "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  medium: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  high:   "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="font-mono text-[11px] text-[#3a3e46]">—</span>;
  const cls = RISK_BADGE[level.toLowerCase()] ?? "border-white/10 text-[#8a8f98]";
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${cls}`}>
      {level}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-3.5 text-[#7C6DFA]/60" />
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">{label}</p>
      </div>
      <p className="text-[2rem] font-bold tabular-nums tracking-tight text-[#f4f5f7]">{value}</p>
      {sub && <p className="mt-1 font-mono text-[11px] text-[#3a3e46]">{sub}</p>}
    </div>
  );
}

function StatePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${
        ok ? "border-[#4DE8B0]/24 bg-[#4DE8B0]/8 text-[#98e4c8]" : "border-[#F0BF72]/20 bg-[#F0BF72]/8 text-[#F0BF72]"
      }`}
    >
      {label}
    </span>
  );
}

function gateLabel(currentPlan: string, requiredPlan: "pro" | "builder" | "team"): string {
  const currentIdx = planOrder.indexOf(currentPlan as (typeof planOrder)[number]);
  const requiredIdx = planOrder.indexOf(requiredPlan);
  if (currentIdx >= 0 && currentIdx >= requiredIdx) return "Included";
  if (requiredPlan === "pro") return "Pro required";
  if (requiredPlan === "builder") return "Builder required";
  return "Team required";
}

function gateLabelCls(label: string): string {
  return label === "Included" ? "text-[#4DE8B0]" : "text-[#5a5f68]";
}

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data    = await getDashboardData(user.id);
  const isEmpty = !data || data.totalRuns === 0;

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `~${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `~${(n / 1_000).toFixed(0)}k`
    : String(n);

  const formatCost = (n: number) =>
    n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k`
    : n >= 0.01 ? `$${n.toFixed(2)}`
    : "$0.00";

  const planDataAvailable = data !== null;
  const plan            = data?.plan ?? "free";
  const planStatus      = data?.planStatus ?? null;
  const periodEnd       = data?.periodEnd ?? null;
  const isTrialing      = plan !== "free" && planStatus === "trialing";
  const isCanceledInPeriod = plan !== "free" &&
    (planStatus === "canceled" || planStatus === "cancelled");
  const isPastDue       = planStatus === "past_due";
  const hasSubscription = data?.hasSubscription ?? false;
  const isTrialEligible = trialEligible({ plan, planStatus, paymentSubscriptionId: hasSubscription ? "present" : null });

  // Onboarding state
  const hasConnectedCli  = data?.hasConnectedCli  ?? false;
  const hasProjects      = (data?.totalProjects   ?? 0) > 0;
  const hasRuns          = (data?.totalRuns       ?? 0) > 0;
  const hasCompletedRun  = data?.hasCompletedRun  ?? false;
  const lastVerdict      = data?.lastRun?.status ?? null;
  const hasLastVerdict   = Boolean(lastVerdict);
  const runsUsed    = data?.runsUsed ?? 0;
  const runsLimit   = data?.runsLimit ?? 5;
  const isUnlimited = runsLimit === null;
  const isNearLimit = !isUnlimited && runsUsed >= (runsLimit - 1);
  const isAtLimit   = !isUnlimited && runsUsed >= runsLimit;

  // Trial days remaining
  const trialDaysLeft = (() => {
    if (!isTrialing || !periodEnd) return null;
    const diff = new Date(periodEnd).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  })();

  const trialEndLabel = (() => {
    if (!periodEnd) return null;
    return new Date(periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const PLAN_BADGE: Record<string, string> = {
    free:    "border-white/12 text-[#6A7398]",
    pro:     "border-[#7C6DFA]/30 bg-[#7C6DFA]/10 text-[#a78bfa]",
    builder: "border-[#4DE8B0]/25 bg-[#4DE8B0]/8 text-[#4DE8B0]",
    team:    "border-[#F0BF72]/25 bg-[#F0BF72]/8 text-[#F0BF72]",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">Overview</p>
          <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">Dashboard</h1>
        </div>
        <span className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] ${isPastDue ? "border-[#FF7B5C]/30 bg-[#FF7B5C]/8 text-[#FF7B5C]" : PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
          {isPastDue ? "Payment failed" : isTrialing ? "Pro Trial" : plan}
        </span>
      </div>

      {/* Activation onboarding — shown until first run is synced and complete */}
      <OnboardingChecklist
        hasConnectedCli={hasConnectedCli}
        hasProjects={hasProjects}
        hasRuns={hasRuns}
        hasCompletedRun={hasCompletedRun}
        plan={plan}
        planStatus={planStatus}
      />

      {/* Subscription warning banners */}
      {isCanceledInPeriod && (
        <div className="rounded-xl border border-[#F0BF72]/22 bg-[#F0BF72]/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#F0BF72]/70">Subscription canceled</p>
              <p className="mt-1 text-[14px] font-semibold text-[#f4f5f7]">
                {periodEnd
                  ? `Access continues until ${new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
                  : "Your plan has been canceled."}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8a8f98]">Resubscribe to keep your features after this period.</p>
            </div>
            <Link href="/app/billing" className="shrink-0 rounded-lg border border-[#F0BF72]/30 bg-[#F0BF72]/10 px-3.5 py-2 text-[12px] font-medium text-[#F0BF72] transition-colors hover:bg-[#F0BF72]/18">
              Resubscribe
            </Link>
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="rounded-xl border border-[#FF7B5C]/22 bg-[#FF7B5C]/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#FF7B5C]/70">Payment failed</p>
              <p className="mt-1 text-[14px] font-semibold text-[#f4f5f7]">Your last payment did not go through.</p>
              <p className="mt-0.5 text-[12px] text-[#8a8f98]">Update your payment method to avoid losing access.</p>
            </div>
            <a href="mailto:hello@runtrim.com?subject=RunTrim payment issue" className="shrink-0 rounded-lg border border-[#FF7B5C]/30 bg-[#FF7B5C]/10 px-3.5 py-2 text-[12px] font-medium text-[#FF7B5C] transition-colors hover:bg-[#FF7B5C]/18">
              Contact support
            </a>
          </div>
        </div>
      )}

      {/* Plan / usage card */}
      {plan === "free" ? (
        <div className={`rounded-xl border px-5 py-4 ${isAtLimit ? "border-[#FF7B5C]/20 bg-[#FF7B5C]/5" : isNearLimit ? "border-[#F0BF72]/18 bg-[#F0BF72]/5" : "border-white/6 bg-[#0c0e11]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className={`size-3.5 ${isAtLimit ? "text-[#FF7B5C]" : isNearLimit ? "text-[#F0BF72]" : "text-[#7C6DFA]/60"}`} />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">
                  Bridge Mode usage
                </p>
              </div>
              <p className={`mt-1.5 text-[14px] font-semibold ${isAtLimit ? "text-[#FF8F8F]" : isNearLimit ? "text-[#F0BF72]" : "text-[#f4f5f7]"}`}>
                {runsUsed} / {runsLimit} runs this month
              </p>
              {isAtLimit && (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  Free Bridge limit reached. Upgrade for unlimited runs.
                </p>
              )}
              {isNearLimit && !isAtLimit && (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  {runsLimit - runsUsed} run{runsLimit - runsUsed === 1 ? "" : "s"} remaining this month.
                </p>
              )}
            </div>
            {isPastDue ? (
              <Link
                href="/app/billing"
                className="shrink-0 rounded-lg bg-[#FF7B5C] px-3.5 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
              >
                Update payment method
              </Link>
            ) : isTrialEligible ? (
              <ProCheckoutButton
                label="Start 3-day Pro trial"
                className="shrink-0 rounded-lg bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60"
              />
            ) : (
              <Link
                href="/app/billing"
                className="shrink-0 rounded-lg bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      ) : isTrialing ? (
        <div className="rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-[#a78bfa]/70" />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">
                  Pro Trial active
                </p>
              </div>
              <p className="mt-1.5 text-[14px] font-semibold text-[#f4f5f7]">
                Pro trial active — full access enabled.
              </p>
              {trialDaysLeft !== null && trialEndLabel ? (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  {trialDaysLeft === 0
                    ? `Trial ends today. Your subscription continues after.`
                    : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left. Converts to Pro on ${trialEndLabel}.`}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  Full Pro access. Converts to paid after trial.
                </p>
              )}
            </div>
            <Link
              href="/app/billing"
              className="shrink-0 rounded-lg border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-3.5 py-2 text-[12px] font-medium text-[#a78bfa] transition-colors hover:bg-[#7C6DFA]/18"
            >
              View plan
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-4">
          <div className="flex items-center gap-3">
            <Zap className="size-3.5 text-[#4DE8B0]/60" />
            <p className="text-[13px] font-semibold text-[#f4f5f7]">Bridge Mode: Unlimited</p>
            <span className="font-mono text-[11px] text-[#5a5f68]">
              {plan === "pro" ? "Pro" : plan === "builder" ? "Builder" : "Team"} plan active
            </span>
          </div>
        </div>
      )}

      {/* Stats — derived from all-time aggregates, not a capped query */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Runs"
          value={String(data?.totalRuns ?? 0)}
          sub="all-time"
          icon={Activity}
        />
        <StatCard
          label="Projects"
          value={String(data?.totalProjects ?? 0)}
          sub="tracked"
          icon={Layers}
        />
        <StatCard
          label="Tokens saved"
          value={data && data.totalTokens > 0 ? formatTokens(data.totalTokens) : "0"}
          sub="across all synced runs"
          icon={TrendingDown}
        />
        <StatCard
          label="Cost saved"
          value={data && data.totalCost > 0 ? formatCost(data.totalCost) : "$0.00"}
          sub="estimated cumulative savings"
          icon={Shield}
        />
      </div>

      <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Control state</p>
          <p className="text-[11px] text-[#5a5f68]">RunTrim-aware projects keep memory, instructions, and MCP guidance in place.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">Project memory</p>
            <div className="mt-2"><StatePill ok={hasProjects || hasRuns} label={hasProjects || hasRuns ? "updated" : "setup needed"} /></div>
          </div>
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">Agent instructions</p>
            <div className="mt-2"><StatePill ok={hasConnectedCli} label={hasConnectedCli ? "installed" : "setup needed"} /></div>
          </div>
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">MCP</p>
            <div className="mt-2"><StatePill ok={true} label="available" /></div>
          </div>
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">Local bridge</p>
            <div className="mt-2"><StatePill ok={hasConnectedCli} label={hasConnectedCli ? "available" : "available after CLI connect"} /></div>
          </div>
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">Last finish verdict</p>
            <div className="mt-2"><StatePill ok={hasLastVerdict} label={hasLastVerdict ? String(lastVerdict).toUpperCase() : "not recorded"} /></div>
          </div>
          <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
            <p className="text-[12px] text-[#8a8f98]">Active contract</p>
            <div className="mt-2"><StatePill ok={hasRuns} label={hasRuns ? "from latest run" : "use runtrim_create_contract"} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Cloud and governance access</p>
        {!planDataAvailable ? (
          <p className="mt-4 text-[12px] text-[#8a8f98]">
            Plan status unavailable. Local features remain available. Sign in or refresh billing to check cloud sync access.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["Cloud sync", "Auto-sync dashboard", "Cloud run history", "Memory sync"] as const).map((label) => {
              const lbl = gateLabel(plan, "pro");
              return (
                <div key={label} className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
                  <p className="text-[12px] text-[#8a8f98]">{label}</p>
                  <p className={`mt-1 font-mono text-[11px] ${gateLabelCls(lbl)}`}>{lbl}</p>
                </div>
              );
            })}
            <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
              <p className="text-[12px] text-[#8a8f98]">Advanced reports and multi-project</p>
              {(() => { const lbl = gateLabel(plan, "builder"); return <p className={`mt-1 font-mono text-[11px] ${gateLabelCls(lbl)}`}>{lbl}</p>; })()}
            </div>
            <div className="rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
              <p className="text-[12px] text-[#8a8f98]">Team approvals and audit logs</p>
              {(() => { const lbl = gateLabel(plan, "team"); return <p className={`mt-1 font-mono text-[11px] ${gateLabelCls(lbl)}`}>{lbl}</p>; })()}
              <p className="mt-1 text-[11px] text-[#5a5f68]">Team policies and GitHub checks: coming soon</p>
            </div>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-6 py-10 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8"
               style={{ boxShadow: "0 0 24px rgba(124,109,250,0.08)" }}>
            <Shield className="size-5 text-[#a78bfa]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#f4f5f7]">
            Connect your first guarded run.
          </h2>
          <p className="mx-auto mt-2 max-w-[400px] text-[13px] leading-[1.7] text-[#8a8f98]">
            Free CLI works locally. Cloud sync is opening for Pro, Builder, and Team. Once connected, every guarded run will appear here with its contract, memory, risk, and savings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app/install" className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ boxShadow: "0 4px 16px rgba(124,109,250,0.28)" }}>
              Install CLI <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/app/connect" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#f4f5f7]">
              Connect CLI
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">
            Recent runs
          </p>
          <div className="space-y-2">
            {(data?.recentRuns ?? []).slice(0, 6).map((run) => {
              const changedCount = [...(run.changed_files ?? []), ...(run.watch_changed_files ?? [])].length;
              const when =
                toTimeMs(run.evaluated_at_local) ??
                toTimeMs(run.created_at_local) ??
                toTimeMs(run.created_at) ??
                toTimeMs(run.synced_at);
              return (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/6 bg-[#0a0c10] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#f4f5f7]">{run.task ?? "Untitled run"}</p>
                    <p className="mt-1 font-mono text-[10px] text-[#5a5f68]">
                      {(run.agent ?? run.model ?? "agent n/a")} · {when ? new Date(when).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatePill ok={Boolean(run.status)} label={(run.status ?? "unknown").toUpperCase()} />
                    <RiskBadge level={run.risk_after ?? run.risk_before} />
                    <span className="font-mono text-[10px] text-[#8a8f98]">{changedCount} files</span>
                    <Link href={`/app/runs/${run.id}`} className="font-mono text-[11px] text-[#a78bfa] transition-colors hover:text-[#c9ccd2]">
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync banner */}
      <div className="rounded-xl border border-white/6 bg-[#0e1116] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#f4f5f7]">
              {!planDataAvailable
                ? "Sign in to check cloud sync access."
                : plan === "free"
                  ? "Cloud sync requires Pro."
                  : "CLI cloud sync is available on your plan."}
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#5a5f68]">
              {!planDataAvailable
                ? "Plan status unavailable. Local features remain available. Sign in or refresh billing to check cloud sync access."
                : plan === "free"
                  ? "Free includes local setup, local memory, and local run history. Upgrade to Pro to unlock auto-sync dashboard, cloud run history, and memory sync."
                  : <>Connect your CLI with <code className="font-mono text-[#a78bfa]">runtrim login</code> then run <code className="font-mono text-[#a78bfa]">runtrim sync</code> from any project.</>}
            </p>
          </div>
          <Link
            href="/app/connect"
            className="shrink-0 rounded-lg border border-white/10 px-3.5 py-2 text-[12px] font-medium text-[#8a8f98] transition-colors hover:border-white/20 hover:text-[#f4f5f7]"
          >
            Connect CLI
          </Link>
        </div>
      </div>
    </div>
  );
}
