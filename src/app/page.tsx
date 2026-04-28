import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { HeroTerminal } from "@/components/app/hero-terminal";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";
import { planOrder, plans } from "@/lib/plans";

// â”€â”€ Terminal data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CLI_PREVIEW = [
  { type: "comment" as const, text: "# initialize RunTrim in your project" },
  { type: "prompt"  as const, text: "$ runtrim init" },
  { type: "dim"     as const, text: "  config created  .runtrim/config.json" },
  { text: "" },
  { type: "comment" as const, text: "# capture a completed run" },
  { type: "prompt"  as const, text: '$ runtrim capture "fixed sync handling in checkout"' },
  { type: "dim"     as const, text: "  run captured  run_47  2 files  score 84/100" },
  { text: "" },
  { type: "comment" as const, text: "# view full run and prompt history" },
  { type: "prompt"  as const, text: "$ runtrim history" },
  { type: "dim"     as const, text: "  run_47  fixed sync handling       partial  Apr 28" },
  { type: "dim"     as const, text: "  run_46  auth flow audit            passed   Apr 27" },
  { type: "dim"     as const, text: "  run_45  rewrite billing and schema split     Apr 26" },
  { text: "" },
  { type: "comment" as const, text: "# see estimated savings across all runs" },
  { type: "prompt"  as const, text: "$ runtrim savings" },
  { type: "accent"  as const, text: "  tokens saved  ~847,000    cost saved  ~$4.12" },
];

const AGENT_MODES = [
  { cmd: "runtrim agent set claude",  note: "# Claude Code" },
  { cmd: "runtrim agent set codex",   note: "# OpenAI Codex CLI" },
  { cmd: "runtrim agent set cursor",  note: "# Cursor" },
  { cmd: "runtrim agent set copy",    note: "# paste into any tool" },
];

// â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PROBLEMS = [
  "You re-explain the same project structure at the start of every session.",
  "Context limits cut your run short. You restart from scratch next time.",
  "The same failed approach gets tried again because there is no run log.",
  "You pay full token cost on repetition that a memory layer would skip.",
  "There is no record of what changed, what worked, or what was left unfinished.",
  "Prompt quality degrades because you write from memory, not from history.",
];

const FEATURES = [
  {
    title: "Full run history",
    body: "Every captured run is stored locally with status, risk score, changed files, and continuation guidance. Nothing disappears between sessions.",
  },
  {
    title: "Prompt history",
    body: "RunTrim saves the prompts that worked. Reuse them verbatim or as a base for the next run, without rebuilding from scratch.",
  },
  {
    title: "Reusable project context",
    body: "Project-specific scope, sensitive systems, and stop rules are stored once and loaded automatically so the agent starts informed.",
  },
  {
    title: "Savings visibility",
    body: "Estimated tokens saved and cost avoided are tracked per run and surfaced as a project total. Figures are local estimates, not billing data.",
  },
];

const SAVINGS_STATS = [
  { value: "47",      label: "Runs captured",        note: "Across 4 local projects",    accent: false },
  { value: "23",      label: "Prompts reused",        note: "From saved run history",     accent: false },
  { value: "~847k",   label: "Est. tokens saved",     note: "Based on local run scoring", accent: true  },
  { value: "~$4.12",  label: "Est. cost avoided",     note: "Standard model rate",        accent: true  },
];

const FAQS = [
  {
    q: "Does RunTrim upload my source code?",
    a: "No. V1 runs entirely locally. Source code never leaves your machine. Cloud sync in paid plans uploads run metadata only, not file contents or env values.",
  },
  {
    q: "How accurate are the savings estimates?",
    a: "They are approximations based on task score, captured run size, and token usage patterns. Treat them as directional signals, not billing data.",
  },
  {
    q: "Which agents does it work with?",
    a: "Claude Code, Codex CLI, Cursor, ChatGPT, and any agent you can run from a terminal. RunTrim wraps or copies depending on your config.",
  },
  {
    q: "Can't I just keep notes manually?",
    a: "You can. RunTrim automates the capture, structures run output, and loads context back into the next session so you spend less time reconstructing.",
  },
];

// Feature rows for pricing comparison
const PRICING_FEATURES = [
  { label: "Local CLI",                free: true,       pro: true,       builder: true,       team: true       },
  { label: "Run history",              free: "local",    pro: "cloud",    builder: "cloud",     team: "cloud"    },
  { label: "Prompt history",           free: "local",    pro: "cloud",    builder: "cloud",     team: "cloud"    },
  { label: "Projects",                 free: "1",        pro: "1",        builder: "unlimited", team: "unlimited" },
  { label: "Savings report",           free: false,      pro: true,       builder: true,       team: true       },
  { label: "Custom project rules",     free: false,      pro: false,      builder: true,       team: true       },
  { label: "Team run policies",        free: false,      pro: false,      builder: false,      team: true       },
  { label: "GitHub PR summaries",      free: false,      pro: false,      builder: false,      team: true       },
];

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07071A]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07071A]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">How it works</Link>
            <Link href="#pricing"      className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Pricing</Link>
            <Link href="/app"          className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Dashboard</Link>
          </nav>
          <Link
            href="/app/install"
            className="rounded-md bg-[#7C6DFA] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install RunTrim
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="pointer-events-none absolute inset-0 hero-tech-grid opacity-70" />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-14 lg:pb-16 lg:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <MotionFade>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#6F7F96]">Run history and context reuse</p>
              </MotionFade>
              <MotionFade delay={0.05}>
                <h1 className="mt-4 text-[2.4rem] font-bold leading-[1.05] tracking-[-0.04em] text-[#EDEEFF] sm:text-[3.1rem] lg:text-[3.5rem]">
                  Stop paying twice for context your project already created.
                </h1>
              </MotionFade>
              <MotionFade delay={0.1}>
                <p className="mt-5 max-w-[590px] text-[1rem] leading-7 text-[#7F8CA3]">
                  RunTrim tracks AI coding runs, prompt history, reusable context, and estimated savings, so every next agent starts from the full project state.
                </p>
              </MotionFade>
              <MotionFade delay={0.14}>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/app/install"
                    className="inline-flex items-center gap-2.5 rounded-md bg-[#7C6DFA] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                  >
                    Install RunTrim
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="rounded-md border border-white/12 px-5 py-3 text-sm text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                  >
                    View CLI flow
                  </Link>
                </div>
                <p className="mt-5 font-mono text-[11px] text-[#56647D]">Local-first. Agent-agnostic. Sync-ready.</p>
              </MotionFade>
            </div>
            <MotionFade delay={0.18}>
              <HeroTerminal />
            </MotionFade>
          </div>

          <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {["Prompt history", "Run history", "Reusable context", "Savings visibility"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-[#0D111B] px-3.5 py-2.5">
                <p className="font-mono text-[11px] text-[#97A7BC]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Problem */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
            <div>
              <p className="text-sm font-bold text-[#EDEEFF]">The problem</p>
              <p className="mt-3 text-sm leading-6 text-[#4D5070]">
                Every new session starts blind. You pay again for context the last run already built.
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {PROBLEMS.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-md border border-white/8 bg-[#0D0C22] px-4 py-3.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-[#2E2E50]" />
                  <span className="text-[13px] leading-6 text-[#9699BE]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-bold text-[#EDEEFF]">What RunTrim tracks</p>
          <p className="mb-10 max-w-md text-[13px] text-[#4D5070]">Four layers of memory that make every run cheaper than the last.</p>
          <div className="overflow-hidden rounded-lg border border-white/8">
            <div className="grid gap-px bg-white/8 sm:grid-cols-2">
              {FEATURES.map(({ title, body }) => (
                <div key={title} className="bg-[#0D0C22] px-6 py-7">
                  <p className="text-[15px] font-semibold text-[#EDEEFF]">{title}</p>
                  <p className="mt-3 text-[13px] leading-6 text-[#6870A0]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLI preview */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-bold text-[#EDEEFF]">Five commands. Full memory.</p>
          <p className="mb-8 text-[13px] text-[#4D5070]">RunTrim is CLI-first. No GUI required for capture, history, or savings tracking.</p>
          <TerminalCard title="runtrim" lines={CLI_PREVIEW} />
        </div>
      </section>

      {/* Savings proof */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-bold text-[#EDEEFF]">Savings over time</p>
          <p className="mb-8 text-[13px] text-[#4D5070]">Example figures from a single local project, marked as estimated.</p>
          <div className="overflow-hidden rounded-lg border border-white/8">
            <div className="grid grid-cols-2 gap-px bg-white/8 xl:grid-cols-4">
              {SAVINGS_STATS.map(({ value, label, note, accent }) => (
                <div key={label} className="bg-[#0D0C22] px-6 py-7">
                  <p className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${accent ? "text-[#9E91FF]" : "text-[#EDEEFF]"}`}>
                    {value}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#4D5070]">{label}</p>
                  <p className="mt-1 text-[11px] text-[#2E2E50]">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 font-mono text-[11px] text-[#2E2E50]">All figures are estimates. RunTrim does not access billing data.</p>
        </div>
      </section>

      {/* Works with */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-bold text-[#EDEEFF]">Works with the tools you already use.</p>
          <p className="mb-8 text-[13px] text-[#4D5070]">Set your agent once. RunTrim handles the rest.</p>
          <div className="overflow-hidden rounded-lg border border-white/8">
            {AGENT_MODES.map(({ cmd, note }) => (
              <div
                key={cmd}
                className="flex items-center justify-between gap-4 border-b border-white/8 bg-[#0D0C22] px-5 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-baseline gap-5">
                  <code className="shrink-0 font-mono text-[13px] text-[#9E91FF]">{cmd}</code>
                  <span className="truncate font-mono text-[12px] text-[#2E2E50]">{note}</span>
                </div>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">Pricing</p>
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-3xl">
            Start local. Scale when memory matters.
          </h2>
          <p className="mt-4 max-w-lg text-[13px] leading-6 text-[#6870A0]">
            The CLI is free forever. Paid plans add cloud memory, multi-device history, and team visibility.
          </p>

          {/* Comparison table */}
          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[680px]">

              {/* Plan headers */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] border-b border-white/8">
                <div className="px-5 py-4" />
                {planOrder.map((id) => {
                  const plan = plans[id];
                  const isBuilder = id === "builder";
                  const isFree = id === "free";
                  return (
                    <div
                      key={id}
                      className={`relative px-5 py-4 ${isBuilder ? "bg-[#0D0C22]" : ""}`}
                    >
                      {isBuilder && (
                        <div className="absolute inset-x-0 top-0 h-px brand-gradient" />
                      )}
                      <p className="text-[12px] font-semibold text-[#9699BE]">{plan.name}</p>
                      <p className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${isBuilder ? "text-[#9E91FF]" : "text-[#EDEEFF]"}`}>
                        {plan.priceLabel}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-4 text-[#4D5070]">{plan.summary}</p>
                    </div>
                  );
                })}
              </div>

              {/* Feature rows */}
              {PRICING_FEATURES.map(({ label, free, pro, builder, team }, i) => {
                const cells = [free, pro, builder, team];
                const isLast = i === PRICING_FEATURES.length - 1;
                return (
                  <div
                    key={label}
                    className={`grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] ${isLast ? "" : "border-b border-white/8"}`}
                  >
                    <div className="px-5 py-3.5">
                      <p className="text-[13px] text-[#9699BE]">{label}</p>
                    </div>
                    {cells.map((val, ci) => {
                      const isBuilder = ci === 2;
                      return (
                        <div key={ci} className={`flex items-center px-5 py-3.5 ${isBuilder ? "bg-[#0D0C22]" : ""}`}>
                          {val === true ? (
                            <Check className="size-3.5 text-[#7C6DFA]" />
                          ) : val === false ? (
                            <span className="size-3.5 rounded-sm bg-white/6" />
                          ) : (
                            <span className="font-mono text-[12px] text-[#6870A0]">{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* CTA row */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] border-t border-white/8 bg-[#07071A]">
                <div className="px-5 py-5">
                  <p className="text-[11px] text-[#2E2E50]">Cloud sync stores metadata only. Source code stays local.</p>
                </div>
                {planOrder.map((id) => {
                  const plan = plans[id];
                  const isFree    = id === "free";
                  const isBuilder = id === "builder";
                  const isSoon    = id === "team";
                  return (
                    <div key={id} className={`flex items-center px-5 py-5 ${isBuilder ? "bg-[#0D0C22]" : ""}`}>
                      {isFree ? (
                        <Link
                          href="/app/install"
                          className="rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                        >
                          {plan.ctaLabel}
                        </Link>
                      ) : isBuilder ? (
                        <Link
                          href="/app/install"
                          className="rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                        >
                          {plan.ctaLabel}
                        </Link>
                      ) : isSoon ? (
                        <span className="rounded-md border border-white/8 px-3.5 py-2 text-[12px] text-[#2E2E50]">
                          {plan.ctaLabel}
                        </span>
                      ) : (
                        <Link
                          href="/app/install"
                          className="rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                        >
                          {plan.ctaLabel}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#0D0C22]">
        {/* Gradient top edge */}
        <div className="absolute inset-x-0 top-0 h-px brand-gradient" />
        {/* Gradient bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-px brand-gradient opacity-40" />
        {/* Faint dot grid for texture */}
        <div className="pointer-events-none absolute inset-0 hero-dot-grid opacity-30" />

        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Get started</p>
          <h3 className="text-3xl font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.75rem]">
            Start tracking your runs
          </h3>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-[#6870A0]">
            Install the CLI, capture your first run, and see exactly what your project already knows.
          </p>
          <div className="mx-auto mt-9 flex w-fit items-center gap-3 rounded-md border border-white/10 bg-[#090918] px-4 py-3">
            <code className="font-mono text-sm text-[#EDEEFF]">npm install -g runtrim</code>
            <CopyButton text="npm install -g runtrim" />
          </div>
          <p className="mt-3 font-mono text-[11px] text-[#2E2E50]">Runs locally. No account required.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/app/install"
              className="rounded-md bg-[#7C6DFA] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              Get started
            </Link>
            <Link
              href="/app"
              className="rounded-md border border-white/10 px-6 py-3 text-sm text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
            >
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-10 text-sm font-bold text-[#EDEEFF]">FAQ</p>
          <div className="grid gap-8 lg:grid-cols-2">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <p className="text-[15px] font-semibold text-[#EDEEFF]">{q}</p>
                <p className="mt-3 text-[13px] leading-6 text-[#6870A0]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-5 rounded" />
            <span className="text-sm font-bold text-[#EDEEFF]">RunTrim</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/app/install" className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Install</Link>
            <Link href="#pricing"     className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Pricing</Link>
            <Link href="/app"         className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Dashboard</Link>
          </div>
          <span className="font-mono text-[11px] text-[#2E2E50]">V1. Local-first. No code uploads.</span>
        </div>
      </footer>
    </div>
  );
}

