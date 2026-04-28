import { AppShell } from "@/components/app/app-shell";
import { CopyButton } from "@/components/app/copy-button";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { getSyncedRuns } from "@/lib/dashboard-sync";

type Filter = "all" | "guarded" | "split_required" | "partial" | "passed" | "drift_detected";

const FILTERS: Filter[] = ["all", "guarded", "split_required", "partial", "passed", "drift_detected"];

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
    next_safe_prompt:
      "Continue from the current diff only. Do not modify new files unless verification proves it is required.",
  },
  {
    local_id: "run_2",
    task: "Rewrite auth flow, middleware, database schema and billing",
    status: "split_required",
    created_at_local: new Date(Date.now() - 86_400_000).toISOString(),
    risk_before: "critical",
    risk_after: null,
    score_before: 12,
    score_after: 12,
    changed_files: [],
    missing_proof_items: [],
    next_safe_prompt: "Audit only. Identify the smallest failing surface related to auth flow.",
  },
];

function label(filter: Filter) {
  return filter.replace("_", " ");
}

export default async function RunsPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const params = (await searchParams) || {};
  const selected = (params.filter as Filter) || "all";
  const synced = await getSyncedRuns();
  const rows = synced.length > 0 ? synced : PREVIEW_RUNS;

  const filtered = rows.filter((r) => selected === "all" || (r.status || "").toLowerCase() === selected);
  const selectedRun = filtered[0];

  return (
    <AppShell active="/app/runs">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Run investigation log</h1>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">{synced.length > 0 ? "Synced local metadata" : "Example local project state until sync is connected"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={`/app/runs?filter=${f}`}
              className={`rounded-md border px-2.5 py-1 text-[12px] capitalize ${
                selected === f
                  ? "border-[#7EE7D8]/30 bg-[#7EE7D8]/10 text-[#9AEFE3]"
                  : "border-white/10 text-[#A5B1BF]"
              }`}
            >
              {label(f)}
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="surface-panel rounded-xl p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Runs shown</p>
            <p className="mt-2 text-xl font-semibold text-[#F5F7FA]">{filtered.length}</p>
          </div>
          <div className="surface-panel rounded-xl p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Partial or verification</p>
            <p className="mt-2 text-xl font-semibold text-[#F0BF72]">{rows.filter((r) => ["partial", "needs_verification", "no_changes_detected"].includes((r.status || "").toLowerCase())).length}</p>
          </div>
          <div className="surface-panel rounded-xl p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Blocked or drift</p>
            <p className="mt-2 text-xl font-semibold text-[#FF9C88]">{rows.filter((r) => ["blocked", "split_required", "drift_detected"].includes((r.status || "").toLowerCase())).length}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="surface-panel rounded-xl p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Timeline</p>
            <div className="mt-4 space-y-3">
              {filtered.map((run) => (
                <article key={run.local_id} className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[11px] text-[#7D8A99]">
                      {run.created_at_local
                        ? new Date(run.created_at_local).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "Unknown"}
                    </p>
                    <RunStatusBadge status={run.status || "guarded"} />
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-[#E4EBF3]">{run.task}</p>
                  <p className="mt-2 text-[12px] text-[#9AA7B6]">
                    Decision: {(run.status || "").toLowerCase() === "split_required" ? "Split required. Containment before implementation." : "Guarded run evaluated with continuation guidance."}
                  </p>
                  <p className="mt-1 text-[12px] text-[#A5B1BF]">Risk: {(run.risk_before || "unknown").toUpperCase()}{run.risk_after ? ` -> ${(run.risk_after || "").toUpperCase()}` : ""}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Selected run details</p>
            {selectedRun ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
                  <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Raw task summary</p>
                  <p className="mt-1 text-[12px] text-[#D7DEE7]">{selectedRun.task}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3 text-[12px] text-[#A5B1BF]">
                  <p>Contract score: {(selectedRun as { score_after?: number }).score_after ?? "n/a"}</p>
                  <p>Changed files: {(selectedRun.changed_files || []).length}</p>
                  <p>Missing proof: {(selectedRun.missing_proof_items || []).length}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Next safe prompt</p>
                    <CopyButton text={selectedRun.next_safe_prompt || ""} />
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-[#D7DEE7]">{selectedRun.next_safe_prompt || "No prompt recorded"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[#9AA7B6]">No runs for this filter.</p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

