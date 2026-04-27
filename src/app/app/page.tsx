import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/app/metric-card";
import { TerminalCard } from "@/components/app/terminal-card";
import { RunTimeline } from "@/components/app/run-timeline";
import { ShareCard } from "@/components/app/share-card";
import { CopyButton } from "@/components/app/copy-button";

const EMPTY_METRICS = [
  { label: "Est. tokens trimmed", value: "--", sub: "Run runtrim guard to start tracking." },
  { label: "Runs guarded", value: "0", sub: "No runs yet in this project." },
  { label: "Avg. risk reduction", value: "--", sub: "Score before vs after guard." },
  { label: "Est. spend avoided", value: "--", sub: "Based on your model and run count." },
];

const INSTALL_LINES = [
  { type: "comment" as const, text: "# Install globally" },
  { type: "prompt" as const, text: "$ npm install -g runtrim" },
  { text: "" },
  { type: "comment" as const, text: "# Or use locally in this project" },
  { type: "prompt" as const, text: "$ npm run runtrim -- init" },
  { type: "prompt" as const, text: '$ npm run runtrim -- guard "your task"' },
];

const SAMPLE_RUNS = [
  {
    id: "abc123",
    task: "fix checkout redirect loop after payment",
    riskBefore: "high",
    riskAfter: "low",
    status: "passed" as const,
    date: "Run history will appear here",
    nextPrompt: "Previous run passed verification. Ready for next guarded run.",
  },
];

export default function AppPage() {
  return (
    <AppShell active="/app">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Install the CLI to start trimming waste.
              </p>
            </div>
            <Link
              href="/app/install"
              className="shrink-0 rounded-sm bg-accent px-4 py-1.5 text-xs font-medium text-[oklch(0.07_0_0)] hover:bg-accent/90 transition-colors"
            >
              Install CLI
            </Link>
          </div>
        </div>

        <div className="rounded-sm border border-accent/20 bg-accent/5 p-5">
          <p className="text-sm font-medium text-accent mb-1">The CLI is the product.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This dashboard shows run history, estimated savings, and project memory from your
            local <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">.runtrim/</code> folder.
            Start with the CLI, then come back here to review what happened.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Metrics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {EMPTY_METRICS.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Quick start
            </h2>
            <TerminalCard
              title="terminal"
              lines={INSTALL_LINES}
              copyText="npm run runtrim -- init"
            />
            <div className="mt-3 flex gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 flex-1 min-w-0">
                <code className="font-mono text-xs text-foreground truncate">
                  npm run runtrim -- init
                </code>
                <CopyButton text="npm run runtrim -- init" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Continue where you left off
            </h2>
            <div className="rounded-sm border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-4">
                After your first guard run, this section will show your latest run status and
                the next safe action.
              </p>
              <RunTimeline runs={SAMPLE_RUNS} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Share card preview
          </h2>
          <ShareCard
            project="your-project"
            runsGuarded={0}
            estimatedTokens="0"
            estimatedDollars="$0.00"
            riskReduction="0"
          />
        </div>
      </div>
    </AppShell>
  );
}
