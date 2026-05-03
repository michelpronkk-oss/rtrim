import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, cardW, easeOut, slideY, spring, scaleFrom } from "../styles";
import { TerminalCard } from "../components/TerminalCard";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

const FINISH_LINES = [
  { kind: "prompt"  as const, text: "runtrim finish" },
  { kind: "blank"   as const, text: "" },
  { kind: "dim"     as const, text: "  checking changed files..." },
  { kind: "dim"     as const, text: "  scope drift:    none detected" },
  { kind: "dim"     as const, text: "  risk score:     low" },
  { kind: "dim"     as const, text: "  proof gaps:     2 recorded" },
  { kind: "blank"   as const, text: "" },
  { kind: "success" as const, text: "  continuation saved" },
];

const CHECK_ITEMS = [
  { label: "Changed files",  color: C.text  },
  { label: "Scope drift",    color: C.mint  },
  { label: "Risk score",     color: C.mint  },
  { label: "Proof gaps",     color: C.amber },
  { label: "Continuation",   color: C.mint  },
];

export function Scene5Finish({ frame, mode, width, height }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);
  const tw = isLandscape ? Math.min(cardW("terminal", mode, width), 640) : cardW("terminal", mode, width);

  const labelOp  = easeOut(frame, 0, 20);
  const headOp   = easeOut(frame, 6, 22);
  const headY    = slideY(frame, 6, 24, 22);
  const termOp   = easeOut(frame, 12, 20);
  const termSc   = scaleFrom(frame, 12, 0.97, 20);

  // Char-by-char: "runtrim finish" = 14 chars → done at ~frame 21
  const charRevealed = Math.max(0, (frame - 12) * 1.5);

  const checkOps  = CHECK_ITEMS.map((_, i) => spring(frame, 28 + i * 12, 26));
  const checkScs  = CHECK_ITEMS.map((_, i) => scaleFrom(frame, 28 + i * 12, 0.88, 26));
  // Item is "done" (dot filled) shortly after it appears
  const checkDone = CHECK_ITEMS.map((_, i) => frame >= 40 + i * 12);

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex",
        flexDirection: isLandscape ? "row" : "column",
        alignItems: isLandscape ? "flex-start" : "center",
        gap: isLandscape ? 72 : 40,
        padding: `0 ${ph}px`,
        width: "100%",
        maxWidth: 1600,
      }}>
        {/* Terminal */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <p style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px", opacity: labelOp }}>
              04 / Finish check
            </p>
            <h2 style={{ fontFamily: FONT_SANS, fontSize: sz("h1", mode), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, margin: "0 0 4px", maxWidth: tw, opacity: headOp, transform: `translateY(${headY}px)` }}>
              Checks drift, changed files,<br />proof gaps, and continuation.
            </h2>
          </div>
          <div style={{ opacity: termOp, transform: `scale(${termSc})`, transformOrigin: "left top" }}>
            <TerminalCard title="runtrim — terminal" lines={FINISH_LINES} charRevealed={charRevealed} width={tw} mode={mode} frame={frame} />
          </div>
        </div>

        {/* Checklist */}
        <div style={{ maxWidth: isLandscape ? 380 : tw }}>
          <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: isLandscape ? 28 : 22 }}>
            {CHECK_ITEMS.map(({ label, color }, i) => {
              const done = checkDone[i];
              return (
                <div key={label} style={{
                  opacity: checkOps[i],
                  transform: `scale(${checkScs[i]})`,
                  transformOrigin: "left center",
                  display: "flex", alignItems: "center", gap: 16,
                  padding: `${isLandscape ? 14 : 11}px 0`,
                }}>
                  {/* Check circle */}
                  <div style={{
                    width: isLandscape ? 26 : 22,
                    height: isLandscape ? 26 : 22,
                    borderRadius: "50%",
                    border: `2px solid ${done ? color : C.textDim}`,
                    background: done ? `${color}1A` : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}>
                    {done && (
                      <div style={{ width: isLandscape ? 10 : 8, height: isLandscape ? 10 : 8, borderRadius: "50%", background: color }} />
                    )}
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: sz("monoSm", mode), color: done ? C.text : C.textDim, transition: "color 0.15s ease" }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
