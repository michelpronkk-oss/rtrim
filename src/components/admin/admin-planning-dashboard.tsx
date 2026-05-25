"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, Plus, XCircle } from "lucide-react";
import {
  buildDefaultMetrics,
  buildDefaultTasks,
  buildWeeklyQuestions,
  type PlanningMetric,
  type PlanningTask,
  type TaskStatus,
} from "@/lib/admin-planning-data";

type ReviewAnswers = Record<string, string>;

type PlanningState = {
  startDate: string;
  tasks: PlanningTask[];
  metrics: PlanningMetric[];
  reviews: Record<number, ReviewAnswers>;
};

const STORAGE_KEY = "runtrim_admin_planning_v1";
const STATUSES: TaskStatus[] = ["todo", "in_progress", "done", "skipped"];

function defaultState(): PlanningState {
  const reviewTemplate: Record<number, ReviewAnswers> = {};
  for (let week = 1; week <= 4; week += 1) {
    reviewTemplate[week] = {};
    for (const q of buildWeeklyQuestions()) reviewTemplate[week][q.key] = "";
  }
  return {
    startDate: "",
    tasks: buildDefaultTasks(),
    metrics: buildDefaultMetrics(),
    reviews: reviewTemplate,
  };
}

function pct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function dayFromStart(startDate: string): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((nowUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
  if (diff < 1 || diff > 30) return null;
  return diff;
}

function dayBg(tasks: PlanningTask[]): { bg: string; border: string } {
  if (!tasks.length) return { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };
  if (tasks.every((t) => t.status === "done")) return { bg: "rgba(16,185,129,0.25)", border: "rgba(16,185,129,0.5)" };
  if (tasks.some((t) => t.status === "in_progress")) return { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.4)" };
  return { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
}

function StatusIcon({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  const cls = "size-[15px] shrink-0 cursor-pointer transition-all hover:scale-110";
  if (status === "done") return <CheckCircle2 className={cls} style={{ color: "#10b981" }} onClick={onClick} />;
  if (status === "in_progress") return <CircleDot className={cls} style={{ color: "#3b82f6" }} onClick={onClick} />;
  if (status === "skipped") return <XCircle className={cls} style={{ color: "#f59e0b" }} onClick={onClick} />;
  return <Circle className={cls} style={{ color: "rgba(255,255,255,0.18)" }} onClick={onClick} />;
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onNotesChange,
  onUrlChange,
}: {
  task: PlanningTask;
  onStatusChange: (id: string, s: TaskStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onUrlChange: (id: string, url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === "done";

  function cycleStatus() {
    const next = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length];
    onStatusChange(task.id, next);
  }

  return (
    <div
      className="group rounded-lg overflow-hidden transition-colors"
      style={{ background: "#0d0f13", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <StatusIcon status={task.status} onClick={cycleStatus} />
        <span
          className="flex-1 min-w-0 truncate text-[12.5px] leading-snug transition-colors"
          style={{ color: isDone ? "rgba(255,255,255,0.2)" : "#d8dbe5", textDecoration: isDone ? "line-through" : "none" }}
        >
          {task.title}
        </span>
        <div className="flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px]"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}
          >
            {task.platform}
          </span>
          <span className="font-mono text-[9.5px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            {task.estimatedMinutes}m
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="font-mono text-[12px] transition-colors"
          style={{ color: expanded ? "rgba(124,109,250,0.6)" : "rgba(255,255,255,0.12)" }}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div
          className="border-t px-3 py-3 space-y-2"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "#090b0e" }}
        >
          {task.description && (
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
              {task.description}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Notes…"
              value={task.notes}
              onChange={(e) => onNotesChange(task.id, e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] outline-none transition-colors"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#d8dbe5",
              }}
            />
            <input
              placeholder="Result URL…"
              value={task.resultUrl}
              onChange={(e) => onUrlChange(task.id, e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] outline-none transition-colors"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#d8dbe5",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  metric,
  onChange,
}: {
  metric: PlanningMetric;
  onChange: (key: string, value: number | boolean) => void;
}) {
  const current = metric.targetBool ? (metric.currentBool ? 1 : 0) : (metric.currentValue ?? 0);
  const target = metric.targetBool ? 1 : (metric.targetValue ?? 100);
  const percent = pct(current, target);
  const reached = percent >= 100;
  const barColor = reached
    ? "#10b981"
    : `linear-gradient(90deg, #7C6DFA, #a78bfa)`;

  return (
    <div
      className="rounded-xl flex flex-col gap-3 p-4"
      style={{ background: "#0d0f13", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>
          {metric.label}
        </span>
        <span
          className="font-mono text-[10.5px] shrink-0 font-semibold"
          style={{ color: reached ? "#10b981" : "#7C6DFA" }}
        >
          {percent}%
        </span>
      </div>

      {metric.targetBool ? (
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onChange(metric.key, !metric.currentBool)}
            className="relative flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
            style={{
              borderColor: metric.currentBool ? "#10b981" : "rgba(255,255,255,0.15)",
              background: metric.currentBool ? "rgba(16,185,129,0.15)" : "transparent",
            }}
          >
            {metric.currentBool && (
              <span className="size-2 rounded-full" style={{ background: "#10b981" }} />
            )}
          </button>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            {metric.currentBool ? "Done" : "Not yet"}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <input
            type="number"
            value={metric.currentValue ?? 0}
            onChange={(e) => onChange(metric.key, Number(e.target.value))}
            className="w-20 bg-transparent font-mono font-bold outline-none"
            style={{ fontSize: 24, letterSpacing: "-0.03em", color: "#e8eaf0" }}
          />
          <span className="font-mono text-[12px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            / {metric.targetValue}
          </span>
        </div>
      )}

      <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ─── Core content (embeddable) ────────────────────────────────────────────────

export function AdminPlanningContent() {
  const [boot] = useState(() => {
    const base = defaultState();
    if (typeof window === "undefined") return { state: base, error: "" };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { state: base, error: "" };
      const parsed = JSON.parse(raw) as Partial<PlanningState>;
      return {
        state: {
          startDate: parsed.startDate ?? "",
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : base.tasks,
          metrics: Array.isArray(parsed.metrics) ? parsed.metrics : base.metrics,
          reviews:
            parsed.reviews && typeof parsed.reviews === "object"
              ? parsed.reviews
              : base.reviews,
        },
        error: "",
      };
    } catch {
      return { state: base, error: "Could not read local planner data." };
    }
  });

  const [state, setState] = useState<PlanningState>(boot.state);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loadError] = useState(boot.error);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [activeReviewWeek, setActiveReviewWeek] = useState(1);

  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const todayDay = dayFromStart(state.startDate);
  useEffect(() => {
    if (todayDay != null) setSelectedDay(todayDay);
  }, [state.startDate, todayDay]);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, PlanningTask[]>();
    for (let day = 1; day <= 30; day += 1) map.set(day, []);
    for (const t of state.tasks) map.get(t.dayNumber)?.push(t);
    for (const dayTasks of map.values()) dayTasks.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [state]);

  const progress = useMemo(() => {
    const all = state.tasks;
    const doneAll = all.filter((t) => t.status === "done").length;
    const perDay: Record<number, number> = {};
    const perWeek: Record<number, number> = {};
    for (let day = 1; day <= 30; day += 1) {
      const d = tasksByDay.get(day) ?? [];
      perDay[day] = pct(d.filter((t) => t.status === "done").length, d.length);
    }
    for (let week = 1; week <= 4; week += 1) {
      const w = all.filter((t) => t.weekNumber === week);
      perWeek[week] = pct(w.filter((t) => t.status === "done").length, w.length);
    }
    return { total: pct(doneAll, all.length), doneAll, totalAll: all.length, perDay, perWeek };
  }, [state, tasksByDay]);

  const questions = buildWeeklyQuestions();

  function setTaskStatus(id: string, status: TaskStatus) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
  }
  function setTaskNotes(id: string, notes: string) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, notes } : t)) }));
  }
  function setTaskUrl(id: string, resultUrl: string) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, resultUrl } : t)) }));
  }
  function updateMetric(key: string, value: number | boolean) {
    setState((s) => ({
      ...s,
      metrics: s.metrics.map((m) =>
        m.key === key
          ? typeof value === "boolean"
            ? { ...m, currentBool: value }
            : { ...m, currentValue: value }
          : m
      ),
    }));
  }

  function addCustomTask() {
    const title = newTaskInput.trim();
    if (!title) return;
    const day = selectedDay;
    const week = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    const existing = tasksByDay.get(day) ?? [];
    const maxSort = existing.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    const newTask: PlanningTask = {
      id: `custom-${day}-${Date.now()}`,
      dayNumber: day,
      weekNumber: week,
      title,
      description: "",
      platform: "Custom",
      category: "custom",
      estimatedMinutes: 30,
      status: "todo",
      notes: "",
      resultUrl: "",
      sortOrder: maxSort + 1,
    };
    setState((s) => ({ ...s, tasks: [...s.tasks, newTask] }));
    setNewTaskInput("");
  }

  const selectedWeek = selectedDay <= 7 ? 1 : selectedDay <= 14 ? 2 : selectedDay <= 21 ? 3 : 4;
  const selectedTasks = tasksByDay.get(selectedDay) ?? [];
  const selectedDone = selectedTasks.filter((t) => t.status === "done").length;

  return (
    <div className="flex min-h-0 flex-1" style={{ background: "#06070a" }}>
      {loadError && (
        <div
          className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-[11px]"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}
        >
          {loadError}
        </div>
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col overflow-y-auto"
        style={{ width: 264, background: "#080a0d", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Start date */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.2)" }}>
            Launch start
          </p>
          <input
            type="date"
            value={state.startDate}
            onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#d8dbe5",
            }}
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
            <span className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.18)" }}>
              Overall
            </span>
            <span className="font-mono text-[11px] font-bold" style={{ color: "#7C6DFA" }}>
              {progress.total}%
            </span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress.total}%`, background: "linear-gradient(90deg, #7C6DFA, #a78bfa)" }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[9.5px]" style={{ color: "rgba(255,255,255,0.12)" }}>
            {progress.doneAll} / {progress.totalAll} tasks
          </p>
        </div>

        {/* Week dot grids */}
        <div className="flex-1 py-1">
          {[1, 2, 3, 4].map((week) => {
            const start = (week - 1) * 7 + 1;
            const end = week === 4 ? 30 : week * 7;
            const days = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            return (
              <div
                key={week}
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9.5px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                    Week {week}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>
                    {progress.perWeek[week]}%
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="mb-2.5 h-[2px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress.perWeek[week]}%`, background: "rgba(124,109,250,0.5)" }}
                  />
                </div>
                {/* Dot grid */}
                <div className="flex flex-wrap gap-[5px]">
                  {days.map((day) => {
                    const dayTasks = tasksByDay.get(day) ?? [];
                    const { bg, border } = dayBg(dayTasks);
                    const isToday = todayDay === day;
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        title={`Day ${day}`}
                        onClick={() => setSelectedDay(day)}
                        className="relative flex items-center justify-center rounded-[4px] font-mono text-[8px] font-bold transition-all"
                        style={{
                          width: 24,
                          height: 22,
                          background: bg,
                          border: `1px solid ${isSelected || isToday ? "#7C6DFA" : border}`,
                          color: isSelected || isToday ? "#a78bfa" : "rgba(255,255,255,0.2)",
                          boxShadow: isSelected || isToday ? "0 0 0 1px rgba(124,109,250,0.3)" : "none",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">

        {/* Status bar */}
        <div
          className="shrink-0 flex items-center gap-5 px-6 py-3"
          style={{ background: "#0a0b0e", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[20px] font-bold" style={{ color: "#e8eaf0", letterSpacing: "-0.04em" }}>
              {selectedDay}
            </span>
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>/ 30</span>
          </div>
          <div className="h-3.5 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Week</span>
            <span className="font-mono text-[13px] font-semibold" style={{ color: "#d8dbe5" }}>{selectedWeek}</span>
          </div>
          <div className="h-3.5 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Today</span>
            <span className="font-mono text-[11px]" style={{ color: "#7C6DFA" }}>
              {selectedDone}/{selectedTasks.length}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div
              className="w-28 overflow-hidden rounded-full"
              style={{ height: 3, background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress.total}%`,
                  background: "linear-gradient(90deg, #7C6DFA, #a78bfa)",
                }}
              />
            </div>
            <span className="font-mono text-[10px] font-semibold" style={{ color: "#7C6DFA" }}>
              {progress.total}%
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 px-6 py-5">

          {/* Day tasks */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Day {selectedDay}
                </span>
                {selectedTasks.length > 0 && (
                  <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.12)" }}>
                    {selectedDone} / {selectedTasks.length} done
                  </span>
                )}
              </div>
              <div
                className="overflow-hidden rounded-full"
                style={{ width: 64, height: 2, background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress.perDay[selectedDay]}%`,
                    background: progress.perDay[selectedDay] === 100 ? "#10b981" : "#7C6DFA",
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5 px-4 py-3">
              {selectedTasks.length === 0 ? (
                <p
                  className="py-6 text-center font-mono text-[11px]"
                  style={{ color: "rgba(255,255,255,0.12)" }}
                >
                  No tasks for day {selectedDay}
                </p>
              ) : (
                selectedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={setTaskStatus}
                    onNotesChange={setTaskNotes}
                    onUrlChange={setTaskUrl}
                  />
                ))
              )}

              <div className="flex gap-2 pt-2">
                <input
                  placeholder="Add task…"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomTask(); }}
                  className="flex-1 rounded-lg px-3 py-2 text-[11.5px] outline-none transition-colors"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#d8dbe5",
                  }}
                />
                <button
                  onClick={addCustomTask}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] transition-colors"
                  style={{
                    background: "rgba(124,109,250,0.08)",
                    border: "1px solid rgba(124,109,250,0.2)",
                    color: "#9E91FF",
                  }}
                >
                  <Plus className="size-3" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                Metrics
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} onChange={updateMetric} />
              ))}
            </div>
          </div>

          {/* Weekly reviews */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex items-center gap-1 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="mr-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                Weekly review
              </span>
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  onClick={() => setActiveReviewWeek(w)}
                  className="rounded px-2.5 py-1 font-mono text-[10px] transition-colors"
                  style={{
                    background: activeReviewWeek === w ? "rgba(124,109,250,0.15)" : "transparent",
                    color: activeReviewWeek === w ? "#9E91FF" : "rgba(255,255,255,0.2)",
                  }}
                >
                  W{w}
                </button>
              ))}
            </div>
            <div className="space-y-3 px-4 py-4">
              {questions.map((question) => (
                <div key={`${activeReviewWeek}-${question.key}`}>
                  <label
                    className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.08em]"
                    style={{ color: "rgba(255,255,255,0.22)" }}
                  >
                    {question.question}
                  </label>
                  <textarea
                    value={state.reviews[activeReviewWeek]?.[question.key] ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        reviews: {
                          ...s.reviews,
                          [activeReviewWeek]: {
                            ...s.reviews[activeReviewWeek],
                            [question.key]: e.target.value,
                          },
                        },
                      }))
                    }
                    rows={2}
                    placeholder="Your notes…"
                    className="w-full resize-none rounded-lg px-3 py-2 text-[11.5px] outline-none transition-colors leading-relaxed"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#d8dbe5",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Standalone page wrapper ──────────────────────────────────────────────────

export function AdminPlanningDashboard() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#06070a", color: "#EDEEFF" }}>
      <header
        className="sticky top-0 z-10 px-6 py-3.5 backdrop-blur-md"
        style={{ background: "rgba(6,7,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">Marketing Planning</span>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}
            >
              admin
            </span>
          </div>
          <Link
            href="/admin"
            className="rounded px-3 py-1.5 text-[12px] transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
          >
            Back to admin
          </Link>
        </div>
      </header>
      <AdminPlanningContent />
    </div>
  );
}
