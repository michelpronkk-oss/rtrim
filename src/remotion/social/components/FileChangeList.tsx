import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";
import { VerdictBadge, Verdict } from "./VerdictBadge";

export interface FileChange {
  name: string;
  risky?: boolean;
}

interface Props {
  verdict: Verdict;
  files: FileChange[];
  scale?: number;
}

export function FileChangeList({ verdict, files, scale = 1 }: Props) {
  const s = (n: number) => Math.round(n * scale);
  const riskyCount = files.filter((f) => f.risky).length;

  return (
    <div style={{
      background: "#060610",
      border: `1px solid ${C.borderMid}`,
      borderRadius: s(12),
      overflow: "hidden",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily: FONT_MONO,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${s(14)}px ${s(20)}px`,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
          <VerdictBadge verdict={verdict} size={s(13)} />
          <span style={{ fontSize: s(12), color: C.textDim, letterSpacing: "0.04em" }}>
            {files.length} files changed
            {riskyCount > 0 && (
              <span style={{ color: verdict === "BLOCKED" ? "#FF6B6B" : "#F0BF72", marginLeft: s(6) }}>
                · {riskyCount} risky
              </span>
            )}
          </span>
        </div>
      </div>

      {/* File list */}
      <div style={{ padding: `${s(6)}px 0` }}>
        {files.map((f, i) => {
          const isNote = f.name.startsWith("+");
          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: s(10),
              padding: `${s(8)}px ${s(20)}px`,
              opacity: isNote ? 0.5 : 1,
            }}>
              {/* Risk indicator */}
              <div style={{
                width: s(6),
                height: s(6),
                borderRadius: "50%",
                flexShrink: 0,
                background: f.risky
                  ? (verdict === "BLOCKED" ? "#FF6B6B" : "#F0BF72")
                  : isNote ? "transparent" : C.borderHi,
                boxShadow: f.risky ? `0 0 ${s(6)}px ${verdict === "BLOCKED" ? "#FF6B6B" : "#F0BF72"}80` : "none",
              }} />
              <span style={{
                fontSize: s(13),
                color: f.risky ? C.text : isNote ? C.textDim : C.textSub,
                fontFamily: isNote ? FONT_SANS : FONT_MONO,
                fontStyle: isNote ? "italic" : "normal",
              }}>
                {f.name}
              </span>
              {f.risky && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: s(10),
                  color: verdict === "BLOCKED" ? "#FF6B6B80" : "#F0BF7280",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                  risky
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
