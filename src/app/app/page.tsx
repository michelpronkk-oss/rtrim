import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { ContinueCard } from "@/components/app/continue-card";
import { ProjectMemoryPanel } from "@/components/app/project-memory-panel";
import { RiskMap } from "@/components/app/risk-map";
import { RunDecisionTimeline } from "@/components/app/run-decision-timeline";
import { ShareCard } from "@/components/app/share-card";
import { SyncStatusPanel } from "@/components/app/sync-status-panel";
import { getLatestSyncedProject } from "@/lib/dashboard-sync";
import { getPlan } from "@/lib/plans";

function mapStatusToRiskState(status: string) {
  const s = status.toLowerCase();
  if (["blocked", "split_required", "drift_detected"].includes(s)) return "blocked" as const;
  if (["partial", "needs_verification", "no_changes_detected"].includes(s)) return "needs_verification" as const;
  if (["guarded", "checked", "executed"].includes(s)) return "sensitive" as const;
  return "safe" as const;
}

export default async function AppPage() {
  const synced = await getLatestSyncedProject();
  const currentPlan = getPlan("free");

  const runs = synced?.runs ?? [];
  const connected = Boolean(synced);
  const lastStatus = (synced?.project?.last_status ?? "guarded").toLowerCase();

  const fallbackMissing = ["ROOT CAUSE section", "HOW TO VERIFY section", "NEXT SAFE ACTION section"];

  const continueData = {
    project: synced?.project?.name ?? "runtrim",
    status: lastStatus,
    lastUpdated: synced?.project?.updated_at
      ? new Date(synced.project.updated_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Local preview",
    syncState: connected ? "Sync connected" : "Local preview",
    currentFocus:
      synced?.memory?.current_state ??
      "Verification is still missing. Confirm the current diff before opening a new scope.",
    nextSafeAction:
      synced?.memory?.next_safe_action ??
      synced?.project?.next_safe_action ??
      "Run runtrim check and confirm missing proof before new implementation.",
    lastTask:
      synced?.project?.last_task ??
      "Improve landing page visual system without changing product strategy.",
    changedFilesCount: runs[0]?.changed_files?.length ?? 2,
    missingProofItems: lastStatus === "passed" ? [] : fallbackMissing,
    detectedRiskSystems: ["auth", "middleware", "database", "billing", "env/secrets", "webhooks"],
    nextSafePrompt:
      synced?.memory?.next_safe_prompt ??
      synced?.project?.next_safe_prompt ??
      "Continue from the current diff only. Do not modify new files unless verification proves it is required.",
    promptSource: runs[0]?.local_id ? `Source ${runs[0].local_id}` : "Source memory",
    promptUpdatedAt: runs[0]?.created_at_local
      ? new Date(runs[0].created_at_local).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not timestamped",
  };
  const watchWarningCount = runs.reduce((sum, run) => sum + (run.watch_warnings?.length ?? 0), 0);

  const guardedCount = runs.length || 18;
  const blockedCount = runs.filter((r) => ["split_required", "blocked"].includes((r.status ?? "").toLowerCase())).length || 6;
  const partialCount =
    runs.filter((r) => ["partial", "needs_verification", "no_changes_detected"].includes((r.status ?? "").toLowerCase())).length || 4;
  const driftCount = runs.filter((r) => (r.status ?? "").toLowerCase() === "drift_detected").length || 2;

  const tokens = Number(synced?.project?.estimated_tokens_trimmed ?? 384000);
  const standard = Number(synced?.project?.estimated_dollars_standard ?? 1.15);
  const expensive = Number(synced?.project?.estimated_dollars_expensive ?? 11.5);

  const timelineItems =
    runs.slice(0, 6).map((run) => ({
      id: run.local_id,
      task: run.task ?? "Untitled run",
      status: (run.status ?? "guarded").toLowerCase(),
      riskBefore: (run.risk_before ?? "medium").toLowerCase(),
      riskAfter: run.risk_after ? run.risk_after.toLowerCase() : undefined,
      filesChanged: run.changed_files?.length ?? 0,
      decision:
        (run.status ?? "").toLowerCase() === "split_required"
          ? "RunTrim stopped this run before protected systems were edited together."
          : (run.status ?? "").toLowerCase() === "partial"
          ? "RunTrim marked verification debt and generated continuation guidance."
          : "RunTrim guarded scope and logged the outcome.",
      nextAction: run.next_safe_prompt ? "Use generated next safe prompt." : "Run runtrim check for next action.",
      date: run.created_at_local
        ? new Date(run.created_at_local).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Preview",
    })) || [];

  const previewTimeline = [
    {
      id: "1",
      task: "Polish app overview risk language and improve command workflow visibility",
      status: "partial",
      riskBefore: "high",
      riskAfter: "medium",
      filesChanged: 3,
      decision: "RunTrim identified missing verification proof and kept continuation in scope.",
      nextAction: "Confirm root cause and verification steps before new scope.",
      date: "Apr 28, 15:20",
    },
    {
      id: "2",
      task: "Rewrite auth flow, middleware, database schema and billing",
      status: "split_required",
      riskBefore: "critical",
      filesChanged: 0,
      decision: "RunTrim blocked this mega-run and requested isolated audits.",
      nextAction: "Audit auth flow only. No edits.",
      date: "Apr 28, 12:04",
    },
  ];

  const memoryProtected = ["auth", "middleware", "database schema", "env/secrets", "billing", "webhooks"];

  const riskItems = [
    { system: "auth",        state: mapStatusToRiskState(lastStatus), note: "Isolate auth scope before edits."              },
    { system: "middleware",  state: "sensitive" as const,             note: "Changes affect all requests."                  },
    { system: "database",    state: "sensitive" as const,             note: "Schema changes require migration review."       },
    { system: "billing",     state: mapStatusToRiskState(lastStatus), note: "Treat billing as protected surface."           },
    { system: "env/secrets", state: "blocked" as const,               note: "Never read or upload secrets."                  },
    { system: "webhooks",    state: "needs_verification" as const,    note: "Review event flow before touching handlers."   },
  ];

  const syncedAt = synced?.project?.updated_at
    ? new Date(synced.project.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : undefined;

  const KPI_METRICS = [
    { label: "Estimated savings",  value: `~$${standard.toFixed(2)}`,              color: "text-[#4DE8B0]" },
    { label: "Tokens trimmed",     value: `~${tokens.toLocaleString("en-US")}`,    color: "text-[#9E91FF]" },
    { label: "Runs guarded",       value: String(guardedCount),                    color: "text-[#9E91FF]" },
    { label: "Contract score",     value: "75/100",                                color: "text-[#7BAEFF]" },
    { label: "Verification debt",  value: String(partialCount),                    color: "text-[#F0BF72]" },
    { label: "Drift detections",   value: String(driftCount),                      color: driftCount > 0 ? "text-[#FF7B5C]" : "text-[#EDEEFF]" },
  ];

  return (
    <AppShell active="/app">
      <div className="mx-auto w-full max-w-[1340px] space-y-7">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Overview</h1>
            <p className="mt-0.5 text-[13px] text-[#4D5070]">CLI does the work locally. This is the memory layer.</p>
          </div>
          {watchWarningCount > 0 && (
            <span className="flex items-center gap-1.5 rounded border border-[#F0BF72]/20 bg-[#F0BF72]/6 px-2.5 py-1.5 font-mono text-[11px] text-[#F0BF72]">
              <span className="size-1.5 rounded-full bg-[#F0BF72]" />
              {watchWarningCount} watch {watchWarningCount === 1 ? "warning" : "warnings"}
            </span>
          )}
        </div>

        {/* ── KPI strip ───────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-white/8">
          <div className="grid grid-cols-2 gap-px bg-white/8 sm:grid-cols-3 xl:grid-cols-6">
            {KPI_METRICS.map(({ label, value, color }) => (
              <div key={label} className="bg-[#0D0C22] px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">{label}</p>
                <p className={`mt-2.5 text-3xl font-bold tabular-nums tracking-tight ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Continue card ───────────────────────────────── */}
        <ContinueCard {...continueData} />

        {/* ── Main two-column ─────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* Run timeline */}
          <RunDecisionTimeline items={timelineItems.length ? timelineItems : previewTimeline} />

          {/* Right column: risk map + sync */}
          <div className="flex flex-col gap-6">
            <RiskMap items={riskItems} />
            <SyncStatusPanel connected={connected} lastSynced={syncedAt} syncedRuns={runs.length} />
          </div>
        </div>

        {/* ── Bottom row ──────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ProjectMemoryPanel
            currentFocus={continueData.currentFocus}
            protectedAreas={memoryProtected}
            stillMissing={continueData.missingProofItems}
            nextPrompt={continueData.nextSafePrompt}
          />

          <div className="flex flex-col gap-5">
            <ShareCard
              project={continueData.project}
              runsGuarded={guardedCount}
              estimatedTokens={`~${tokens.toLocaleString("en-US")}`}
              estimatedDollars={`$${standard.toFixed(2)} reference`}
              riskReduction="45"
            />
            <div className="surface-panel rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Plan</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-[15px] font-bold text-[#EDEEFF]">{currentPlan.name}</p>
                    <span className="text-[13px] font-semibold text-[#9E91FF]">{currentPlan.priceLabel}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-[#4D5070]">Local CLI is free. Cloud sync is coming.</p>
                </div>
                <Link
                  href="/#pricing"
                  className="shrink-0 rounded border border-white/8 px-3 py-1.5 text-[12px] text-[#6870A0] transition-colors hover:border-white/14 hover:text-[#9699BE]"
                >
                  View plans
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
