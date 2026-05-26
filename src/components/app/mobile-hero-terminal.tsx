"use client";

import { useState, useEffect } from "react";

// Command definitions - the real RunTrim workflow
// Sequence: start and dispatch (guard the run), finish (close and check), sync (push to cloud)
const CMDS = [
  {
    cmd: 'runtrim agent "fix mobile nav" --copy',
    badge: "guarded",
    bs: { color: "#3DDAB4", border: "rgba(61,218,180,0.22)", bg: "rgba(61,218,180,0.07)" },
    lines: [
      { t: "Memory loaded", c: "#55587A" },
      { t: "Contract created", c: "#55587A" },
      { t: "Protected: auth, billing, env", c: "#55587A" },
      { t: "Agent inside scope", c: "#55587A" },
      { t: "Auto-sync ready", c: "#3DDAB4" },
    ],
  },
  {
    cmd: "runtrim finish",
    badge: "checked",
    bs: { color: "#9E91FF", border: "rgba(158,145,255,0.22)", bg: "rgba(158,145,255,0.07)" },
    lines: [
      { t: "Drift check: clean", c: "#55587A" },
      { t: "Changed files: 2", c: "#55587A" },
      { t: "Report saved", c: "#55587A" },
      { t: "Continuation ready", c: "#9E91FF" },
      { t: "Tokens saved: ~18k", c: "#3DDAB4" },
    ],
  },
  {
    cmd: "runtrim sync",
    badge: "synced",
    bs: { color: "#3DDAB4", border: "rgba(61,218,180,0.22)", bg: "rgba(61,218,180,0.07)" },
    lines: [
      { t: "Syncing 3 runs...", c: "#55587A" },
      { t: "Memory uploaded", c: "#55587A" },
      { t: "Dashboard updated", c: "#3DDAB4" },
      { t: "Run history: synced", c: "#55587A" },
      { t: "Reports: 3 ready", c: "#55587A" },
    ],
  },
] as const;

// All commands have the same line count - terminal height is stable.
const LINE_COUNT = 5;
const LINE_H_PX = 20; // 12px x 1.66 leading ~ 20px per line
const LINE_GAP = 2; // space-y-0.5 = 2px gap
const OUTPUT_H = LINE_COUNT * LINE_H_PX + (LINE_COUNT - 1) * LINE_GAP;

const CHAR_MS = 34;
const LINE_MS = 185;
const HOLD_MS = 3000;
const FADE_MS = 360;
const CURSOR_MS = 520;

type Phase = "typing" | "output" | "hold" | "clear";

export function MobileHeroTerminal() {
  const [reduced, setReduced] = useState(false);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [cursorV, setCursorV] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setTyped(CMDS[0].cmd.length);
      setShown(LINE_COUNT);
      setPhase("hold");
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCursorV((v) => !v), CURSOR_MS);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const cmd = CMDS[idx];

    if (phase === "typing") {
      if (typed < cmd.cmd.length) {
        const id = setTimeout(() => setTyped((t) => t + 1), CHAR_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("output"), 210);
      return () => clearTimeout(id);
    }

    if (phase === "output") {
      if (shown < cmd.lines.length) {
        const id = setTimeout(() => setShown((s) => s + 1), LINE_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("hold"), 320);
      return () => clearTimeout(id);
    }

    if (phase === "hold") {
      const id = setTimeout(() => setPhase("clear"), HOLD_MS);
      return () => clearTimeout(id);
    }

    if (phase === "clear") {
      setOpacity(0);
      const id = setTimeout(() => {
        setIdx((i) => (i + 1) % CMDS.length);
        setTyped(0);
        setShown(0);
        setOpacity(1);
        setPhase("typing");
      }, FADE_MS);
      return () => clearTimeout(id);
    }
  }, [phase, typed, shown, idx, reduced]);

  const cmd = CMDS[idx];
  const showCursor = !reduced && (phase === "typing" || (phase === "output" && shown === 0));

  return (
    <div
      className="overflow-hidden rounded-xl border border-[#7C6DFA]/28 bg-[#06060F]"
      style={{
        boxShadow: "0 0 0 1px rgba(124,109,250,0.11), 0 14px 36px rgba(0,0,0,0.58)",
        opacity,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            {([0.18, 0.11, 0.06] as const).map((op, i) => (
              <span key={i} className="size-2 rounded-full" style={{ background: `rgba(255,255,255,${op})` }} />
            ))}
          </div>
          <span className="font-mono text-[11px] text-[#3A3E5A]">runtrim</span>
        </div>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.07em]"
          style={{ color: cmd.bs.color, borderColor: cmd.bs.border, backgroundColor: cmd.bs.bg }}
        >
          {cmd.badge}
        </span>
      </div>

      <div className="px-3.5 py-3.5 font-mono">
        <div className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-[12px] text-[#3A3E5A]">$</span>
          <span className="text-[13px] text-[#8B82FF]">{cmd.cmd.slice(0, typed)}</span>
          {showCursor && (
            <span
              className="inline-block shrink-0 rounded-[1px] align-text-bottom"
              style={{
                width: "0.45ch",
                height: "0.85em",
                fontSize: "13px",
                background: "#7C6DFA",
                opacity: cursorV ? 0.88 : 0,
              }}
            />
          )}
        </div>

        <div className="mt-2 overflow-hidden space-y-0.5" style={{ height: OUTPUT_H }}>
          {cmd.lines.slice(0, shown).map((line, i) => (
            <p key={i} className="text-[12px] leading-[1.66]" style={{ color: line.c }}>
              {"  "}
              {line.t}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
