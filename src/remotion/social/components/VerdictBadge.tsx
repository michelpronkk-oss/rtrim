import React from "react";
import { FONT_MONO } from "../../styles";

export type Verdict = "PASS" | "WARN" | "BLOCKED";

const CFG: Record<Verdict, { color: string; bg: string; border: string }> = {
  PASS:    { color: "#4DE8B0", bg: "rgba(77,232,176,0.10)",  border: "rgba(77,232,176,0.28)"  },
  WARN:    { color: "#F0BF72", bg: "rgba(240,191,114,0.10)", border: "rgba(240,191,114,0.28)" },
  BLOCKED: { color: "#FF6B6B", bg: "rgba(255,107,107,0.10)", border: "rgba(255,107,107,0.28)" },
};

interface Props {
  verdict: Verdict;
  size?: number;
}

export function VerdictBadge({ verdict, size = 14 }: Props) {
  const c   = CFG[verdict];
  const px  = Math.round(size * 0.86);
  const py  = Math.round(size * 0.44);
  const dot = Math.round(size * 0.5);
  const r   = Math.round(size * 0.55);
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: Math.round(size * 0.57),
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: r,
      padding: `${py}px ${px}px`,
      fontFamily: FONT_MONO,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: "0.07em",
      color: c.color,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      <div style={{
        width: dot, height: dot,
        borderRadius: "50%",
        background: c.color,
        boxShadow: `0 0 ${dot * 1.6}px ${c.color}70`,
        flexShrink: 0,
      }} />
      {verdict}
    </div>
  );
}
