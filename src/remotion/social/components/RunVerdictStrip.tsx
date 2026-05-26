import React from "react";
import { C, FONT_MONO } from "../../styles";
import { VerdictBadge, Verdict } from "./VerdictBadge";

interface Props {
  verdict?: Verdict;
  url?: string;
  tagline?: string;
  scale?: number;
}

export function RunVerdictStrip({
  verdict,
  url = "runtrim.com",
  tagline = "source stays local",
  scale = 1,
}: Props) {
  const s = (n: number) => Math.round(n * scale);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: FONT_MONO,
    }}>
      {/* Left: URL · tagline */}
      <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
        <span style={{ fontSize: s(13), color: C.textSub, fontWeight: 600 }}>{url}</span>
        {tagline && (
          <>
            <span style={{ fontSize: s(11), color: C.textDim }}>·</span>
            <span style={{ fontSize: s(12), color: C.textDim }}>{tagline}</span>
          </>
        )}
      </div>

      {/* Right: verdict badge */}
      {verdict && <VerdictBadge verdict={verdict} size={s(13)} />}
    </div>
  );
}
