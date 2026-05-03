import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, cardW, easeOut, slideY, slideX, spring, scaleFrom } from "../styles";
import { TerminalCard } from "../components/TerminalCard";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

const GO_LINES = [
  { kind: "prompt"  as const, text: 'runtrim go "fix mobile nav"' },
  { kind: "blank"   as const, text: "" },
  { kind: "dim"     as const, text: "  loading memory..." },
  { kind: "dim"     as const, text: "  scoping contract..." },
  { kind: "success" as const, text: "  contract ready" },
];

const CONTRACT_ROWS = [
  { label: "risk",      value: "low",                     color: C.mint   },
  { label: "budget",    value: "10,000 tokens",            color: C.text   },
  { label: "allowed",   value: "app/navigation  app/ui",   color: C.blue   },
  { label: "forbidden", value: "auth  env  billing  db",   color: C.amber  },
];

export function Scene3Contract({ frame, mode, width, height }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);
  const tw = cardW("terminal", mode, width);
  const cw = isLandscape ? cardW("contract", mode, width) : tw;

  const labelOp   = easeOut(frame, 0, 20);
  const headOp    = easeOut(frame, 6, 22);
  const headY     = slideY(frame, 6, 24, 22);
  const termOp    = easeOut(frame, 12, 20);
  const termSc    = scaleFrom(frame, 12, 0.97, 20);

  const cardOp    = spring(frame, 28, 28);
  const cardX     = isLandscape ? slideX(frame, 28, 40, 28) : 0;
  const cardY     = isLandscape ? 0 : slideY(frame, 28, 30, 28);
  const cardSc    = scaleFrom(frame, 28, 0.95, 28);

  // Char-by-char: 'runtrim go "fix mobile nav"' = 26 chars → done at ~frame 29
  const charRevealed = Math.max(0, (frame - 12) * 1.5);
  const rowOps    = CONTRACT_ROWS.map((_, i) => easeOut(frame, 40 + i * 10, 18));

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex",
        flexDirection: isLandscape ? "row" : "column",
        alignItems: isLandscape ? "flex-start" : "center",
        gap: isLandscape ? 64 : 36,
        padding: `0 ${ph}px`,
        width: "100%",
        maxWidth: 1600,
      }}>
        {/* Left: label + heading + terminal */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: isLandscape ? 22 : 18 }}>
          <div>
            <p style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px", opacity: labelOp }}>
              02 / Scope
            </p>
            <h2 style={{ fontFamily: FONT_SANS, fontSize: sz("h1", mode), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, margin: 0, maxWidth: isLandscape ? 480 : tw, opacity: headOp, transform: `translateY(${headY}px)` }}>
              Creates the scoped contract<br />before the agent touches code.
            </h2>
          </div>
          <div style={{ opacity: termOp, transform: `scale(${termSc})`, transformOrigin: "left top" }}>
            <TerminalCard title="runtrim — terminal" lines={GO_LINES} charRevealed={charRevealed} width={isLandscape ? Math.min(tw, 620) : tw} mode={mode} frame={frame} />
          </div>
        </div>

        {/* Right: contract card with per-row reveal */}
        <div style={{ opacity: cardOp, transform: `translate(${cardX}px, ${cardY}px) scale(${cardSc})`, transformOrigin: isLandscape ? "left center" : "center top", flexShrink: 0 }}>
          <div style={{
            width: cw,
            borderRadius: 12,
            border: `1px solid ${C.borderMid}`,
            background: C.surface,
            overflow: "hidden",
            boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${C.mint}0A`,
          }}>
            {/* Mint top accent */}
            <div style={{ height: 2, background: `linear-gradient(90deg, ${C.mint}90, ${C.accent}60, transparent)` }} />

            {/* Header */}
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.mint }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>run contract</span>
            </div>

            {/* Rows */}
            <div style={{ padding: "8px 22px 16px" }}>
              {CONTRACT_ROWS.map((row, i) => (
                <div key={i} style={{
                  opacity: rowOps[i],
                  transform: `translateX(${(1 - rowOps[i]) * 16}px)`,
                  display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24,
                  padding: "12px 0",
                  borderBottom: i < CONTRACT_ROWS.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
                    {row.label}
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: sz("monoSm", mode), color: row.color, fontWeight: 600 }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
