import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_SANS, VideoMode, sz, padH, easeOut, slideY, scaleFrom, spring } from "../styles";
import { Pill } from "../components/Pill";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

export function Scene1Intro({ frame, mode }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);

  const brandOp  = easeOut(frame, 0, 20);
  const head1Op  = easeOut(frame, 8, 24);
  const head1Y   = slideY(frame, 8, 28, 24);
  const head2Op  = easeOut(frame, 22, 24);
  const head2Y   = slideY(frame, 22, 28, 24);
  const subOp    = easeOut(frame, 38, 22);
  const subY     = slideY(frame, 38, 14, 22);
  const pill1Op  = spring(frame, 54, 26);
  const pill2Op  = spring(frame, 64, 26);
  const pill3Op  = spring(frame, 74, 26);
  const pill1Sc  = scaleFrom(frame, 54, 0.88, 26);
  const pill2Sc  = scaleFrom(frame, 64, 0.88, 26);
  const pill3Sc  = scaleFrom(frame, 74, 0.88, 26);
  const accentLn = easeOut(frame, 4, 40);

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Subtle ambient depth — not a blob */}
      <div style={{
        position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)",
        width: isLandscape ? 900 : 600, height: isLandscape ? 400 : 300,
        background: `radial-gradient(ellipse, ${C.accent}16 0%, ${C.accent}06 45%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 5%, ${C.accent}80 40%, ${C.mint}60 60%, transparent 95%)`,
        opacity: accentLn,
      }} />

      <div style={{ textAlign: "center", padding: `0 ${ph}px`, maxWidth: isLandscape ? 1100 : 860, width: "100%" }}>
        {/* Brand label */}
        <div style={{ opacity: brandOp, marginBottom: isLandscape ? 32 : 26, display: "flex", justifyContent: "center" }}>
          <Pill label="RunTrim" color={C.accent} mode={mode} />
        </div>

        {/* Headline — two lines stagger */}
        <div style={{ fontFamily: FONT_SANS, fontSize: sz("display", mode), fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.0, color: C.text, opacity: head1Op, transform: `translateY(${head1Y}px)` }}>
          The control layer
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: sz("display", mode), fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.0, color: C.mint, opacity: head2Op, transform: `translateY(${head2Y}px)`, marginTop: 6 }}>
          for AI coding agents.
        </div>

        {/* Sub */}
        <p style={{ fontFamily: FONT_SANS, fontSize: sz("body", mode), color: C.textSub, lineHeight: 1.65, margin: `${isLandscape ? 28 : 22}px auto 0`, maxWidth: isLandscape ? 680 : 540, opacity: subOp, transform: `translateY(${subY}px)` }}>
          Run Claude, Codex, Cursor, and other agents<br />through one guarded protocol.
        </p>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: isLandscape ? 44 : 36, flexWrap: "wrap" }}>
          {[
            { label: "memory",  color: C.mint,   op: pill1Op, sc: pill1Sc },
            { label: "scope",   color: C.accent, op: pill2Op, sc: pill2Sc },
            { label: "control", color: C.blue,   op: pill3Op, sc: pill3Sc },
          ].map(({ label, color, op, sc }) => (
            <div key={label} style={{ opacity: op, transform: `scale(${sc})`, transformOrigin: "center" }}>
              <Pill label={label} color={color} mode={mode} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}
