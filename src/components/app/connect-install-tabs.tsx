"use client";

import { useState } from "react";
import { CopyButton } from "@/components/app/copy-button";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const TABS = [
  {
    label: "npm",
    cmds: ["npm install -g runtrim", "runtrim --version"],
    note: "Requires Node 18+",
  },
  {
    label: "macOS brew",
    cmds: ["brew install runtrim/tap/runtrim", "runtrim --version"],
    note: "Requires macOS 12+ · Node 18+ for MCP mode.",
  },
  {
    label: "Windows",
    cmds: ["npm install -g runtrim", "runtrim --version"],
    note: "Requires Node 18+ on Windows.",
  },
  {
    label: "curl",
    cmds: ["curl -fsSL https://get.runtrim.com | sh", "runtrim --version"],
    note: "Requires macOS or Linux.",
  },
] as const;

export function ConnectInstallTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>install method</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>Pick your platform</span>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 4, padding: "8px 8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#111317" }}>
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            style={{
              padding: "8px 12px",
              ...MONO, fontSize: 12,
              color: active === i ? "#f4f5f7" : "#8a8f98",
              borderRadius: "5px 5px 0 0",
              cursor: "pointer",
              borderBottom: `2px solid ${active === i ? "#a78bfa" : "transparent"}`,
              marginBottom: -1,
              background: active === i ? "#16191e" : "transparent",
              border: "none",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              transition: "color 0.12s, background 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Commands */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {tab.cmds.map((cmd) => (
          <div
            key={cmd}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 7, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", ...MONO, fontSize: 12.5, color: "#c9ccd2" }}
          >
            <span style={{ color: "#a78bfa", flexShrink: 0 }}>$</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd}</span>
            <CopyButton text={cmd} />
          </div>
        ))}
        <p style={{ ...MONO, fontSize: 12, color: "#3a3e46", margin: "4px 0 0", letterSpacing: "0.02em" }}>{tab.note}</p>
      </div>
    </div>
  );
}
