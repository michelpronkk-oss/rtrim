"use client";

import { useState, useEffect } from "react";

// ── Command definitions ────────────────────────────────────────────────────

const CMDS = [
  {
    cmd:   'runtrim go "fix mobile nav"',
    badge: "guarded",
    badge_style: { color: "#3DDAB4", border: "rgba(61,218,180,0.22)", bg: "rgba(61,218,180,0.07)" },
    lines: [
      { t: "Memory loaded",                 c: "#484A68" },
      { t: "Contract created",              c: "#484A68" },
      { t: "Protected: auth, billing, env", c: "#484A68" },
      { t: "Agent inside scope",            c: "#484A68" },
      { t: "Auto-sync ready",               c: "#3DDAB4" },
    ],
  },
  {
    cmd:   "runtrim history",
    badge: "3 runs",
    badge_style: { color: "#8B82FF", border: "rgba(139,130,255,0.22)", bg: "rgba(139,130,255,0.07)" },
    lines: [
      { t: "3 runs found",           c: "#484A68" },
      { t: "Latest: fix mobile nav", c: "#484A68" },
      { t: "Status: guarded",        c: "#3DDAB4" },
      { t: "Tokens saved: ~24k",     c: "#8B82FF" },
    ],
  },
  {
    cmd:   "runtrim sync",
    badge: "synced",
    badge_style: { color: "#3DDAB4", border: "rgba(61,218,180,0.22)", bg: "rgba(61,218,180,0.07)" },
    lines: [
      { t: "Syncing run history",  c: "#484A68" },
      { t: "Memory uploaded",      c: "#484A68" },
      { t: "Dashboard updated",    c: "#3DDAB4" },
    ],
  },
] as const;

// Max lines across all commands — reserves space so height never shifts.
const MAX_LINES = Math.max(...CMDS.map((c) => c.lines.length));
const CHAR_MS    = 35;   // ms per character typed
const LINE_MS    = 190;  // ms between output lines
const HOLD_MS    = 2900; // ms to hold after last output line
const FADE_MS    = 380;  // ms to fade before cycling
const CURSOR_MS  = 530;  // ms per cursor blink half-period

type Phase = "typing" | "output" | "hold" | "clear";

// ── Component ─────────────────────────────────────────────────────────────

export function MobileHeroTerminal() {
  const [reduced, setReduced] = useState(false);
  const [idx,     setIdx]     = useState(0);
  const [typed,   setTyped]   = useState(0);
  const [shown,   setShown]   = useState(0);
  const [phase,   setPhase]   = useState<Phase>("typing");
  const [cursorV, setCursorV] = useState(true);
  const [fade,    setFade]    = useState(1);

  // Detect prefers-reduced-motion once on mount
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setTyped(CMDS[0].cmd.length);
      setShown(CMDS[0].lines.length);
      setPhase("hold");
    }
  }, []);

  // Cursor blink
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCursorV((v) => !v), CURSOR_MS);
    return () => clearInterval(id);
  }, [reduced]);

  // Animation state machine
  useEffect(() => {
    if (reduced) return;
    const cmd = CMDS[idx];

    if (phase === "typing") {
      if (typed < cmd.cmd.length) {
        const id = setTimeout(() => setTyped((t) => t + 1), CHAR_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("output"), 220);
      return () => clearTimeout(id);
    }

    if (phase === "output") {
      if (shown < cmd.lines.length) {
        const id = setTimeout(() => setShown((s) => s + 1), LINE_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("hold"), 350);
      return () => clearTimeout(id);
    }

    if (phase === "hold") {
      const id = setTimeout(() => setPhase("clear"), HOLD_MS);
      return () => clearTimeout(id);
    }

    if (phase === "clear") {
      setFade(0);
      const id = setTimeout(() => {
        const next = (idx + 1) % CMDS.length;
        setIdx(next);
        setTyped(0);
        setShown(0);
        setFade(1);
        setPhase("typing");
      }, FADE_MS);
      return () => clearTimeout(id);
    }
  }, [phase, typed, shown, idx, reduced]);

  const cmd      = CMDS[idx];
  const showCursor = !reduced && (phase === "typing" || (phase === "output" && shown === 0));

  return (
    <div
      className="overflow-hidden rounded-xl border border-[#7C6DFA]/25 bg-[#06060F]"
      style={{
        boxShadow: "0 0 0 1px rgba(124,109,250,0.10), 0 12px 32px rgba(0,0,0,0.55)",
        opacity:    fade,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {([0.14, 0.09, 0.05] as const).map((op, i) => (
              <span key={i} className="size-2 rounded-full" style={{ background: `rgba(255,255,255,${op})` }} />
            ))}
          </div>
          <span className="font-mono text-[10px] text-[#3A3E58]">runtrim</span>
        </div>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]"
          style={{
            color:            cmd.badge_style.color,
            borderColor:      cmd.badge_style.border,
            backgroundColor:  cmd.badge_style.bg,
          }}
        >
          {cmd.badge}
        </span>
      </div>

      {/* Terminal body */}
      <div className="px-3 py-3 font-mono leading-[1.65]">
        {/* Command with typing cursor */}
        <div className="flex items-baseline gap-1.5 text-[12px]">
          <span className="shrink-0 text-[#3A3E58]">$</span>
          <span className="text-[#8B82FF]">{cmd.cmd.slice(0, typed)}</span>
          {showCursor && (
            <span
              className="inline-block h-[0.82em] w-[0.48ch] shrink-0 align-text-bottom rounded-[1px]"
              style={{ background: "#7C6DFA", opacity: cursorV ? 0.9 : 0 }}
            />
          )}
        </div>

        {/* Output lines — reserved height prevents layout shift */}
        <div
          className="mt-1.5 space-y-0.5 text-[11px]"
          style={{ minHeight: `${MAX_LINES * 11 * 1.65}px` }}
        >
          {cmd.lines.slice(0, shown).map((line, i) => (
            <p key={i} style={{ color: line.c }}>{"  "}{line.t}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
