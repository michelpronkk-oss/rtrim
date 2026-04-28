import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { HeroTerminal } from "@/components/app/hero-terminal";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";
import { RiskBadge } from "@/components/app/risk-badge";
import { planOrder, plans } from "@/lib/plans";

const BEFORE_LINES = [
  { type: "comment" as const, text: "# unguarded" },
  { type: "prompt"  as const, text: "fix checkout redirect, check everything and make sure billing works" },
  { text: "" },
  { type: "dim"     as const, text: "  no scope  no stop rules  no success criteria" },
];

const AFTER_LINES = [
  { type: "header" as const, text: "runtrim guarded contract" },
  { text: "" },
  { type: "header" as const, text: "objective" },
  { type: "output" as const, text: "  Fix checkout redirect after payment return." },
  { text: "" },
  { type: "header" as const, text: "scope" },
  { type: "dim"    as const, text: "  src/app/checkout    src/lib/redirect" },
  { text: "" },
  { type: "header" as const, text: "stop rules" },
  { type: "dim"    as const, text: "  stop if auth, DB, or billing is needed" },
  { type: "dim"    as const, text: "  stop if file count exceeds 5" },
  { text: "" },
  { type: "header" as const, text: "required output" },
  { type: "dim"    as const, text: "  ROOT CAUSE  /  FILES CHANGED  /  HOW TO VERIFY" },
];

const SPLIT_LINES = [
  { type: "prompt" as const, text: '$ runtrim guard "rewrite auth flow, fix middleware, update schema, fix billing"' },
  { text: "" },
  { type: "accent" as const, text: "  SPLIT REQUIRED    4 systems detected" },
  { text: "" },
  { type: "header" as const, text: "recommended split" },
  { type: "dim"    as const, text: "  1  audit auth flow only" },
  { type: "dim"    as const, text: "  2  audit middleware only" },
  { type: "dim"    as const, text: "  3  audit database impact only" },
  { type: "dim"    as const, text: "  4  audit billing flow only" },
];

const CHECK_LINES = [
  { type: "prompt" as const, text: "$ npm run runtrim -- check" },
  { text: "" },
  { type: "header" as const, text: "changed files" },
  { type: "dim"    as const, text: "  src/app/checkout/page.tsx" },
  { type: "dim"    as const, text: "  src/lib/redirect.ts" },
  { text: "" },
  { type: "dim"    as const, text: "  contract score  74 / 100" },
  { type: "dim"    as const, text: "  scope drift     NONE" },
  { type: "accent" as const, text: "  missing         root cause  verification" },
  { text: "" },
  { type: "header" as const, text: "next prompt" },
  { type: "output" as const, text: '  "Verification-only continuation generated."' },
];

const AGENT_MODES = [
  { cmd: "npm run runtrim -- agent set claude", note: "# Claude Code" },
  { cmd: "npm run runtrim -- agent set codex",  note: "# OpenAI Codex" },
  { cmd: "npm run runtrim -- agent set cursor", note: "# Cursor" },
  { cmd: "npm run runtrim -- agent set copy",   note: "# paste into any tool" },
];

const WORKFLOW = [
  ["01", 'Run `runtrim run "<task>"`',       "RunTrim receives the raw task."],
  ["02", "Task is audited and scored",        "Scope, risk, and system spread are evaluated."],
  ["03", "Unsafe runs are blocked and split", "Multi-system tasks are divided before the agent starts."],
  ["04", "Safe runs generate a contract",     "Objective, scope, stop rules, required proof."],
  ["05", "Post-run diff is verified",         "Scope drift, missing proof, and continuation checked."],
  ["06", "Next safe prompt is generated",     "Continuation is specific, not a restart from scratch."],
];

const STATS = [
  { value: "12 runs",   label: "Project memory",        accent: false },
  { value: "4 partial", label: "Needs verification",    accent: false },
  { value: "6 blocked", label: "Mega-runs stopped",     accent: false },
  { value: "~384k",     label: "Tokens trimmed (est.)", accent: true  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07080F]">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/7 bg-[#07080F]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-bold tracking-tight text-[#EEEEF2]">RunTrim</span>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm text-[#4A4E72] transition-colors hover:text-[#EEEEF2]">How it works</Link>
            <Link href="/app/install"  className="text-sm text-[#4A4E72] transition-colors hover:text-[#EEEEF2]">Install</Link>
            <Link href="/app"          className="text-sm text-[#4A4E72] transition-colors hover:text-[#EEEEF2]">Dashboard</Link>
          </nav>
          <Link
            href="/app/install"
            className="rounded-md bg-[#0DDB9E] px-4 py-1.5 text-sm font-semibold text-[#02060F] transition-opacity hover:opacity-85"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[600px] hero-glow" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] hero-ring"  />

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-28 text-center lg:pt-36">
          <MotionFade>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0DDB9E]/20 bg-[#0DDB9E]/6 px-3.5 py-1.5">
              <span className="size-1.5 rounded-full bg-[#0DDB9E]" />
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#0DDB9E]">CLI-first agent control</span>
            </div>
          </MotionFade>

          <MotionFade delay={0.06}>
            <h1 className="text-[3.75rem] font-bold leading-[1.0] tracking-[-0.04em] text-[#EEEEF2] sm:text-[4.5rem] lg:text-[5.5rem]">
              Guard every
              <br />
              <span className="text-[#0DDB9E]">agent run.</span>
            </h1>
          </MotionFade>

          <MotionFade delay={0.10}>
            <p className="mx-auto mt-7 max-w-xl text-lg leading-7 text-[#6A6E98]">
              RunTrim audits the task, blocks unsafe mega-runs, and generates a scoped contract before your agent touches the repo.
            </p>
          </MotionFade>

          <MotionFade delay={0.14}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/app/install"
                className="inline-flex items-center gap-2.5 rounded-md bg-[#0DDB9E] px-5 py-3 text-sm font-semibold text-[#02060F] transition-opacity hover:opacity-85"
              >
                Install RunTrim
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-white/10 px-5 py-3 text-sm text-[#8888A8] transition-colors hover:border-white/16 hover:text-[#EEEEF2]"
              >
                How it works
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] text-[#2E3050]">V1 runs locally. Code is not uploaded.</p>
          </MotionFade>

          <MotionFade delay={0.18}>
            <div className="mt-14">
              <HeroTerminal />
            </div>
          </MotionFade>
        </div>
      </section>

      {/* Works with */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="mb-6 text-[13px] text-[#4A4E72]">Works with the tools you already use.</p>
          <div className="overflow-hidden rounded-lg border border-white/7">
            {AGENT_MODES.map(({ cmd, note }, i) => (
              <div
                key={cmd}
                className="flex items-center justify-between gap-4 border-b border-white/7 bg-[#0D0E1C] px-5 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-baseline gap-4">
                  <code className="shrink-0 font-mono text-[13px] text-[#0DDB9E]">{cmd}</code>
                  <span className="truncate font-mono text-[12px] text-[#2E3050]">{note}</span>
                </div>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="text-sm font-semibold text-[#EEEEF2]">The problem</p>
              <p className="mt-3 text-sm leading-6 text-[#4A4E72]">
                Without guard rails, every agent task carries risk that compounds across runs.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "The agent scans half the repo for a small, isolated fix.",
                "A quick bug becomes an auth, middleware, and billing change.",
                "The same failed assumption gets retried across multiple runs.",
                "You lose context on where the run left off after each restart.",
                "Prompts have no stop rules, no scope, no success criteria.",
                "Costs climb while confidence drops with every rerun.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-md border border-white/7 bg-[#0D0E1C] px-4 py-3.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-[#2E3050]" />
                  <span className="text-sm leading-6 text-[#8888A8]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-8 text-sm font-semibold text-[#EEEEF2]">How it works</p>
          <div className="overflow-hidden rounded-lg border border-white/7">
            {WORKFLOW.map(([num, step, detail]) => (
              <div
                key={num}
                className="flex items-start gap-8 border-b border-white/7 bg-[#0D0E1C] px-6 py-4 last:border-b-0 hover:bg-[#111226] transition-colors duration-150"
              >
                <span className="mt-0.5 w-6 shrink-0 font-mono text-[11px] text-[#2E3050]">{num}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#EEEEF2]">{step}</p>
                  <p className="mt-0.5 text-[13px] text-[#4A4E72]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-8 text-sm font-semibold text-[#EEEEF2]">Before and after</p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] text-[#4A4E72]">Unguarded task</span>
                <RiskBadge risk="high" />
              </div>
              <TerminalCard title="prompt.txt" lines={BEFORE_LINES} />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] text-[#4A4E72]">After RunTrim</span>
                <RiskBadge risk="low" />
              </div>
              <TerminalCard title="contract.txt" lines={AFTER_LINES} />
            </div>
          </div>
        </div>
      </section>

      {/* Split required */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-8 text-sm font-semibold text-[#EEEEF2]">Split required</p>
          <TerminalCard title="guard-output.txt" lines={SPLIT_LINES} />
        </div>
      </section>

      {/* Post-run check */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-8 text-sm font-semibold text-[#EEEEF2]">Post-run check</p>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <TerminalCard title="check-output.txt" lines={CHECK_LINES} />
            <div className="flex flex-col justify-center gap-4">
              <p className="text-sm leading-7 text-[#8888A8]">
                RunTrim tracks where the agent left off. Your next prompt continues from the current state instead of restarting the whole problem.
              </p>
              <p className="text-[13px] text-[#4A4E72]">
                Continuation memory is built from local run history and the current diff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-semibold text-[#EEEEF2]">Dashboard preview</p>
          <p className="mb-8 text-[13px] text-[#4A4E72]">The CLI does the work. The dashboard shows the memory.</p>
          <div className="overflow-hidden rounded-lg border border-white/7">
            <div className="grid grid-cols-2 gap-px bg-white/7 xl:grid-cols-4">
              {STATS.map(({ value, label, accent }) => (
                <div key={label} className="bg-[#0D0E1C] px-6 py-7 hover:bg-[#111226] transition-colors duration-150">
                  <p className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${accent ? "text-[#0DDB9E]" : "text-[#EEEEF2]"}`}>
                    {value}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#4A4E72]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-sm font-semibold text-[#EEEEF2]">Plans</p>
          <p className="mb-8 text-[13px] text-[#4A4E72]">
            Local CLI remains free. Cloud sync and hosted history are planned paid features.
          </p>
          <div className="grid gap-4 lg:grid-cols-4">
            {planOrder.map((id) => {
              const plan = plans[id];
              const isFree = id === "free";
              const isComingSoon = id === "team";
              return (
                <div key={id} className="surface-panel rounded-lg p-5">
                  <p className="text-sm font-semibold text-[#EEEEF2]">{plan.name}</p>
                  <p className={`mt-2 text-xl font-bold ${isFree ? "text-[#0DDB9E]" : "text-[#EEEEF2]"}`}>
                    {plan.priceLabel}
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {plan.bullets.slice(0, 6).map((item) => (
                      <li key={item} className="text-[12px] leading-5 text-[#8888A8]">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isFree ? (
                      <Link
                        href="/app/install"
                        className="inline-flex rounded-md bg-[#0DDB9E] px-3.5 py-2 text-xs font-semibold text-[#02060F] transition-opacity hover:opacity-85"
                      >
                        {plan.ctaLabel}
                      </Link>
                    ) : (
                      <span
                        className={`inline-flex rounded-md border px-3.5 py-2 text-xs font-medium ${
                          isComingSoon
                            ? "border-white/10 text-[#4A4E72]"
                            : "border-white/10 text-[#8888A8]"
                        }`}
                      >
                        {plan.ctaLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/7">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Common question</p>
            <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[#EEEEF2]">
              Can't I just ask ChatGPT for a better prompt?
            </h3>
            <p className="mt-4 text-sm leading-7 text-[#8888A8]">
              Once, yes. RunTrim is for every run. It scores the task, locks the scope, blocks unsafe mega-runs, checks the diff, and remembers where you left off automatically, before the agent starts.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/7">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 hero-glow opacity-50" />
          <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
            <h3 className="text-3xl font-bold tracking-[-0.03em] text-[#EEEEF2] sm:text-4xl">
              Get started
            </h3>
            <p className="mt-3 text-[#4A4E72]">Clone the repo and run locally. Global install is planned.</p>
            <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-md border border-white/7 bg-[#0D0E1C] px-4 py-3">
              <code className="font-mono text-sm text-[#EEEEF2]">npm run runtrim -- init</code>
              <CopyButton text="npm run runtrim -- init" />
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/app/install"
                className="rounded-md bg-[#0DDB9E] px-5 py-2.5 text-sm font-semibold text-[#02060F] transition-opacity hover:opacity-85"
              >
                Open install guide
              </Link>
              <Link
                href="/app"
                className="rounded-md border border-white/7 bg-[#0D0E1C] px-5 py-2.5 text-sm text-[#8888A8] transition-colors hover:text-[#EEEEF2]"
              >
                View dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/7">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <span className="text-sm font-bold text-[#EEEEF2]">RunTrim</span>
          <div className="flex items-center gap-6">
            <Link href="/app/install" className="text-[13px] text-[#4A4E72] transition-colors hover:text-[#8888A8]">Install</Link>
            <Link href="/app"         className="text-[13px] text-[#4A4E72] transition-colors hover:text-[#8888A8]">Dashboard</Link>
            <Link href="/app/runs"    className="text-[13px] text-[#4A4E72] transition-colors hover:text-[#8888A8]">Runs</Link>
          </div>
          <span className="font-mono text-[11px] text-[#2E3050]">V1. Runs locally. No code uploads.</span>
        </div>
      </footer>
    </div>
  );
}
