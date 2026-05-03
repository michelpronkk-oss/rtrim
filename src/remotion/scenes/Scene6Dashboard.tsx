import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, cardW, easeOut, slideY, spring, scaleFrom } from "../styles";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

const STATS = [
  { label: "synced runs",  value: "59",     accent: false },
  { label: "tokens saved", value: "~847k",  accent: true  },
  { label: "cost saved",   value: "~$4.12", accent: true  },
  { label: "risk reduced", value: "45%",    accent: false },
];

const RUNS = [
  { label: "fix mobile nav",       status: "guarded",  color: C.accent },
  { label: "auth flow scope check", status: "passed",   color: C.mint   },
  { label: "billing refactor",      status: "partial",  color: C.amber  },
];

export function Scene6Dashboard({ frame, mode, width, height }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);
  const dw = cardW("dashboard", mode, width);

  const labelOp   = easeOut(frame, 0, 20);
  const headOp    = easeOut(frame, 6, 24);
  const headY     = slideY(frame, 6, 26, 24);
  const subOp     = easeOut(frame, 22, 20);

  const cardOp    = spring(frame, 18, 30);
  const cardSc    = scaleFrom(frame, 18, 0.96, 30);

  const statOps   = STATS.map((_, i) => easeOut(frame, 32 + i * 10, 20));
  const runOps    = RUNS.map((_, i) => easeOut(frame, 52 + i * 10, 18));
  const runYs     = RUNS.map((_, i) => slideY(frame, 52 + i * 10, 10, 18));
  const syncOp    = easeOut(frame, 82, 16);

  return (
    <AbsoluteFill style={{ background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex",
        flexDirection: isLandscape ? "row" : "column",
        alignItems: isLandscape ? "center" : "center",
        gap: isLandscape ? 72 : 40,
        padding: `0 ${ph}px`,
        width: "100%",
        maxWidth: 1600,
      }}>
        {/* Text side */}
        <div style={{ flexShrink: 0, maxWidth: isLandscape ? 420 : dw }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px", opacity: labelOp }}>
            05 / Auto-sync
          </p>
          <h2 style={{ fontFamily: FONT_SANS, fontSize: isLandscape ? sz("h1", mode) : sz("h2", mode), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, margin: "0 0 16px", opacity: headOp, transform: `translateY(${headY}px)` }}>
            Every run<br />becomes history.
          </h2>
          <p style={{ fontFamily: FONT_SANS, fontSize: sz("body", mode), color: C.textSub, lineHeight: 1.65, margin: 0, opacity: subOp }}>
            Reports, savings, memory, and continuation<br />sync to your dashboard.
          </p>
        </div>

        {/* Dashboard mock card */}
        <div style={{ opacity: cardOp, transform: `scale(${cardSc})`, transformOrigin: isLandscape ? "left center" : "center top", flexShrink: 0, width: dw }}>
          <div style={{
            borderRadius: 14,
            border: `1px solid ${C.borderMid}`,
            background: C.surface,
            overflow: "hidden",
            boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 50px ${C.accent}0C`,
          }}>
            {/* Top accent */}
            <div style={{ height: 2, background: `linear-gradient(90deg, ${C.accent}90, ${C.mint}60, transparent)` }} />

            {/* Header */}
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.mint }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>runtrim dashboard</span>
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode) - 1, color: C.mint, letterSpacing: "0.08em" }}>SYNCED</span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: C.border }}>
              {STATS.map(({ label, value, accent }, i) => (
                <div key={label} style={{ background: C.surface, padding: isLandscape ? "18px 20px" : "14px 16px", opacity: statOps[i] }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode) - 2, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: isLandscape ? 28 : 22, fontWeight: 700, color: accent ? C.mint : C.text, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Run list */}
            <div style={{ padding: "4px 0" }}>
              {RUNS.map(({ label, status, color }, i) => (
                <div key={label} style={{
                  opacity: runOps[i],
                  transform: `translateY(${runYs[i]}px)`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  padding: isLandscape ? "12px 22px" : "10px 18px",
                  borderBottom: i < RUNS.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: sz("monoSm", mode), color: C.textSub }}>{label}</span>
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color, letterSpacing: "0.08em", textTransform: "uppercase", border: `1px solid ${color}35`, background: `${color}12`, padding: "3px 10px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ opacity: syncOp, padding: isLandscape ? "10px 22px" : "8px 18px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode) - 1, color: C.textDim }}>auto-sync completed</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
