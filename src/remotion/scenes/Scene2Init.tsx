import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_MONO, FONT_SANS, VideoMode, sz, padH, cardW, easeOut, slideY, spring, scaleFrom } from "../styles";
import { TerminalCard } from "../components/TerminalCard";

interface Props { frame: number; mode: VideoMode; width: number; height: number; }

const INIT_LINES = [
  { kind: "prompt"  as const, text: "runtrim init" },
  { kind: "blank"   as const, text: "" },
  { kind: "dim"     as const, text: "  installing protocol..." },
  { kind: "dim"     as const, text: "  RUNTRIM.md" },
  { kind: "dim"     as const, text: "  .runtrim/policies.json" },
  { kind: "dim"     as const, text: "  .runtrim/memory/baseline.md" },
  { kind: "blank"   as const, text: "" },
  { kind: "success" as const, text: "  protocol installed" },
];

const FILES = [
  { name: "RUNTRIM.md",                  note: "agent instructions"  },
  { name: ".runtrim/policies.json",       note: "run policies"        },
  { name: ".runtrim/memory/baseline.md",  note: "project memory"      },
];

export function Scene2Init({ frame, mode, width, height }: Props) {
  const isLandscape = mode === "landscape";
  const ph = padH(mode);
  const tw = cardW("terminal", mode, width);

  const labelOp  = easeOut(frame, 0, 20);
  const headOp   = easeOut(frame, 6, 22);
  const headY    = slideY(frame, 6, 24, 22);
  const termOp   = easeOut(frame, 14, 22);
  const termSc   = scaleFrom(frame, 14, 0.97, 22);

  // Char-by-char typing: 1.5 chars/frame starting at frame 14
  // "runtrim init" = 12 chars → prompt done at ~frame 22
  // Then output lines flush (every OUTPUT_WEIGHT=7 char units ≈ 5 frames each)
  const charRevealed = Math.max(0, (frame - 14) * 1.5);

  const fileOps = FILES.map((_, i) => spring(frame, 30 + i * 12, 24));
  const fileScs = FILES.map((_, i) => scaleFrom(frame, 30 + i * 12, 0.90, 24));

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
        {/* Terminal — hero visual */}
        <div style={{ opacity: termOp, transform: `scale(${termSc})`, transformOrigin: "left center", flexShrink: 0 }}>
          <TerminalCard
            title="runtrim — terminal"
            lines={INIT_LINES}
            charRevealed={charRevealed}
            width={tw}
            mode={mode}
            frame={frame}
          />
        </div>

        {/* Text side */}
        <div style={{ maxWidth: isLandscape ? 400 : tw }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px", opacity: labelOp }}>
            01 / Initialize
          </p>
          <h2 style={{ fontFamily: FONT_SANS, fontSize: sz("h1", mode), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, margin: "0 0 24px", opacity: headOp, transform: `translateY(${headY}px)` }}>
            Installs the protocol<br />into your repo.
          </h2>

          {/* File list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FILES.map(({ name, note }, i) => (
              <div key={name} style={{ opacity: fileOps[i], transform: `scale(${fileScs[i]})`, transformOrigin: "left center", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 4, width: 5, height: 5, borderRadius: "50%", background: C.mint, flexShrink: 0 }} />
                <div>
                  <code style={{ fontFamily: FONT_MONO, fontSize: sz("monoSm", mode), color: C.text, display: "block" }}>{name}</code>
                  <span style={{ fontFamily: FONT_MONO, fontSize: sz("label", mode), color: C.textDim }}>{note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
