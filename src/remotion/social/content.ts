import type { TerminalLine } from "../components/TerminalCard";
import type { FileChange } from "./components/FileChangeList";
import type { Snapshot } from "./components/RestoreCard";
import type { Verdict } from "./components/VerdictBadge";
import type { ContractData } from "./components/RunContractCard";

// ── Visual payload types ───────────────────────────────────────────────────────

export type PostVisual =
  | { type: "contract-card" } & ContractData
  | { type: "file-change-list"; verdict: Verdict; files: FileChange[] }
  | { type: "scope-card";       task: string; paths: string[] }
  | { type: "restore-card";     snapshots: Snapshot[] }
  | { type: "terminal";         lines: TerminalLine[] }
  | { type: "verdict-hero";     verdict: Verdict; message: string }
  | { type: "comparison";       leftText: string; rightText: string }
  | { type: "plan-card";        plan: string; tagline?: string; features: string[] }
  | { type: "local-first";      tagline?: string; items?: string[] };

export interface PostContent {
  id: string;
  compositionId: string;
  eyebrow?: string;
  hook: string[];
  sub?: string;
  visual: PostVisual;
  footer?: string;
  format: "1600x900" | "1200x675";
  category: "hook" | "scope" | "recovery" | "ci" | "pricing" | "trust";
}

export interface CarouselSlide {
  type: "hook" | "problem" | "solution" | "proof" | "cta";
  eyebrow?: string;
  headline: string;
  body?: string;
  visual?: PostVisual;
}

export interface CarouselContent {
  id: string;
  compositionId: string;
  slides: CarouselSlide[];
}

// ── X / Twitter posts (1600×900) ──────────────────────────────────────────────

export const X_POSTS: PostContent[] = [
  {
    id: "drift",
    compositionId: "XPost-Drift",
    eyebrow: "THE PROBLEM",
    hook: ["AI agents are fast.", "They also drift."],
    sub: "One prompt. Twelve files. Unknown risk.",
    visual: {
      type: "file-change-list",
      verdict: "WARN",
      files: [
        { name: "src/lib/auth.ts",         risky: true  },
        { name: "src/middleware.ts",        risky: true  },
        { name: "src/app/api/route.ts"              },
        { name: "src/components/hero.tsx"           },
        { name: "package.json",            risky: true  },
        { name: "src/lib/utils.ts"                  },
        { name: "+ 8 more files"                    },
      ],
    },
    format: "1600x900",
    category: "hook",
  },
  {
    id: "scope-drift",
    compositionId: "XPost-ScopeDrift",
    eyebrow: "SCOPE DRIFT",
    hook: ["Your agent changed", "14 files.", "You asked for one."],
    sub: "RunTrim scopes every run to the task.",
    visual: {
      type: "contract-card",
      runId: "RUN#A12C",
      task: "Fix the broken button in HeroSection",
      allowed: ["src/components/hero.tsx"],
      forbidden: [".env+", "migrations/++", "src/lib/auth.ts"],
      risk: "low",
      finishChecks: ["tests pass", "diff < 50 lines"],
      verdict: "GUARDED",
      agent: "Claude Code",
      step: "step 1 / 3",
    },
    format: "1600x900",
    category: "scope",
  },
  {
    id: "blocked",
    compositionId: "XPost-Blocked",
    eyebrow: "RUN BLOCKED",
    hook: ["BLOCKED.", "Risky file detected", "before your commit."],
    sub: "src/lib/auth.ts is outside the allowed scope.",
    visual: {
      type: "contract-card",
      runId: "RUN#B77F",
      task: "Update checkout flow copy",
      allowed: ["src/app/checkout/++"],
      forbidden: [".env+", "migrations/++", "src/lib/auth.ts"],
      risk: "high",
      verdict: "BLOCKED",
      agent: "Claude Code",
      step: "BLOCKED — forbidden write detected",
    },
    format: "1600x900",
    category: "scope",
  },
  {
    id: "restore",
    compositionId: "XPost-Restore",
    eyebrow: "RECOVERY",
    hook: ["Recover without", "spending another", "agent run."],
    sub: "Pick a restore point. Rewind the run.",
    visual: {
      type: "restore-card",
      snapshots: [
        { label: "Before agent run",   time: "14m ago", files: 0                      },
        { label: "After runtrim init", time: "13m ago", files: 2                      },
        { label: "Scope confirmed",    time: "12m ago", files: 4                      },
        { label: "Agent checkpoint",   time: "8m ago",  files: 9,  isCurrent: true    },
        { label: "BLOCKED — drift",    time: "3m ago",  files: 14, isRisk:    true    },
      ],
    },
    format: "1600x900",
    category: "recovery",
  },
  {
    id: "ci-gate",
    compositionId: "XPost-CIGate",
    eyebrow: "CI GATE",
    hook: ["Stop risky AI-generated", "PRs before merge."],
    sub: "GitHub check blocks the PR. Team reviews before it ships.",
    visual: {
      type: "contract-card",
      runId: "PR#291",
      task: "Refactor payment gateway integration",
      allowed: ["src/app/payments/++", "src/lib/stripe/++"],
      forbidden: ["src/middleware.ts", "src/lib/auth.ts", "prisma/++"],
      risk: "high",
      verdict: "BLOCKED",
      agent: "CI Gate",
      step: "3 forbidden writes detected",
    },
    footer: "CI Gate · Team plan",
    format: "1600x900",
    category: "ci",
  },
  {
    id: "git-vs-runtrim",
    compositionId: "XPost-GitVsRunTrim",
    eyebrow: "POSITIONING",
    hook: ["Git reverts commits.", "RunTrim rewinds AI runs."],
    sub: "Finer control. Faster recovery.",
    visual: {
      type: "comparison",
      leftText:  "git revert\none commit",
      rightText: "runtrim restore\nfull run rewind",
    },
    format: "1600x900",
    category: "hook",
  },
  {
    id: "free",
    compositionId: "XPost-Free",
    eyebrow: "FREE PLAN",
    hook: ["Free protects", "one project locally."],
    sub: "Unlimited runs. No sync. No account required.",
    visual: {
      type: "plan-card",
      plan: "Free",
      tagline: "$0 · local only",
      features: [
        "Unlimited local runs",
        "Memory + scope + finish checks",
        "Local history",
        "Local restore points",
        "Source stays local",
      ],
    },
    format: "1600x900",
    category: "pricing",
  },
  {
    id: "builder",
    compositionId: "XPost-Builder",
    eyebrow: "BUILDER PLAN",
    hook: ["Builder protects", "every project."],
    sub: "Cloud history. Drift reports. Multi-project memory.",
    visual: {
      type: "plan-card",
      plan: "Builder",
      tagline: "Unlimited projects",
      features: [
        "Unlimited projects",
        "Cloud history + sync",
        "Proof and drift reports",
        "Multi-project memory",
        "Priority support",
      ],
    },
    format: "1600x900",
    category: "pricing",
  },
  {
    id: "token-burn",
    compositionId: "XPost-TokenBurn",
    eyebrow: "TOKEN WASTE",
    hook: ["Token burn is a tax", "on broken runs."],
    sub: "RunTrim cuts reruns and context reloads.",
    visual: {
      type: "terminal",
      lines: [
        { kind: "prompt",  text: "runtrim finish"         },
        { kind: "blank",   text: ""                       },
        { kind: "dim",     text: "  scope drift:     none"  },
        { kind: "dim",     text: "  risk score:      low"   },
        { kind: "success", text: "  tokens saved:    ~4,200"},
        { kind: "success", text: "  reruns avoided:  2"     },
        { kind: "blank",   text: ""                       },
        { kind: "accent",  text: "  PASS — continuation saved" },
      ],
    },
    format: "1600x900",
    category: "hook",
  },
  {
    id: "local-first",
    compositionId: "XPost-LocalFirst",
    eyebrow: "LOCAL FIRST",
    hook: ["Source code stays", "local by default."],
    sub: "RunTrim never reads, uploads, or stores your code.",
    visual: {
      type: "local-first",
      tagline: "Source stays local",
      items: [
        "No code uploaded",
        "No repo access required",
        "No cloud dependency",
        "Opt-in sync only",
      ],
    },
    format: "1600x900",
    category: "trust",
  },
];

// ── Instagram square posts (1080×1080) ────────────────────────────────────────

export const IG_SQUARES: PostContent[] = [
  {
    id: "ig-drift",
    compositionId: "IGSquare-Drift",
    eyebrow: "THE PROBLEM",
    hook: ["AI agents", "are fast.", "They also drift."],
    sub: "One prompt. Twelve files.",
    visual: {
      type: "file-change-list",
      verdict: "WARN",
      files: [
        { name: "src/lib/auth.ts",   risky: true },
        { name: "src/middleware.ts", risky: true },
        { name: "package.json",      risky: true },
        { name: "+ 11 more files"               },
      ],
    },
    format: "1200x675",
    category: "hook",
  },
  {
    id: "ig-blocked",
    compositionId: "IGSquare-Blocked",
    eyebrow: "RUN BLOCKED",
    hook: ["BLOCKED.", "Risky file stopped", "before commit."],
    sub: "Scope check catches what git misses.",
    visual: {
      type: "verdict-hero",
      verdict: "BLOCKED",
      message: "src/lib/auth.ts  ·  outside scope",
    },
    format: "1200x675",
    category: "scope",
  },
  {
    id: "ig-local-first",
    compositionId: "IGSquare-LocalFirst",
    eyebrow: "LOCAL FIRST",
    hook: ["Your code never", "leaves your machine."],
    sub: "No uploads. No cloud dependency. Just control.",
    visual: {
      type: "local-first",
    },
    format: "1200x675",
    category: "trust",
  },
];

// ── Instagram carousels (1080×1350, 5 slides each) ────────────────────────────

export const IG_CAROUSELS: CarouselContent[] = [
  {
    id: "carousel-agent-drift",
    compositionId: "IGCarousel-AgentDrift",
    slides: [
      {
        type: "hook",
        eyebrow: "01 / 05",
        headline: "AI agents are fast. They also drift.",
        body: "One prompt can become twelve files, wasted tokens, and broken state.",
      },
      {
        type: "problem",
        eyebrow: "02 / 05",
        headline: "One task. Twelve files.",
        body: "The agent keeps going past your intent. Scope creep is invisible until it breaks something.",
        visual: {
          type: "file-change-list",
          verdict: "WARN",
          files: [
            { name: "src/lib/auth.ts",  risky: true },
            { name: "src/middleware.ts", risky: true },
            { name: "+ 10 more files"               },
          ],
        },
      },
      {
        type: "solution",
        eyebrow: "03 / 05",
        headline: "Scope the run. Block the drift.",
        body: "RunTrim creates a contract. The agent stays inside it.",
        visual: {
          type: "scope-card",
          task: "Fix the broken button in HeroSection",
          paths: ["src/components/hero.tsx"],
        },
      },
      {
        type: "proof",
        eyebrow: "04 / 05",
        headline: "BLOCKED before commit.",
        body: "Risky files outside scope are caught before they ever reach your branch.",
        visual: {
          type: "verdict-hero",
          verdict: "BLOCKED",
          message: "src/lib/auth.ts  ·  outside scope",
        },
      },
      {
        type: "cta",
        eyebrow: "05 / 05",
        headline: "Install free. Source stays local.",
        body: "npm install -g runtrim\nruntrim.com",
      },
    ],
  },
  {
    id: "carousel-recover",
    compositionId: "IGCarousel-Recover",
    slides: [
      {
        type: "hook",
        eyebrow: "01 / 05",
        headline: "Recover without another agent run.",
        body: "The run broke. You need to go back. Not to git — to before the agent started.",
      },
      {
        type: "problem",
        eyebrow: "02 / 05",
        headline: "Git revert is too blunt.",
        body: "You want to rewind the AI run, not undo a specific commit. That's a different problem.",
        visual: {
          type: "comparison",
          leftText:  "git revert\none commit",
          rightText: "runtrim restore\nfull run rewind",
        },
      },
      {
        type: "solution",
        eyebrow: "03 / 05",
        headline: "Restore points, not just commits.",
        body: "RunTrim captures the state before, during, and after each agent run.",
        visual: {
          type: "restore-card",
          snapshots: [
            { label: "Before agent run",   time: "14m ago", files: 0 },
            { label: "Scope confirmed",    time: "12m ago", files: 4 },
            { label: "BLOCKED — drift",    time: "3m ago",  files: 14, isRisk: true },
          ],
        },
      },
      {
        type: "proof",
        eyebrow: "04 / 05",
        headline: "Pick a point. Rewind.",
        body: "Select any restore point. RunTrim rewinds to that state in seconds.",
      },
      {
        type: "cta",
        eyebrow: "05 / 05",
        headline: "Free plan. Local-only. Start now.",
        body: "npm install -g runtrim\nruntrim.com",
      },
    ],
  },
  {
    id: "carousel-pricing",
    compositionId: "IGCarousel-Pricing",
    slides: [
      {
        type: "hook",
        eyebrow: "01 / 05",
        headline: "One CLI. Four levels of protection.",
        body: "Start free. Scale when you need it.",
      },
      {
        type: "problem",
        eyebrow: "02 / 05",
        headline: "Free protects one project locally.",
        body: "Unlimited runs, memory, scope checks, local restore. No account required.",
        visual: {
          type: "plan-card",
          plan: "Free",
          tagline: "$0 · local only",
          features: ["Unlimited local runs", "Memory + scope + finish", "Local restore points"],
        },
      },
      {
        type: "solution",
        eyebrow: "03 / 05",
        headline: "Pro syncs history and memory.",
        body: "Cloud history, memory sync across machines, continuation handoffs.",
        visual: {
          type: "plan-card",
          plan: "Pro",
          tagline: "Sync across machines",
          features: ["Cloud history + sync", "Memory sync", "Guarded handoffs"],
        },
      },
      {
        type: "proof",
        eyebrow: "04 / 05",
        headline: "Builder protects every project.",
        body: "Unlimited projects, drift reports, multi-project memory.",
        visual: {
          type: "plan-card",
          plan: "Builder",
          tagline: "Unlimited projects",
          features: ["Unlimited projects", "Proof + drift reports", "Multi-project memory"],
        },
      },
      {
        type: "cta",
        eyebrow: "05 / 05",
        headline: "Team protects every merge.",
        body: "Shared state, GitHub checks, audit logs. Coming soon.",
        visual: {
          type: "plan-card",
          plan: "Team",
          tagline: "Coming soon",
          features: ["Shared state", "GitHub checks", "Audit logs"],
        },
      },
    ],
  },
];

// ── Design system spec (used in admin) ────────────────────────────────────────

export const DESIGN_SPEC = {
  colors: {
    bg:         { hex: "#07071A", label: "Background" },
    surface:    { hex: "#0F0F1A", label: "Card surface" },
    surfaceEl:  { hex: "#141422", label: "Elevated element" },
    border:     { hex: "rgba(255,255,255,0.09)", label: "Border default" },
    borderMid:  { hex: "rgba(255,255,255,0.14)", label: "Border mid" },
    text:       { hex: "#EDEEFF", label: "Text primary" },
    textSub:    { hex: "#9090B4", label: "Text secondary" },
    textDim:    { hex: "#484868", label: "Text dim" },
    accent:     { hex: "#7C6DFA", label: "Brand violet" },
    mint:       { hex: "#4DE8B0", label: "Mint / PASS" },
    amber:      { hex: "#F0BF72", label: "Amber / WARN" },
    coral:      { hex: "#FF6B6B", label: "Coral / BLOCKED" },
  },
  typography: {
    fontSans: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, system-ui",
    fontMono: "'Menlo', 'Monaco', 'Courier New', monospace",
    scale: {
      display: { size: "72px", weight: 700, tracking: "-0.03em", use: "Main hook (1600x900)" },
      h1:      { size: "52px", weight: 700, tracking: "-0.03em", use: "Secondary headline"   },
      h2:      { size: "38px", weight: 700, tracking: "-0.02em", use: "Card headline"         },
      body:    { size: "20px", weight: 400, tracking: "0",       use: "Subtext / description" },
      mono:    { size: "17px", weight: 400, tracking: "0",       use: "Terminal commands"     },
      label:   { size: "11px", weight: 400, tracking: "0.12em",  use: "Eyebrow labels"        },
    },
  },
  spacing: {
    canvasPadH: "80px (1600x900) · 64px (1080x1080)",
    canvasPadV: "64px (1600x900) · 60px (1080x1080)",
    cardPad:    "20–22px",
    sectionGap: "60px",
    elementGap: "40px",
    cardGap:    "16px",
  },
  copyRules: [
    "Short. Sharp. No em dashes.",
    "Two-line hooks: problem then tension.",
    "Subtext expands. Never repeats.",
    "No hype words. No emojis.",
    "Terminal copy is lowercase mono.",
    "Badges and labels: UPPERCASE mono.",
    "CTA = one verb + one noun.",
  ],
  renderCommands: {
    xPostStill:    "remotion render src/remotion/index.ts XPost-Drift --still=59 out/x-drift.png",
    xPostVideo:    "remotion render src/remotion/index.ts XPost-Drift out/x-drift.mp4",
    carousel:      "remotion render src/remotion/index.ts IGCarousel-AgentDrift out/carousel-drift.mp4",
    previewAll:    "remotion preview src/remotion/index.ts",
  },
};
