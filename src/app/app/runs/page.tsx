import { AppShell } from "@/components/app/app-shell";
import { CopyButton } from "@/components/app/copy-button";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { getLatestSyncedProject, getSyncedRuns } from "@/lib/dashboard-sync";

type Filter = "all" | "guarded" | "split_required" | "partial" | "passed" | "drift_detected";
const FILTERS: Filter[] = ["all", "guarded", "split_required", "partial", "passed", "drift_detected"];

function pickPromptSource(
  run: {
    status?: string | null;
    next_safe_prompt?: string | null;
    continuation_prompt?: string | null;
    latest_prompt?: string | null;
  },
  fallback: { projectNextSafePrompt?: string | null; memoryNextSafePrompt?: string | null }
) {
  const status = (run.status || "").toLowerCase();
  const next = run.next_safe_prompt?.trim() || "";
  const continuation = run.continuation_prompt?.trim() || "";
  const latest = run.latest_prompt?.trim() || "";
  const projectPrompt = fallback.projectNextSafePrompt?.trim() || "";
  const memoryPrompt = fallback.memoryNextSafePrompt?.trim() || "";

  if (next) {
    if (status === "guarded" && latest && next === latest) {
      return { text: next, label: "Prepared run contract" };
    }
    return { text: next, label: "Next safe prompt" };
  }
  if (continuation) return { text: continuation, label: "Continuation prompt" };
  if (latest) return { text: latest, label: "Prepared run contract" };
  if (projectPrompt) return { text: projectPrompt, label: "Next safe prompt" };
  if (memoryPrompt) return { text: memoryPrompt, label: "Next safe prompt" };
  return { text: "", label: "Next safe prompt" };
}

const PREVIEW_RUNS = [
  {
    local_id: "run_1",
    task: "Polish app dashboard structure and improve workflow command cards",
    status: "partial",
    created_at_local: new Date().toISOString(),
    risk_before: "high",
    risk_after: "medium",
    score_before: 46,
    score_after: 74,
    changed_files: ["src/app/app/page.tsx", "src/components/app/app-shell.tsx"],
    missing_proof_items: ["No root cause identified", "No verification or test steps provided"],
    next_safe_prompt: "Continue from the current diff only. Do not modify new files unless verification proves it is required.",
    watch_warnings: [] as string[],
  },
  {
    local_id: "run_2",
    task: "Rewrite auth flow, middleware, database schema and billing",
    status: "split_required",
    created_at_local: new Date(Date.now() - 86_400_000).toISOString(),
    risk_before: "critical",
    risk_after: null as string | null,
    score_before: 12,
    score_after: 12,
    changed_files: [] as string[],
    missing_proof_items: [] as string[],
    next_safe_prompt: "Audit only. Identify the smallest failing surface related to auth flow.",
    watch_warnings: [] as string[],
  },
];

function filterLabel(f: Filter) {
  return f === "all" ? "All" : f.replace(/_/g, " ");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function RunsPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const params = (await searchParams) || {};
  const selected = (params.filter as Filter) || "all";
  const [synced, latestBundle] = await Promise.all([getSyncedRuns(), getLatestSyncedProject()]);
  const rows = synced.length > 0 ? synced : PREVIEW_RUNS;
  const filtered = rows.filter((r) => selected === "all" || (r.status || "").toLowerCase() === selected);
  const selectedRun = filtered[0];
  const selectedPrompt = selectedRun
    ? pickPromptSource(selectedRun, {
        projectNextSafePrompt: latestBundle?.project?.next_safe_prompt ?? null,
        memoryNextSafePrompt: latestBundle?.memory?.next_safe_prompt ?? null,
      })
    : { text: "", label: "Next safe prompt" };

  const partialCount = rows.filter((r) => ["partial", "needs_verification", "no_changes_detected"].includes((r.status || "").toLowerCase())).length;
  const blockedCount = rows.filter((r) => ["blocked", "split_required", "drift_detected"].includes((r.status || "").toLowerCase())).length;

  return (
    <AppShell active="/app/runs">
      <div className="mx-auto w-full max-w-[1340px] space-y-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Run history</h1>
          <p className="mt-0.5 text-[13px] text-[#4D5070]">
            {synced.length > 0 ? "Synced from local CLI" : "Preview data. Connect CLI to see live runs."}
          </p>
        </div>

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
          <span className="ml-auto self-center font-mono text-[11px] text-[#2E2E50]">{filtered.length} run{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="surface-panel overflow-hidden rounded-xl">
            <div className="border-b border-white/8 px-6 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Timeline</p>
            </div>
            {filtered.length === 0 ? (
              <div className="px-6 py-9">
                <p className="text-[13px] text-[#4D5070]">No runs match this filter.</p>
                <p className="mt-2 font-mono text-[12px] text-[#6870A0]">runtrim capture "what you worked on"</p>
                <p className="mt-1 font-mono text-[12px] text-[#6870A0]">runtrim sync</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {filtered.map((run) => (
                  <div key={run.local_id} className="flex gap-4 px-6 py-5 transition-colors hover:bg-white/[0.02]">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full" style={{
                      background:
                        run.status === "passed" ? "#4DE8B0" :
                        run.status === "split_required" || run.status === "blocked" || run.status === "drift_detected" ? "#FF7B5C" :
                        run.status === "partial" || run.status === "needs_verification" ? "#F0BF72" :
                        "#7C6DFA",
                    }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[11px] text-[#4D5070]">
                          {run.created_at_local ? fmt(run.created_at_local) : "Unknown"}
                        </span>
                        <RunStatusBadge status={run.status || "guarded"} />
                      </div>
                      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[#EDEEFF]">{run.task}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#4D5070]">
                        <span>Risk: {(run.risk_before || "unknown").toUpperCase()}{run.risk_after ? ` -> ${run.risk_after.toUpperCase()}` : ""}</span>
                        <span>{(run.changed_files || []).length} files changed</span>
                        {(run.missing_proof_items || []).length > 0 && (
                          <span className="text-[#F0BF72]">{(run.missing_proof_items || []).length} proof items missing</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-panel sticky top-6 h-fit overflow-hidden rounded-xl">
            <div className="border-b border-white/8 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Run inspector</p>
            </div>
            {selectedRun ? (
              <div className="divide-y divide-white/8">
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase text-[#4D5070]">Task</p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#C0C2E8]">{selectedRun.task}</p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/8">
                  <div className="bg-[#0D0C22] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase text-[#4D5070]">Score</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-[#9E91FF]">{(selectedRun as { score_after?: number }).score_after ?? "n/a"}</p>
                  </div>
                  <div className="bg-[#0D0C22] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase text-[#4D5070]">Files</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-[#EDEEFF]">{(selectedRun.changed_files || []).length}</p>
                  </div>
                  <div className="bg-[#0D0C22] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase text-[#4D5070]">Proof missing</p>
                    <p className={`mt-1 text-xl font-bold tabular-nums ${(selectedRun.missing_proof_items || []).length > 0 ? "text-[#F0BF72]" : "text-[#4DE8B0]"}`}>
                      {(selectedRun.missing_proof_items || []).length}
                    </p>
                  </div>
                  <div className="bg-[#0D0C22] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase text-[#4D5070]">Warnings</p>
                    <p className={`mt-1 text-xl font-bold tabular-nums ${(selectedRun.watch_warnings || []).length > 0 ? "text-[#FF7B5C]" : "text-[#EDEEFF]"}`}>
                      {(selectedRun.watch_warnings || []).length}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase text-[#4D5070]">{selectedPrompt.label}</p>
                    <CopyButton text={selectedPrompt.text} />
                  </div>
                  <div className="rounded-lg border border-white/8 bg-[#090918] p-3">
                    <p className="font-mono text-[12px] leading-6 text-[#C0C2E8]">
                      {selectedPrompt.text || "No prompt recorded."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="px-5 py-8 text-[13px] text-[#4D5070]">No run selected.</p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
