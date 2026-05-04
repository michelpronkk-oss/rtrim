import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { CopyButton } from "@/components/app/copy-button";
import { SmartCta } from "@/components/app/smart-cta";
import { HeroRunContract, MobileContractCard } from "@/components/app/hero-run-contract";
import { planOrder, plans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "RunTrim — Control layer for AI coding agents",
  description:
    "RunTrim installs a protocol into your repo, gives every AI coding task memory, scope, forbidden files, and a finish check, then syncs the run to your dashboard. Fewer drifts, lower token burn, cleaner diffs.",
  alternates: {
    canonical: "https://www.runtrim.com",
  },
};

/* ─── Section data ──────────────────────────────────────────────────────────── */

const DRIFT_ITEMS = [
  {
    tag:   "Context reset",
    title: "Every session starts blind",
    body:  "The agent forgets your conventions, the last run, and which files matter. You re-explain the codebase, again.",
    glyph: "SESSION_NEW",
    code:  "memory: null",
  },
  {
    tag:   "Scope creep",
    title: "One task, twelve files",
    body:  "You asked to fix a webhook. It touched the auth layer, two configs, and a migration nobody approved.",
    glyph: "DELTA",
    code:  "files_touched: 12 / 3",
  },
  {
    tag:   "Token burn",
    title: "Re-loading the same repo",
    body:  "Without scoped memory, the agent reads the world to do anything. Token bills compound silently, run after run.",
    glyph: "USAGE",
    code:  "+38% vs scoped",
  },
  {
    tag:   "Forbidden writes",
    title: "It edited .env",
    body:  "Production secrets, migrations, and infrastructure should be off-limits by default. Most agents have no concept of off-limits.",
    glyph: "VIOLATION",
    code:  "writes: .env.production",
  },
  {
    tag:   "Unclear handoff",
    title: "Is it actually done?",
    body:  'The agent says "complete." Tests are red, the diff is half-applied, and nobody flagged it. You find out at PR review.',
    glyph: "FINISH",
    code:  "checks: skipped",
  },
  {
    tag:   "No audit trail",
    title: "What did it actually do?",
    body:  "Three runs, four branches, zero history of intent. You can read the diff, but you can't read the reasoning behind it.",
    glyph: "RUN_LOG",
    code:  "not found",
  },
];

const PIPELINE_STAGES = [
  {
    n:      "01 / install",
    cmd:    "runtrim init",
    desc:   "Drop the protocol into your repo. Conventions, allowed paths, forbidden files, finish checks.",
    active: true,
  },
  {
    n:      "02 / dispatch",
    cmd:    'runtrim go "task"',
    desc:   "Compile the run contract. Load memory, lock scope, set the token budget, attach the finish check.",
    active: true,
  },
  {
    n:      "03 / execute",
    cmd:    "› agent",
    desc:   "Claude, Codex, Cursor or any agent runs the guarded prompt. Stop rules trigger if it strays.",
    active: true,
  },
  {
    n:      "04 / verify",
    cmd:    "runtrim finish",
    desc:   "Run the finish check. Tests, scope, diff size, forbidden writes. Pass or fail, no in-between.",
    active: false,
  },
  {
    n:      "05 / sync",
    cmd:    "↗ dashboard",
    desc:   "Run, contract, diff, token spend, and verdict are written to your dashboard. Resumable next session.",
    active: false,
  },
];

const BENEFITS = [
  { n: "01", title: "Faster runs",        body: "Scoped context means the agent stops re-reading the world. Same task, less wandering.",                     stat: "avg run time",     delta: "↓ 41%" },
  { n: "02", title: "Lower token burn",   body: "Memory recall replaces context dumping. You pay for the work, not the warmup.",                             stat: "tokens per task",  delta: "↓ 27%" },
  { n: "03", title: "Stricter output",    body: "Diff caps, file allowlists, stop rules. The agent works inside lines you draw.",                             stat: "scope violations", delta: "↓ 96%" },
  { n: "04", title: "Less breakage",      body: "Forbidden files stay forbidden. .env, migrations, infrastructure are protected by default.",                stat: "forbidden writes", delta: "0"     },
  { n: "05", title: "Clean continuation", body: "Memory survives sessions. Next run starts where the last one stopped, with intent intact.",                 stat: "cold-start tokens", delta: "↓ 64%" },
  { n: "06", title: "Cloud run history",  body: "Every run is a record. Contract, diff, verdict, agent, model. Searchable, auditable, replayable.",          stat: "retention",        delta: "90 days" },
];

const AGENT_LIST = [
  // iconColor = icon text, iconBorder/iconBg = subtle brand tint on the icon box
  { icon: "C",   name: "Claude Code",  status: "first-class",       beta: false,
    iconColor: "#E8763A", iconBorder: "rgba(232,118,58,0.30)",   iconBg: "rgba(232,118,58,0.07)"  },
  { icon: "Cx",  name: "OpenAI Codex", status: "first-class",       beta: false,
    iconColor: "#19c37d", iconBorder: "rgba(25,195,125,0.28)",   iconBg: "rgba(25,195,125,0.07)"  },
  { icon: "Cu",  name: "Cursor",       status: "first-class",       beta: false,
    iconColor: "#8C9BF5", iconBorder: "rgba(94,106,210,0.30)",   iconBg: "rgba(94,106,210,0.07)"  },
  { icon: "Gp",  name: "ChatGPT",      status: "supported",         beta: false,
    iconColor: "#19c37d", iconBorder: "rgba(25,195,125,0.28)",   iconBg: "rgba(25,195,125,0.07)"  },
  { icon: "Km",  name: "Kimi",         status: "supported",         beta: false,
    iconColor: "#4899FF", iconBorder: "rgba(22,119,255,0.28)",   iconBg: "rgba(22,119,255,0.07)"  },
  { icon: "Ds",  name: "DeepSeek",     status: "supported",         beta: false,
    iconColor: "#7898FF", iconBorder: "rgba(77,107,254,0.28)",   iconBg: "rgba(77,107,254,0.07)"  },
  { icon: "Oc",  name: "OpenClaw",     status: "beta",              beta: true,
    iconColor: "#f87171", iconBorder: "rgba(248,113,113,0.28)",  iconBg: "rgba(248,113,113,0.07)" },
  { icon: "···", name: "Custom agent", status: "any prompt-runner", beta: false,
    iconColor: "#5a5f68", iconBorder: "rgba(255,255,255,0.09)",  iconBg: "#16191e"                },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div style={{ background: "#08090b", minHeight: "100vh", overflowX: "hidden", color: "#c9ccd2", fontFeatureSettings: '"ss01","ss02","cv11"' }}>

      {/* ── NAV ── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(8,9,11,0.72)",
          backdropFilter: "saturate(140%) blur(12px)",
          WebkitBackdropFilter: "saturate(140%) blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="mx-auto flex items-center gap-7"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)", height: 60 }}
        >
          <Link href="/" aria-label="RunTrim" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
              runtrim
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-3">
            {[
              { href: "/app/install", label: "Install CLI" },
              { href: "#protocol",    label: "Protocol"    },
              { href: "#agents",      label: "Agents"      },
              { href: "#plans",       label: "Plans"       },
              { href: "/app/install", label: "Docs"        },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{ fontSize: 13, color: "#8a8f98", padding: "7px 10px", borderRadius: 5, transition: "color 0.15s, background 0.15s" }}
                className="hover:text-[#f4f5f7] hover:bg-white/6"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Status badge — links to /status */}
          <Link
            href="/status"
            className="hidden sm:inline-flex items-center gap-2 transition-colors hover:border-white/18"
            style={{
              fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#8a8f98",
              padding: "5px 10px", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 999, background: "#0c0e11",
            }}
          >
            <span
              className="rt-live-dot"
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#6ee7b7",
                display: "inline-block",
              }}
            />
            v0.7 · all systems normal
          </Link>

          <Link
            href="/app/install"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 32, padding: "0 14px", borderRadius: 6,
              background: "#f4f5f7", color: "#0b0d10",
              fontSize: 13, fontWeight: 500,
              border: "1px solid #fff",
              transition: "background 0.15s",
            }}
            className="hover:bg-white"
          >
            Request access
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="pt-9 pb-8 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28"
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />
        {/* Violet glow */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)",
          }}
        />

        <div
          className="mx-auto relative z-10"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}
        >
          {/* Two-column grid — stacks on mobile */}
          <div
            className="grid gap-6 lg:gap-20 items-start"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,480px), 1fr))" }}
          >
            {/* Left: copy */}
            <div>
              {/* Eyebrow — "Bridge Mode live" with pulsing mint dot */}
              <MotionFade>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "4px 10px 4px 8px",
                    border: "1px solid rgba(110,231,183,0.2)",
                    borderRadius: 999,
                    background: "rgba(110,231,183,0.04)",
                  }}
                >
                  <span
                    className="rt-live-dot"
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#6ee7b7",
                      display: "inline-block", flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontFamily: "var(--font-geist-mono)", fontSize: 11,
                    color: "#6ee7b7", letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}>
                    Bridge Mode live
                  </span>
                </span>
              </MotionFade>

              <MotionFade delay={0.06}>
                <h1
                  className="mt-3 sm:mt-5 mb-0"
                  style={{
                    fontSize: "clamp(34px, 5.4vw, 66px)",
                    lineHeight: 1.06, letterSpacing: "-0.033em",
                    fontWeight: 500, color: "#f4f5f7",
                  }}
                >
                  Run AI coding agents with{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>
                    memory, scope, and control.
                  </em>
                </h1>
              </MotionFade>

              <MotionFade delay={0.12}>
                {/* Mobile sub — compact single statement */}
                <p className="sm:hidden" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: "#8a8f98", maxWidth: 340 }}>
                  Memory, scope, and finish checks for Claude, Codex, Cursor, and other coding agents.
                </p>
                {/* Desktop sub */}
                <p className="hidden sm:block" style={{ marginTop: 20, fontSize: 17, lineHeight: 1.6, color: "#c9ccd2", maxWidth: 520 }}>
                  RunTrim gives Claude, Codex, Cursor, and other coding agents the context,
                  boundaries, and finish checks they need before they touch your code.
                </p>
              </MotionFade>

              <MotionFade delay={0.17}>
                <div className="mt-4 sm:mt-8 flex flex-wrap gap-3 items-center">
                  <Link
                    href="/app/install"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      height: 40, padding: "0 18px", borderRadius: 7,
                      fontSize: 14, fontWeight: 500,
                      background: "#f4f5f7", color: "#0b0d10",
                      border: "1px solid rgba(255,255,255,0.9)",
                      transition: "background 0.15s",
                    }}
                    className="rt-cta-glow hover:bg-white group"
                  >
                    Install free CLI
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <SmartCta
                    label="Request access"
                    variant="pro"
                    className="inline-flex items-center gap-2 h-10 px-[18px] rounded-[7px] text-[14px] font-medium text-[#c9ccd2] border border-white/14 bg-transparent transition-colors hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
                    openAppLabel="Open dashboard"
                    openAppClassName="inline-flex items-center gap-2 h-10 px-[18px] rounded-[7px] border border-[rgba(167,139,250,0.3)] bg-[rgba(167,139,250,0.07)] text-[14px] text-[#a78bfa] font-medium hover:bg-[rgba(167,139,250,0.12)] transition-colors"
                  />
                </div>
              </MotionFade>

              <MotionFade delay={0.22}>
                {/* Mobile: 2 items inline — no wrapping */}
                <div
                  className="mt-4 flex sm:hidden items-center gap-x-4"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#3a3e46", whiteSpace: "nowrap" }}
                >
                  <span>Free CLI</span>
                  <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)", display: "inline-block", flexShrink: 0 }} />
                  <span>No model lock-in</span>
                </div>
                {/* Desktop: all 3 */}
                <div
                  className="mt-6 hidden sm:flex flex-wrap gap-x-5 gap-y-2"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#3a3e46" }}
                >
                  {[
                    "Works with Claude, Codex, Cursor",
                    "Local first, cloud when connected",
                    "No model lock-in",
                  ].map((t, i) => (
                    <span key={t} className="flex items-center gap-2">
                      {i > 0 && (
                        <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)", display: "inline-block" }} />
                      )}
                      {t}
                    </span>
                  ))}
                </div>
              </MotionFade>
            </div>

            {/* Right: Run contract — compact card on mobile, full panel on desktop */}
            <MotionFade delay={0.25} className="pt-1 sm:pt-4 lg:pt-2">
              <div className="sm:hidden">
                <MobileContractCard />
              </div>
              <div className="hidden sm:block rt-hero-card-glow rounded-[10px]">
                <HeroRunContract />
              </div>
            </MotionFade>
          </div>
        </div>
      </section>

      {/* ── PROBLEM — The drift problem ── */}
      <section
        id="problem"
        className="py-14 sm:py-16 lg:py-24"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <div
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-14 mb-8 sm:mb-10 lg:mb-14 items-end"
            >
              <div
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#a78bfa", fontWeight: 500 }}>01</span>
                The drift problem
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  AI agents are fast.{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>They also drift.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  Without a protocol, every run is a coin flip. Context resets between sessions, scope creeps quietly,
                  and the audit trail ends at a Slack message. Six failure modes show up again and again.
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Drift grid */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{
              gap: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {DRIFT_ITEMS.map(({ tag, title, body, glyph, code }, i) => (
              <MotionFade key={tag} delay={0.05 * i}>
                <div
                  className="p-5 sm:p-7"
                  style={{
                    background: "#0c0e11",
                    minHeight: "auto",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono)", fontSize: 10.5,
                      color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em",
                      marginBottom: 10,
                      display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: 1,
                        background: "#f87171",
                        boxShadow: "0 0 6px rgba(248,113,113,0.5)",
                        display: "inline-block",
                      }}
                    />
                    {tag}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                    {title}
                  </h3>
                  <p style={{ margin: "8px 0 0", color: "#8a8f98", fontSize: 13.5, maxWidth: "32ch" }}>
                    {body}
                  </p>
                  <div
                    style={{
                      marginTop: "auto", paddingTop: 14,
                      fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68",
                    }}
                  >
                    {glyph} ·{" "}
                    <code
                      style={{
                        color: "#c9ccd2", background: "#16191e",
                        border: "1px solid rgba(255,255,255,0.09)",
                        padding: "2px 6px", borderRadius: 4,
                      }}
                    >
                      {code}
                    </code>
                  </div>
                </div>
              </MotionFade>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION — The RunTrim protocol ── */}
      <section
        id="protocol"
        className="py-14 sm:py-16 lg:py-24"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <div
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-14 mb-8 sm:mb-10 lg:mb-14 items-end"
            >
              <div
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#a78bfa", fontWeight: 500 }}>02</span>
                The RunTrim protocol
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  AI coding,{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>turned into scoped execution.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  Five stages. One contract. Any agent. RunTrim wraps your model of choice with memory,
                  scope, stop rules, and a finish check, then writes the run to your dashboard.
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Mobile: stacked step list */}
          <div className="sm:hidden overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(180deg, #0e1116, #0a0c10)" }}>
            {PIPELINE_STAGES.map(({ n, cmd, desc, active }, i) => (
              <div
                key={n}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 16px",
                  borderBottom: i < PIPELINE_STAGES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#5a5f68", letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>
                  {n.split(" / ")[0]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#f4f5f7", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {active && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }} />}
                    <span style={{ color: "#a78bfa" }}>$</span>
                    {cmd}
                  </span>
                  <p style={{ margin: "4px 0 0", color: "#5a5f68", fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: horizontal scrollable pipeline */}
          <div className="hidden sm:block overflow-x-auto sm:mx-0 sm:px-0">
          <div
            className="min-w-[640px] overflow-hidden rounded-[10px]"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "linear-gradient(180deg, #0e1116, #0a0c10)",
            }}
          >
            {PIPELINE_STAGES.map(({ n, cmd, desc, active }, i) => (
              <div
                key={n}
                style={{
                  padding: "24px 22px 22px",
                  borderRight: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  position: "relative",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.06em" }}>
                  {n}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono)", fontSize: 14,
                    color: "#f4f5f7", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  <span style={{ color: "#a78bfa" }}>$</span>
                  {cmd}
                </span>
                <p style={{ color: "#8a8f98", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  {desc}
                </p>
                {/* Progress bar */}
                <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", gap: 4 }}>
                  {[0,1,2,3].map((j) => (
                    <span
                      key={j}
                      style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: active
                          ? (j === 3 ? "#6ee7b7" : "rgba(110,231,183,0.45)")
                          : "#1c2026",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Callout stats */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[
              { label: "Avg run time",         val: "2m 14s", delta: "↓ 41% vs unguarded" },
              { label: "Tokens per task",       val: "38.2k",  delta: "↓ 27% vs unguarded" },
              { label: "Finish-check pass rate", val: "94.1%", delta: "first attempt"        },
            ].map(({ label, val, delta }) => (
              <div
                key={label}
                style={{
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 8,
                  background: "#0c0e11",
                  padding: "18px",
                  display: "flex", flexDirection: "column", gap: 6,
                }}
              >
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {label}
                </span>
                <span style={{ fontSize: 22, color: "#f4f5f7", letterSpacing: "-0.015em", fontWeight: 500 }}>
                  {val}
                </span>
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#6ee7b7", marginTop: 2 }}>
                  {delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section
        id="benefits"
        className="py-14 sm:py-16 lg:py-24"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <div
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-14 mb-8 sm:mb-10 lg:mb-14 items-end"
            >
              <div
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#a78bfa", fontWeight: 500 }}>03</span>
                What you get
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  Six things{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>that change the next run.</em>
                </h2>
              </div>
            </div>
          </MotionFade>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{
              gap: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {BENEFITS.map(({ n, title, body, stat, delta }, i) => (
              <MotionFade key={n} delay={0.05 * i}>
                <div
                  className="p-5 sm:p-7"
                  style={{
                    background: "#0c0e11",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.08em" }}>
                    {n}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 19, color: "#f4f5f7", fontWeight: 500, letterSpacing: "-0.01em" }}>
                    {title}
                  </h3>
                  <p style={{ margin: 0, color: "#8a8f98", fontSize: 13.5 }}>
                    {body}
                  </p>
                  <div
                    style={{
                      marginTop: "auto", paddingTop: 16,
                      fontFamily: "var(--font-geist-mono)", fontSize: 11.5, color: "#c9ccd2",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    {stat}{" "}
                    <span style={{ color: "#6ee7b7" }}>{delta}</span>
                  </div>
                </div>
              </MotionFade>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS ── */}
      <section
        id="agents"
        className="py-14 sm:py-16 lg:py-24"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <div
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-14 mb-8 sm:mb-10 lg:mb-14 items-end"
            >
              <div
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#a78bfa", fontWeight: 500 }}>04</span>
                Agent compatibility
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  Works with{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>every agent you already use.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  If it can read a prompt or repo instructions, it can run through RunTrim. No SDK, no model
                  lock-in, no rewiring.
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Agents shell */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10,
              overflow: "hidden",
              background: "linear-gradient(180deg, #0e1116, #0a0c10)",
            }}
          >
            {/* Shell head */}
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 14,
                fontFamily: "var(--font-geist-mono)", fontSize: 11.5,
                color: "#5a5f68", letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              <span
                className="rt-live-dot"
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#6ee7b7",
                  display: "inline-block",
                }}
              />
              connected agents · 7
            </div>

            {/* Agent grid */}
            <div
              className="grid grid-cols-2 md:grid-cols-4"
              style={{ gap: 1, background: "rgba(255,255,255,0.06)" }}
            >
              {AGENT_LIST.map(({ icon, name, status, beta, iconColor, iconBorder, iconBg }, i) => (
                <div
                  key={name}
                  className="p-4 sm:p-6"
                  style={{
                    background: "linear-gradient(180deg, #0e1116, #0a0c10)",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: iconBg,
                      border: `1px solid ${iconBorder}`,
                      display: "grid", placeItems: "center",
                      color: iconColor,
                      fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ color: "#f4f5f7", fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.005em" }}>
                    {name}
                  </span>
                  <div
                    style={{
                      marginTop: "auto",
                      fontFamily: "var(--font-geist-mono)", fontSize: 10.5,
                      color: "#5a5f68", letterSpacing: "0.06em", textTransform: "uppercase",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: beta ? "#f5a524" : "#6ee7b7",
                        display: "inline-block",
                      }}
                    />
                    {status}
                  </div>
                </div>
              ))}
            </div>

            {/* Shell footer */}
            <div
              style={{
                padding: "18px 22px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: "#8a8f98", fontSize: 13.5,
                display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
              }}
            >
              <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>Bring your own agent.</strong>
              <span>If it reads a prompt or repo instructions, RunTrim wraps it. No SDK required.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section
        id="plans"
        className="py-14 sm:py-16 lg:py-24"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <div
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-14 mb-8 sm:mb-10 lg:mb-14 items-end"
            >
              <div
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#a78bfa", fontWeight: 500 }}>05</span>
                Plans
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  Start local.{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>Scale to a team.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  The CLI is free forever. Cloud sync, advanced guardrails, and team governance unlock as you grow.
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Cards — items-stretch (default) + h-full on wrapper+card = equal heights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch">
            {[
              {
                id: "free",
                name: "Free",
                price: "$0",
                per: "/ local",
                desc: "The CLI, the protocol, and local run history. Forever.",
                features: ["Unlimited local runs", "Memory, scope, finish checks", "All supported agents", "JSON run logs on disk"],
                featured: false,
              },
              {
                id: "pro",
                name: "Pro · cloud sync",
                price: "$18",
                per: "/ month",
                desc: "Everything local, plus run history, dashboard, and resume across machines.",
                features: ["Everything in Free", "Cloud run history · 90 days", "Cross-machine memory", "Web dashboard"],
                featured: true,
              },
              {
                id: "builder",
                name: "Builder",
                price: "$48",
                per: "/ month",
                desc: "For founders shipping production code through agents daily.",
                features: ["Everything in Pro", "Advanced guardrails", "Custom finish checks", "Priority support"],
                featured: false,
              },
              {
                id: "team",
                name: "Team",
                price: "From $24",
                per: "/ seat",
                desc: "Shared protocol, shared memory, shared accountability.",
                features: ["Everything in Builder", "Org-wide policy", "SSO, roles, audit log", "Run governance reports"],
                featured: false,
              },
            ].map(({ id, name, price, per, desc, features, featured }) => (
              <MotionFade key={id} delay={0.06} className="h-full">
                <div
                  style={{
                    height: "100%",
                    background: featured
                      ? "radial-gradient(160% 80% at 0% 0%, rgba(167,139,250,0.08), transparent 60%), #0c0e11"
                      : "#0c0e11",
                    border: `1px solid ${featured ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
                    borderRadius: 10,
                    padding: "20px 18px 22px",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Plan label */}
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono)", fontSize: 11,
                      color: featured ? "#a78bfa" : "#5a5f68",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                    }}
                  >
                    {name}
                  </span>

                  {/* Price */}
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 26, color: "#f4f5f7", letterSpacing: "-0.02em", fontWeight: 500 }}>
                      {price}
                    </span>
                    <span style={{ fontSize: 13, color: "#5a5f68", fontWeight: 400, marginLeft: 4 }}>{per}</span>
                  </div>

                  {/* Description — fixed height keeps cards aligned below price */}
                  <p style={{ marginTop: 8, marginBottom: 0, color: "#8a8f98", fontSize: 13, lineHeight: 1.55, minHeight: "3.2em" }}>
                    {desc}
                  </p>

                  {/* Feature list */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 13, color: "#c9ccd2",
                          display: "grid", gridTemplateColumns: "14px 1fr", gap: 10, alignItems: "start",
                        }}
                      >
                        <span
                          style={{
                            marginTop: 5, width: 6, height: 6,
                            background: featured ? "#a78bfa" : "#5a5f68",
                            borderRadius: 1, display: "block",
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA — pushed to bottom by flex-1 on the list above */}
                  <div style={{ marginTop: 20 }}>
                    {id === "free" ? (
                      <Link
                        href="/app/install"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          height: 36, borderRadius: 6, width: "100%",
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "transparent", color: "#f4f5f7",
                          fontSize: 13, transition: "background 0.15s",
                          textDecoration: "none",
                        }}
                        className="hover:bg-[#16191e]"
                      >
                        Install CLI
                      </Link>
                    ) : (
                      <SmartCta
                        label={id === "team" ? "Talk to us" : `Start ${name.split(" ")[0]}`}
                        variant={id === "builder" ? "builder" : "pro"}
                        className={
                          featured
                            ? "flex items-center justify-center h-9 w-full rounded-[6px] border border-white bg-[#f4f5f7] text-[#0b0d10] text-[13px] font-medium transition-colors hover:bg-white"
                            : "flex items-center justify-center h-9 w-full rounded-[6px] border border-white/14 bg-transparent text-[#f4f5f7] text-[13px] transition-colors hover:bg-[#16191e]"
                        }
                        openAppLabel="Open dashboard"
                        openAppClassName={`flex items-center justify-center h-9 rounded-[6px] w-full text-[13px] font-medium transition-colors ${featured ? "bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white" : "border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"}`}
                      />
                    )}
                  </div>
                </div>
              </MotionFade>
            ))}
          </div>

          {/* View all plans */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3">
            <p
              style={{
                fontFamily: "var(--font-geist-mono)", fontSize: 11.5,
                color: "#5a5f68", letterSpacing: "0.04em", textAlign: "center",
              }}
            >
              Compare limits, cloud sync, memory, and team controls.
            </p>
            <Link
              href="/plans"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 36, padding: "0 16px", borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "transparent", color: "#8a8f98",
                fontSize: 13, transition: "color 0.15s, border-color 0.15s, background 0.15s",
                textDecoration: "none",
              }}
              className="hover:text-[#f4f5f7] hover:border-white/20 hover:bg-[#0c0e11]"
            >
              View all plans
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        id="install"
        className="py-16 sm:py-20 lg:py-32"
        style={{
          position: "relative",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "radial-gradient(1000px 500px at 50% 0%, rgba(109,76,242,0.1), transparent 60%)",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />

        <div className="mx-auto relative z-10 text-center" style={{ maxWidth: 760, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <h2
              style={{
                fontSize: "clamp(34px,5vw,56px)",
                lineHeight: 1.05, letterSpacing: "-0.03em",
                color: "#f4f5f7", fontWeight: 500, margin: 0,
              }}
            >
              Before any AI agent touches your code, run it through RunTrim.
            </h2>
            <p style={{ margin: "18px auto 0", color: "#8a8f98", fontSize: 17, maxWidth: 540 }}>
              One command installs the protocol. Every run after that is scoped, memorable, and on the record.
            </p>

            {/* CLI command */}
            <div
              className="mx-auto mt-8 inline-flex items-center gap-3"
              style={{
                padding: "9px 12px 9px 14px",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 8, background: "#0c0e11",
                fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#c9ccd2",
              }}
            >
              <span style={{ color: "#a78bfa" }}>$</span>
              <span>npm install -g runtrim</span>
              <CopyButton text="npm install -g runtrim" trackCommandKey="npm_install_global" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                href="/app/install"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  height: 40, padding: "0 18px", borderRadius: 7,
                  fontSize: 14, fontWeight: 500,
                  background: "#f4f5f7", color: "#0b0d10",
                  border: "1px solid #fff",
                  transition: "background 0.15s",
                }}
                className="group hover:bg-white"
              >
                Install free CLI
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <SmartCta
                label="Request early access"
                variant="pro"
                className="inline-flex items-center h-10 px-[18px] rounded-[7px] text-[14px] font-medium text-[#c9ccd2] border border-white/14 bg-transparent transition-colors hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
                openAppLabel="Open dashboard"
                openAppClassName="inline-flex items-center h-10 px-[18px] rounded-[7px] border border-[rgba(167,139,250,0.3)] bg-[rgba(167,139,250,0.07)] text-[14px] text-[#a78bfa] font-medium hover:bg-[rgba(167,139,250,0.12)] transition-colors"
              />
            </div>
          </MotionFade>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="mx-auto"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}
        >

          {/* ── Mobile layout: stacked sections ── Desktop: side by side ── */}
          <div className="py-10 sm:py-12 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 items-start">

            {/* Brand + install + status */}
            <div>
              {/* Wordmark */}
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
                  runtrim
                </span>
              </div>

              {/* Descriptor */}
              <p className="mt-2.5" style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", lineHeight: 1.65 }}>
                The protocol layer for AI coding agents.
              </p>

              {/* Install command */}
              <div
                className="mt-4 flex items-center gap-2 rounded-[8px] px-3 py-2.5"
                style={{
                  background: "#0c0e11",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "inline-flex",
                }}
              >
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#a78bfa", flexShrink: 0 }}>$</span>
                <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#8a8f98" }}>
                  npm install -g runtrim
                </code>
              </div>

              {/* Status badge — pill button */}
              <Link
                href="/status"
                className="mt-4 inline-flex items-center gap-2 rounded-[999px] transition-colors hover:border-[rgba(110,231,183,0.35)] hover:bg-[rgba(110,231,183,0.06)]"
                style={{
                  fontFamily: "var(--font-geist-mono)", fontSize: 11,
                  color: "#3a3e46", letterSpacing: "0.05em",
                  padding: "4px 10px 4px 8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "#0c0e11",
                  display: "inline-flex",
                }}
              >
                <span
                  className="rt-live-dot"
                  style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#6ee7b7",
                    display: "inline-block", flexShrink: 0,
                  }}
                />
                All systems normal
              </Link>
            </div>

            {/* Links */}
            <div className="lg:flex lg:justify-end lg:items-start lg:pt-1">
              {/* Mobile: 3-column grid — each link gets its own clean cell */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-4 lg:flex lg:flex-wrap lg:gap-x-8 lg:gap-y-3">
                {[
                  { href: "/app/install", label: "Docs"      },
                  { href: "/plans",       label: "Plans"     },
                  { href: "/changelog",   label: "Changelog" },
                  { href: "/status",      label: "Status"    },
                  { href: "https://github.com/michelpronkk-oss/rtrim", label: "GitHub", ext: true },
                  { href: "/privacy",     label: "Privacy"   },
                ].map(({ href, label, ext }) =>
                  ext ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, color: "#5a5f68", transition: "color 0.15s" }}
                      className="hover:text-[#f4f5f7]"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      key={label}
                      href={href}
                      style={{ fontSize: 13, color: "#5a5f68", transition: "color 0.15s" }}
                      className="hover:text-[#f4f5f7]"
                    >
                      {label}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="py-5 flex flex-wrap items-center justify-between gap-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#3a3e46" }}>
              &copy; {new Date().getFullYear()} RunTrim. Bring your own agent. Run it with memory, scope, and control.
            </p>
            <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#3a3e46" }}>
              Free CLI. Source code never uploaded.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}
