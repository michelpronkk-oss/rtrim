import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";

interface Props {
  tagline?: string;
  items?: string[];
  scale?: number;
}

const DEFAULT_ITEMS = [
  "No code uploaded",
  "No repo access required",
  "No cloud dependency",
  "Opt-in sync only",
];

export function LocalFirstBadge({ tagline = "Source stays local", items = DEFAULT_ITEMS, scale = 1 }: Props) {
  const s = (n: number) => Math.round(n * scale);

  return (
    <div style={{
      background: "#060610",
      border: `1px solid rgba(77,232,176,0.22)`,
      borderRadius: s(12),
      overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(77,232,176,0.06), 0 20px 50px rgba(0,0,0,0.5)",
      fontFamily: FONT_MONO,
    }}>
      {/* Header */}
      <div style={{
        padding: `${s(14)}px ${s(20)}px`,
        borderBottom: `1px solid rgba(77,232,176,0.12)`,
        background: "rgba(77,232,176,0.04)",
        display: "flex",
        alignItems: "center",
        gap: s(10),
      }}>
        {/* Shield icon approximation */}
        <svg width={s(18)} height={s(20)} viewBox="0 0 18 20" fill="none">
          <path d="M9 1L2 4v6c0 4.4 3 8.5 7 9.5C13 18.5 16 14.4 16 10V4L9 1z" stroke="#4DE8B0" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: s(13), color: "#4DE8B0", fontWeight: 600, letterSpacing: "0.04em", fontFamily: FONT_SANS }}>
          {tagline}
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: `${s(14)}px ${s(20)}px`, display: "flex", flexDirection: "column", gap: s(10) }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: s(10) }}>
            <div style={{
              width: s(14), height: s(14),
              borderRadius: "50%",
              border: "1.5px solid rgba(77,232,176,0.5)",
              background: "rgba(77,232,176,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width={s(7)} height={s(6)} viewBox="0 0 7 6" fill="none">
                <path d="M1 3l2 2 3-4" stroke="#4DE8B0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: s(13), color: C.textSub, fontFamily: FONT_SANS }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
