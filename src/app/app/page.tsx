import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/app/metric-card";
import { RunTimeline } from "@/components/app/run-timeline";
import { ShareCard } from "@/components/app/share-card";
import { TerminalCard } from "@/components/app/terminal-card";
import { getPlan } from "@/lib/plans";

const METRICS = [
  { label: "Est. tokens trimmed", value: "~384k", sub: "Across local runs",           accent: true  },
  { label: "Runs guarded",        value: "18",    sub: "Including split-required"               },
  { label: "Mega-runs blocked",   value: "6",     sub: "Stopped before unsafe edits"            },
  { label: "Avg. contract score", value: "75/100",sub: "From runtrim check output"              },
];

const RUNS = [
  {
    id: "r1",
    task: "Improve checkout redirect and verify post-payment return handling",
    riskBefore: "high",
    riskAfter: "low",
    status: "partial" as const,
    date: "Apr 28, 2026 14:34",
    changed: "2 files changed",
    nextPrompt: "Continue from current diff only. Verification mode enabled.",
  },
  {
    id: "r2",
    task: "Rewrite auth flow, middleware, database, billing",
    riskBefore: "critical",
    status: "split_required" as const,
    date: "Apr 28, 2026 12:04",
    changed: "0 files changed",
    nextPrompt: "Split required. Audit one system at a time.",
  },
];

const CONTINUE_LINES = [
  { type: "header" as const, text: "continuation prompt" },
  { text: "" },
  { type: "dim" as const, text: "  last status   PARTIAL" },
  { type: "dim" as const, text: "  missing       root cause  verification" },
  { text: "" },
  { type: "accent" as const, text: "  Next prompt ready for verification-only mode." },
];

export default function AppPage() {
  const currentPlan = getPlan("free");

  return (
    <AppShell active="/app">
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-[#EEEEF2]">Overview</h1>
            <p className="mt-1 text-[13px] text-[#4A4E72]">Guarded runs, continuation prompts, and project memory.</p>
          </div>
          <Link
            href="/app/install"
            className="rounded-md border border-white/7 bg-[#0D0E1C] px-3.5 py-1.5 text-[13px] font-medium text-[#8888A8] transition-colors hover:text-[#EEEEF2]"
          >
            Install CLI
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} accent={m.accent} />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="surface-panel rounded-lg p-5">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Recent runs</p>
            <RunTimeline runs={RUNS} />
          </div>
          <div className="space-y-4">
            <TerminalCard title="continuation.txt" lines={CONTINUE_LINES} compact />
            <div className="surface-panel rounded-lg p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Current plan</p>
              <p className="mt-2 text-sm font-semibold text-[#EEEEF2]">
                {currentPlan.name} <span className="text-[#0DDB9E]">{currentPlan.priceLabel}</span>
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#8888A8]">
                Local CLI is free. Cloud sync and hosted dashboard history are planned paid features.
              </p>
            </div>
            <div className="surface-panel rounded-lg p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Project memory</p>
              <p className="mt-3 text-[13px] leading-6 text-[#8888A8]">
                RunTrim stores task, score, status, drift, and next safe prompt per run in{" "}
                <code className="font-mono text-[#0DDB9E]">.runtrim/runs/</code>.
              </p>
              <p className="mt-3 text-[13px] text-[#4A4E72]">
                Keeps follow-up prompts specific instead of restarting from scratch.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ShareCard project="rtrim" runsGuarded={18} estimatedTokens="~384k" estimatedDollars="~$1.15" riskReduction="45" />
          <div className="surface-panel rounded-lg p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">CLI reference</p>
            <p className="mt-3 text-[13px] leading-6 text-[#8888A8]">
              The CLI is the product. This dashboard is the memory layer for safer continuation.
            </p>
            <div className="mt-4 space-y-1 rounded border border-white/7 bg-[#07080F] p-4 font-mono text-[12px] text-[#4A4E72]">
              <p>npm run runtrim -- run "fix checkout redirect"</p>
              <p>npm run runtrim -- check</p>
              <p>npm run runtrim -- report</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
