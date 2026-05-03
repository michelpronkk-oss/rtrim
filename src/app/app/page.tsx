import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Activity, Layers, TrendingDown } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

export const metadata: Metadata = {
  title: "Overview | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type EarlyAccessRow = {
  email: string;
  plan_interest: string | null;
  status: string;
  created_at: string;
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

type ProjectRow = {
  id: string;
  name: string | null;
};

async function getDashboardData(userId: string, email: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const [runsResult, projectsResult, earlyAccessResult] = await Promise.all([
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
    supabase
      .from("runtrim_early_access")
      .select("email, plan_interest, status, created_at")
      .eq("email", email)
      .maybeSingle(),
  ]);

  const runs = (runsResult.data ?? []) as RunRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const earlyAccess = earlyAccessResult.data as EarlyAccessRow | null;

  const totalRuns = runs.length;
  const totalProjects = projects.length;
  const totalTokens = runs.reduce((s, r) => s + (r.estimated_tokens_trimmed ?? 0), 0);
  const totalCost = runs.reduce((s, r) => s + (r.estimated_dollars_standard ?? 0), 0);
  const lastRun = runs[0] ?? null;

  return { runs, projects, earlyAccess, totalRuns, totalProjects, totalTokens, totalCost, lastRun };
}

const RISK_BADGE: Record<string, string> = {
  low:      "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  medium:   "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  high:     "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
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

  const data = await getDashboardData(user.id, user.email ?? "");
  const isEmpty = !data || data.totalRuns === 0;

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `~${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `~${(n / 1_000).toFixed(0)}k` : String(n);

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Overview</p>
          <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
            Dashboard
          </h1>
        </div>
        {data?.earlyAccess ? (
          <div className="rounded-lg border border-[#7C6DFA]/25 bg-[#7C6DFA]/8 px-3 py-1.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9E91FF]">
              {data.earlyAccess.plan_interest ?? "Pro"} — {data.earlyAccess.status}
            </p>
          </div>
        ) : (
          <EarlyAccessModalTrigger
            label="Join early access"
            variant="pro"
            className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#4D5070] transition-colors hover:border-white/20 hover:text-[#9E91FF]"
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Runs"
          value={String(data?.totalRuns ?? 0)}
          sub="synced from CLI"
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
          sub="estimated"
          icon={TrendingDown}
        />
        <StatCard
          label="Cost saved"
          value={data && data.totalCost > 0 ? `$${data.totalCost.toFixed(2)}` : "$0.00"}
          sub="estimated, local only"
          icon={Shield}
        />
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-6 py-10 text-center">
          <div
            className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8"
            style={{ boxShadow: "0 0 24px rgba(124,109,250,0.08)" }}
          >
            <Shield className="size-5 text-[#9E91FF]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
            Connect your first guarded run.
          </h2>
          <p className="mx-auto mt-2 max-w-[400px] text-[13px] leading-[1.7] text-[#5E6A88]">
            Free CLI works locally. Cloud sync is opening for Pro, Builder, and Team. Once connected, every guarded run will appear here with its contract, memory, risk, and savings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app/install"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ boxShadow: "0 4px 16px rgba(124,109,250,0.28)" }}
            >
              Install CLI
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/app/early-access"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              Join early access
            </Link>
          </div>
        </div>
      ) : (
        /* Last run */
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
                  {data.lastRun.synced_at
                    ? new Date(data.lastRun.synced_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={data.lastRun.risk_after ?? data.lastRun.risk_before} />
                <Link
                  href={`/app/runs/${data.lastRun.id}`}
                  className="font-mono text-[11px] text-[#7C6DFA] transition-colors hover:text-[#B2A7FF]"
                >
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
            <p className="text-[13px] font-semibold text-[#EDEEFF]">
              CLI cloud sync is coming.
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#4D5070]">
              Free CLI stays local-first. Sync opens for Pro, Builder, and Team via{" "}
              <code className="font-mono text-[#9E91FF]">runtrim sync</code>.
            </p>
          </div>
          <Link
            href="/app/early-access"
            className="shrink-0 rounded-lg border border-white/10 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Get early access
          </Link>
        </div>
      </div>
    </div>
  );
}
