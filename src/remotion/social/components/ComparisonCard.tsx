import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";

interface Props {
  leftLabel?: string;
  leftText: string;
  rightLabel?: string;
  rightText: string;
  scale?: number;
}

export function ComparisonCard({
  leftLabel = "git",
  leftText,
  rightLabel = "runtrim",
  rightText,
  scale = 1,
}: Props) {
  const s = (n: number) => Math.round(n * scale);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: s(2),
      borderRadius: s(12),
      overflow: "hidden",
      border: `1px solid ${C.borderMid}`,
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    }}>
      {/* Left — git */}
      <div style={{
        background: "#060610",
        padding: `${s(20)}px ${s(22)}px`,
        borderRight: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: s(10),
          color: C.textDim,
          fontFamily: FONT_MONO,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: s(12),
        }}>
          {leftLabel}
        </div>
        <div style={{
          fontSize: s(15),
          color: C.textSub,
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
        }}>
          {leftText}
        </div>
      </div>

      {/* Right — runtrim */}
      <div style={{
        background: "rgba(124,109,250,0.06)",
        padding: `${s(20)}px ${s(22)}px`,
      }}>
        <div style={{
          fontSize: s(10),
          color: "#9E91FF80",
          fontFamily: FONT_MONO,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: s(12),
        }}>
          {rightLabel}
        </div>
        <div style={{
          fontSize: s(15),
          color: C.text,
          fontFamily: FONT_MONO,
          lineHeight: 1.5,
        }}>
          {rightText}
        </div>
      </div>
    </div>
  );
}
