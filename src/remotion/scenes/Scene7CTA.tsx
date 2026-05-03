import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, easeOut, slideY, spring, scaleFrom } from "../styles";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

export function Scene7CTA({ frame, mode, width, height }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);

  // Background elements
  const bgOp    = easeOut(frame, 0, 30);

  // Headline: each word group slides up independently
  const w1Op    = easeOut(frame, 6, 22);
  const w1Y     = slideY(frame, 6, 30, 22);
  const w2Op    = easeOut(frame, 18, 22);
  const w2Y     = slideY(frame, 18, 30, 22);
  const w3Op    = easeOut(frame, 30, 24);
  const w3Y     = slideY(frame, 30, 30, 24);

  // Supporting elements
  const lineOp  = easeOut(frame, 36, 18);
  const urlOp   = spring(frame, 46, 28);
  const urlSc   = scaleFrom(frame, 46, 0.90, 28);
  const cmdOp   = spring(frame, 58, 28);
  const cmdSc   = scaleFrom(frame, 58, 0.90, 28);

  // Decorative accent lines
  const accentOp = easeOut(frame, 2, 35);

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

      {/* Background depth — two overlapping radials for richness */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse ${isLandscape ? "70% 65%" : "90% 70%"} at 50% 50%, ${C.accent}1A 0%, ${C.mint}0A 40%, transparent 70%)`,
        opacity: bgOp,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: isLandscape ? -80 : -60,
        left: "50%",
        transform: "translateX(-50%)",
        width: isLandscape ? 1200 : 800,
        height: isLandscape ? 500 : 380,
        background: `radial-gradient(ellipse, ${C.mint}14 0%, ${C.accent}08 45%, transparent 72%)`,
        opacity: bgOp,
        pointerEvents: "none",
      }} />

      {/* Horizontal accent lines — top and bottom */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${C.accent}70 30%, ${C.mint}80 55%, ${C.accent}50 75%, transparent 100%)`,
        opacity: accentOp,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 10%, ${C.mint}50 40%, ${C.accent}40 60%, transparent 90%)`,
        opacity: accentOp * 0.6,
      }} />

      {/* Main content */}
      <div style={{
        textAlign: "center",
        padding: `0 ${ph}px`,
        width: "100%",
        maxWidth: isLandscape ? 1200 : 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}>

        {/* Line 1: "Bring your own agent." */}
        <div style={{
          fontFamily: FONT_SANS,
          fontSize: sz("display", mode),
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          color: "#FFFFFF",   // pure white — max brightness
          opacity: w1Op,
          transform: `translateY(${w1Y}px)`,
          textShadow: "0 0 60px rgba(255,255,255,0.06)",
        }}>
          Bring your own agent.
        </div>

        {/* Line 2a: "Run it through" — white */}
        <div style={{
          fontFamily: FONT_SANS,
          fontSize: sz("display", mode),
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          color: "#FFFFFF",
          opacity: w2Op,
          transform: `translateY(${w2Y}px)`,
          marginTop: 4,
        }}>
          Run it through{" "}
          {/* "RunTrim first." — mint */}
          <span style={{
            color: C.mint,
            opacity: w3Op,
            display: "inline",
          }}>
            RunTrim first.
          </span>
        </div>

        {/* Separator */}
        <div style={{
          width: isLandscape ? 56 : 40,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
          margin: `${isLandscape ? 44 : 36}px auto ${isLandscape ? 28 : 22}px`,
          opacity: lineOp,
        }} />

        {/* Domain pill */}
        <div style={{
          opacity: urlOp,
          transform: `scale(${urlSc})`,
          transformOrigin: "center",
          marginBottom: isLandscape ? 18 : 14,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 6,
            border: `1px solid rgba(255,255,255,0.12)`,
            background: "rgba(255,255,255,0.04)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: sz("small", mode), color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>
              runtrim.com
            </span>
          </div>
        </div>

        {/* Install command */}
        <div style={{
          opacity: cmdOp,
          transform: `scale(${cmdSc})`,
          transformOrigin: "center",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: isLandscape ? "13px 26px" : "10px 20px",
            borderRadius: 10,
            border: `1px solid rgba(255,255,255,0.14)`,
            background: "rgba(255,255,255,0.05)",
            fontFamily: FONT_MONO,
            fontSize: sz("monoSm", mode),
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
          }}>
            <span style={{ color: "rgba(255,255,255,0.30)" }}>$</span>
            <span style={{ color: C.mint }}>npm install -g runtrim</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
