import { AppShell } from "@/components/app/app-shell";
import { RunTimeline } from "@/components/app/run-timeline";
import { MetricCard } from "@/components/app/metric-card";
import { RiskBadge } from "@/components/app/risk-badge";

const RUNS = [
  {
    id: "run-01",
    task: "Polish landing page visual hierarchy and product panels",
    riskBefore: "medium",
    riskAfter: "low",
    status: "partial" as const,
    date: "Apr 28, 2026 14:34",
    changed: "2 files changed",
    nextPrompt: "Continue from current diff only. Verification mode.",
  },
  {
    id: "run-02",
    task: "Rewrite auth flow, middleware, database, billing",
    riskBefore: "critical",
    status: "split_required" as const,
    date: "Apr 28, 2026 12:04",
    changed: "0 files changed",
    nextPrompt: "Containment required before proceeding.",
  },
  {
    id: "run-03",
    task: "Fix checkout redirect loop",
    riskBefore: "high",
    riskAfter: "low",
    status: "passed" as const,
    date: "Apr 27, 2026 10:14",
    changed: "3 files changed",
    nextPrompt: "Ready for next guarded run.",
  },
  {
    id: "run-04",
    task: "Touch auth session inside UI bug fix",
    riskBefore: "medium",
    status: "drift_detected" as const,
    date: "Apr 26, 2026 09:01",
    changed: "4 files changed",
    nextPrompt: "Stop edits. Review out-of-scope files first.",
  },
];

export default function RunsPage() {
  return (
    <AppShell active="/app/runs">
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-[#EEEEF2]">Run history</h1>
          <p className="mt-1 text-[13px] text-[#4A4E72]">All runs across guarded, split required, partial, passed, and drift detected.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total runs"         value="18"     sub="Current project" />
          <MetricCard label="Split required"     value="6"      sub="High-risk runs blocked" />
          <MetricCard label="Needs verification" value="4"      sub="Continuation prompts generated" />
          <MetricCard label="Est. waste trimmed" value="~384k"  sub="Local estimate" accent />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="surface-panel rounded-lg p-5">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Timeline</p>
            <RunTimeline runs={RUNS} />
          </div>

          <div className="space-y-4">
            <div className="surface-panel rounded-lg p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Status keys</p>
              <div className="mt-4 space-y-3">
                {[
                  ["guarded",        "Run contract generated"],
                  ["split_required", "Run blocked, split recommended"],
                  ["partial",        "Work done but proof incomplete"],
                  ["passed",         "Verification complete"],
                  ["drift_detected", "Out-of-scope files touched"],
                ].map(([risk, label]) => (
                  <div key={risk} className="flex items-center gap-3">
                    <RiskBadge risk={risk} size="sm" />
                    <span className="text-[12px] text-[#4A4E72]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-lg p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Next prompt</p>
              <p className="mt-3 text-[13px] leading-6 text-[#8888A8]">
                Continue from the current diff only. Do not modify new files unless verification requires it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
