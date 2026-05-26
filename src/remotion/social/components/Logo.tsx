import React from "react";
import { C, FONT_SANS } from "../../styles";

interface Props {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
}

export function Logo({ size = 28, showWordmark = true, wordmarkSize }: Props) {
  const ws = wordmarkSize ?? Math.round(size * 0.57);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.32) }}>
      {/* Exact paths from src/app/icon.svg — no background rect */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        style={{ flexShrink: 0, display: "block" }}
      >
        {/* Violet diagonal leg */}
        <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill="#a78bfa" />
        {/* R body — white, counter punched out via evenodd */}
        <path
          fillRule="evenodd"
          d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z"
          fill="#f4f5f7"
        />
      </svg>
      {showWordmark && (
        <span style={{
          fontFamily: FONT_SANS,
          fontSize: ws,
          fontWeight: 700,
          color: C.text,
          letterSpacing: "-0.02em",
        }}>
          RunTrim
        </span>
      )}
    </div>
  );
}
