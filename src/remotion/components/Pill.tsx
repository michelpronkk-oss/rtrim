import React from "react";
import { C, FONT_MONO, VideoMode, sz } from "../styles";

interface Props {
  label:    string;
  color?:   string;
  mode?:    VideoMode;
  dot?:     boolean;
}

export function Pill({ label, color = C.accent, mode = "landscape", dot = true }: Props) {
  const fSize = sz("label", mode);
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "6px 14px",
      borderRadius: 6,
      border: `1px solid ${color}45`,
      background: `${color}16`,
      fontFamily: FONT_MONO,
      fontSize: fSize,
      color,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {dot && (
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      )}
      {label}
    </div>
  );
}

/** Large agent / identity pill — more prominent */
export function AgentPill({ name, color, mode = "landscape" }: { name: string; color: string; mode?: VideoMode }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 22px",
      borderRadius: 10,
      border: `1px solid ${color}38`,
      background: `${color}12`,
      fontFamily: FONT_MONO,
      fontSize: sz("monoSm", mode),
      color,
      fontWeight: 500,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      minWidth: 180,
      justifyContent: "center",
    }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {name}
    </div>
  );
}
