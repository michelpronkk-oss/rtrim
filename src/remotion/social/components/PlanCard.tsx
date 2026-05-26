import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";

interface Props {
  plan: string;
  tagline?: string;
  features: string[];
  highlighted?: boolean;
  scale?: number;
}

const PLAN_ACCENT: Record<string, string> = {
  Free:    "#4DE8B0",
  Pro:     "#7C6DFA",
  Builder: "#9E91FF",
  Team:    "#F0BF72",
};

export function PlanCard({ plan, tagline, features, highlighted = false, scale = 1 }: Props) {
  const s      = (n: number) => Math.round(n * scale);
  const accent = PLAN_ACCENT[plan] ?? C.accent;

  return (
    <div style={{
      background: highlighted ? `${accent}08` : "#060610",
      border: `1px solid ${highlighted ? `${accent}35` : C.borderMid}`,
      borderRadius: s(12),
      overflow: "hidden",
      boxShadow: highlighted
        ? `0 0 0 1px ${accent}20, 0 20px 50px rgba(0,0,0,0.5)`
        : "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily: FONT_MONO,
    }}>
      {/* Header */}
      <div style={{
        padding: `${s(18)}px ${s(22)}px ${s(14)}px`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: s(18),
            fontWeight: 700,
            color: accent,
            fontFamily: FONT_SANS,
            letterSpacing: "-0.02em",
          }}>
            {plan}
          </span>
          {/* Left accent bar */}
          <div style={{
            width: s(28),
            height: s(3),
            borderRadius: s(2),
            background: `linear-gradient(90deg, ${accent}, ${accent}40)`,
          }} />
        </div>
        {tagline && (
          <p style={{ fontSize: s(12), color: C.textSub, marginTop: s(5), fontFamily: FONT_SANS }}>
            {tagline}
          </p>
        )}
      </div>

      {/* Features */}
      <div style={{ padding: `${s(14)}px ${s(22)}px ${s(18)}px`, display: "flex", flexDirection: "column", gap: s(10) }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: s(10) }}>
            <div style={{
              width: s(5), height: s(5),
              borderRadius: "50%",
              background: accent,
              flexShrink: 0,
              marginTop: s(5),
            }} />
            <span style={{ fontSize: s(13), color: C.textSub, fontFamily: FONT_SANS, lineHeight: 1.4 }}>
              {f}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
