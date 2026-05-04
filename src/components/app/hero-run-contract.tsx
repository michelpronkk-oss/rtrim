"use client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function Pill({
  variant,
  children,
}: {
  variant?: "scope" | "forbid" | "mem" | "warn";
  children: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 4,
    fontSize: "11.5px",
    ...MONO,
  };
  const map = {
    scope:  { color: "#6ee7b7", borderColor: "rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.06)"  },
    forbid: { color: "#f87171", borderColor: "rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)"  },
    mem:    { color: "#a78bfa", borderColor: "rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.07)"  },
    warn:   { color: "#f5a524", borderColor: "rgba(245,165,36,0.3)",   background: "rgba(245,165,36,0.07)"   },
  };
  const s = variant
    ? map[variant]
    : { color: "#c9ccd2", borderColor: "rgba(255,255,255,0.09)", background: "#16191e" };
  return (
    <span style={{ ...base, border: `1px solid ${s.borderColor}`, background: s.background, color: s.color }}>
      {children}
    </span>
  );
}

function Meter({ pct, mint }: { pct: number; mint?: boolean }) {
  return (
    <span
      style={{
        flex: 1, minWidth: 120, height: 6, background: "#14171c",
        borderRadius: 3, overflow: "hidden", position: "relative",
        border: "1px solid rgba(255,255,255,0.04)", display: "block",
      }}
    >
      <span
        style={{
          display: "block", height: "100%", width: `${pct}%`, borderRadius: 3,
          background: mint
            ? "linear-gradient(90deg, #10b981, #6ee7b7)"
            : "linear-gradient(90deg, #6d4cf2, #a78bfa)",
        }}
      />
    </span>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 16,
        padding: "9px 16px",
        alignItems: "center",
        borderBottom: "1px dashed rgba(255,255,255,0.04)",
        ...MONO,
      }}
    >
      <span style={{ color: "#5a5f68", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {k}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

export function HeroRunContract() {
  return (
    <div style={{ position: "relative" }}>
      {/* Floating badge */}
      <div
        style={{
          position: "absolute", right: 10, top: -14, zIndex: 2,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 6,
          background: "#111317",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 8px 24px -10px rgba(0,0,0,0.8)",
          ...MONO, fontSize: "10.5px", color: "#c9ccd2",
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#6ee7b7",
            boxShadow: "0 0 8px #6ee7b7",
          }}
        />
        Run #4f2a · live
      </div>

      {/* Contract panel */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #0e1116, #0a0c10)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 10,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.03) inset, 0 30px 60px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.4)",
          overflow: "hidden",
          ...MONO,
          fontSize: "12.5px",
          color: "#c9ccd2",
        }}
      >
        {/* Top glow overlay */}
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(167,139,250,0.06), transparent 30%)",
          }}
        />

        {/* Head */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, #14171c, #0d1014)",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: "#2a2e36",
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "block",
                }}
              />
            ))}
          </div>
          <span style={{ color: "#5a5f68", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            runtrim · run contract
          </span>
          <span style={{ marginLeft: "auto", color: "#5a5f68", fontSize: "11px" }}>
            repo <b style={{ color: "#c9ccd2", fontWeight: 500 }}>core/checkout-api</b>
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "6px 0" }}>
          <Row k="Task">
            <span style={{ color: "#f4f5f7" }}>refactor stripe webhook to idempotent queue</span>
          </Row>
          <Row k="Memory">
            <Pill variant="mem">runs/last-3</Pill>
            <Pill variant="mem">repo.map</Pill>
            <Pill variant="mem">conventions.md</Pill>
            <span style={{ color: "#5a5f68", fontSize: "11.5px" }}>14.2k tokens</span>
          </Row>
          <Row k="Allowed scope">
            <Pill variant="scope">api/webhooks/**</Pill>
            <Pill variant="scope">lib/queue/**</Pill>
          </Row>
          <Row k="Forbidden">
            <Pill variant="forbid">.env*</Pill>
            <Pill variant="forbid">migrations/**</Pill>
            <Pill variant="forbid">infra/**</Pill>
          </Row>
          <Row k="Token budget">
            <Meter pct={38} />
            <span style={{ color: "#8a8f98", fontSize: "11.5px", minWidth: 56, textAlign: "right" }}>38k / 100k</span>
          </Row>
          <Row k="Risk">
            <Meter pct={22} mint />
            <span style={{ color: "#6ee7b7", fontSize: "11.5px", minWidth: 56, textAlign: "right" }}>low · 22</span>
          </Row>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 16,
              padding: "9px 16px",
              alignItems: "center",
              ...MONO,
            }}
          >
            <span style={{ color: "#5a5f68", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Finish check
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <Pill>tests pass</Pill>
              <Pill>no forbidden writes</Pill>
              <Pill>diff &lt; 400 lines</Pill>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.012)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "11px", color: "#8a8f98", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            <span
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#6ee7b7",
                boxShadow: "0 0 0 3px rgba(110,231,183,0.14), 0 0 10px rgba(110,231,183,0.4)",
                animation: "rt-contract-pulse 1.8s ease-in-out infinite",
                display: "inline-block",
              }}
            />
            agent: claude-3.7
          </span>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)" }} />
          <span style={{ color: "#5a5f68", fontSize: "11px" }}>
            <b style={{ color: "#c9ccd2", fontWeight: 500 }}>step 4 / 7</b> · writing tests
          </span>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)" }} />
          <span style={{ color: "#5a5f68", fontSize: "11px" }}>
            sync <b style={{ color: "#c9ccd2", fontWeight: 500 }}>cloud · paused</b>
          </span>
        </div>
      </div>

      <style>{`
        @keyframes rt-contract-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.55; transform:scale(0.85); }
        }
      `}</style>
    </div>
  );
}
