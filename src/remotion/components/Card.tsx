import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../styles";

interface CardRowProps {
  label: string;
  value: string;
  valueColor?: string;
  fontSize?: number;
}

export function CardRow({ label, value, valueColor = C.text, fontSize = 13 }: CardRowProps) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 24,
      padding: "9px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: FONT_MONO, fontSize, color: valueColor, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

interface ContractCardProps {
  rows: { label: string; value: string; color?: string }[];
  title?: string;
  width?: number | string;
  fontSize?: number;
}

export function ContractCard({ rows, title = "run contract", width = 380, fontSize = 13 }: ContractCardProps) {
  return (
    <div style={{
      width,
      borderRadius: 10,
      border: `1px solid ${C.borderMid}`,
      background: C.surface,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 18px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint }} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "4px 18px 12px" }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 20,
              padding: "8px 0",
              borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>
              {row.label}
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize, color: row.color ?? C.text, fontWeight: 500 }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  stats: { label: string; value: string; accent?: boolean }[];
  title?: string;
  width?: number | string;
}

export function StatCard({ stats, title = "dashboard", width = 360 }: StatCardProps) {
  return (
    <div style={{
      width,
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.surface,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.mint }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.mint, letterSpacing: "0.08em" }}>LIVE</span>
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        background: C.border,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: C.surface, padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, fontWeight: 700, color: s.accent ? C.mint : C.text, marginTop: 6 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
