/**
 * RunTrim brand primitives.
 *
 * Eyebrow   — mono uppercase pill with optional tag chip
 * StatusPill — inline scope / forbid / mem / warn pill
 * LEDDot    — 7 px glow dot (mint default) with optional pulse
 *
 * These match the design spec in design_handoff_runtrim_brand/README.md exactly.
 */

import * as React from "react";

// ── Font reference ─────────────────────────────────────────────────────────────
const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, 'JetBrains Mono', monospace",
};

// ── Eyebrow ────────────────────────────────────────────────────────────────────

interface EyebrowProps {
  /** Optional colored chip at the left, e.g. "v0.7" */
  tag?: string;
  /** Tag variant: violet (default) | mint | amber | rose */
  tagVariant?: "violet" | "mint" | "amber" | "rose";
  children: React.ReactNode;
  className?: string;
}

const TAG_COLORS = {
  violet: { color: "var(--rt-violet)",      bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
  mint:   { color: "var(--rt-mint)",        bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.25)" },
  amber:  { color: "var(--rt-amber)",       bg: "rgba(245,165,36,0.10)",  border: "rgba(245,165,36,0.25)"  },
  rose:   { color: "var(--rt-rose)",        bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
};

export function Eyebrow({ tag, tagVariant = "violet", children, className }: EyebrowProps) {
  const tc = TAG_COLORS[tagVariant];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "5px 10px 5px 8px",
        border: "1px solid var(--rt-line2)",
        borderRadius: 999,
        background: "var(--rt-bg1)",
        ...MONO,
        fontSize: 11,
        color: "var(--rt-fg3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {tag && (
        <span
          style={{
            color: tc.color,
            background: tc.bg,
            padding: "1px 7px",
            borderRadius: 4,
            border: `1px solid ${tc.border}`,
            letterSpacing: "0.04em",
          }}
        >
          {tag}
        </span>
      )}
      {children}
    </span>
  );
}

// ── StatusPill ─────────────────────────────────────────────────────────────────

type PillVariant = "scope" | "forbid" | "mem" | "warn" | "default";

interface StatusPillProps {
  variant?: PillVariant;
  children: React.ReactNode;
  className?: string;
}

const PILL_MAP: Record<PillVariant, { color: string; border: string; bg: string }> = {
  scope:   { color: "var(--rt-mint)",   border: "rgba(110,231,183,0.25)", bg: "rgba(110,231,183,0.06)"  },
  forbid:  { color: "var(--rt-rose)",   border: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.06)"  },
  mem:     { color: "var(--rt-violet)", border: "rgba(167,139,250,0.28)", bg: "rgba(167,139,250,0.07)"  },
  warn:    { color: "var(--rt-amber)",  border: "rgba(245,165,36,0.30)",  bg: "rgba(245,165,36,0.07)"   },
  default: { color: "var(--rt-fg1)",    border: "rgba(255,255,255,0.09)", bg: "var(--rt-bg3)"            },
};

export function StatusPill({ variant = "default", children, className }: StatusPillProps) {
  const s = PILL_MAP[variant];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "2px 7px", borderRadius: 4,
        fontSize: 11.5,
        ...MONO,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
      }}
    >
      {children}
    </span>
  );
}

// ── LEDDot ─────────────────────────────────────────────────────────────────────

type LEDColor = "mint" | "amber" | "rose" | "violet";

interface LEDDotProps {
  color?: LEDColor;
  pulse?: boolean;
  size?: number;
  className?: string;
}

const LED_COLORS: Record<LEDColor, string> = {
  mint:   "var(--rt-mint)",
  amber:  "var(--rt-amber)",
  rose:   "var(--rt-rose)",
  violet: "var(--rt-violet)",
};

export function LEDDot({ color = "mint", pulse = false, size = 7, className }: LEDDotProps) {
  const c = LED_COLORS[color];
  return (
    <span
      className={[pulse ? "rt-live-dot" : "", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        width: size, height: size,
        borderRadius: "50%",
        background: c,
        boxShadow: `0 0 8px ${c}`,
        flexShrink: 0,
      }}
    />
  );
}

// ── MeterBar ───────────────────────────────────────────────────────────────────
// Static (no animation) version for SSR-safe use. Use the animated Meter in
// hero-run-contract.tsx for client-side animated fills.

interface MeterBarProps {
  /** 0-100 */
  pct: number;
  mint?: boolean;
  className?: string;
}

export function MeterBar({ pct, mint = false, className }: MeterBarProps) {
  return (
    <span
      className={className}
      style={{
        display: "block", flex: 1, minWidth: 120, height: 6,
        background: "#14171c", borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.04)",
        overflow: "hidden", position: "relative",
      }}
    >
      <span
        style={{
          display: "block", height: "100%", borderRadius: 3,
          width: `${pct}%`,
          background: mint
            ? "linear-gradient(90deg, #10b981, #6ee7b7)"
            : "linear-gradient(90deg, #6d4cf2, #a78bfa)",
        }}
      />
    </span>
  );
}
