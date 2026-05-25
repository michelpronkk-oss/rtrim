import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { MotionFade } from "@/components/app/motion-section";
import { CopyButton } from "@/components/app/copy-button";
import { SmartCta } from "@/components/app/smart-cta";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";
import { HeroRunContract, MobileContractCard } from "@/components/app/hero-run-contract";
import { planOrder, plans } from "@/lib/plans";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";

export const metadata: Metadata = {
  title: "RunTrim — CLI Control Layer for Claude Code, Cursor, and Codex",
  description:
    "Stop AI agents from drifting through your codebase. RunTrim gives Claude, Codex, Cursor and other coding agents scoped contracts, project memory, MCP tools, finish checks, CI gates and local restore points.",
  alternates: { canonical: "https://www.runtrim.com" },
  openGraph: {
    title: "RunTrim — CLI Control Layer for Claude Code, Cursor, and Codex",
    description:
      "Stop AI agents from drifting through your codebase with scoped contracts, memory, finish verification, CI checks, and local restore points.",
    url: "https://www.runtrim.com",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RunTrim — Control Layer for AI Coding Agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim — CLI Control Layer for Claude Code, Cursor, and Codex",
    description:
      "Stop AI agents from drifting through your codebase with scoped contracts, memory, finish verification, CI checks, and local restore points.",
    images: ["/opengraph-image"],
  },
};

/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Section data ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

const DRIFT_ITEMS = [
  {
    tag:   "Scope creep",
    title: "One task becomes twelve files",
    body:  "Small requests drift into unrelated files.",
    glyph: "SESSION_NEW",
    code:  "files_touched: 12 / 3",
  },
  {
    tag:   "Token burn",
    title: "The agent rereads the repo",
    body:  "Bad runs spend context before they solve anything.",
    glyph: "DELTA",
    code:  "usage: +38% vs scoped",
  },
  {
    tag:   "Broken state",
    title: "Small fixes break working code",
    body:  "Checkout, auth or config can change without warning.",
    glyph: "USAGE",
    code:  "risk: hidden",
  },
  {
    tag:   "No recovery",
    title: "Git revert is too blunt",
    body:  "RunTrim rewinds the AI run, not your whole branch.",
    glyph: "VIOLATION",
    code:  "restore: local",
  },
  {
    tag:   "No proof",
    title: "The agent says done",
    body:  "RunTrim checks scope, diff and forbidden writes.",
    glyph: "FINISH",
    code:  "finish: verified",
  },
  {
    tag:   "Context reset",
    title: "Every session starts cold",
    body:  "RunTrim carries project memory forward.",
    glyph: "RUN_LOG",
    code:  "memory: loaded",
  },
];

const PIPELINE_STAGES = [
  {
    n:      "01 / setup",
    cmd:    "runtrim start",
    desc:   "Creates memory, rules and MCP snippets.",
    active: true,
  },
  {
    n:      "02 / readiness",
    cmd:    "runtrim doctor",
    desc:   "Checks if your agent is RunTrim-ready.",
    active: true,
  },
  {
    n:      "03 / control",
    cmd:    'runtrim agent "task" --copy',
    desc:   "Creates a scoped handoff. MCP agents can create it directly.",
    active: true,
  },
  {
    n:      "04 / verify",
    cmd:    "runtrim finish",
    desc:   "Checks scope, changed files and proof gaps.",
    active: false,
  },
  {
    n:      "05 / gate",
    cmd:    "runtrim ci check",
    desc:   "Blocks risky AI-generated PRs before merge.",
    active: false,
  },
  {
    n:      "06 / recover",
    cmd:    "runtrim restore last --preview",
    desc:   "Preview and rewind a broken AI run locally.",
    active: false,
  },
];

const BENEFITS = [
  { n: "01", title: "Run history", body: "Every guarded task records the agent, scope, changed files, and outcome.", stat: "history", delta: "every run logged" },
  { n: "02", title: "Proof trail", body: "See scope, forbidden files, tests, diff size, and the finish verdict in one place.", stat: "finish state", delta: "visible and auditable" },
  { n: "03", title: "Continuation", body: "Next session starts from what actually happened, not from memory loss.", stat: "handoff", delta: "contract-aware" },
  { n: "04", title: "Team-ready accountability", body: "Shared state, approvals, and audit logs as your team workflow grows.", stat: "governance", delta: "built in" },
  { n: "05", title: "Smaller, focused runs", body: "Scoped context keeps tasks focused and reduces repeated context loading.", stat: "context waste", delta: "lower" },
  { n: "06", title: "Fewer out-of-scope edits", body: "Allowed paths and stop rules keep agents inside the contract boundaries.", stat: "scope control", delta: "stricter by default" },
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
  { icon: "...", name: "Custom agent", status: "any prompt-runner", beta: false,
    iconColor: "#5a5f68", iconBorder: "rgba(255,255,255,0.09)",  iconBg: "#16191e"                },
];

/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Page ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

export default function Home() {
  return (
    <div style={{ background: "#08090b", minHeight: "100vh", overflowX: "hidden", color: "#c9ccd2", fontFeatureSettings: '"ss01","ss02","cv11"' }}>

      <PublicNav />

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ HERO ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
          {/* Two-column grid ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â stacks on mobile */}
          <div
            className="grid gap-7 lg:gap-16 items-start"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,480px), 1fr))" }}
          >
            {/* Left: copy */}
            <div className="max-w-[620px]">
              {/* Eyebrow ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â "Bridge Mode live" with pulsing mint dot */}
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
                    AI AGENT CONTROL LAYER
                  </span>
                </span>
              </MotionFade>

              <MotionFade delay={0.06}>
                <h1
                  className="mt-3 sm:mt-5 mb-0 max-w-[18ch]"
                  style={{
                    fontSize: "clamp(34px, 4.6vw, 66px)",
                    lineHeight: 1.06, letterSpacing: "-0.033em",
                    fontWeight: 500, color: "#f4f5f7",
                  }}
                >
                  Stop AI agents from drifting through your codebase.
                </h1>
              </MotionFade>

                            <MotionFade delay={0.12}>
                <p
                  style={{
                    marginTop: 16,
                    fontSize: "clamp(14.5px, 1.45vw, 16px)",
                    lineHeight: 1.58,
                    color: "#c9ccd2",
                    maxWidth: 540,
                  }}
                >
                  RunTrim gives coding agents scope, memory, finish checks and restore points, so you waste fewer tokens and recover faster when an agent breaks something.
                </p>
              </MotionFade>

              <MotionFade delay={0.17}>
                <div className="mt-6 sm:mt-9 flex flex-wrap gap-2.5 sm:gap-3 items-center">
                  <Link
                    href="/app/install"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      height: 41, padding: "0 17px", borderRadius: 7,
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
                  <Link
                    href="/app/install"
                    className="inline-flex items-center gap-2 h-[41px] px-[16px] sm:px-[18px] rounded-[7px] text-[14px] font-medium text-[#c9ccd2] border border-white/14 bg-transparent transition-colors hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
                  >
                    See how it works
                  </Link>
                </div>
              </MotionFade>

                            <MotionFade delay={0.22}>
                <div
                  className="mt-4 sm:mt-5 hidden sm:flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1.5 sm:gap-y-2"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#4a4f59" }}
                >
                  <span>Local-first</span>
                  <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.09)", display: "inline-block", flexShrink: 0 }} />
                  <span>Source stays local</span>
                  <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.09)", display: "inline-block", flexShrink: 0 }} />
                  <span>MCP-ready</span>
                  <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.09)", display: "inline-block", flexShrink: 0 }} />
                  <span>Restore points</span>
                </div>
              </MotionFade>
            </div>

            {/* Right: Run contract ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â compact card on mobile, full panel on desktop */}
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

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ PROBLEM ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â The drift problem ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
                AI AGENT DRIFT
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  <span className="hidden sm:inline">AI coding agents are fast.{" "}</span>
                  <span className="sm:hidden">AI agents are fast.{" "}</span>
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>They also drift.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  <span className="hidden sm:inline">Without a control layer, one prompt can become twelve files, wasted tokens, broken state and no clear way back.</span>
                  <span className="sm:hidden">One prompt can become twelve files, wasted tokens and broken state.</span>
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
              <MotionFade key={tag} delay={0.05 * i} className="h-full">
                <div
                  className="p-5 sm:p-7"
                  style={{
                    height: "100%",
                    background: "#0c0e11",
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

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ SOLUTION ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â The RunTrim protocol ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
                THE RUNTRIM PROTOCOL
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  <span className="hidden sm:inline">Your agent should start with a contract.</span>
                  <span className="sm:hidden">Start every AI run with a contract.</span>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  <span className="hidden sm:inline">RunTrim turns a task into scope, memory and rules before edits begin. Finish checks the diff, sensitive files and proof gaps.</span>
                  <span className="sm:hidden">Task, scope, memory, rules. Then finish checks the diff.</span>
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Mobile: stacked step list */}
          <div className="sm:hidden overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(180deg, #0e1116, #0a0c10)" }}>
            {PIPELINE_STAGES.map(({ n, cmd, desc, active }, idx) => (
              <div
                key={n}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "12px 16px",
                  borderBottom: idx < PIPELINE_STAGES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                }}
              >
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#5a5f68", letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>
                  {n.split(" / ")[0]}
                </span>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#f4f5f7", fontWeight: 500, display: "flex", alignItems: "flex-start", gap: 5, flexWrap: "wrap", wordBreak: "break-all" }}>
                    {active && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0, marginTop: 4 }} />}
                    <span style={{ color: "#a78bfa", flexShrink: 0 }}>$</span>
                    <span style={{ wordBreak: "break-all" }}>{cmd}</span>
                  </span>
                  <p style={{ margin: "4px 0 0", color: "#5a5f68", fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: horizontal scrollable pipeline */}
          <div className="hidden sm:block">
          <div
            className="overflow-hidden rounded-[10px]"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "linear-gradient(180deg, #0e1116, #0a0c10)",
            }}
          >
            {PIPELINE_STAGES.map(({ n, cmd, desc, active }, i) => (
              <div
                key={n}
                style={{
                  padding: "24px 22px 22px",
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
                          ? "linear-gradient(90deg, rgba(124,58,237,0.85), rgba(167,139,250,0.9))"
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
              { label: "Avg run time",         val: "2m 14s", delta: "down 41% vs unguarded" },
              { label: "Tokens per task",       val: "38.2k",  delta: "down 27% vs unguarded" },
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
          <p style={{ marginTop: 10, color: "#5a5f68", fontSize: 11.5, fontFamily: "var(--font-geist-mono)" }}>
            Early internal benchmark across repeated guarded vs unguarded tasks. Public benchmark report coming soon.
          </p>
        </div>
      </section>

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ BENEFITS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
                Run visibility
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}>
                  Every AI run{" "}
                  <em style={{ fontStyle: "normal", color: "#8a8f98" }}>becomes visible.</em>
                </h2>
                <p style={{ marginTop: 14, color: "#8a8f98", fontSize: 16, maxWidth: 620 }}>
                  See the task, contract, changed files, risk, finish verdict, continuation state, and run history in one place.
                </p>
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
              <MotionFade key={n} delay={0.05 * i} className="h-full">
                <div
                  className="p-5 sm:p-7"
                  style={{
                    height: "100%",
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

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ AGENTS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
              {AGENT_LIST.map(({ icon, name, status, beta, iconColor, iconBorder, iconBg }, i) => {
                const dotColor =
                  status === "first-class" ? "#a78bfa"
                  : status === "supported"  ? "#4DE8B0"
                  : status === "beta"       ? "#F0BF72"
                  : "#5a5f68";
                return (
                  <div
                    key={name}
                    className="p-5 sm:p-6"
                    style={{
                      background: "linear-gradient(180deg, #0e1116, #0a0c10)",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 6,
                        background: iconBg,
                        border: `1px solid ${iconBorder}`,
                        display: "grid", placeItems: "center",
                        color: iconColor,
                        fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    {/* Name */}
                    <span style={{ color: "#f4f5f7", fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}>
                      {name}
                    </span>
                    {/* Status — aligned to icon/name column top, no auto margin */}
                    <div
                      style={{
                        fontFamily: "var(--font-geist-mono)", fontSize: 10,
                        color: "#5a5f68", letterSpacing: "0.08em", textTransform: "uppercase",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 4, height: 4, borderRadius: "50%",
                          background: dotColor,
                          display: "inline-block", flexShrink: 0,
                        }}
                      />
                      {status}
                    </div>
                  </div>
                );
              })}
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
              <span>
                runtrim agent packages task, scope, memory, and constraints into a clean handoff prompt. Paste into any agent UI, or use MCP for compatible agents.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ PLANS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
                  The CLI is free forever. Upgrade when you need cloud history, synced memory, recovery metadata and team governance.
                </p>
              </div>
            </div>
          </MotionFade>

          {/* Cards ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â items-stretch (default) + h-full on wrapper+card = equal heights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch">
            {[
              {
                id: "free",
                name: "Free",
                price: "$0",
                per: "/ local",
                trial: null as string | null,
                desc: "The CLI, local memory and recovery for individual AI coding runs.",
                features: ["Unlimited local runs", "Memory, scope and finish checks", "All supported agents", "Local run history", "Local restore for latest run"],
                featured: false,
              },
              {
                id: "pro",
                name: "Pro",
                price: "$29",
                per: "/ month",
                trial: "3-day trial" as string | null,
                desc: "Personal agent control with cloud sync, memory and recovery history.",
                features: [
                  "Unlimited guarded handoffs",
                  "Auto-sync dashboard",
                  "Cloud run history",
                  "Memory sync",
                  "Synced restore metadata",
                  "Savings reports",
                ],
                featured: true,
              },
              {
                id: "builder",
                name: "Builder",
                price: "$49",
                per: "/ month",
                trial: null as string | null,
                desc: "Advanced guardrails for founders shipping production code with AI agents daily.",
                features: [
                  "Everything in Pro",
                  "Unlimited projects",
                  "Proof / drift reports",
                  "Priority guardrails",
                  "Multi-project memory",
                  "Advanced recovery history",
                ],
                featured: false,
              },
              {
                id: "team",
                name: "Team",
                price: "From $24",
                per: "/ seat / month",
                trial: null as string | null,
                desc: "Shared control for teams using AI coding agents.",
                features: ["Everything in Builder", "Shared team state", "Approvals and audit logs", "Shared recovery logs", "GitHub checks and policies (coming soon)"],
                featured: false,
              },
            ].map(({ id, name, price, per, trial, desc, features, featured }) => (
              <MotionFade key={id} delay={0.06} className="h-full">
                <div
                  style={{
                    height: "100%",
                    background: "#0c0e11",
                    border: `1px solid ${featured ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
                    borderTop: featured ? "2px solid rgba(167,139,250,0.7)" : "1px solid rgba(255,255,255,0.09)",
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
                  {/* Fixed-height badge slot — reserves space in all cards so description aligns */}
                  <div style={{ height: 22, marginTop: 6 }}>
                    {trial && (
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono)", fontSize: 10.5,
                          letterSpacing: "0.04em",
                          color: "#a78bfa",
                          border: "1px solid rgba(167,139,250,0.25)",
                          borderRadius: 4, padding: "2px 8px",
                          background: "rgba(167,139,250,0.06)",
                          display: "inline-block",
                        }}
                      >
                        {trial}
                      </span>
                    )}
                  </div>

                  {/* Description ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â fixed height keeps cards aligned below price */}
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
                            background: featured ? "#a78bfa" : "#6b7280",
                            borderRadius: 1, display: "block",
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â pushed to bottom by flex-1 on the list above */}
                  <div style={{ marginTop: 20 }}>
                    {id === "free" ? (
                      <Link
                        href="/app/install"
                        className="flex items-center justify-center h-9 w-full rounded-[6px] border border-white/14 bg-transparent text-[#f4f5f7] text-[13px] transition-colors hover:bg-[#16191e]"
                      >
                        Install free CLI
                      </Link>
                    ) : id === "pro" ? (
                      <ProCheckoutButton
                        label="Start free 3-day Pro trial"
                        className="flex items-center justify-center h-9 w-full rounded-[6px] border border-white bg-[#f4f5f7] text-[#0b0d10] text-[13px] font-medium transition-colors hover:bg-white disabled:opacity-60"
                      />
                    ) : (
                      id === "builder" ? (
                        <Link
                          href="/app/billing"
                          className="flex items-center justify-center h-9 w-full rounded-[6px] border border-white/14 bg-transparent text-[#f4f5f7] text-[13px] transition-colors hover:bg-[#16191e]"
                        >
                          Upgrade to Builder
                        </Link>
                      ) : (
                        <a
                          href="mailto:hello@runtrim.com?subject=RunTrim%20Team%20plan"
                          className="flex items-center justify-center h-9 w-full rounded-[6px] border border-white/14 bg-transparent text-[#f4f5f7] text-[13px] transition-colors hover:bg-[#16191e]"
                        >
                          Contact for Team
                        </a>
                      )
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

      {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ FINAL CTA ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
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
              <Link
                href="/app/install"
                className="inline-flex items-center h-10 px-[18px] rounded-[7px] text-[14px] font-medium text-[#c9ccd2] border border-white/14 bg-transparent transition-colors hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
              >
                See how it works
              </Link>
            </div>
          </MotionFade>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}





