import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Every RunTrim CLI release in order: runtrim start, agent dispatch, MCP server, cloud sync, plan model, and finish enforcement changes.",
  alternates: { canonical: "https://www.runtrim.com/changelog" },
  openGraph: {
    title: "RunTrim Changelog — CLI and Agent Workflow Updates",
    description:
      "Latest updates to the RunTrim CLI control layer, MCP server, cloud sync, and AI coding agent workflow features.",
    url: "https://www.runtrim.com/changelog",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RunTrim Changelog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim Changelog — CLI and Agent Workflow Updates",
    description:
      "Latest updates to the RunTrim CLI control layer, MCP server, cloud sync, and agent workflow features.",
    images: ["/opengraph-image"],
  },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const RELEASES = [
  {
    version: "0.1.18",
    title: "Doctor readiness, CI check v1, and Restore v1",
    date: "May 2026",
    tag: "Latest",
    items: [
      "runtrim doctor: readiness report for project setup, instruction surfaces, MCP snippets, and tool availability",
      "stronger generated agent instruction blocks for contract-first flow and finish verification",
      "MCP readiness and status checks in doctor output",
      "runtrim ci check and GitHub Action v1 example for CLI-based PR gating",
      "Restore v1 local recovery: preview/apply restore points with source-safe handling",
      "migration: primary onboarding is now runtrim start -> runtrim doctor -> runtrim agent --copy -> runtrim finish",
    ],
  },
  {
    version: "0.1.17",
    title: "Local state integrity and repair wall",
    date: "May 2026",
    tag: null,
    items: [
      "local global state integrity model for fair-use repo tracking",
      "repair wall when local repo registry is missing/corrupt/inconsistent",
      "repo status/repair flow improvements for safer recovery",
      "prompt and routing handling improvements for negative boundaries",
    ],
  },
  {
    version: "0.1.16",
    title: "Repo-limit consistency and scope/risk fixes",
    date: "May 2026",
    tag: null,
    items: [
      "repo-limit consistency across start, agent, go compatibility, MCP contract creation, and sync messaging",
      "README/docs task scope and risk classification fixes",
      "modern command-flow cleanup across generated guidance",
    ],
  },
  {
    version: "0.1.15",
    title: "CLI publish surface and sync messaging",
    date: "May 2026",
    tag: null,
    items: [
      "CLI-only publish manifest: installed package dependency surface reduced to CLI deps only",
      "runtrim install footprint reduced significantly vs prior versions",
      ".env.local ignored by RunTrim now warns instead of blocking safe runs",
      "cloud sync local/no-auth fallback now reads as skipped/not configured rather than failed",
      "Restore v1: local restore points for guarded runs with CLI preview/apply; restore apply stays local and source-safe",
    ],
  },
  {
    version: "0.1.14",
    title: "Project setup, MCP, and plan model",
    date: "May 2026",
    tag: null,
    items: [
      "runtrim start: project setup command that analyzes the repo, writes memory, detects agent files, and prepares MCP snippets",
      "project memory and profile generation on first start",
      "agent instruction injection for CLAUDE.md, AGENTS.md, and Cursor rules",
      "MCP config snippets and guidance via runtrim mcp instructions and runtrim mcp config --print",
      "dashboard entitlement gating: Free sees local-only, Pro sees cloud sync",
      "plan model alignment: Free local-only, Pro cloud sync, Builder multi-project, Team governance",
    ],
  },
  {
    version: "0.1.13",
    title: "Agent dispatch, MCP server, and finish enforcement",
    date: "May 2026",
    tag: null,
    items: [
      "runtrim agent: primary dispatch command with --copy handoff support",
      "local Bridge v1: scoped contract creation and guarded prompt handoff",
      "MCP server v1: runtrim mcp start, runtrim_create_contract MCP tool",
      "finish enforcement: PASS / WARN / BLOCKED verdict on runtrim finish",
      "runtrim approve for scope extension within a run",
      "sensitive and untracked file detection in finish checks",
    ],
  },
  {
    version: "0.1.11",
    title: "Automatic cloud sync for Bridge runs",
    date: "May 2026",
    tag: null,
    items: [
      "runtrim go now auto-syncs started runs when connected",
      "runtrim finish auto-syncs completed reports",
      "manual runtrim sync remains available as fallback",
      "failed syncs stay local and can be retried",
    ],
  },
  {
    version: "0.1.10",
    title: "Safe resting state for agent protocols",
    date: "May 2026",
    tag: null,
    items: [
      "finished runs restore RUNTRIM.md to canonical protocol mode",
      "latest contract resets to Status: none after finish",
      "current memory resets after finish",
      "agents entering between sessions are told to start a new runtrim go contract",
    ],
  },
  {
    version: "0.1.9",
    title: "Protocol installer and agent pointers",
    date: "May 2026",
    tag: null,
    items: [
      "runtrim start installs RUNTRIM.md, project policies, memory baseline, and agent pointers",
      "supports CLAUDE.md, AGENTS.md, and Cursor rules",
      "repo becomes RunTrim-aware after one command",
    ],
  },
  {
    version: "0.1.8",
    title: "Bridge Mode",
    date: "May 2026",
    tag: null,
    items: [
      "runtrim go creates scoped contracts before AI agents touch code",
      "runtrim finish checks changed files, risk, proof gaps, and continuation",
      "works with Claude Code, Codex, Cursor, ChatGPT, and prompt-based agents",
    ],
  },
  {
    version: "0.1.6",
    title: "Public CLI release",
    date: "May 2026",
    tag: null,
    items: [
      "public npm install flow",
      "local run history",
      "basic savings reports",
      "project-level run files",
    ],
  },
] as const;

export default function ChangelogPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#06070a] text-[#f4f5f7]">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-16 pb-14 sm:pt-24 sm:pb-20"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Grid */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 55% at 50% 30%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 55% at 50% 30%, black 30%, transparent 75%)",
          }}
        />
        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(1000px 600px at 50% -100px, rgba(124,109,250,0.08), transparent 60%)",
          }}
        />

        <div className="relative z-10 mx-auto px-6" style={{ maxWidth: 860 }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "3px 10px 3px 8px",
              border: "1px solid rgba(167,139,250,0.2)", borderRadius: 999,
              background: "rgba(167,139,250,0.05)",
              ...MONO, fontSize: 10.5, color: "#a78bfa",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", flexShrink: 0 }} />
            Changelog
          </div>

          <h1
            className="mt-5"
            style={{
              fontSize: "clamp(26px, 3.6vw, 44px)",
              fontWeight: 600, lineHeight: 1.18,
              letterSpacing: "-0.03em", color: "#f4f5f7",
              maxWidth: 640,
            }}
          >
            Every RunTrim release,<br className="hidden sm:block" /> in order.
          </h1>

          <p
            className="mt-4"
            style={{ fontSize: 16, lineHeight: 1.65, color: "#6e737d", maxWidth: 480 }}
          >
            CLI updates, MCP server, cloud sync, and agent workflow changes, in order.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/app/install"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                height: 36, padding: "0 14px", borderRadius: 7,
                background: "rgba(124,109,250,0.12)", color: "#c4b5fd",
                border: "1px solid rgba(124,109,250,0.22)",
                fontSize: 13, fontWeight: 500,
                transition: "background 0.15s, color 0.15s",
              }}
              className="hover:bg-[rgba(124,109,250,0.2)] hover:text-[#ddd6fe]"
            >
              Install free CLI
              <ArrowRight style={{ width: 13, height: 13 }} />
            </Link>
            <Link
              href="/app/install"
              style={{
                display: "inline-flex", alignItems: "center",
                height: 36, padding: "0 14px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "transparent", color: "#4a4f5c",
                fontSize: 13,
                transition: "color 0.15s, border-color 0.15s",
              }}
              className="hover:text-[#9ca3af] hover:border-white/20"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <div className="mx-auto px-6 py-14 sm:py-20" style={{ maxWidth: 860 }}>

        {/* Latest release — highlighted */}
        <div
          className="relative mb-3 overflow-hidden rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(124,109,250,0.06) 0%, rgba(124,109,250,0.02) 100%)",
            border: "1px solid rgba(124,109,250,0.2)",
          }}
        >
          {/* Gradient top rule */}
          <div
            style={{
              position: "absolute", inset: "0 0 auto 0", height: 1,
              background: "linear-gradient(90deg, transparent 5%, rgba(124,109,250,0.7) 35%, rgba(153,102,255,0.7) 65%, transparent 95%)",
            }}
          />

          {/* Header */}
          <div
            className="flex flex-wrap items-center gap-2.5 px-5 py-4"
            style={{ borderBottom: "1px solid rgba(124,109,250,0.12)" }}
          >
            <span
              style={{
                ...MONO, fontSize: 11, color: "#a78bfa",
                background: "rgba(167,139,250,0.1)",
                border: "1px solid rgba(167,139,250,0.25)",
                borderRadius: 4, padding: "2px 7px",
                letterSpacing: "0.04em",
              }}
            >
              v{RELEASES[0].version}
            </span>
            <span
              style={{
                ...MONO, fontSize: 9.5, color: "#7c6dfa",
                background: "rgba(124,109,250,0.12)",
                border: "1px solid rgba(124,109,250,0.25)",
                borderRadius: 3, padding: "2px 6px",
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}
            >
              Latest
            </span>
            <h2
              style={{
                flex: 1, minWidth: 0,
                fontSize: 15, fontWeight: 500, color: "#e8eaf0",
                letterSpacing: "-0.01em",
              }}
            >
              {RELEASES[0].title}
            </h2>
            <span style={{ ...MONO, fontSize: 11, color: "#2e3240", whiteSpace: "nowrap" }}>
              {RELEASES[0].date}
            </span>
          </div>

          {/* Items */}
          <ul className="px-5 py-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RELEASES[0].items.map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span
                  style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "rgba(124,109,250,0.5)",
                    flexShrink: 0, marginTop: 7,
                  }}
                />
                <span
                  style={{
                    ...MONO, fontSize: 12.5, color: "#8085a0",
                    lineHeight: 1.65, minWidth: 0,
                    wordBreak: "break-word", overflowWrap: "break-word",
                  }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Remaining releases */}
        <div style={{ position: "relative" }}>
          {/* Continuous timeline line */}
          <div
            className="absolute hidden sm:block"
            style={{
              left: 19, top: 20, bottom: 24, width: 1,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {RELEASES.slice(1).map(({ version, title, date, items }) => (
              <div key={version} className="relative flex gap-5 py-1">
                {/* Timeline dot */}
                <div className="hidden sm:flex flex-col items-center" style={{ width: 40, flexShrink: 0, paddingTop: 18 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#111318",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "block", flexShrink: 0,
                    }}
                  />
                </div>

                {/* Card */}
                <div
                  style={{
                    flex: 1, minWidth: 0,
                    background: "#0b0c10",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex flex-wrap items-center gap-2.5 px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      style={{
                        ...MONO, fontSize: 10.5, color: "#7c6dfa",
                        background: "rgba(124,109,250,0.07)",
                        border: "1px solid rgba(124,109,250,0.18)",
                        borderRadius: 4, padding: "2px 6px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      v{version}
                    </span>
                    <h2
                      style={{
                        flex: 1, minWidth: 0,
                        fontSize: 14, fontWeight: 500, color: "#d8dbe5",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {title}
                    </h2>
                    <span style={{ ...MONO, fontSize: 10.5, color: "#272b34", whiteSpace: "nowrap" }}>
                      {date}
                    </span>
                  </div>

                  {/* Items */}
                  <ul className="px-5 py-3.5" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span
                          style={{
                            width: 3, height: 3, borderRadius: 1,
                            background: "#3a3e4a",
                            flexShrink: 0, marginTop: 8,
                          }}
                        />
                        <span
                          style={{
                            ...MONO, fontSize: 12, color: "#6b707a",
                            lineHeight: 1.65, minWidth: 0,
                            wordBreak: "break-word", overflowWrap: "break-word",
                          }}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          className="mt-6 text-center"
          style={{ ...MONO, fontSize: 11, color: "#22252d" }}
        >
          Earlier releases were pre-public. Changelog starts at v0.1.6.
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}

