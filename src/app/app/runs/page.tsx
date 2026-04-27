import { AppShell } from "@/components/app/app-shell";
import { RunTimeline } from "@/components/app/run-timeline";
import { RiskBadge } from "@/components/app/risk-badge";
import { MetricCard } from "@/components/app/metric-card";

const SAMPLE_RUNS = [
  {
    id: "run-001",
    task: "fix checkout redirect loop after successful payment",
    riskBefore: "high",
    riskAfter: "low",
    status: "passed" as const,
    date: "Apr 26, 2026 at 14:32",
    nextPrompt:
      "Previous run passed verification. Use: runtrim guard for next task.",
  },
  {
    id: "run-002",
    task: "add loading state to cart button",
    riskBefore: "medium",
    riskAfter: "low",
    status: "passed" as const,
    date: "Apr 25, 2026 at 11:10",
    nextPrompt:
      "Previous run passed verification. Use: runtrim guard for next task.",
  },
  {
    id: "run-003",
    task: "refactor the entire auth flow to use server actions",
    riskBefore: "critical",
    riskAfter: "medium",
    status: "drift_detected" as const,
    date: "Apr 25, 2026 at 09:15",
    nextPrompt:
      "SCOPE DRIFT DETECTED. Explain why you modified middleware.ts. Revert if not necessary.",
  },
  {
    id: "run-004",
    task: "update pricing section copy on marketing page",
    riskBefore: "low",
    riskAfter: "low",
    status: "passed" as const,
    date: "Apr 23, 2026 at 17:44",
    nextPrompt:
      "Previous run passed. Ready for next guarded run.",
  },
  {
    id: "run-005",
    task: "check everything in the payments module",
    riskBefore: "critical",
    riskAfter: "high",
    status: "needs_verification" as const,
    date: "Apr 22, 2026 at 13:20",
    nextPrompt:
      "Missing: root cause, list of changed files, verification steps. Provide before continuing.",
  },
];

const SAMPLE_METRICS = [
  { label: "Total runs", value: "5", sub: "Sample data. Your runs appear after first guard." },
  { label: "Passed", value: "3", sub: "Runs that passed contract verification." },
  { label: "Drift detected", value: "1", sub: "Runs where agent touched forbidden scope." },
  { label: "Est. tokens trimmed", value: "~120k", sub: "Across 5 sample runs. Estimated.", accent: true },
];

export default function RunsPage() {
  return (
    <AppShell active="/app/runs">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">Run history</h1>
          <p className="text-sm text-muted-foreground">
            Every guarded run, in order. Local data from .runtrim/runs/.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_METRICS.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} accent={m.accent} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Run timeline (sample data)
            </h2>
            <div className="rounded-sm border border-border bg-card p-5">
              <RunTimeline runs={SAMPLE_RUNS} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Risk distribution
            </h2>
            <div className="rounded-sm border border-border bg-card p-5 space-y-3">
              {[
                { risk: "critical", count: 1, label: "1 run started critical risk" },
                { risk: "high", count: 1, label: "1 run started high risk" },
                { risk: "medium", count: 1, label: "1 run started medium risk" },
                { risk: "low", count: 2, label: "2 runs started low risk" },
              ].map((item) => (
                <div key={item.risk} className="flex items-center justify-between gap-3">
                  <RiskBadge risk={item.risk} size="sm" />
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-border bg-card p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                Status breakdown
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Passed", value: 3, color: "bg-emerald-500" },
                  { label: "Needs verification", value: 1, color: "bg-orange-500" },
                  { label: "Drift detected", value: 1, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`size-1.5 rounded-full ${item.color} shrink-0`} />
                    <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                    <span className="text-xs font-mono text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card/50 p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Note
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sample data shown above. Your run history populates after using the CLI in this
                repo. Savings are estimated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
