import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Terminal } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { HeroTerminal } from "@/components/app/hero-terminal";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";
import { SmartCta } from "@/components/app/smart-cta";
import { BeforeAfterSection } from "@/components/app/before-after-section";
import { AnimatedRunContract } from "@/components/app/animated-run-contract";
import { planOrder, plans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "RunTrim | Run AI coding tasks with guardrails",
  description:
    "RunTrim turns prompts into controlled AI coding runs with scoped contracts, reusable memory, token control, risk checks, and clean continuation.",
  alternates: {
    canonical: "https://www.runtrim.com",
  },
};

const CLI_PREVIEW = [
  { type: "comment" as const, text: "# daily guarded run (copy mode)" },
  { type: "prompt"  as const, text: '$ runtrim go "fix the billing redirect"' },
  { type: "dim"     as const, text: "  guarded prompt prepared" },
  { type: "dim"     as const, text: "  scoped to: billing route, checkout" },
  { type: "dim"     as const, text: "  project memory loaded" },
  { type: "dim"     as const, text: "  copied to clipboard — paste into agent" },
  { text: "" },
  { type: "prompt"  as const, text: "$ runtrim check" },
  { type: "dim"     as const, text: "  changed files reviewed" },
  { type: "dim"     as const, text: "  scope drift: none detected" },
  { type: "dim"     as const, text: "  proof gaps: 3 recorded" },
  { text: "" },
  { type: "prompt"  as const, text: "$ runtrim continue --reason usage_limit" },
  { type: "dim"     as const, text: "  continuation pack built" },
  { type: "dim"     as const, text: "  memory preserved" },
  { type: "dim"     as const, text: "  next: paste into the next agent session" },
];

const AGENT_MODES = [
  { cmd: "runtrim agent set copy",    note: "# recommended — paste into any tool" },
  { cmd: "runtrim agent set claude",  note: "# Claude Code (CLI)" },
  { cmd: "runtrim agent set codex",   note: "# OpenAI Codex CLI" },
  { cmd: "runtrim agent set cursor",  note: "# Cursor" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Scope the task",
    body: "Every prompt gets a scoped contract before the agent runs. Allowed files, forbidden systems, and stop conditions are defined before a single token is spent.",
    color: "#7C6DFA",
  },
  {
    step: "02",
    title: "Load memory",
    body: "Reusable project memory gives the agent context without starting from zero. Project structure, rules, and past decisions load automatically.",
    color: "#5B8BFF",
  },
  {
    step: "03",
    title: "Control the run",
    body: "Token budgets, allowed files, forbidden areas, and drift checks keep the run focused. Risk is scored before changes are applied.",
    color: "#9966FF",
  },
  {
    step: "04",
    title: "Continue cleanly",
    body: "Run history and continuation packs preserve what worked, what changed, and what comes next. No more rebuilding context from scratch.",
    color: "#0DDB9E",
  },
];

const FREE_CLI_FEATURES = [
  "Prompt history",
  "Run history",
  "Reusable context",
  "Token savings",
  "Cost savings",
  "Basic reports",
  "Clean continuation",
];

const PRICING_FEATURES = [
  { label: "Local CLI",             free: true,       pro: true,       builder: true,        team: true        },
  { label: "Run history",           free: "local",    pro: "cloud",    builder: "cloud",     team: "cloud"     },
  { label: "Reusable context",      free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Continuation packs",    free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Savings reports",       free: false,      pro: true,       builder: true,        team: true        },
  { label: "Tracked projects",      free: "1 local",  pro: "1 synced", builder: "unlimited", team: "unlimited" },
  { label: "Custom project rules",  free: false,      pro: false,      builder: true,        team: true        },
  { label: "Scope drift detection", free: false,      pro: false,      builder: true,        team: true        },
  { label: "Risk scores",           free: "basic",    pro: "standard", builder: "advanced",  team: "advanced"  },
  { label: "Agent early access",    free: false,      pro: true,       builder: true,        team: true        },
  { label: "Team policies",         free: false,      pro: false,      builder: false,       team: true        },
  { label: "GitHub checks",         free: false,      pro: false,      builder: false,       team: "planned"   },
];

const FAQS = [
  {
    q: "Does RunTrim upload my source code?",
    a: "No. The free CLI runs entirely locally. Source code never leaves your machine. Cloud sync in Pro early access uploads run metadata only, not file contents or environment values.",
  },
  {
    q: "What is RunTrim Agent?",
    a: "RunTrim Agent is the next layer: a guarded AI coding agent that runs tasks through scoped contracts, memory, token budgets, risk checks, and audit-ready reports. It is entering early access for Pro, Builder, and Team plans.",
  },
  {
    q: "Which agents does it work with?",
    a: "Claude Code, Codex CLI, Cursor, and any agent you can run from a terminal or paste into. RunTrim wraps or copies depending on your configuration.",
  },
  {
    q: "How accurate are the savings estimates?",
    a: "They are approximations based on task score, captured run size, and token usage patterns. Treat them as directional signals, not billing data.",
  },
];

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
            <Link href="/how-it-works" data-rt-event="how_it_works_clicked" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">How it works</Link>
            <Link href="#pricing" data-rt-event="pricing_cta_clicked" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Pricing</Link>
            <Link href="/app/install" data-rt-event="docs_clicked" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Docs</Link>
          </nav>
          <Link
            href="/app/install"
            data-rt-event="install_cta_clicked"
            className="rounded-md bg-[#7C6DFA] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install CLI
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/8">

        {/* Background */}

        {/* Line grid — replaces dot grid, fades radially from center */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            ].join(","),
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 75%)",
          }}
        />

        {/* Orb 1 — large violet, drifts slowly left side */}
        <div
          className="pointer-events-none absolute -left-[180px] -top-[80px] h-[640px] w-[640px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124,109,250,0.18) 0%, rgba(124,109,250,0.06) 45%, transparent 70%)",
            animation: "rt-orb-1 26s ease-in-out infinite",
          }}
        />

        {/* Orb 2 — blue-indigo, drifts right side */}
        <div
          className="pointer-events-none absolute -right-[120px] top-[80px] h-[520px] w-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(91,139,255,0.13) 0%, rgba(91,139,255,0.04) 50%, transparent 70%)",
            animation: "rt-orb-2 34s ease-in-out infinite",
          }}
        />

        {/* Orb 3 — purple accent, bottom center */}
        <div
          className="pointer-events-none absolute -bottom-[60px] left-1/2 h-[380px] w-[700px] -translate-x-1/2 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(153,102,255,0.14) 0%, rgba(153,102,255,0.04) 50%, transparent 70%)",
            animation: "rt-orb-3 20s ease-in-out infinite",
          }}
        />

        {/* Edge vignette — darkens corners, keeps centre readable */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 75% 75% at 50% 45%, transparent 45%, #07071A 88%)",
          }}
        />

        <div className="pointer-events-none absolute inset-0 hero-glow hero-glow-animate" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: "linear-gradient(to bottom, #07071A, transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
          style={{ background: "linear-gradient(to top, #07071A, transparent)" }}
        />

        {/*
          Above-fold zone.
          Mobile: min-h-[100svh] fills the full viewport. flex-1 spacer pushes
          the feature strip to the very bottom so the terminal appears below the fold.
          Desktop: min-h is removed and the section behaves compactly.
        */}
        <div className="relative z-10 flex min-h-[100svh] w-full flex-col items-center pb-6 pt-20 sm:min-h-0 sm:pb-0 sm:pt-28">

          {/* Core content */}
          <div className="flex w-full flex-col items-center px-6 text-center">

            <MotionFade>
              <div className="rt-ai-pill mb-8 inline-flex items-center gap-2 rounded-full border border-[#7C6DFA]/22 bg-[#7C6DFA]/8 px-4 py-1.5 backdrop-blur-sm">
                <span className="rt-ai-pill-dot size-1.5 rounded-full bg-[#7C6DFA]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9E91FF]">
                  RunTrim Agent
                </span>
              </div>
            </MotionFade>

            <MotionFade delay={0.06}>
              <h1 className="mx-auto max-w-[860px] text-[2.2rem] font-bold leading-[1.08] tracking-[-0.04em] text-[#EDEEFF] sm:text-[3.4rem] lg:text-[4.5rem] xl:text-[5rem]">
                Run AI coding tasks{" "}
                <span className="brand-gradient-text">with guardrails</span>.
              </h1>
            </MotionFade>

            <MotionFade delay={0.12}>
              <p className="mx-auto mt-6 max-w-[400px] text-[0.98rem] leading-[1.75] text-[#7F8CA3] sm:hidden">
                Scoped contracts, reusable memory, and guarded execution for every AI coding run.
              </p>
              <p className="mx-auto mt-6 hidden max-w-[600px] text-[1.03rem] leading-[1.8] text-[#7F8CA3] sm:block">
                RunTrim turns prompts into controlled AI coding runs with scoped contracts, reusable memory, token control, risk checks, and clean continuation.
              </p>
            </MotionFade>

            <MotionFade delay={0.17}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/app/install"
                  data-rt-event="install_cta_clicked"
                  className="group inline-flex items-center gap-2.5 rounded-lg bg-[#7C6DFA] px-6 py-3 text-[15px] font-semibold text-white"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(124,109,250,0.45), 0 8px 20px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  Install Free CLI
                  <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
                <SmartCta
                  label="Join Agent Early Access"
                  variant="pro"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-6 py-3 text-[15px] text-[#A3AEBD] backdrop-blur-sm transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                  openAppLabel="Open app"
                  openAppClassName="inline-flex items-center gap-2 rounded-lg border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-6 py-3 text-[15px] font-medium text-[#C4B8FF] transition-colors hover:bg-[#7C6DFA]/18"
                />
              </div>
            </MotionFade>

            <MotionFade delay={0.20}>
              <p className="mt-5 font-mono text-[11px] text-[#4A5170]">
                Free CLI is live. RunTrim Agent is entering early access.
              </p>
            </MotionFade>

          </div>

          {/* Spacer: fills remaining viewport height on mobile, invisible on desktop */}
          <div className="flex-1 sm:hidden" />

          {/* Feature strip — anchored to bottom of viewport on mobile */}
          <MotionFade delay={0.34} className="w-full max-w-4xl px-6 pb-2 sm:mt-6 sm:pb-0">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { label: "Scope the task",   note: "Contract before execution" },
                { label: "Load memory",      note: "Never start from zero" },
                { label: "Control the run",  note: "Budgets, rules, drift checks" },
                { label: "Continue cleanly", note: "Preserved across sessions" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/8 bg-[#0D0C22]/70 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[12px] font-semibold text-[#C4C8EA]">{item.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#4A5068]">{item.note}</p>
                </div>
              ))}
            </div>
          </MotionFade>
        </div>

        {/* Terminal — starts below the fold on mobile, flows after content on desktop */}
        <MotionFade
          delay={0.28}
          className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16 pt-8 sm:pb-24 sm:pt-14"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-64 -translate-y-1/2"
            style={{
              background: "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(124,109,250,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="overflow-hidden rounded-xl border border-white/10"
            style={{
              boxShadow:
                "0 0 0 1px rgba(124,109,250,0.15), 0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(124,109,250,0.08)",
            }}
          >
            <HeroTerminal />
          </div>
        </MotionFade>
      </section>

      {/* How RunTrim works */}
      <section className="border-t border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">01 / How it works</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Every run is guarded.
            </h2>
            <p className="mt-4 max-w-[500px] text-[14px] leading-[1.75] text-[#5E6A88]">
              Scope is set before execution. Memory loads automatically. Runs stay within their contract.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, title, body, color }) => (
              <div
                key={step}
                className="group rounded-xl border border-white/7 bg-[#0C0C20] p-6 transition-colors hover:border-white/12"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold" style={{ color: `${color}99` }}>
                    {step}
                  </span>
                  <div className="h-px flex-1 bg-white/6" />
                </div>
                <p className="mb-2 text-[15px] font-semibold tracking-[-0.01em] text-[#DDE0F2]">{title}</p>
                <p className="text-[13px] leading-[1.7] text-[#5E6A88]">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/how-it-works"
              className="inline-flex rounded-md border border-white/10 px-4 py-2 text-[12px] font-medium text-[#97A3BA] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              See the full flow
            </Link>
          </div>
        </div>
      </section>

      <BeforeAfterSection />

      {/* Free CLI */}
      <section id="free-cli" className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">

            {/* Left */}
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">02 / Free CLI</p>
              <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
                Free CLI is live.
              </h2>
              <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
                Runs locally in your repo. No account required. Source code is never uploaded.
              </p>
              <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {FREE_CLI_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-[#B8C0D8]">
                    <Check className="size-3.5 shrink-0 text-[#7C6DFA]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/app/install"
                  data-rt-event="install_cta_clicked"
                  className="group inline-flex items-center gap-2 rounded-lg border border-white/12 px-5 py-2.5 text-[14px] font-medium text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                >
                  Full install guide
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Right — install guide panel */}
            <div className="space-y-3">

              {/* Step 1: npm install */}
              <div className="rounded-xl border border-white/8 bg-[#0A0A1C] p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">1. Install</p>
                <div
                  className="flex items-center overflow-hidden rounded-lg"
                  style={{
                    background: "#0C0A22",
                    border: "1px solid rgba(124,109,250,0.28)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <span className="pl-4 pr-1 font-mono text-[12px] text-[#7C6DFA]/50">$</span>
                  <code className="flex-1 py-3 pr-3 font-mono text-[13px] text-[#B8AAFF]">npm install -g runtrim</code>
                  <div className="border-l border-[#7C6DFA]/18 px-3.5 py-3">
                    <CopyButton text="npm install -g runtrim" trackCommandKey="npm_install_global" />
                  </div>
                </div>
              </div>

              {/* Step 2: quick start */}
              <div className="rounded-xl border border-[#7C6DFA]/18 bg-[#0A0A1C] p-5"
                style={{ boxShadow: "inset 0 1px 0 rgba(124,109,250,0.06)" }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">2. Daily shortcut</p>
                  <span className="rounded border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[#C4B8FF]">
                    recommended
                  </span>
                </div>
                <div
                  className="flex items-center overflow-hidden rounded-lg"
                  style={{
                    background: "#0C0A22",
                    border: "1px solid rgba(124,109,250,0.28)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <span className="pl-4 pr-1 font-mono text-[12px] text-[#7C6DFA]/50">$</span>
                  <code className="flex-1 py-3 pr-3 font-mono text-[13px] text-[#B8AAFF]">{'runtrim go "your task"'}</code>
                  <div className="border-l border-[#7C6DFA]/18 px-3.5 py-3">
                    <CopyButton text={'runtrim go "your task"'} />
                  </div>
                </div>
                <p className="mt-2.5 text-[12px] leading-5 text-[#4D5070]">
                  Prepares a guarded prompt, copies it for your agent, and records the run locally.
                </p>
              </div>

              {/* Step 3: direct commands */}
              <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0A0A1C]">
                <div className="border-b border-white/6 px-5 py-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">3. Direct commands</p>
                </div>
                {[
                  { step: "01", cmd: "runtrim start",                         note: "Guided menu — let RunTrim choose the next step"  },
                  { step: "02", cmd: "runtrim check",                         note: "Review changed files and proof gaps"              },
                  { step: "03", cmd: "runtrim memory",                        note: "Show and resume from project memory"             },
                  { step: "04", cmd: "runtrim continue --reason usage_limit", note: "Build continuation prompt after context limit"   },
                ].map(({ step, cmd, note }, i, arr) => (
                  <div
                    key={cmd}
                    className={`flex items-start gap-3.5 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-white/6" : ""}`}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-white/8 bg-[#07071A] font-mono text-[10px] text-[#7C6DFA]/60">
                      {step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <code className="font-mono text-[12px] text-[#9E91FF]">{cmd}</code>
                      <p className="mt-0.5 text-[11px] leading-4 text-[#3A4460]">{note}</p>
                    </div>
                    <CopyButton text={cmd} />
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* The guarded loop */}
      <section className="border-t border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">03 / The guarded loop</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Scope. Check. Continue.
            </h2>
            <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
              Every run follows the same guarded loop. Contract first, then execution, then continuation.
            </p>
          </div>
          <TerminalCard title="runtrim — terminal" lines={CLI_PREVIEW} />
        </div>
      </section>

      {/* RunTrim Agent early access */}
      <section className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">04 / RunTrim Agent</p>
              <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
                RunTrim Agent is next.
              </h2>
              <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
                The next layer is a guarded AI coding agent that runs tasks through scoped contracts, memory, token budgets, risk checks, and audit-ready reports.
              </p>
              <p className="mt-3 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
                Agent early access is opening for Pro, Builder, and Team.
              </p>
              <div className="mt-8">
                <SmartCta
                  label="Join Agent Early Access"
                  variant="pro"
                  className="inline-flex items-center gap-2.5 rounded-lg bg-[#7C6DFA] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
                  openAppLabel="Open app"
                  openAppClassName="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
                />
              </div>
            </div>

            <AnimatedRunContract />
          </div>
        </div>
      </section>

      {/* Works with */}
      <section className="border-t border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">05 / Integrations</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Works with every agent.
            </h2>
            <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
              Set your agent once. RunTrim wraps or copies depending on your config.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/8">
            {AGENT_MODES.map(({ cmd, note }, i) => (
              <div
                key={cmd}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] ${i < AGENT_MODES.length - 1 ? "border-b border-white/8" : ""}`}
                style={{ background: i % 2 === 0 ? "#0C0C20" : "#0A0A1C" }}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <Terminal className="size-3.5 shrink-0 text-[#7C6DFA]/50" />
                  <code className="shrink-0 font-mono text-[13px] text-[#9E91FF]">{cmd}</code>
                  <span className="hidden truncate font-mono text-[12px] text-[#2E2E50] sm:block">{note}</span>
                </div>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">06 / Pricing</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Start local. Scale when it matters.
            </h2>
            <p className="mt-4 max-w-lg text-[14px] leading-[1.75] text-[#5E6A88]">
              Free CLI works without an account. Pro, Builder, and Team are entering early access with RunTrim Agent.
            </p>
          </div>

          {/* Mobile pricing cards */}
          <div className="mt-8 grid gap-3 md:hidden">
            {planOrder.map((id) => {
              const plan = plans[id];
              const isBuilder = id === "builder";
              const isProOrBuilder = id === "pro" || id === "builder";
              const mobileFeatures =
                id === "free"
                  ? ["Local CLI", "Run history (local)", "Reusable context", "Token savings"]
                  : id === "pro"
                    ? ["Cloud run history", "Synced context", "Savings reports", "Agent early access"]
                    : id === "builder"
                      ? ["Everything in Pro", "Unlimited projects", "Scope drift detection", "Risk scores (advanced)"]
                      : ["Everything in Builder", "Team policies", "Shared workspaces", "GitHub checks (planned)"];

              return (
                <div
                  key={id}
                  className={`rounded-xl border border-white/10 bg-[#0C0C20] p-5 ${isBuilder ? "shadow-[0_0_0_1px_rgba(124,109,250,0.35)]" : ""}`}
                >
                  <p className="text-[12px] font-semibold text-[#9699BE]">{plan.name}</p>
                  <p className={`mt-1 text-2xl font-bold tracking-tight ${isBuilder ? "text-[#9E91FF]" : "text-[#EDEEFF]"}`}>{plan.priceLabel}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6A7398]">{plan.summary}</p>
                  <ul className="mt-4 space-y-2">
                    {mobileFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-[12px] text-[#B8C0D8]">
                        <Check className="size-3.5 text-[#7C6DFA]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {id === "free" ? (
                      <Link
                        href="/app/install"
                        className="inline-flex rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                      >
                        {plan.ctaLabel}
                      </Link>
                    ) : (
                      <SmartCta
                        label={plan.ctaLabel}
                        variant={isBuilder ? "builder" : "pro"}
                        className={
                          isBuilder
                            ? "inline-flex rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                            : "inline-flex rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                        }
                        openAppLabel="Open app"
                        openAppClassName={
                          isBuilder
                            ? "inline-flex rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                            : "inline-flex rounded-md border border-[#7C6DFA]/25 bg-[#7C6DFA]/8 px-3.5 py-2 text-[12px] font-medium text-[#C4B8FF] transition-colors hover:bg-[#7C6DFA]/14"
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-white/8 bg-[#07071A] px-4 py-3">
              <p className="text-[11px] text-[#2E2E50]">Cloud sync stores metadata only. Source code stays local.</p>
              <p className="mt-1 text-[11px] text-[#2E2E50]">Agent early access is included in Pro, Builder, and Team.</p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-10 hidden overflow-x-auto md:block">
            <div className="min-w-[680px]">

              {/* Plan headers */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] border-b border-white/8">
                <div className="px-5 py-4" />
                {planOrder.map((id) => {
                  const plan = plans[id];
                  const isBuilder = id === "builder";
                  return (
                    <div key={id} className={`relative px-5 py-4 ${isBuilder ? "bg-[#0D0C22]" : ""}`}>
                      {isBuilder && <div className="absolute inset-x-0 top-0 h-px brand-gradient" />}
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
                      const isBld = ci === 2;
                      return (
                        <div key={ci} className={`flex items-center px-5 py-3.5 ${isBld ? "bg-[#0D0C22]" : ""}`}>
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
                  <p className="mt-1 text-[11px] text-[#2E2E50]">Agent early access is included in Pro, Builder, and Team.</p>
                </div>
                {planOrder.map((id) => {
                  const plan = plans[id];
                  const isFree    = id === "free";
                  const isBuilder = id === "builder";
                  return (
                    <div key={id} className={`flex items-center px-5 py-5 ${isBuilder ? "bg-[#0D0C22]" : ""}`}>
                      {isFree ? (
                        <Link
                          href="/app/install"
                          className="rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                        >
                          {plan.ctaLabel}
                        </Link>
                      ) : (
                        <SmartCta
                          label={plan.ctaLabel}
                          variant={isBuilder ? "builder" : "pro"}
                          className={
                            isBuilder
                              ? "rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                              : "rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                          }
                          openAppLabel="Open app"
                          openAppClassName={
                            isBuilder
                              ? "rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                              : "rounded-md border border-[#7C6DFA]/25 bg-[#7C6DFA]/8 px-3.5 py-2 text-[12px] font-medium text-[#C4B8FF] transition-colors hover:bg-[#7C6DFA]/14"
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden" style={{ background: "#07071A" }}>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% 110%, rgba(124,109,250,0.28) 0%, rgba(100,80,240,0.10) 50%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, #07071A 92%)" }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 10%, rgba(124,109,250,0.6) 40%, rgba(153,102,255,0.6) 60%, transparent 90%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-xl px-6 py-28 text-center">

          <h3 className="text-[2.2rem] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[2.8rem] lg:text-[3.2rem]">
            <span className="block text-[#EDEEFF]">Start controlled.</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #C4B8FF 10%, #9E91FF 50%, #7C6DFA 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Scale when it matters.
            </span>
          </h3>

          <p className="mx-auto mt-5 max-w-[360px] text-[14px] leading-[1.75] text-[#505870]">
            Free CLI is live now. Join early access for cloud memory, run reports, and the RunTrim Agent.
          </p>

          <div
            className="mx-auto mt-9 flex w-fit items-center overflow-hidden rounded-xl"
            style={{
              background: "#0C0A22",
              border: "1px solid rgba(124,109,250,0.32)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <span className="pl-4 pr-1 font-mono text-[13px] text-[#7C6DFA]/55">$</span>
            <code className="py-3.5 pr-4 font-mono text-[14px] text-[#B8AAFF]">
              npm install -g runtrim
            </code>
            <div className="border-l border-[#7C6DFA]/20 px-4 py-3.5">
              <CopyButton text="npm install -g runtrim" trackCommandKey="npm_install_global" />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/app/install"
              data-rt-event="install_cta_clicked"
              className="group inline-flex items-center gap-2.5 rounded-xl px-9 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{
                background: "linear-gradient(160deg, #8B7EFF 0%, #7C6DFA 60%, #6A54E8 100%)",
                boxShadow:
                  "0 0 0 1px rgba(155,140,255,0.50), 0 8px 32px rgba(124,109,250,0.40), 0 2px 8px rgba(124,109,250,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              Install Free CLI
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>

            <SmartCta
              label="Join Agent Early Access"
              variant="pro"
              className="text-[13px] text-[#3E4462] transition-colors hover:text-[#9E91FF]"
              openAppLabel="Open app"
              openAppClassName="text-[13px] text-[#7C6DFA] transition-colors hover:text-[#B2A7FF]"
            />
          </div>

          <p className="mt-8 px-4 text-center text-[11px] leading-6 text-[#4E5577] sm:text-[12px]">
            Free and local in V1. No account required. Agent-agnostic.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">FAQ</p>
            <h2 className="text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
              Common questions
            </h2>
          </div>
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-2">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border-l-2 border-[#7C6DFA]/25 pl-5">
                <p className="text-[14px] font-semibold leading-snug text-[#C8CCF0]">{q}</p>
                <p className="mt-2.5 text-[13px] leading-[1.7] text-[#525978]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-white/6 bg-[#050514]">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #7C6DFA 30%, #9966FF 60%, transparent 100%)" }}
        />

        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">

            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
                <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
              </div>
              <p className="max-w-[200px] text-[13px] leading-[1.6] text-[#3E4260]">
                The guarded way to run AI coding agents. Free CLI is live. RunTrim Agent is entering early access.
              </p>
              <p className="font-mono text-[11px] text-[#2A2A45]">Local-first. Agent-agnostic. No code uploads.</p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Product</p>
              <nav className="flex flex-col gap-2.5">
                {[
                  { href: "/app/install", label: "Install"        },
                  { href: "/how-it-works",label: "How it works"   },
                  { href: "#pricing",     label: "Pricing"        },
                  { href: "/login",       label: "Dashboard"      },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Legal</p>
              <nav className="flex flex-col gap-2.5">
                {[
                  { href: "/privacy",  label: "Privacy"  },
                  { href: "/terms",    label: "Terms"    },
                  { href: "/security", label: "Security" },
                  { href: "https://github.com/michelpronkk-oss/rtrim", label: "GitHub",  external: true },
                  { href: "mailto:hello@runtrim.com",                  label: "Contact", external: true },
                ].map((l) =>
                  l.external ? (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer"
                      className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.href} href={l.href} className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
                      {l.label}
                    </Link>
                  )
                )}
              </nav>
            </div>

            {/* CTA callout */}
            <div className="space-y-3 lg:justify-self-end">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Get started</p>
              <div className="rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8 p-4">
                <p className="text-[13px] font-semibold text-[#C4B8FF]">Free CLI is live</p>
                <p className="mt-1 text-[12px] leading-snug text-[#5C6490]">Install locally, no account required.</p>
                <Link
                  href="/app/install"
                  data-rt-event="install_cta_clicked"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7C6DFA] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ boxShadow: "0 4px 14px rgba(124,109,250,0.30)" }}
                >
                  Install CLI
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/6 pt-6">
            <p className="font-mono text-[11px] text-[#252540]">
              {new Date().getFullYear()} RunTrim. All rights reserved.
            </p>
            <p className="font-mono text-[11px] text-[#252540]">
              Guarded by default. Local-first. Agent-agnostic.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
