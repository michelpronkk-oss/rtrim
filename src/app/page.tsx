import Link from "next/link";
import { MotionSection, MotionFade } from "@/components/app/motion-section";
import { TerminalCard } from "@/components/app/terminal-card";
import { MetricCard } from "@/components/app/metric-card";
import { CopyButton } from "@/components/app/copy-button";
import { RiskBadge } from "@/components/app/risk-badge";

const WORKFLOW_STEPS = [
  {
    num: "01",
    cmd: "runtrim init",
    desc: "Initialize in your repo. Detect your stack, sensitive areas, and project structure.",
  },
  {
    num: "02",
    cmd: 'runtrim guard "fix checkout redirect"',
    desc: "Audit the task. Score the waste risk. Build a strict guarded run contract.",
  },
  {
    num: "03",
    cmd: "Paste into Claude, Codex, or Cursor",
    desc: "Your agent runs with defined scope, stop rules, and a required output format.",
  },
  {
    num: "04",
    cmd: "runtrim check",
    desc: "Read the git diff. Evaluate agent output. Flag scope drift automatically.",
  },
  {
    num: "05",
    cmd: "runtrim report",
    desc: "See estimated savings, run history, drift warnings, and project state.",
  },
];

const BEFORE_LINES = [
  { type: "comment" as const, text: "# Raw task" },
  { type: "prompt" as const, text: "$ runtrim guard ..." },
  { text: "" },
  { type: "dim" as const, text: "Task:        fix checkout redirect" },
  { type: "dim" as const, text: "Score:       47/100" },
  { type: "accent" as const, text: "Risk:        HIGH" },
  { text: "" },
  { type: "comment" as const, text: "Flags detected:" },
  { type: "dim" as const, text: "  ! Vague task description" },
  { type: "dim" as const, text: "  ! No success condition" },
  { type: "dim" as const, text: "  ! No stop rules defined" },
  { type: "dim" as const, text: "  ! No forbidden scope" },
  { type: "dim" as const, text: "  - No audit-first instruction" },
];

const AFTER_LINES = [
  { type: "header" as const, text: "RUNTRIM GUARDED RUN CONTRACT" },
  { type: "comment" as const, text: "Mode: GUARDED-STRICT  |  Agent: claude / sonnet" },
  { text: "" },
  { type: "header" as const, text: "RELEVANT SCOPE" },
  { type: "dim" as const, text: "- src/app/ only" },
  { type: "dim" as const, text: "- Max 5 files total" },
  { text: "" },
  { type: "header" as const, text: "FORBIDDEN SCOPE" },
  { type: "dim" as const, text: "- Do not touch auth or session handling" },
  { type: "dim" as const, text: "- Do not modify middleware.ts / proxy.ts" },
  { type: "dim" as const, text: "- Do not install new dependencies" },
  { text: "" },
  { type: "header" as const, text: "STOP RULES" },
  { type: "dim" as const, text: "- Stop if change requires > 5 files" },
  { type: "dim" as const, text: "- Stop if forbidden scope is needed" },
  { text: "" },
  { type: "accent" as const, text: "Score: 92/100  |  Est. ~27,000 tokens trimmed" },
];

const SAMPLE_CONTRACT = `RUNTRIM GUARDED RUN CONTRACT
Mode: GUARDED-STRICT
Agent: claude / sonnet

OBJECTIVE
fix checkout redirect

RELEVANT SCOPE
- src/app/ - App Router pages and layouts only
- Only files directly referenced by the task
- Maximum 5 files total

FORBIDDEN SCOPE
- Do not touch auth logic, session handling, or JWT tokens
- Do not modify middleware.ts or proxy.ts
- Do not install new dependencies without approval
- Do not refactor code outside the direct task scope

STOP RULES
- Stop if the change requires touching more than 5 files
- Stop if you need to modify any forbidden file
- Stop if you cannot identify a clear root cause`;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight text-foreground">RunTrim</span>
          <div className="flex items-center gap-4">
            <Link
              href="/app/install"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/app/install"
              className="rounded-sm bg-accent px-4 py-1.5 text-sm font-medium text-[oklch(0.07_0_0)] hover:bg-accent/90 transition-colors"
            >
              Install
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 40%, oklch(0.72 0.15 70 / 8%) 0%, transparent 60%)",
          }}
        />
        <MotionFade delay={0}>
          <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-1.5 mb-8">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-xs font-mono text-muted-foreground">
              CLI guard layer for AI coding runs
            </span>
          </div>
        </MotionFade>

        <MotionFade delay={0.08}>
          <h1 className="max-w-3xl text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] text-foreground">
            Stop wasting tokens
            <br />
            <span className="text-accent">on messy AI runs.</span>
          </h1>
        </MotionFade>

        <MotionFade delay={0.16}>
          <p className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            RunTrim is a CLI guard layer that audits your task, locks the scope, and creates a run
            contract before Claude, Codex or Cursor touches your repo.
          </p>
        </MotionFade>

        <MotionFade delay={0.24}>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-2.5">
              <span className="font-mono text-sm text-foreground">
                npm install -g runtrim
              </span>
              <CopyButton text="npm install -g runtrim" />
            </div>
            <Link
              href="#how-it-works"
              className="rounded-sm border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </MotionFade>

        <MotionFade delay={0.32}>
          <p className="mt-5 text-xs font-mono text-muted-foreground/50">
            V1 does not upload your code. Runs are stored locally in .runtrim/runs/
          </p>
        </MotionFade>
      </section>

      <MotionSection
        className="border-t border-border bg-card/30 py-20 px-6"
        id="problem"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-4">
            The problem
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-12">
            Vague tasks cause full repo scans.
            <br />
            Full repo scans burn tokens.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Token waste",
                body: "A vague prompt forces the agent to scan your entire repo looking for context. A high-risk task can waste 40-80k tokens before writing a single line of code.",
                stat: "~40-80k tokens",
                statLabel: "wasted per messy run",
              },
              {
                title: "Scope drift",
                body: "Without a forbidden scope, agents touch auth, middleware, and billing logic they were never asked to change. One unbounded run can corrupt multiple systems.",
                stat: "Auth, billing, env",
                statLabel: "top drift targets",
              },
              {
                title: "Context bloat",
                body: "Every re-run after a failed agent run reloads the full conversation history. Without check points, you pay for the same failed context over and over.",
                stat: "3-5x",
                statLabel: "cost on repeat runs",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-sm border border-border bg-card p-5">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
                  {item.title}
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">{item.body}</p>
                <div className="border-t border-border pt-4">
                  <p className="text-xl font-bold text-accent">{item.stat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.statLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection className="py-20 px-6" id="how-it-works">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-4">
            Workflow
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-12">
            Five commands. Full control.
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="flex gap-5 rounded-sm border border-border bg-card p-5 hover:border-accent/25 transition-colors duration-200"
              >
                <span className="text-2xl font-bold text-accent/30 font-mono shrink-0 w-8">
                  {step.num}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono text-foreground">{step.cmd}</code>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden sm:flex items-center text-muted-foreground/30">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 3l5 5-5 5M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection className="py-20 px-6 border-t border-border bg-card/30">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-4">
            Before / After
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-12">
            Raw task. Guarded contract.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Before guard
                </span>
                <RiskBadge risk="high" />
              </div>
              <TerminalCard title="terminal" lines={BEFORE_LINES} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  After guard
                </span>
                <RiskBadge risk="low" />
              </div>
              <TerminalCard
                title="guarded-contract.txt"
                lines={AFTER_LINES}
                copyText={SAMPLE_CONTRACT}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/50 font-mono">
            The guarded contract is copied to clipboard and ready to paste into Claude, Codex, or Cursor.
          </p>
        </div>
      </MotionSection>

      <MotionSection className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-4">
            Estimated savings
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-12">
            Dashboard preview. Local data, no uploads.
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Est. tokens trimmed"
              value="~127k"
              sub="Across 5 guarded runs. Estimated, not verified."
              accent
            />
            <MetricCard
              label="Runs guarded"
              value="5"
              sub="Since runtrim init in this repo."
            />
            <MetricCard
              label="Avg. risk reduction"
              value="71%"
              sub="Prompt score before vs after guard."
            />
            <MetricCard
              label="Est. spend avoided"
              value="~$0.38"
              sub="Based on claude / sonnet pricing. Estimated."
              accent
            />
          </div>
        </div>
      </MotionSection>

      <MotionSection className="py-20 px-6 border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl">
          <blockquote className="rounded-sm border border-border bg-card p-8">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-5">
              Common objection
            </p>
            <p className="text-lg sm:text-xl font-medium text-foreground leading-relaxed mb-6">
              "Can't I just ask ChatGPT for a better prompt?"
            </p>
            <div className="border-t border-border pt-6">
              <p className="text-muted-foreground leading-relaxed">
                Once, yes. RunTrim is for every run. It scores the risk, creates a strict
                contract, checks the result against the git diff, and remembers where you left
                off. ChatGPT does not know your repo, your sensitive areas, or your last five
                runs. RunTrim does.
              </p>
            </div>
          </blockquote>
        </div>
      </MotionSection>

      <MotionSection className="py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Scope the run before
            <br />
            Claude burns tokens.
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            One command before every AI coding run. No account required. No code uploaded.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-3 rounded-sm border border-border bg-card px-5 py-3">
              <span className="font-mono text-sm text-foreground">
                npm install -g runtrim
              </span>
              <CopyButton text="npm install -g runtrim" />
            </div>
            <Link
              href="/app/install"
              className="rounded-sm border border-accent/30 bg-accent/5 px-5 py-3 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              View install guide
            </Link>
          </div>

          <p className="mt-6 text-xs font-mono text-muted-foreground/40">
            Package not published yet? Use: npm run runtrim -- init
          </p>
        </div>
      </MotionSection>

      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold text-foreground">RunTrim</span>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/app" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/app/install" className="hover:text-foreground transition-colors">
              Install
            </Link>
            <Link href="/app/runs" className="hover:text-foreground transition-colors">
              Runs
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/40 font-mono">
            V1 does not upload code.
          </p>
        </div>
      </footer>
    </div>
  );
}
