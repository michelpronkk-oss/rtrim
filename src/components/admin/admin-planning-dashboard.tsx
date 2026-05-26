"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildDefaultTasks, buildDefaultMetrics, type PlanningTask, type PlanningMetric } from "@/lib/admin-planning-data";

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "runtrim_admin_planning_v3";

type PlanningState = {
  startDate: string;
  tasks: PlanningTask[];
  metrics: PlanningMetric[];
};

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultState(): PlanningState {
  return { startDate: tomorrow(), tasks: buildDefaultTasks(), metrics: buildDefaultMetrics() };
}

function loadState(): PlanningState {
  const base = defaultState();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PlanningState>;
    return {
      startDate: parsed.startDate ?? base.startDate,
      tasks:   Array.isArray(parsed.tasks)   ? parsed.tasks   : base.tasks,
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : base.metrics,
    };
  } catch {
    return base;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}

function todayDayNumber(startDate: string): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now   = new Date();
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const n = Date.UTC(now.getFullYear(),   now.getMonth(),   now.getDate());
  const d = Math.floor((n - s) / 86_400_000) + 1;
  return d >= 1 && d <= 30 ? d : null;
}

function calendarDate(startDate: string, dayNumber: number): string {
  if (!startDate) return "";
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const WEEK_GOAL: Record<number, string> = {
  1: "Get first 20 real users through honesty and direct outreach",
  2: "Show real feedback, deepen user relationships, expand to new subreddits",
  3: "Widen audience, hit Hacker News, start getting organic shares",
  4: "First paying user, real testimonials, Product Hunt prep",
};

const PLATFORM_COLOR: Record<string, string> = {
  "X":              "#d8dbe5",
  "LinkedIn":       "#5B9FD4",
  "Reddit":         "#FF6314",
  "Instagram":      "#C96BC4",
  "Hacker News":    "#FF6600",
  "Indie Hackers":  "#9E91FF",
  "ALL":            "#4DE8B0",
  "Video":          "#a78bfa",
  "Product Hunt":   "#DA552F",
  "Reddit / HN / IH": "#FF6314",
  "X / LinkedIn":     "#d8dbe5",
  "X + LinkedIn":     "#d8dbe5",
};

function platformColor(p: string): string {
  return PLATFORM_COLOR[p] ?? "rgba(255,255,255,0.3)";
}

function dayProgress(tasks: PlanningTask[]): { done: number; total: number; pct: number } {
  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  return { done, total, pct: pct(done, total) };
}

function dotStyle(tasks: PlanningTask[], isSelected: boolean, isToday: boolean): React.CSSProperties {
  const p = dayProgress(tasks);
  const accent = isSelected || isToday ? "#7C6DFA" : undefined;
  let bg = "rgba(255,255,255,0.04)";
  let border = "rgba(255,255,255,0.09)";
  if (p.pct === 100)        { bg = "rgba(16,185,129,0.20)"; border = "rgba(16,185,129,0.45)"; }
  else if (p.done > 0)      { bg = "rgba(124,109,250,0.12)"; border = "rgba(124,109,250,0.3)"; }
  return {
    background: bg,
    border: `1px solid ${accent ?? border}`,
    boxShadow: accent ? "0 0 0 1px rgba(124,109,250,0.25)" : "none",
    color: accent ?? (p.done > 0 ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.18)"),
  };
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onNotes,
}: {
  task: PlanningTask;
  onToggle: (id: string) => void;
  onNotes: (id: string, v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pc = platformColor(task.platform);

  return (
    <div
      className="overflow-hidden rounded-xl transition-colors"
      style={{
        background: task.done ? "rgba(16,185,129,0.04)" : "#0d0f13",
        border: `1px solid ${task.done ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className="mt-0.5 shrink-0 flex items-center justify-center rounded-full border-2 transition-all"
          style={{
            width: 20, height: 20,
            borderColor: task.done ? "#10b981" : "rgba(255,255,255,0.18)",
            background:  task.done ? "rgba(16,185,129,0.15)" : "transparent",
          }}
        >
          {task.done && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span
                className="text-[12.5px] font-medium leading-snug"
                style={{
                  color: task.done ? "rgba(255,255,255,0.22)" : "#d8dbe5",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
              <span
                className="ml-2 rounded px-1.5 py-0.5 font-mono text-[9.5px]"
                style={{ background: "rgba(255,255,255,0.04)", color: pc, border: `1px solid ${pc}22` }}
              >
                {task.platform}
              </span>
            </div>
            <button
              onClick={() => setOpen(v => !v)}
              className="shrink-0 font-mono text-[13px] leading-none transition-colors"
              style={{ color: open ? "#7C6DFA" : "rgba(255,255,255,0.15)" }}
            >
              {open ? "−" : "+"}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: instruction + notes */}
      {open && (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "#090b0e" }}
        >
          <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
            {task.instruction}
          </p>
          <textarea
            rows={2}
            placeholder="Notes…"
            value={task.notes}
            onChange={e => onNotes(task.id, e.target.value)}
            className="w-full resize-none rounded-lg px-3 py-2 text-[11.5px] outline-none leading-relaxed"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#d8dbe5",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ metric, onChange }: { metric: PlanningMetric; onChange: (key: string, v: number | boolean) => void }) {
  const current = metric.targetBool ? (metric.currentBool ? 1 : 0) : (metric.currentValue ?? 0);
  const target  = metric.targetBool ? 1 : (metric.targetValue ?? 100);
  const p       = pct(current, target);
  const reached = p >= 100;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{ background: "#0d0f13", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.38)" }}>
          {metric.label}
        </span>
        <span className="shrink-0 font-mono text-[10px] font-semibold" style={{ color: reached ? "#10b981" : "#7C6DFA" }}>
          {p}%
        </span>
      </div>

      {metric.targetBool ? (
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onChange(metric.key, !metric.currentBool)}
            className="relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all"
            style={{
              width: 20, height: 20,
              borderColor: metric.currentBool ? "#10b981" : "rgba(255,255,255,0.15)",
              background:  metric.currentBool ? "rgba(16,185,129,0.15)" : "transparent",
            }}
          >
            {metric.currentBool && <span className="size-2 rounded-full" style={{ background: "#10b981" }} />}
          </button>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {metric.currentBool ? "Done" : "Not yet"}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <input
            type="number"
            min={0}
            value={metric.currentValue ?? 0}
            onChange={e => onChange(metric.key, Number(e.target.value))}
            className="w-20 bg-transparent font-mono font-bold outline-none"
            style={{ fontSize: 22, letterSpacing: "-0.03em", color: "#e8eaf0" }}
          />
          <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            / {metric.targetValue}
          </span>
        </div>
      )}

      <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(p, 100)}%`,
            background: reached ? "#10b981" : "linear-gradient(90deg, #7C6DFA, #a78bfa)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

export function AdminPlanningContent() {
  const [state, setState] = useState<PlanningState>(loadState);
  const [selectedDay, setSelectedDay] = useState(1);

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Auto-jump to today
  const todayDay = todayDayNumber(state.startDate);
  useEffect(() => {
    if (todayDay != null) setSelectedDay(todayDay);
  }, [state.startDate, todayDay]);

  // Task map by day
  const tasksByDay = useMemo(() => {
    const map = new Map<number, PlanningTask[]>();
    for (let d = 1; d <= 30; d++) map.set(d, []);
    for (const t of state.tasks) map.get(t.dayNumber)?.push(t);
    for (const arr of map.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [state.tasks]);

  // Progress
  const progress = useMemo(() => {
    const all  = state.tasks;
    const done = all.filter(t => t.done).length;
    const perDay: Record<number, { done: number; total: number; pct: number }> = {};
    const perWeek: Record<number, number> = {};
    for (let d = 1; d <= 30; d++) perDay[d] = dayProgress(tasksByDay.get(d) ?? []);
    for (let w = 1; w <= 4; w++) {
      const wt = all.filter(t => t.weekNumber === w);
      perWeek[w] = pct(wt.filter(t => t.done).length, wt.length);
    }
    return { completionPct: pct(done, all.length), done, total: all.length, perDay, perWeek };
  }, [state.tasks, tasksByDay]);

  // Mutations
  function toggleTask(id: string) {
    setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }
  function setNotes(id: string, notes: string) {
    setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, notes } : t) }));
  }
  function updateMetric(key: string, value: number | boolean) {
    setState(s => ({
      ...s,
      metrics: s.metrics.map(m =>
        m.key === key
          ? typeof value === "boolean" ? { ...m, currentBool: value } : { ...m, currentValue: value }
          : m
      ),
    }));
  }

  const selectedTasks = tasksByDay.get(selectedDay) ?? [];
  const dp = progress.perDay[selectedDay] ?? { done: 0, total: 0, pct: 0 };
  const selectedWeek = selectedDay <= 7 ? 1 : selectedDay <= 14 ? 2 : selectedDay <= 21 ? 3 : 4;
  const dateLabel = calendarDate(state.startDate, selectedDay);

  return (
    <div className="flex min-h-0 flex-1" style={{ background: "#06070a" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className="flex shrink-0 flex-col overflow-y-auto"
        style={{ width: 258, background: "#080a0d", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Start date */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.18)" }}>
            Start date
          </p>
          <input
            type="date"
            value={state.startDate}
            onChange={e => setState(s => ({ ...s, startDate: e.target.value }))}
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#d8dbe5" }}
          />
          {todayDay && (
            <p className="mt-2 font-mono text-[10px]" style={{ color: "#7C6DFA" }}>
              Day {todayDay} of 30 active
            </p>
          )}
        </div>

        {/* Overall progress */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.15)" }}>Overall</span>
            <span className="font-mono text-[11px] font-bold" style={{ color: "#7C6DFA" }}>{progress.completionPct}%</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress.completionPct}%`, background: "linear-gradient(90deg, #7C6DFA, #a78bfa)" }} />
          </div>
          <p className="mt-1.5 font-mono text-[9.5px]" style={{ color: "rgba(255,255,255,0.1)" }}>
            {progress.done} / {progress.total} tasks
          </p>
        </div>

        {/* Week dot grids */}
        <div className="flex-1 py-1">
          {[1, 2, 3, 4].map(week => {
            const start = (week - 1) * 7 + 1;
            const end   = week === 4 ? 30 : week * 7;
            const days  = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            return (
              <div key={week} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[9.5px]" style={{ color: "rgba(255,255,255,0.2)" }}>Week {week}</span>
                  <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.12)" }}>{progress.perWeek[week]}%</span>
                </div>
                <div className="mb-2 h-[2px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress.perWeek[week]}%`, background: "rgba(124,109,250,0.5)" }} />
                </div>
                <div className="flex flex-wrap gap-[5px]">
                  {days.map(day => {
                    const dt = tasksByDay.get(day) ?? [];
                    const isToday    = todayDay === day;
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        title={`Day ${day}${state.startDate ? ` · ${calendarDate(state.startDate, day)}` : ""}`}
                        className="relative flex items-center justify-center rounded-[4px] font-mono text-[8px] font-bold transition-all"
                        style={{ width: 24, height: 22, ...dotStyle(dt, isSelected, isToday) }}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <span
                            className="absolute -top-[3px] -right-[3px] size-[5px] rounded-full"
                            style={{ background: "#7C6DFA" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">

        {/* Header bar */}
        <div
          className="shrink-0 flex items-center gap-4 px-6 py-3"
          style={{ background: "#0a0b0e", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[20px] font-bold" style={{ color: "#e8eaf0", letterSpacing: "-0.04em" }}>
              Day {selectedDay}
            </span>
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>/30</span>
          </div>
          {dateLabel && (
            <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              {dateLabel}
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]"
            style={{ background: "rgba(124,109,250,0.1)", color: "#9E91FF", border: "1px solid rgba(124,109,250,0.2)" }}
          >
            Week {selectedWeek}
          </span>
          <div className="flex-1" />
          <span className="font-mono text-[11px]" style={{ color: dp.pct === 100 ? "#10b981" : "#7C6DFA" }}>
            {dp.done}/{dp.total} done
          </span>
          <div className="w-24 overflow-hidden rounded-full" style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${dp.pct}%`, background: dp.pct === 100 ? "#10b981" : "#7C6DFA" }} />
          </div>
        </div>

        <div className="flex-1 space-y-5 px-6 py-5">

          {/* Week goal banner */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(124,109,250,0.06)", border: "1px solid rgba(124,109,250,0.14)" }}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "rgba(167,139,250,0.5)" }}>
              Week {selectedWeek} goal
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "rgba(167,139,250,0.85)" }}>
              {WEEK_GOAL[selectedWeek]}
            </p>
          </div>

          {/* Tasks */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Day {selectedDay} tasks
              </span>
              {dp.pct === 100 && (
                <span className="font-mono text-[10px]" style={{ color: "#10b981" }}>All done</span>
              )}
            </div>

            <div className="space-y-2 px-4 py-3">
              {selectedTasks.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.1)" }}>
                  No tasks for day {selectedDay}
                </p>
              ) : (
                selectedTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onNotes={setNotes}
                  />
                ))
              )}
            </div>
          </div>

          {/* Metrics */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.25)" }}>
                30-Day metrics
              </span>
              <span className="ml-2 font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.12)" }}>
                Day 30 targets
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.metrics.map(metric => (
                <MetricCard key={metric.key} metric={metric} onChange={updateMetric} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Standalone wrapper ───────────────────────────────────────────────────────

export function AdminPlanningDashboard() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#06070a", color: "#EDEEFF" }}>
      <header
        className="sticky top-0 z-10 px-6 py-3.5 backdrop-blur-md"
        style={{ background: "rgba(6,7,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">30-Day Marketing Plan</span>
            <span className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.22)" }}>
              admin
            </span>
          </div>
          <Link
            href="/admin"
            className="rounded px-3 py-1.5 text-[12px] transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.28)" }}
          >
            Back to admin
          </Link>
        </div>
      </header>
      <AdminPlanningContent />
    </div>
  );
}
