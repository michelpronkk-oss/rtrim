"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
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
const statuses: TaskStatus[] = ["todo", "in_progress", "done", "skipped"];

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

function statusColor(status: TaskStatus): string {
  switch (status) {
    case "in_progress": return "#3b82f6";
    case "done":        return "#10b981";
    case "skipped":     return "#f59e0b";
    default:            return "rgba(255,255,255,0.1)";
  }
}

function statusPillStyle(status: TaskStatus): string {
  switch (status) {
    case "in_progress": return "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#60a5fa]";
    case "done":        return "border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]";
    case "skipped":     return "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]";
    default:            return "border-white/10 bg-white/5 text-[#8E95C3]";
  }
}

function dayStatusDot(tasks: PlanningTask[]): string {
  if (!tasks.length) return "bg-[#2E3554]";
  const all = tasks.every((t) => t.status === "done");
  if (all) return "bg-[#10b981]";
  const hasSkipped = tasks.some((t) => t.status === "skipped");
  if (hasSkipped) return "bg-[#f59e0b]";
  const inProg = tasks.some((t) => t.status === "in_progress");
  if (inProg) return "bg-[#3b82f6]";
  return "bg-[#2E3554]";
}

function SectionHeader({
  label,
  collapsed,
  onToggle,
  right,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex items-center gap-2">
        {collapsed ? (
          <ChevronRight className="size-3.5 shrink-0 text-[#4D5070]" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-[#7C6DFA]" />
        )}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8E95C3]">
          {label}
        </span>
      </div>
      {right}
    </button>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onNotesChange,
  onUrlChange,
}: {
  task: PlanningTask;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onUrlChange: (id: string, url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function cycleStatus() {
    const idx = statuses.indexOf(task.status);
    const next = statuses[(idx + 1) % statuses.length];
    onStatusChange(task.id, next);
  }

  return (
    <div
      className="rounded-lg border border-white/8 bg-[#0c0e11] overflow-hidden"
      style={{ borderLeftColor: statusColor(task.status), borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={cycleStatus}
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${statusPillStyle(task.status)}`}
        >
          {task.status.replace("_", " ")}
        </button>
        <span className={`flex-1 text-[12px] font-medium ${task.status === "done" ? "line-through opacity-50" : "text-[#EDEEFF]"}`}>
          {task.title}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded border border-white/8 px-1.5 py-0.5 font-mono text-[9px] text-[#4D5070]">
            {task.platform}
          </span>
          <span className="rounded border border-white/8 px-1.5 py-0.5 font-mono text-[9px] text-[#4D5070]">
            {task.category}
          </span>
          <span className="font-mono text-[10px] text-[#2E3554]">{task.estimatedMinutes}m</span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-0.5 text-[#4D5070] hover:text-[#8E95C3] transition-colors"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/6 px-3 py-2.5 space-y-2 bg-[#080a0d]">
          <p className="text-[11px] text-[#8E95C3] leading-relaxed">{task.description}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Notes"
              value={task.notes}
              onChange={(e) => onNotesChange(task.id, e.target.value)}
              className="rounded border border-white/10 bg-[#06070a] px-2 py-1.5 text-[11px] text-[#EDEEFF] placeholder-[#2E3554] outline-none focus:border-[#7C6DFA]/40"
            />
            <input
              placeholder="Result URL"
              value={task.resultUrl}
              onChange={(e) => onUrlChange(task.id, e.target.value)}
              className="rounded border border-white/10 bg-[#06070a] px-2 py-1.5 text-[11px] text-[#EDEEFF] placeholder-[#2E3554] outline-none focus:border-[#7C6DFA]/40"
            />
          </div>
        </div>
      )}
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
          reviews: parsed.reviews && typeof parsed.reviews === "object" ? parsed.reviews : base.reviews,
        },
        error: "",
      };
    } catch {
      return { state: base, error: "Could not read local planner data. Resetting to defaults." };
    }
  });

  const [state, setState] = useState<PlanningState>(boot.state);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loadError] = useState(boot.error);
  const [weekOpen, setWeekOpen] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newTaskInputs, setNewTaskInputs] = useState<Record<number, string>>({});

  // Persist
  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Auto-select today's day
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
      const dayTasks = tasksByDay.get(day) ?? [];
      perDay[day] = pct(dayTasks.filter((t) => t.status === "done").length, dayTasks.length);
    }
    for (let week = 1; week <= 4; week += 1) {
      const weekTasks = all.filter((t) => t.weekNumber === week);
      perWeek[week] = pct(weekTasks.filter((t) => t.status === "done").length, weekTasks.length);
    }
    return { total: pct(doneAll, all.length), perDay, perWeek };
  }, [state, tasksByDay]);

  const questions = buildWeeklyQuestions();

  // Helpers
  function setTaskStatus(id: string, status: TaskStatus) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
  }
  function setTaskNotes(id: string, notes: string) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, notes } : t)) }));
  }
  function setTaskUrl(id: string, resultUrl: string) {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, resultUrl } : t)) }));
  }
  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addCustomTask(day: number) {
    const title = (newTaskInputs[day] ?? "").trim();
    if (!title) return;
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
    setNewTaskInputs((prev) => ({ ...prev, [day]: "" }));
  }

  const todayTasks = todayDay ? (tasksByDay.get(todayDay) ?? []) : [];
  const todayEstimate = todayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const selectedTasks = tasksByDay.get(selectedDay) ?? [];

  return (
    <div className="flex min-h-0 flex-1 bg-[#06070a]">

      {loadError ? (
        <div className="m-4 rounded-lg border border-[#F0BF72]/25 bg-[#20190B] px-4 py-3 text-[12px] text-[#F0BF72]">
          {loadError}
        </div>
      ) : null}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="shrink-0 border-r border-white/8 bg-[#080a0d] overflow-y-auto"
        style={{ width: 260 }}
      >
        {/* Start date */}
        <div className="border-b border-white/8 px-3 py-3">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#3A4060]">Launch start</p>
          <input
            type="date"
            value={state.startDate}
            onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
            className="w-full rounded border border-white/10 bg-[#06070a] px-2 py-1.5 text-[11px] text-[#EDEEFF] outline-none focus:border-[#7C6DFA]/40"
          />
          {todayDay && (
            <p className="mt-1 font-mono text-[10px] text-[#7C6DFA]">Day {todayDay} of 30 active</p>
          )}
        </div>

        {/* Overall progress */}
        <div className="border-b border-white/8 px-3 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#4D5070]">Overall</span>
            <span className="font-mono text-[10px] font-semibold text-[#7C6DFA]">{progress.total}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[#7C6DFA] transition-all"
              style={{ width: `${progress.total}%` }}
            />
          </div>
        </div>

        {/* Week accordions */}
        <div className="py-1.5">
          {[1, 2, 3, 4].map((week) => {
            const start = (week - 1) * 7 + 1;
            const end = week === 4 ? 30 : week * 7;
            const days = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            const open = weekOpen[week] ?? true;
            return (
              <div key={week} className="border-b border-white/6 last:border-b-0">
                <button
                  onClick={() => setWeekOpen((p) => ({ ...p, [week]: !p[week] }))}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-1.5">
                    {open
                      ? <ChevronDown className="size-3 text-[#4D5070]" />
                      : <ChevronRight className="size-3 text-[#4D5070]" />
                    }
                    <span className="text-[12px] font-medium text-[#8E95C3]">Week {week}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full bg-[#7C6DFA]/60"
                        style={{ width: `${progress.perWeek[week]}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[#3A4060]">{progress.perWeek[week]}%</span>
                  </div>
                </button>
                {open && (
                  <div className="pb-1.5 pl-2 pr-2 space-y-0.5">
                    {days.map((day) => {
                      const dayTasks = tasksByDay.get(day) ?? [];
                      const isToday = todayDay === day;
                      const isSelected = selectedDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors ${
                            isSelected
                              ? "bg-[#7C6DFA]/15 text-[#EDEEFF]"
                              : "text-[#6B7399] hover:bg-white/[0.03] hover:text-[#9699BE]"
                          } ${isToday ? "border-l-2 border-l-[#7C6DFA] pl-1.5" : ""}`}
                        >
                          <span className="text-[11px]">Day {day}</span>
                          <div className="flex items-center gap-1.5">
                            <div className={`size-1.5 rounded-full ${dayStatusDot(dayTasks)}`} />
                            <span className="font-mono text-[9px] text-[#2E3554]">{progress.perDay[day]}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] space-y-3 px-5 py-5">

          {/* TODAY'S FOCUS */}
          {todayDay != null && (
            <div className="rounded-lg border border-white/8 bg-[#0c0e11] overflow-hidden">
              <SectionHeader
                label={`Today's focus — Day ${todayDay}`}
                collapsed={collapsed["today"] ?? false}
                onToggle={() => toggleSection("today")}
                right={
                  <span className="font-mono text-[10px] text-[#3A4060]">
                    {todayTasks.length} tasks · {todayEstimate}m
                  </span>
                }
              />
              {!(collapsed["today"]) && (
                <div className="border-t border-white/6 px-4 py-3 space-y-2">
                  {todayTasks.length === 0 ? (
                    <p className="text-[12px] text-[#3A4060]">No tasks for today.</p>
                  ) : (
                    todayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 rounded border border-white/6 bg-[#080a0d] px-3 py-2"
                      >
                        <div
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: statusColor(task.status) }}
                        />
                        <span className={`flex-1 text-[12px] ${task.status === "done" ? "line-through opacity-40" : "text-[#EDEEFF]"}`}>
                          {task.title}
                        </span>
                        <span className="font-mono text-[10px] text-[#2E3554]">{task.estimatedMinutes}m</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* DAY N CHECKLIST */}
          <div className="rounded-lg border border-white/8 bg-[#0c0e11] overflow-hidden">
            <SectionHeader
              label={`Day ${selectedDay} checklist`}
              collapsed={collapsed["checklist"] ?? false}
              onToggle={() => toggleSection("checklist")}
              right={
                <span className="font-mono text-[10px] text-[#3A4060]">
                  {progress.perDay[selectedDay]}% complete
                </span>
              }
            />
            {!(collapsed["checklist"]) && (
              <div className="border-t border-white/6 px-4 py-3 space-y-2">
                {selectedTasks.length === 0 ? (
                  <p className="text-[12px] text-[#3A4060]">No tasks for this day yet.</p>
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
                {/* Add custom task */}
                <div className="flex gap-2 pt-1">
                  <input
                    placeholder="Add custom task…"
                    value={newTaskInputs[selectedDay] ?? ""}
                    onChange={(e) =>
                      setNewTaskInputs((prev) => ({ ...prev, [selectedDay]: e.target.value }))
                    }
                    onKeyDown={(e) => { if (e.key === "Enter") addCustomTask(selectedDay); }}
                    className="flex-1 rounded border border-white/10 bg-[#06070a] px-2 py-1.5 text-[11px] text-[#EDEEFF] placeholder-[#2E3554] outline-none focus:border-[#7C6DFA]/40"
                  />
                  <button
                    onClick={() => addCustomTask(selectedDay)}
                    className="flex items-center gap-1 rounded border border-[#7C6DFA]/25 bg-[#7C6DFA]/10 px-2.5 py-1.5 text-[11px] text-[#9E91FF] hover:bg-[#7C6DFA]/20 transition-colors"
                  >
                    <Plus className="size-3" /> Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* METRICS TRACKER */}
          <div className="rounded-lg border border-white/8 bg-[#0c0e11] overflow-hidden">
            <SectionHeader
              label="Metrics tracker"
              collapsed={collapsed["metrics"] ?? false}
              onToggle={() => toggleSection("metrics")}
            />
            {!(collapsed["metrics"]) && (
              <div className="border-t border-white/6 px-4 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {state.metrics.map((metric) => {
                    const percent = metric.targetValue
                      ? pct(metric.currentValue ?? 0, metric.targetValue)
                      : metric.currentBool ? 100 : 0;
                    return (
                      <div key={metric.key} className="rounded-lg border border-white/8 bg-[#080a0d] p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[12px] text-[#EDEEFF]">{metric.label}</span>
                          <span className="font-mono text-[10px] text-[#7C6DFA]">{percent}%</span>
                        </div>
                        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/6">
                          <div
                            className="h-full rounded-full bg-[#7C6DFA]/60 transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {metric.targetBool ? (
                          <label className="flex items-center gap-2 text-[11px] text-[#8E95C3]">
                            <input
                              type="checkbox"
                              checked={Boolean(metric.currentBool)}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  metrics: s.metrics.map((m) =>
                                    m.key === metric.key ? { ...m, currentBool: e.target.checked } : m
                                  ),
                                }))
                              }
                            />
                            Posted
                          </label>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px]">
                            <input
                              type="number"
                              value={metric.currentValue ?? 0}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  metrics: s.metrics.map((m) =>
                                    m.key === metric.key ? { ...m, currentValue: Number(e.target.value) } : m
                                  ),
                                }))
                              }
                              className="w-24 rounded border border-white/10 bg-[#06070a] px-2 py-1 text-[#EDEEFF] outline-none focus:border-[#7C6DFA]/40"
                            />
                            <span className="text-[#3A4060]">/ {metric.targetValue}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* WEEKLY REVIEWS */}
          <div className="rounded-lg border border-white/8 bg-[#0c0e11] overflow-hidden">
            <SectionHeader
              label="Weekly reviews"
              collapsed={collapsed["reviews"] ?? false}
              onToggle={() => toggleSection("reviews")}
            />
            {!(collapsed["reviews"]) && (
              <div className="border-t border-white/6 px-4 py-3 space-y-4">
                {[1, 2, 3, 4].map((week) => (
                  <div key={week} className="rounded-lg border border-white/8 bg-[#080a0d] p-3">
                    <p className="mb-3 font-mono text-[11px] font-semibold text-[#8E95C3]">Week {week}</p>
                    <div className="space-y-3">
                      {questions.map((question) => (
                        <div key={`${week}-${question.key}`}>
                          <label className="mb-1 block text-[11px] text-[#4D5070]">{question.question}</label>
                          <textarea
                            value={state.reviews[week]?.[question.key] ?? ""}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                reviews: {
                                  ...s.reviews,
                                  [week]: { ...s.reviews[week], [question.key]: e.target.value },
                                },
                              }))
                            }
                            rows={2}
                            className="w-full rounded border border-white/10 bg-[#06070a] px-2 py-1.5 text-[11px] text-[#EDEEFF] outline-none focus:border-[#7C6DFA]/40 resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Standalone page wrapper ──────────────────────────────────────────────────

export function AdminPlanningDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-[#06070a] text-[#EDEEFF]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#06070a]/95 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">Marketing Planning</span>
            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#4D5070]">
              admin
            </span>
          </div>
          <Link
            href="/admin"
            className="rounded border border-white/10 px-3 py-1.5 text-[12px] text-[#8E95C3] hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Back to admin
          </Link>
        </div>
      </header>
      <AdminPlanningContent />
    </div>
  );
}
