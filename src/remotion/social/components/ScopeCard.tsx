import React from "react";
import { C, FONT_MONO, FONT_SANS } from "../../styles";

interface Props {
  task: string;
  paths: string[];
  status?: "active" | "finished";
  scale?: number;
}

export function ScopeCard({ task, paths, status = "active", scale = 1 }: Props) {
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
      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${s(13)}px ${s(20)}px`,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
          <span style={{ fontSize: s(11), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Contract
          </span>
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: s(6),
          background: status === "active" ? "rgba(124,109,250,0.10)" : "rgba(77,232,176,0.10)",
          border: `1px solid ${status === "active" ? "rgba(124,109,250,0.28)" : "rgba(77,232,176,0.28)"}`,
          borderRadius: s(5),
          padding: `${s(4)}px ${s(9)}px`,
          fontSize: s(10),
          color: status === "active" ? "#9E91FF" : "#4DE8B0",
          letterSpacing: "0.07em",
        }}>
          <div style={{
            width: s(5), height: s(5),
            borderRadius: "50%",
            background: status === "active" ? "#9E91FF" : "#4DE8B0",
          }} />
          {status}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: `${s(18)}px ${s(20)}px`, display: "flex", flexDirection: "column", gap: s(16) }}>
        {/* Task */}
        <div>
          <div style={{ fontSize: s(10), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: s(6) }}>
            Task
          </div>
          <div style={{ fontSize: s(14), color: C.text, fontFamily: FONT_SANS, lineHeight: 1.4 }}>
            {task}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border }} />

        {/* Allowed paths */}
        <div>
          <div style={{ fontSize: s(10), color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: s(8) }}>
            Allowed paths
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: s(5) }}>
            {paths.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: s(8) }}>
                <div style={{
                  width: s(5), height: s(5),
                  borderRadius: "50%",
                  background: C.accent,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: s(13), color: "#9E91FF" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
