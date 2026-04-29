import { AppShell } from "@/components/app/app-shell";
import { RunsInspector } from "@/components/app/runs-inspector";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { getLatestSyncedProject, getSyncedRunsResult } from "@/lib/dashboard-sync";
import { buildAttemptMeta } from "@/lib/run-grouping";

type Filter = "all" | "guarded" | "split_required" | "partial" | "passed" | "drift_detected";
const FILTERS: Filter[] = ["all", "guarded", "split_required", "partial", "passed", "drift_detected"];

type NormalizedRun = {
  localId: string;
  task: string;
  status: string;
  createdAt: string | null;
  riskBefore: string | null;
  riskAfter: string | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  riskReductionPercent: number | null;
  changedFiles: string[];
  missingProofItems: string[];
  detectedRisks: string[];
  sensitiveAreas: string[];
  watchWarnings: string[];
  watchChangedFiles: string[];
  nextSafePrompt: string;
  latestPrompt: string;
  continuationPrompt: string;
  attempts?: number;
  attemptNumber?: number;
  latestAttempt?: boolean;
  repeatedTask?: boolean;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeRun(row: unknown): NormalizedRun {
  const obj = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  return {
    localId: asString(obj.local_id) || "unknown",
    task: asString(obj.task) || "Untitled run",
    status: asString(obj.status).toLowerCase() || "guarded",
    createdAt: asOptionalString(obj.created_at_local),
    riskBefore: asOptionalString(obj.risk_before),
    riskAfter: asOptionalString(obj.risk_after),
    scoreBefore: asOptionalNumber(obj.score_before),
    scoreAfter: asOptionalNumber(obj.score_after),
    riskReductionPercent: asOptionalNumber(obj.risk_reduction_percent),
    changedFiles: asStringArray(obj.changed_files),
    missingProofItems: asStringArray(obj.missing_proof_items),
    detectedRisks: asStringArray(obj.detected_risks),
    sensitiveAreas: asStringArray(obj.sensitive_areas),
    watchWarnings: asStringArray(obj.watch_warnings),
    watchChangedFiles: asStringArray(obj.watch_changed_files),
    nextSafePrompt: asString(obj.next_safe_prompt),
    latestPrompt: asString(obj.latest_prompt),
    continuationPrompt: asString(obj.continuation_prompt),
  };
}

function pickPromptSource(
  run: NormalizedRun,
  fallback: { projectNextSafePrompt?: string | null; memoryNextSafePrompt?: string | null }
) {
  const next = run.nextSafePrompt.trim();
  const continuation = run.continuationPrompt.trim();
  const latest = run.latestPrompt.trim();
  const projectPrompt = asString(fallback.projectNextSafePrompt).trim();
  const memoryPrompt = asString(fallback.memoryNextSafePrompt).trim();

  if (next) return { text: next, label: "Next safe prompt" };
  if (continuation) return { text: continuation, label: "Continuation prompt" };
  if (latest) return { text: latest, label: "Prepared run contract" };
  if (projectPrompt) return { text: projectPrompt, label: "Next safe prompt" };
  if (memoryPrompt) return { text: memoryPrompt, label: "Next safe prompt" };
  return { text: "", label: "Next safe prompt" };
}

function filterLabel(f: Filter) {
  return f === "all" ? "All" : f.replace(/_/g, " ");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function RunsPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const params = (await searchParams) || {};
  const selected = (params.filter as Filter) || "all";
  const [runsResult, latestBundle] = await Promise.all([getSyncedRunsResult(), getLatestSyncedProject()]);

  const rows = runsResult.runs.map(normalizeRun);
  const filtered = rows.filter((r) => selected === "all" || r.status === selected);
  const filteredMeta = buildAttemptMeta(filtered.map((run) => ({ task: run.task })));
  const displayRows = filtered.map((run, index) => ({ ...run, ...filteredMeta[index] }));
  const selectedRun = displayRows[0];
  const selectedPrompt = selectedRun
    ? pickPromptSource(selectedRun, {
        projectNextSafePrompt: latestBundle?.project?.next_safe_prompt ?? null,
        memoryNextSafePrompt: latestBundle?.memory?.next_safe_prompt ?? null,
      })
    : { text: "", label: "Next safe prompt" };

  const partialCount = rows.filter((r) => ["partial", "needs_verification", "no_changes_detected"].includes(r.status)).length;
  const blockedCount = rows.filter((r) => ["blocked", "split_required", "drift_detected"].includes(r.status)).length;

  return (
    <AppShell active="/app/runs">
      <div className="mx-auto w-full max-w-[1340px] space-y-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Run history</h1>
          <p className="mt-0.5 text-[13px] text-[#4D5070]">{rows.length > 0 ? "Synced from local CLI" : "No synced runs yet."}</p>
        </div>

        {runsResult.error && (
          <div className="rounded-xl border border-[#FF7B5C]/30 bg-[#FF7B5C]/8 px-5 py-4">
            <p className="text-[13px] font-semibold text-[#FFD0C4]">Runs could not be loaded.</p>
            <p className="mt-1 text-[12px] text-[#FFB29F]">Check schema and sync configuration.</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-white/8">
          <div className="grid grid-cols-3 gap-px bg-white/8">
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Total runs</p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-[#9E91FF]">{rows.length}</p>
            </div>
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Needs verification</p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-[#F0BF72]">{partialCount}</p>
            </div>
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Blocked or drift</p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-[#FF7B5C]">{blockedCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={`/app/runs?filter=${f}`}
              className={`rounded-md border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                selected === f
                  ? "border-[#7C6DFA]/30 bg-[#7C6DFA]/10 text-[#C4B8FF]"
                  : "border-white/8 text-[#4D5070] hover:border-white/14 hover:text-[#9699BE]"
              }`}
            >
              {filterLabel(f)}
            </a>
          ))}
          <span className="ml-auto self-center font-mono text-[11px] text-[#2E2E50]">{displayRows.length} run{displayRows.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="surface-panel overflow-hidden rounded-xl">
            <div className="border-b border-white/8 px-6 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Timeline</p>
            </div>
            {rows.length === 0 ? (
              <div className="px-6 py-9">
                <p className="text-[13px] text-[#4D5070]">No synced runs yet.</p>
                <p className="mt-2 font-mono text-[12px] text-[#6870A0]">runtrim prepare "your task"</p>
                <p className="mt-1 font-mono text-[12px] text-[#6870A0]">runtrim sync</p>
              </div>
            ) : displayRows.length === 0 ? (
              <div className="px-6 py-9">
                <p className="text-[13px] text-[#4D5070]">No runs match this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {displayRows.map((run) => (
                  <div key={run.localId} className="flex gap-4 px-6 py-5 transition-colors hover:bg-white/[0.02]">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full" style={{
                      background:
                        run.status === "passed" ? "#4DE8B0" :
                        run.status === "split_required" || run.status === "blocked" || run.status === "drift_detected" ? "#FF7B5C" :
                        run.status === "partial" || run.status === "needs_verification" ? "#F0BF72" :
                        "#7C6DFA",
                    }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[11px] text-[#4D5070]">{run.createdAt ? fmt(run.createdAt) : "Unknown"}</span>
                        <RunStatusBadge status={run.status} />
                      </div>
                      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[#EDEEFF]">{run.task}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#4D5070]">
                        <span>Risk: {(run.riskBefore || "unknown").toUpperCase()}{run.riskAfter ? ` -> ${run.riskAfter.toUpperCase()}` : ""}</span>
                        <span>{run.changedFiles.length} files changed</span>
                        {run.repeatedTask && (
                          <>
                            <span className="rounded border border-white/10 bg-[#0E1026] px-1.5 py-0.5 text-[10px] text-[#8E95C3]">Repeated task</span>
                            <span>Attempt {run.attemptNumber} of {run.attempts}</span>
                            {run.latestAttempt && <span className="text-[#9E91FF]">Latest attempt</span>}
                          </>
                        )}
                        {run.missingProofItems.length > 0 && (
                          <span className="text-[#F0BF72]">{run.missingProofItems.length} proof items missing</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-panel sticky top-6 h-fit overflow-hidden rounded-xl">
            {selectedRun ? (
              <RunsInspector run={selectedRun} promptLabel={selectedPrompt.label} promptText={selectedPrompt.text} />
            ) : (
              <p className="px-5 py-8 text-[13px] text-[#4D5070]">No run selected.</p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
