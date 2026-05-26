import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";

export interface Snapshot {
  label: string;
  time: string;
  files: number;
  isCurrent?: boolean;
  isRisk?: boolean;
}

interface Props {
  snapshots: Snapshot[];
  scale?: number;
}

export function RestoreCard({ snapshots, scale = 1 }: Props) {
  const s = (n: number) => Math.round(n * scale);

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
        gap: s(10),
        padding: `${s(13)}px ${s(20)}px`,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{ fontSize: s(11), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Restore
        </span>
        <span style={{ fontSize: s(11), color: C.textDim }}>·</span>
        <span style={{ fontSize: s(11), color: C.textSub }}>pick a point</span>
      </div>

      {/* Snapshots */}
      <div style={{ padding: `${s(8)}px 0` }}>
        {snapshots.map((snap, i) => {
          const isFirst = i === 0;
          const isLast  = i === snapshots.length - 1;
          const dotColor = snap.isRisk
            ? "#FF6B6B"
            : snap.isCurrent
            ? "#4DE8B0"
            : isFirst
            ? C.accent
            : C.textDim;

          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: s(12),
              padding: `${s(10)}px ${s(20)}px`,
              background: snap.isCurrent ? "rgba(77,232,176,0.04)" : snap.isRisk ? "rgba(255,107,107,0.04)" : "transparent",
            }}>
              {/* Timeline dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: s(14) }}>
                <div style={{
                  width: s(8), height: s(8),
                  borderRadius: "50%",
                  background: dotColor,
                  boxShadow: (snap.isCurrent || snap.isRisk) ? `0 0 ${s(8)}px ${dotColor}80` : "none",
                  flexShrink: 0,
                }} />
              </div>

              {/* Label + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: s(13),
                  color: snap.isRisk ? "#FF6B6B" : snap.isCurrent ? C.text : C.textSub,
                  fontFamily: FONT_SANS,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {snap.label}
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", alignItems: "center", gap: s(16), flexShrink: 0 }}>
                <span style={{ fontSize: s(11), color: C.textDim }}>{snap.time}</span>
                <span style={{ fontSize: s(11), color: C.textDim, minWidth: s(40), textAlign: "right" }}>
                  {snap.files > 0 ? `${snap.files} files` : "—"}
                </span>
                {(snap.isCurrent || snap.isRisk) && (
                  <span style={{
                    fontSize: s(9),
                    color: snap.isRisk ? "#FF6B6B" : "#4DE8B0",
                    background: snap.isRisk ? "rgba(255,107,107,0.12)" : "rgba(77,232,176,0.12)",
                    border: `1px solid ${snap.isRisk ? "rgba(255,107,107,0.25)" : "rgba(77,232,176,0.25)"}`,
                    borderRadius: s(4),
                    padding: `${s(2)}px ${s(6)}px`,
                    letterSpacing: "0.06em",
                  }}>
                    {snap.isRisk ? "RISK" : "HEAD"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
