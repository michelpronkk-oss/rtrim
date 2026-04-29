import Link from "next/link";
import { ArrowRight, Check, BookMarked, History, Layers, TrendingDown, Terminal, Shield, Zap, GitMerge } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { HeroTerminal } from "@/components/app/hero-terminal";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";
import { planOrder, plans } from "@/lib/plans";

// â”€â”€ Terminal data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CLI_PREVIEW = [
  { type: "comment" as const, text: "# initialize and follow the guided next step" },
  { type: "prompt"  as const, text: "$ runtrim init" },
  { type: "dim"     as const, text: "  baseline created" },
  { type: "dim"     as const, text: "  next: runtrim start" },
  { text: "" },
  { type: "prompt"  as const, text: "$ runtrim start" },
  { type: "dim"     as const, text: "  state: guarded prompt prepared" },
  { type: "dim"     as const, text: "  next: runtrim panel --monitor" },
  { text: "" },
  { type: "prompt"  as const, text: '$ runtrim prepare "fix checkout redirect"' },
  { type: "dim"     as const, text: "  prompt saved to .runtrim/latest-prompt.md" },
  { type: "dim"     as const, text: "  next: paste into your agent, then runtrim check" },
  { text: "" },
  { type: "prompt"  as const, text: "$ runtrim continue --reason usage_limit" },
  { type: "dim"     as const, text: "  continuation prompt copied" },
  { type: "dim"     as const, text: "  next: paste into the next agent" },
  { text: "" },
  { type: "prompt"  as const, text: "$ runtrim sync" },
  { type: "accent"  as const, text: "  synced project memory and runs" },
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
    a: "No. V1 runs entirely locally. Source code never leaves your machine. Cloud sync in Pro early access uploads run metadata only, not file contents or env values.",
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
            <Link href="/app/install"  className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Docs</Link>
          </nav>
          <Link
            href="/app/install"
            className="rounded-md bg-[#7C6DFA] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install CLI
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden border-b border-white/8 pb-20 pt-24">

        {/* ── Background stack ─────────────────────────────── */}

        {/* 1. Dot grid — soft, 30px pitch */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* 2. Radial vignette fades the corners, keeps centre readable */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 75% at 50% 45%, transparent 45%, #07071A 88%)",
          }}
        />

        {/* 3. Violet glow from below */}
        <div className="pointer-events-none absolute inset-0 hero-glow hero-glow-animate" />

        {/* 4. Top vignette */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: "linear-gradient(to bottom, #07071A, transparent)" }}
        />

        {/* 5. Bottom fade */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
          style={{ background: "linear-gradient(to top, #07071A, transparent)" }}
        />

        {/* ── Content ──────────────────────────────────────── */}
        <div className="relative z-10 flex w-full flex-col items-center px-6 text-center">

          {/* Badge pill */}
          <MotionFade>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#7C6DFA]/22 bg-[#7C6DFA]/8 px-4 py-1.5 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[#7C6DFA]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9E91FF]">
                CLI guard layer for AI coding runs
              </span>
            </div>
          </MotionFade>

          {/* Headline */}
          <MotionFade delay={0.06}>
            <h1 className="mx-auto max-w-[860px] text-[2.6rem] font-bold leading-[1.05] tracking-[-0.04em] text-[#EDEEFF] sm:text-[3.6rem] lg:text-[4.6rem] xl:text-[5.2rem]">
              Stop paying twice for context your{" "}
              <span className="brand-gradient-text">project already</span>{" "}
              created.
            </h1>
          </MotionFade>

          {/* Sub */}
          <MotionFade delay={0.12}>
            <p className="mx-auto mt-6 max-w-[540px] text-[1.05rem] leading-[1.75] text-[#7F8CA3]">
              RunTrim tracks AI coding runs, prompt history, and reusable context so every next agent starts from what your project already knows, not from scratch.
            </p>
          </MotionFade>

          {/* CTAs */}
          <MotionFade delay={0.17}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app/install"
                className="group inline-flex items-center gap-2.5 rounded-lg bg-[#7C6DFA] px-6 py-3 text-[15px] font-semibold text-white"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(124,109,250,0.45), 0 8px 20px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                Install CLI
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
              <EarlyAccessModalTrigger
                label="Join Pro early access"
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-6 py-3 text-[15px] text-[#A3AEBD] backdrop-blur-sm transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
              />
            </div>
          </MotionFade>

          {/* Trust line */}
          <MotionFade delay={0.22}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-[#4A5170]">
              {["Local-first", "Agent-agnostic", "No code uploads", "Sync-ready"].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <span className="mr-2 text-[#1E2038]">·</span>}
                  <Check className="size-3 text-[#7C6DFA]/70" />
                  {t}
                </span>
              ))}
            </div>
          </MotionFade>
        </div>

        {/* ── Product visual ───────────────────────────────── */}
        <MotionFade
          delay={0.28}
          className="relative z-10 mt-16 w-full max-w-4xl px-6"
        >
          {/* Glow behind terminal */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-64 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(124,109,250,0.12) 0%, transparent 70%)",
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

        {/* ── Feature strip ────────────────────────────────── */}
        <MotionFade
          delay={0.34}
          className="relative z-10 mt-5 w-full max-w-4xl px-6"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Prompt history",    note: "Reuse what worked" },
              { label: "Run history",       note: "Never start from zero" },
              { label: "Reusable context",  note: "Loaded on next session" },
              { label: "Savings visibility",note: "Estimated per project" },
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
      </section>
      {/* ── Section label helper ─────────────────────────────── */}
      {/* Problem */}
      <section className="border-t border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">01 / The problem</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Every session starts from zero.
            </h2>
            <p className="mt-4 max-w-[500px] text-[14px] leading-[1.75] text-[#5E6A88]">
              You pay again for context the last run already built. There is no memory between sessions, so every agent starts blind.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((item, i) => (
              <li
                key={item}
                className="group flex items-start gap-4 rounded-xl border border-white/7 bg-[#0C0C20] p-5 transition-colors hover:border-white/12"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#7C6DFA]/10 font-mono text-[11px] font-bold text-[#7C6DFA]/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] leading-[1.65] text-[#8890B8]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">02 / What it tracks</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Four layers of memory.
            </h2>
            <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
              Every run captured makes the next one cheaper. Context compounds.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: BookMarked, title: "Prompt history",     body: "Every prompt that worked is saved and reusable verbatim or as a base for the next run. No rebuilding from scratch.",           color: "#7C6DFA" },
              { icon: History,    title: "Run history",        body: "Every captured run stores status, risk score, changed files, and continuation guidance. Nothing disappears between sessions.", color: "#5B8BFF" },
              { icon: Layers,     title: "Reusable context",   body: "Project-specific scope, sensitive systems, and stop rules are stored once and loaded automatically on the next session.",      color: "#9966FF" },
              { icon: TrendingDown, title: "Savings visibility", body: "Estimated tokens saved and cost avoided are tracked per run and surfaced as a project total. Local estimates only.",         color: "#0DDB9E" },
            ].map(({ icon: Icon, title, body, color }) => (
              <div
                key={title}
                className="group rounded-xl border border-white/7 bg-[#0C0C20] p-6 transition-colors hover:border-white/12"
              >
                <div
                  className="mb-5 flex size-10 items-center justify-center rounded-lg"
                  style={{ background: `${color}18`, border: `1px solid ${color}28` }}
                >
                  <Icon className="size-5" style={{ color }} />
                </div>
                <p className="mb-2 text-[15px] font-semibold tracking-[-0.01em] text-[#DDE0F2]">{title}</p>
                <p className="text-[13px] leading-[1.7] text-[#5E6A88]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLI preview */}
      <section className="border-t border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">03 / The loop</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Guided when you want it. Precise when you need it.
            </h2>
            <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
              RunTrim tells you the next safe command after every step. Use start when you are unsure, or run the exact control you need.
            </p>
          </div>
          <TerminalCard title="runtrim — terminal" lines={CLI_PREVIEW} />
        </div>
      </section>

      {/* Savings proof */}
      <section className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">04 / Savings</p>
            <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
              Context that compounds.
            </h2>
            <p className="mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
              Example figures from a single local project. All estimates.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {SAVINGS_STATS.map(({ value, label, note, accent }) => (
              <div
                key={label}
                className="rounded-xl border border-white/7 bg-[#0C0C20] px-6 py-7 transition-colors hover:border-white/12"
              >
                <p className={`text-[2rem] font-bold tabular-nums tracking-tight ${accent ? "text-[#9E91FF]" : "text-[#EDEEFF]"}`}>
                  {value}
                </p>
                <p className="mt-1.5 text-[13px] text-[#5E6A88]">{label}</p>
                <p className="mt-1 font-mono text-[11px] text-[#2E2E50]">{note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11px] text-[#2A2A45]">All figures are estimates. RunTrim does not access billing data.</p>
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
              Free local CLI works without an account. Cloud sync and hosted dashboard are Pro early access.
            </p>
          </div>

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
                  const isProOrBuilder = id === "pro" || id === "builder";
                  return (
                    <div key={id} className={`flex items-center px-5 py-5 ${isBuilder ? "bg-[#0D0C22]" : ""}`}>
                      {isFree ? (
                        <Link
                          href="/app/install"
                          className="rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"
                        >
                          {plan.ctaLabel}
                        </Link>
                      ) : isProOrBuilder ? (
                        <EarlyAccessModalTrigger
                          label={plan.ctaLabel}
                          className={`${isBuilder ? "rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85" : "rounded-md border border-white/8 px-3.5 py-2 text-[12px] font-medium text-[#9699BE] transition-colors hover:border-white/16 hover:text-[#EDEEFF]"}`}
                        />
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
      <section className="relative overflow-hidden" style={{ background: "#07071A" }}>

        {/* Dot grid — single, consistent opacity */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* ONE glow: violet rising from the bottom third */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% 110%, rgba(124,109,250,0.28) 0%, rgba(100,80,240,0.10) 50%, transparent 70%)",
          }}
        />

        {/* Corner vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, #07071A 92%)" }}
        />

        {/* Accent line — one clean gradient rule at the top */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 10%, rgba(124,109,250,0.6) 40%, rgba(153,102,255,0.6) 60%, transparent 90%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-xl px-6 py-28 text-center">

          {/* Stats — three clean numbers, no decorative containers */}
          <div className="mb-12 flex items-start justify-center gap-12 sm:gap-16">
            {[
              { n: "47",    label: "runs captured" },
              { n: "~847k", label: "tokens saved"  },
              { n: "23",    label: "prompts reused" },
            ].map(({ n, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <span className="text-[2.4rem] font-bold tabular-nums tracking-[-0.04em] text-[#EDEEFF] sm:text-[2.8rem]">
                  {n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4A5270]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Headline — gradient only on the last line, white on the first */}
          <h3 className="text-[2.2rem] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[2.8rem] lg:text-[3.2rem]">
            <span className="block text-[#EDEEFF]">Start local.</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #C4B8FF 10%, #9E91FF 50%, #7C6DFA 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Add cloud memory when you need it.
            </span>
          </h3>

          <p className="mx-auto mt-5 max-w-[360px] text-[14px] leading-[1.75] text-[#505870]">
            Install the CLI for free. Join Pro early access when you want hosted run history and synced project memory.
          </p>

          {/* Install command */}
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
              <CopyButton text="npm install -g runtrim" />
            </div>
          </div>

          {/* Primary button */}
          <div className="mt-8 flex flex-col items-center gap-4">
              <Link
                href="/app/install"
              className="group inline-flex items-center gap-2.5 rounded-xl px-9 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{
                background: "linear-gradient(160deg, #8B7EFF 0%, #7C6DFA 60%, #6A54E8 100%)",
                boxShadow:
                  "0 0 0 1px rgba(155,140,255,0.50), 0 8px 32px rgba(124,109,250,0.40), 0 2px 8px rgba(124,109,250,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
              >
                Install CLI
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>

            <EarlyAccessModalTrigger
              label="Join Pro early access"
              className="text-[13px] text-[#3E4462] transition-colors hover:text-[#9E91FF]"
            />
          </div>

          {/* Trust indicators — legible */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5">
            {[
              "No credit card",
              "Local-first",
              "Free in V1",
              "Agent-agnostic",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-[#525C7A]">
                <Check className="size-3.5 shrink-0 text-[#7C6DFA]" />
                {t}
              </span>
            ))}
          </div>
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
        {/* Gradient top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #7C6DFA 30%, #9966FF 60%, transparent 100%)" }}
        />

        {/* Main footer body */}
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">

            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
                <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
              </div>
              <p className="max-w-[220px] text-[13px] leading-[1.65] text-[#3E4260]">
                CLI guard layer that scopes AI coding runs before they waste tokens or drift into protected systems.
              </p>
              <p className="font-mono text-[11px] text-[#2A2A45]">V1. Local-first. No code uploads.</p>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Product</p>
              <nav className="flex flex-col gap-3">
                {[
                  { href: "/app/install", label: "Install"   },
                  { href: "#how-it-works",label: "How it works" },
                  { href: "#pricing",     label: "Pricing"   },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Dashboard */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Dashboard</p>
              <nav className="flex flex-col gap-3">
                {[
                  { href: "/app",          label: "Overview"  },
                  { href: "/app/runs",     label: "Runs"      },
                  { href: "/app/projects", label: "Projects"  },
                  { href: "/app/settings", label: "Settings"  },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* CTA callout */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Get started</p>
              <div
                className="rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8 p-4"
              >
                <p className="text-[13px] font-semibold text-[#C4B8FF]">Free during V1</p>
                <p className="mt-1 text-[12px] text-[#5C6490] leading-snug">Install locally, no account required.</p>
                <Link
                  href="/app/install"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7C6DFA] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ boxShadow: "0 4px 14px rgba(124,109,250,0.30)" }}
                >
                  Install CLI
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3E4260]">Legal</p>
              <nav className="flex flex-col gap-3">
                {[
                  { href: "/privacy", label: "Privacy" },
                  { href: "/terms", label: "Terms" },
                  { href: "/security", label: "Security" },
                  { href: "https://github.com/michelpronkk-oss/rtrim", label: "GitHub", external: true },
                  { href: "mailto:hello@runtrim.com", label: "Contact", external: true },
                ].map((l) =>
                  l.external ? (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]"
                    >
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
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/6 pt-6">
            <p className="font-mono text-[11px] text-[#252540]">
              {new Date().getFullYear()} RunTrim. All rights reserved.
            </p>
            <p className="font-mono text-[11px] text-[#252540]">
              Local-first. Agent-agnostic. Sync-ready.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

