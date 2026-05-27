"use client";

import { useEffect, useState } from "react";
import { growthList, growthUpdate, growthCreate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const CHECKLIST_ITEMS = [
  "Check /admin metrics - log traffic, installs, copies, signups, paid",
  "Check comments on all platforms and note anything needing a reply",
  "Collect screenshots and proof from active posts",
  "Schedule any approved posts that are ready",
  "Repurpose one high-performing post into a new format",
  "Add 5 new content ideas to the calendar",
  "Review the reply inbox and action any pending replies",
  "Submit daily summary note",
] as const;

type DailyState = {
  id?: string;
  date: string;
  checked: boolean[];
  notes: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(key: string): string {
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function addDays(key: string, n: number): string {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function loadDay(date: string): Promise<DailyState> {
  const rows = await growthList<Record<string, unknown>>("daily-logs");
  const row = rows.find((r) => String(r.log_date ?? "") === date);
  if (!row) return { date, checked: Array(8).fill(false), notes: "" };
  const arr = Array.isArray(row.checked_items) ? (row.checked_items as number[]) : [];
  const checked = Array(8).fill(false).map((_, i) => arr.includes(i));
  return {
    id: String(row.id ?? ""),
    date,
    checked,
    notes: String(row.notes ?? ""),
  };
}

async function saveDay(state: DailyState) {
  const checked_items = state.checked
    .map((v, i) => (v ? i : -1))
    .filter((v) => v >= 0);

  if (state.id) {
    await growthUpdate("daily-logs", state.id, {
      log_date: state.date,
      checked_items,
      notes: state.notes,
    });
  } else {
    await growthCreate("daily-logs", {
      log_date: state.date,
      checked_items,
      notes: state.notes,
    });
  }
}

export function AdminVaChecklistContent() {
  const [date,  setDate]  = useState(todayKey());
  const [state, setState] = useState<DailyState>({ date: todayKey(), checked: Array(8).fill(false), notes: "" });

  useEffect(() => {
    void (async () => setState(await loadDay(date)))();
  }, [date]);

  function toggle(i: number) {
    const checked = [...state.checked];
    checked[i] = !checked[i];
    const next = { ...state, checked };
    setState(next);
    void saveDay(next);
  }

  function setNotes(notes: string) {
    const next = { ...state, notes };
    setState(next);
    void saveDay(next);
  }

  const done  = state.checked.filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const pct   = Math.round((done / total) * 100);
  const isToday = date === todayKey();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header + date nav */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>daily checklist</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>{formatDate(date)}</h2>
          {!isToday && (
            <span style={{ ...MONO, fontSize: 11, color: "#f5a524" }}>viewing past day</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => setDate(addDays(date, -1))}
            style={{ ...MONO, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8a8f98", fontSize: 12, cursor: "pointer" }}
          >
            Prev
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(todayKey())}
              style={{ ...MONO, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid rgba(167,139,250,0.40)", background: "rgba(167,139,250,0.10)", color: "#a78bfa", fontSize: 12, cursor: "pointer" }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            style={{ ...MONO, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: isToday ? "#3a3e46" : "#8a8f98", fontSize: 12, cursor: isToday ? "default" : "pointer" }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ ...MONO, fontSize: 11, color: "#8a8f98" }}>{done} of {total} complete</span>
          <span style={{ ...MONO, fontSize: 11, color: pct === 100 ? "#6ee7b7" : "#5a5f68" }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "#16191e", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? "#6ee7b7" : "linear-gradient(90deg, #7c5cff, #a78bfa)", width: `${pct}%`, transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Checklist */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>daily tasks</p>
        </div>
        <div>
          {CHECKLIST_ITEMS.map((item, i) => {
            const checked = state.checked[i] ?? false;
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  width: "100%", padding: "13px 16px",
                  borderBottom: i < CHECKLIST_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                {/* Checkbox */}
                <span style={{
                  flexShrink: 0, width: 16, height: 16, borderRadius: 4, marginTop: 1,
                  border: `1.5px solid ${checked ? "#6ee7b7" : "rgba(255,255,255,0.18)"}`,
                  background: checked ? "rgba(110,231,183,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {checked && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: 13, color: checked ? "#5a5f68" : "#c9ccd2", textDecoration: checked ? "line-through" : "none", lineHeight: 1.5 }}>
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>daily summary note</p>
        </div>
        <div style={{ padding: 16 }}>
          <textarea
            value={state.notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened today? Key wins, blockers, observations..."
            rows={4}
            style={{
              width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "10px 12px", color: "#c9ccd2", fontSize: 13,
              fontFamily: "inherit", resize: "vertical", outline: "none",
              boxSizing: "border-box",
            }}
          />
          <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 6 }}>Saved to Supabase daily logs.</p>
        </div>
      </div>
    </div>
  );
}
