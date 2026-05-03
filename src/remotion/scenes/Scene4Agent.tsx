import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, easeOut, slideY, spring, scaleFrom } from "../styles";
import { AgentPill } from "../components/Pill";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

const AGENTS = [
  { name: "Claude Code", color: C.mint   },
  { name: "Codex CLI",   color: C.blue   },
  { name: "Cursor",      color: C.accent },
  { name: "Any agent",   color: C.textSub},
];

export function Scene4Agent({ frame, mode }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);

  const headOp  = easeOut(frame, 4, 22);
  const headY   = slideY(frame, 4, 26, 22);
  const subOp   = easeOut(frame, 20, 20);

  const agentOps = AGENTS.map((_, i) => spring(frame, 28 + i * 12, 26));
  const agentScs = AGENTS.map((_, i) => scaleFrom(frame, 28 + i * 12, 0.88, 26));

  const arrowOp  = easeOut(frame, 72, 20);
  const centerOp = spring(frame, 80, 28);
  const centerSc = scaleFrom(frame, 80, 0.88, 28);

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Subtle center ambient */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 500, height: 500,
        background: `radial-gradient(ellipse, ${C.accent}10 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 1400, padding: `0 ${ph}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: isLandscape ? 52 : 40 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 16px" }}>
            03 / Bring your agent
          </p>
          <h2 style={{ fontFamily: FONT_SANS, fontSize: sz("h1", mode), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, margin: "0 0 16px", opacity: headOp, transform: `translateY(${headY}px)` }}>
            Paste the guarded prompt into<br />Claude, Codex, Cursor, or your agent.
          </h2>
          <p style={{ fontFamily: FONT_SANS, fontSize: sz("body", mode), color: C.textSub, margin: 0, opacity: subOp }}>
            The agent gets memory, scope, and stop conditions.
          </p>
        </div>

        {/* Agent layout */}
        <div style={{
          display: "flex",
          flexDirection: isLandscape ? "row" : "column",
          alignItems: "center",
          gap: isLandscape ? 32 : 20,
          width: "100%",
          justifyContent: "center",
        }}>
          {/* Agent pills — 2×2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isLandscape ? 14 : 10 }}>
            {AGENTS.map(({ name, color }, i) => (
              <div key={name} style={{ opacity: agentOps[i], transform: `scale(${agentScs[i]})`, transformOrigin: "center" }}>
                <AgentPill name={name} color={color} mode={mode} />
              </div>
            ))}
          </div>

          {/* Arrow connector */}
          <div style={{ opacity: arrowOp, display: "flex", flexDirection: isLandscape ? "row" : "column", alignItems: "center", gap: 0 }}>
            <div style={{ width: isLandscape ? 60 : 1, height: isLandscape ? 1 : 36, background: `linear-gradient(${isLandscape ? "90deg" : "180deg"}, ${C.textDim}80, ${C.mint}70)` }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: `${C.mint}90`, lineHeight: 1, margin: isLandscape ? "0 4px 0 0" : "2px 0 0 0" }}>
              {isLandscape ? "▶" : "▼"}
            </span>
          </div>

          {/* RunTrim center chip */}
          <div style={{
            opacity: centerOp,
            transform: `scale(${centerSc})`,
            transformOrigin: "center",
            padding: isLandscape ? "18px 30px" : "14px 24px",
            borderRadius: 12,
            border: `1px solid ${C.accent}55`,
            background: `${C.accent}14`,
            textAlign: "center",
          }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              protocol
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: sz("h2", mode), color: C.accent, fontWeight: 700, letterSpacing: "-0.02em" }}>
              RunTrim
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
