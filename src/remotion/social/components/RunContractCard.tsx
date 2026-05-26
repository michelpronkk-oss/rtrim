import React from "react";
import { FONT_MONO, FONT_SANS } from "../../styles";
import { VerdictBadge, Verdict } from "./VerdictBadge";

export interface ContractData {
  runId?: string;
  task: string;
  allowed: string[];
  forbidden: string[];
  memory?: string[];
  budget?: { used: number; total: number };
  risk?: string;
  finishChecks?: string[];
  verdict?: Verdict | "GUARDED" | "LIVE";
  agent?: string;
  step?: string;
}

interface Props extends ContractData {
  scale?: number;
}

// Inline chip — tighter than before, matches website pill style
function Chip({ text, tone }: { text: string; tone: "allowed" | "forbidden" | "memory" | "neutral" }) {
  const styles = {
    allowed:   { color: "#4DE8B0", bg: "rgba(77,232,176,0.08)",   border: "rgba(77,232,176,0.20)"   },
    forbidden: { color: "#F0BF72", bg: "rgba(240,191,114,0.08)",  border: "rgba(240,191,114,0.20)"  },
    memory:    { color: "#9E91FF", bg: "rgba(124,109,250,0.08)",  border: "rgba(124,109,250,0.20)"  },
    neutral:   { color: "#8890AA", bg: "rgba(255,255,255,0.04)",  border: "rgba(255,255,255,0.10)"  },
  };
  const st = styles[tone];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      background: st.bg,
      border: `1px solid ${st.border}`,
      borderRadius: 4,
      padding: "2px 7px",
      fontFamily: FONT_MONO,
      fontSize: "inherit",
      color: st.color,
      whiteSpace: "nowrap",
      letterSpacing: "0.01em",
    }}>
      {text}
    </span>
  );
}

function Row({
  label, children, scale,
}: {
  label: string; children: React.ReactNode; scale: number;
}) {
  const s = (n: number) => Math.round(n * scale);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: s(16), fontSize: s(12) }}>
      <span style={{
        width: s(68),
        flexShrink: 0,
        fontFamily: FONT_MONO,
        fontSize: s(11),
        color: "#3A4460",
        paddingTop: s(1),
      }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: s(5), alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

export function RunContractCard({
  runId = "RUN#4F2A",
  task,
  allowed,
  forbidden,
  memory = ["runs/last-3", "repo.map", "conventions.md"],
  budget,
  risk = "low",
  finishChecks,
  verdict = "GUARDED",
  agent,
  step,
  scale = 1,
}: Props) {
  const s = (n: number) => Math.round(n * scale);

  const headerBadge = () => {
    if (verdict === "BLOCKED") return <VerdictBadge verdict="BLOCKED" size={s(11)} />;
    if (verdict === "WARN")    return <VerdictBadge verdict="WARN"    size={s(11)} />;
    if (verdict === "PASS")    return <VerdictBadge verdict="PASS"    size={s(11)} />;
    // GUARDED / LIVE — matches website's status badge exactly
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s(5),
        background: "rgba(77,232,176,0.10)",
        border: "1px solid rgba(77,232,176,0.22)",
        borderRadius: s(6),
        padding: `${s(4)}px ${s(10)}px`,
        fontFamily: FONT_MONO,
        fontSize: s(10),
        color: "#9EE6CD",
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        boxShadow: "0 0 12px rgba(77,232,176,0.12)",
      }}>
        <div style={{
          width: s(5), height: s(5), borderRadius: "50%", background: "#4DE8B0",
          boxShadow: "0 0 6px rgba(77,232,176,0.60)",
        }} />
        {verdict === "LIVE" ? `${runId} · live` : "guarded"}
      </div>
    );
  };

  const riskColor = risk === "high" ? "#FF6B6B" : risk === "medium" ? "#F0BF72" : "#4DE8B0";

  return (
    <div style={{
      background: "#0C0C20",
      border: "1px solid rgba(124,109,250,0.20)",
      borderRadius: s(12),
      overflow: "hidden",
      boxShadow: [
        "0 0 0 1px rgba(124,109,250,0.08)",
        "inset 0 1px 0 rgba(124,109,250,0.06)",
        "0 24px 60px rgba(0,0,0,0.60)",
        `0 0 80px rgba(124,109,250,0.06)`,
      ].join(", "),
      fontFamily: FONT_MONO,
    }}>

      {/* Header — matches website title bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${s(14)}px ${s(22)}px`,
        borderBottom: "1px solid rgba(124,109,250,0.10)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
          <div style={{ width: s(6), height: s(6), borderRadius: "50%", background: "#7C6DFA" }} />
          <span style={{
            fontSize: s(10),
            color: "rgba(124,109,250,0.70)",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
          }}>
            RunTrim — Run Contract
          </span>
        </div>
        {headerBadge()}
      </div>

      {/* Fields */}
      <div style={{
        padding: `${s(18)}px ${s(22)}px`,
        display: "flex",
        flexDirection: "column",
        gap: s(13),
        fontSize: s(12),
      }}>
        {/* Task */}
        <Row label="goal" scale={scale}>
          <span style={{ fontFamily: FONT_SANS, fontSize: s(12), color: "#C8D4DF", lineHeight: 1.4 }}>
            {task}
          </span>
        </Row>

        {/* Allowed */}
        <Row label="allowed" scale={scale}>
          {allowed.map((p, i) => <Chip key={i} text={p} tone="allowed" />)}
        </Row>

        {/* Forbidden */}
        <Row label="forbidden" scale={scale}>
          {forbidden.map((p, i) => <Chip key={i} text={p} tone="forbidden" />)}
        </Row>

        {/* Memory */}
        {memory.length > 0 && (
          <Row label="memory" scale={scale}>
            {memory.map((m, i) => <Chip key={i} text={m} tone="memory" />)}
          </Row>
        )}

        {/* Token budget */}
        {budget && (
          <Row label="budget" scale={scale}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: s(5) }}>
              <div style={{
                height: s(3),
                background: "rgba(255,255,255,0.06)",
                borderRadius: s(2),
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((budget.used / budget.total) * 100)}%`,
                  background: "linear-gradient(90deg, #7C6DFA, #4DE8B0)",
                  borderRadius: s(2),
                }} />
              </div>
              <span style={{ fontSize: s(10), color: "#3A4460" }}>
                {budget.used.toLocaleString()}k / {budget.total.toLocaleString()}k tokens
              </span>
            </div>
          </Row>
        )}

        {/* Finish checks */}
        {finishChecks && (
          <Row label="stop if" scale={scale}>
            <span style={{ color: "#C8D4DF", fontSize: s(12) }}>
              {finishChecks.join(" · ")}
            </span>
          </Row>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: `${s(2)}px 0` }} />

        {/* Risk */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Row label="risk" scale={scale}>
            <span style={{ color: riskColor, fontSize: s(12) }}>{risk}</span>
          </Row>
        </div>
      </div>

      {/* Agent footer */}
      {(agent || step) && (
        <div style={{
          borderTop: "1px solid rgba(124,109,250,0.08)",
          padding: `${s(10)}px ${s(22)}px`,
          display: "flex",
          alignItems: "center",
          gap: s(8),
        }}>
          <div style={{
            width: s(5), height: s(5), borderRadius: "50%",
            background: verdict === "BLOCKED" ? "#FF6B6B" : "#4DE8B0",
            boxShadow: verdict === "BLOCKED"
              ? "0 0 6px rgba(255,107,107,0.50)"
              : "0 0 6px rgba(77,232,176,0.50)",
          }} />
          {agent && (
            <span style={{ fontSize: s(10), color: "#3A4460", letterSpacing: "0.04em" }}>
              {agent.toUpperCase()}
            </span>
          )}
          {step && (
            <span style={{ fontSize: s(10), color: "#2A3050", letterSpacing: "0.03em" }}>
              · {step}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
