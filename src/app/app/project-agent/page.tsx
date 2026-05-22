import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { ProjectAgentChat } from "@/components/app/project-agent-chat";

export const metadata: Metadata = {
  title: "Project Agent | RunTrim Dashboard",
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

export default async function ProjectAgentPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();

  let profile: ProfileRow | null = null;
  let runs: RunRow[] = [];

  if (supabase) {
    const [profileResult, runResult] = await Promise.all([
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
    ]);

    profile = (profileResult.data as ProfileRow | null) ?? null;
    runs = (runResult.data as RunRow[] | null) ?? [];
  }

  runs.sort((a, b) => runSortTime(b) - runSortTime(a));
  const latest = runs[0] ?? null;

  const rawPlan = profile?.plan ?? "free";
  const planStatus = profile?.plan_status ?? null;
  const periodEnd = profile?.current_period_end ?? null;
  const effectivePlan = effectivePlanId(rawPlan, planStatus, periodEnd);
  const canUseAgent = effectivePlan !== "free";

  const summary = {
    recentRunsCount: runs.length,
    latestRunTask: latest?.task ?? null,
    latestRunRisk: latest?.risk_after ?? latest?.risk_before ?? null,
    latestProofGaps: latest?.missing_proof_items?.length ?? 0,
    estimatedTokensSaved: runs.reduce(
      (sum, run) => sum + (run.estimated_tokens_saved ?? run.estimated_tokens_trimmed ?? 0),
      0,
    ),
    estimatedCostSaved: runs.reduce(
      (sum, run) => sum + (run.estimated_cost_saved ?? run.estimated_dollars_standard ?? 0),
      0,
    ),
  };

  return (
    <div className="w-full">
      <ProjectAgentChat canUseAgent={canUseAgent} summary={summary} />
    </div>
  );
}

