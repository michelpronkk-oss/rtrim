import { AppShell } from "@/components/app/app-shell";
import { ContinueCard } from "@/components/app/continue-card";
import { IntelligenceMetric } from "@/components/app/intelligence-metric";
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
    project: synced?.project?.name ?? "rtrim",
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
  };

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

  return (
    <AppShell active="/app">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">AI run intelligence console</h1>
            <p className="mt-1 text-[13px] text-[#9AA7B6]">The CLI does the work locally. The dashboard is the memory layer.</p>
          </div>
        </div>

        <ContinueCard {...continueData} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <IntelligenceMetric label="Runs guarded" value={String(guardedCount)} interpretation="Guard rails applied before agent execution." />
          <IntelligenceMetric label="Mega-runs blocked" value={String(blockedCount)} interpretation="Blocked before unsafe cross-system edits." tone="coral" />
          <IntelligenceMetric label="Estimated tokens trimmed" value={`~${tokens.toLocaleString("en-US")}`} interpretation="Based on local run scoring and risk reduction." tone="mint" />
          <IntelligenceMetric label="Avg contract score" value="75/100" interpretation="Contract quality across recent runs." />
          <IntelligenceMetric label="Verification debt" value={String(partialCount)} interpretation="Runs still missing proof sections." tone="amber" />
          <IntelligenceMetric label="Drift risk" value={String(driftCount)} interpretation="Runs with out-of-scope file movement." tone={driftCount > 0 ? "coral" : "neutral"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <RiskMap
            items={[
              { system: "auth", state: mapStatusToRiskState(lastStatus), note: "Isolate auth scope before edits." },
              { system: "middleware", state: "sensitive", note: "Changes affect all requests." },
              { system: "database", state: "sensitive", note: "Schema changes require migration review." },
              { system: "billing", state: mapStatusToRiskState(lastStatus), note: "Treat billing as protected surface." },
              { system: "env/secrets", state: "blocked", note: "Never read or upload secrets." },
              { system: "webhooks", state: "needs_verification", note: "Review event flow before touching handlers." },
            ]}
          />
          <SyncStatusPanel
            connected={connected}
            lastSynced={
              synced?.project?.updated_at
                ? new Date(synced.project.updated_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined
            }
            syncedRuns={runs.length}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <RunDecisionTimeline items={timelineItems.length ? timelineItems : previewTimeline} />
          <div className="space-y-4">
            <ProjectMemoryPanel
              currentFocus={continueData.currentFocus}
              protectedAreas={memoryProtected}
              stillMissing={continueData.missingProofItems}
              nextPrompt={continueData.nextSafePrompt}
            />
            <ShareCard
              project={continueData.project}
              runsGuarded={guardedCount}
              estimatedTokens={`~${tokens.toLocaleString("en-US")}`}
              estimatedDollars={`~$${standard.toFixed(2)} standard / ~$${expensive.toFixed(2)} expensive`}
              riskReduction="45"
            />
            <section className="surface-panel rounded-xl p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Plan</p>
              <p className="mt-2 text-[14px] font-semibold text-[#F5F7FA]">
                {currentPlan.name} <span className="text-[#9AEFE3]">{currentPlan.priceLabel}</span>
              </p>
              <p className="mt-1 text-[12px] text-[#9AA7B6]">Local CLI remains free. Cloud sync and hosted history are planned paid features.</p>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
