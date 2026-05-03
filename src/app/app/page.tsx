import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Activity, Layers, TrendingDown, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getEntitlements, currentPeriod } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Overview | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
  bridge_runs_used: number | null;
  bridge_runs_period: string | null;
};

type RunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
  synced_at: string | null;
};

type ProjectRow = { id: string; name: string | null };

async function getDashboardData(userId: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const [profileResult, runsResult, projectsResult] = await Promise.all([
    supabase
      .from("runtrim_profiles")
      .select("plan, plan_status, bridge_runs_used, bridge_runs_period")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("runtrim_runs")
      .select("id, task, status, risk_before, risk_after, estimated_tokens_trimmed, estimated_dollars_standard, synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(50),
    supabase
      .from("runtrim_projects")
      .select("id, name")
      .eq("user_id", userId),
  ]);

  const profile  = profileResult.data as ProfileRow | null;
  const runs     = (runsResult.data ?? []) as RunRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];

  const plan       = profile?.plan || "free";
  const period     = currentPeriod();
  const ents       = getEntitlements(plan);
  const runsUsed   = profile?.bridge_runs_period === period
    ? (profile.bridge_runs_used ?? 0)
    : 0;
  const runsLimit  = ents.bridgeRunsPerMonth; // null = unlimited

  const totalRuns    = runs.length;
  const totalProjects = projects.length;
  const totalTokens  = runs.reduce((s, r) => s + (r.estimated_tokens_trimmed ?? 0), 0);
  const totalCost    = runs.reduce((s, r) => s + (r.estimated_dollars_standard ?? 0), 0);
  const lastRun      = runs[0] ?? null;

  return {
    plan, runsUsed, runsLimit,
    runs, projects, totalRuns, totalProjects, totalTokens, totalCost, lastRun,
  };
}

const RISK_BADGE: Record<string, string> = {
  low:    "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  medium: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  high:   "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="font-mono text-[11px] text-[#2E3554]">—</span>;
  const cls = RISK_BADGE[level.toLowerCase()] ?? "border-white/10 text-[#9699BE]";
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
    <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-5 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-3.5 text-[#7C6DFA]/60" />
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">{label}</p>
      </div>
      <p className="text-[2rem] font-bold tabular-nums tracking-tight text-[#EDEEFF]">{value}</p>
      {sub && <p className="mt-1 font-mono text-[11px] text-[#2E2E50]">{sub}</p>}
    </div>
  );
}

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getDashboardData(user.id);
  const isEmpty = !data || data.totalRuns === 0;

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `~${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `~${(n / 1_000).toFixed(0)}k`
    : String(n);

  const plan        = data?.plan ?? "free";
  const runsUsed    = data?.runsUsed ?? 0;
  const runsLimit   = data?.runsLimit ?? 5;
  const isUnlimited = runsLimit === null;
  const isNearLimit = !isUnlimited && runsUsed >= (runsLimit - 1);
  const isAtLimit   = !isUnlimited && runsUsed >= runsLimit;

  const PLAN_BADGE: Record<string, string> = {
    free:    "border-white/12 text-[#6A7398]",
    pro:     "border-[#7C6DFA]/30 bg-[#7C6DFA]/10 text-[#9E91FF]",
    builder: "border-[#4DE8B0]/25 bg-[#4DE8B0]/8 text-[#4DE8B0]",
    team:    "border-[#F0BF72]/25 bg-[#F0BF72]/8 text-[#F0BF72]",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Overview</p>
          <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">Dashboard</h1>
        </div>
        <span className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] ${PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
          {plan}
        </span>
      </div>

      {/* Plan / usage card */}
      {plan === "free" ? (
        <div className={`rounded-xl border px-5 py-4 ${isAtLimit ? "border-[#FF7B5C]/20 bg-[#FF7B5C]/5" : isNearLimit ? "border-[#F0BF72]/18 bg-[#F0BF72]/5" : "border-white/7 bg-[#0C0C20]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className={`size-3.5 ${isAtLimit ? "text-[#FF7B5C]" : isNearLimit ? "text-[#F0BF72]" : "text-[#7C6DFA]/60"}`} />
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">
                  Bridge Mode usage
                </p>
              </div>
              <p className={`mt-1.5 text-[14px] font-semibold ${isAtLimit ? "text-[#FF8F8F]" : isNearLimit ? "text-[#F0BF72]" : "text-[#EDEEFF]"}`}>
                {runsUsed} / {runsLimit} runs this month
              </p>
              {isAtLimit && (
                <p className="mt-0.5 text-[12px] text-[#5E6A88]">
                  Free Bridge limit reached. Upgrade for unlimited runs.
                </p>
              )}
              {isNearLimit && !isAtLimit && (
                <p className="mt-0.5 text-[12px] text-[#5E6A88]">
                  {runsLimit - runsUsed} run{runsLimit - runsUsed === 1 ? "" : "s"} remaining this month.
                </p>
              )}
            </div>
            <Link
              href="/pricing"
              className={`shrink-0 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors ${isAtLimit ? "bg-[#7C6DFA] text-white hover:opacity-85" : "border border-white/10 text-[#9699BE] hover:border-white/20 hover:text-[#EDEEFF]"}`}
              style={isAtLimit ? { boxShadow: "0 4px 14px rgba(124,109,250,0.28)" } : undefined}
            >
              {isAtLimit ? "Upgrade to Pro" : "View plans"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-5 py-4">
          <div className="flex items-center gap-3">
            <Zap className="size-3.5 text-[#4DE8B0]/60" />
            <p className="text-[13px] font-semibold text-[#EDEEFF]">Bridge Mode: Unlimited</p>
            <span className="font-mono text-[11px] text-[#4D5070]">
              {plan === "pro" ? "Pro" : plan === "builder" ? "Builder" : "Team"} plan active
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Runs"         value={String(data?.totalRuns ?? 0)}  sub="synced from CLI"       icon={Activity}     />
        <StatCard label="Projects"     value={String(data?.totalProjects ?? 0)} sub="tracked"            icon={Layers}       />
        <StatCard label="Tokens saved" value={data && data.totalTokens > 0 ? formatTokens(data.totalTokens) : "0"} sub="estimated" icon={TrendingDown} />
        <StatCard label="Cost saved"   value={data && data.totalCost > 0 ? `$${data.totalCost.toFixed(2)}` : "$0.00"} sub="estimated, local only" icon={Shield} />
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-6 py-10 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8"
               style={{ boxShadow: "0 0 24px rgba(124,109,250,0.08)" }}>
            <Shield className="size-5 text-[#9E91FF]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
            Connect your first guarded run.
          </h2>
          <p className="mx-auto mt-2 max-w-[400px] text-[13px] leading-[1.7] text-[#5E6A88]">
            Free CLI works locally. Cloud sync is opening for Pro, Builder, and Team. Once connected, every guarded run will appear here with its contract, memory, risk, and savings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app/install" className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ boxShadow: "0 4px 16px rgba(124,109,250,0.28)" }}>
              Install CLI <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/app/connect" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]">
              Connect CLI
            </Link>
          </div>
        </div>
      ) : (
        data?.lastRun && (
          <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-5 py-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">
              Last guarded run
            </p>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#EDEEFF]">
                  {data.lastRun.task ?? "Untitled run"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[#4D5070]">
                  {data.lastRun.synced_at ? new Date(data.lastRun.synced_at).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={data.lastRun.risk_after ?? data.lastRun.risk_before} />
                <Link href={`/app/runs/${data.lastRun.id}`}
                      className="font-mono text-[11px] text-[#7C6DFA] transition-colors hover:text-[#B2A7FF]">
                  View report
                </Link>
              </div>
            </div>
          </div>
        )
      )}

      {/* Sync banner */}
      <div className="rounded-xl border border-white/6 bg-[#08081C] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#EDEEFF]">CLI cloud sync is live.</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#4D5070]">
              Connect your CLI with <code className="font-mono text-[#9E91FF]">runtrim login</code> then run{" "}
              <code className="font-mono text-[#9E91FF]">runtrim sync</code> from any project.
            </p>
          </div>
          <Link href="/app/connect"
                className="shrink-0 rounded-lg border border-white/10 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]">
            Connect CLI
          </Link>
        </div>
      </div>
    </div>
  );
}
