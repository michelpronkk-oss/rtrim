"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export function AdminPlanningDashboard() {
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

  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, PlanningTask[]>();
    for (let day = 1; day <= 30; day += 1) map.set(day, []);
    for (const t of state.tasks) map.get(t.dayNumber)?.push(t);
    for (const dayTasks of map.values()) dayTasks.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [state]);

  const todayDay = dayFromStart(state.startDate);

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

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#07071A]/95 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">Marketing Planning</span>
            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#4D5070]">admin</span>
          </div>
          <Link href="/admin" className="rounded border border-white/10 px-3 py-1.5 text-[12px] text-[#8E95C3] hover:border-white/20 hover:text-[#EDEEFF]">
            Back to admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-6 py-6">
        {loadError ? (
          <div className="rounded-lg border border-[#F0BF72]/25 bg-[#20190B] px-4 py-3 text-[12px] text-[#F0BF72]">{loadError}</div>
        ) : null}

        <section className="rounded-lg border border-white/8 bg-[#0C0D22] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Today&apos;s execution</h2>
            <span className="font-mono text-[11px] text-[#4D5070]">Total progress {progress.total}%</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] text-[#8E95C3]">
              {todayDay ? `Day ${todayDay} of 30` : "Set launch start date to activate daily focus."}
            </div>
            <div className="flex items-center gap-2">
              <label className="font-mono text-[11px] text-[#4D5070]">Launch start date</label>
              <input
                type="date"
                value={state.startDate}
                onChange={(e) => setState((s) => (s ? { ...s, startDate: e.target.value } : s))}
                className="rounded border border-white/10 bg-[#07071A] px-2 py-1.5 text-[12px] text-[#EDEEFF]"
              />
            </div>
          </div>
          {todayDay ? (
            <div className="mt-3 space-y-2">
              {(tasksByDay.get(todayDay) ?? []).map((task) => (
                <div key={task.id} className="rounded border border-white/8 bg-[#090A1D] px-3 py-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span>{task.title}</span>
                    <span className="font-mono text-[10px] text-[#4D5070]">{task.estimatedMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-[290px_1fr]">
          <aside className="rounded-lg border border-white/8 bg-[#0C0D22] p-3">
            <h3 className="mb-3 px-1 text-[13px] font-semibold">Execution Plan</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((week) => {
                const start = (week - 1) * 7 + 1;
                const end = week === 4 ? 30 : week * 7;
                return (
                  <div key={week} className="rounded border border-white/8 bg-[#090A1D] p-2">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <span className="text-[12px] font-medium">Week {week}</span>
                      <span className="font-mono text-[10px] text-[#4D5070]">{progress.perWeek[week]}%</span>
                    </div>
                    <div className="space-y-1">
                      {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((day) => (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] ${selectedDay === day ? "bg-[#171A3B] text-[#EDEEFF]" : "text-[#8E95C3] hover:bg-white/5"}`}
                        >
                          <span>Day {day}</span>
                          <span className="font-mono text-[10px] text-[#4D5070]">{progress.perDay[day]}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-lg border border-white/8 bg-[#0C0D22] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold">Day {selectedDay} checklist</h3>
                <span className="font-mono text-[11px] text-[#4D5070]">{progress.perDay[selectedDay]}% complete</span>
              </div>
              <div className="space-y-2">
                {(tasksByDay.get(selectedDay) ?? []).map((task) => {
                  const muted = task.status === "done";
                  return (
                    <div key={task.id} className={`rounded border border-white/8 bg-[#090A1D] p-3 ${muted ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            const next = e.target.value as TaskStatus;
                            setState((s) => s ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)) } : s);
                          }}
                          className="rounded border border-white/10 bg-[#0B0B1D] px-2 py-1 text-[11px]"
                        >
                          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <button
                          onClick={() => {
                            const next: TaskStatus = task.status === "done" ? "todo" : "done";
                            setState((s) => s ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)) } : s);
                          }}
                          className="rounded border border-white/10 px-2 py-1 text-[11px] text-[#8E95C3] hover:text-[#EDEEFF]"
                        >
                          {task.status === "done" ? "Undo" : "Mark done"}
                        </button>
                        <span className="text-[12px] font-medium">{task.title}</span>
                        <span className="font-mono text-[10px] text-[#4D5070]">{task.platform} | {task.category} | {task.estimatedMinutes}m</span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-[#8E95C3]">{task.description}</p>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <input
                          placeholder="Notes"
                          value={task.notes}
                          onChange={(e) => setState((s) => s ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, notes: e.target.value } : t)) } : s)}
                          className="rounded border border-white/10 bg-[#0B0B1D] px-2 py-1.5 text-[12px]"
                        />
                        <input
                          placeholder="Result URL"
                          value={task.resultUrl}
                          onChange={(e) => setState((s) => s ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, resultUrl: e.target.value } : t)) } : s)}
                          className="rounded border border-white/10 bg-[#0B0B1D] px-2 py-1.5 text-[12px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-white/8 bg-[#0C0D22] p-4">
              <h3 className="mb-3 text-[14px] font-semibold">Metrics tracker</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {state.metrics.map((metric) => {
                  const percent = metric.targetValue ? pct(metric.currentValue ?? 0, metric.targetValue) : (metric.currentBool ? 100 : 0);
                  return (
                    <div key={metric.key} className="rounded border border-white/8 bg-[#090A1D] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[12px]">{metric.label}</span>
                        <span className="font-mono text-[10px] text-[#4D5070]">{percent}%</span>
                      </div>
                      {metric.targetBool ? (
                        <label className="flex items-center gap-2 text-[12px] text-[#8E95C3]">
                          <input
                            type="checkbox"
                            checked={Boolean(metric.currentBool)}
                            onChange={(e) => setState((s) => s ? { ...s, metrics: s.metrics.map((m) => (m.key === metric.key ? { ...m, currentBool: e.target.checked } : m)) } : s)}
                          />
                          Posted
                        </label>
                      ) : (
                        <div className="flex items-center gap-2 text-[12px]">
                          <input
                            type="number"
                            value={metric.currentValue ?? 0}
                            onChange={(e) => setState((s) => s ? { ...s, metrics: s.metrics.map((m) => (m.key === metric.key ? { ...m, currentValue: Number(e.target.value) } : m)) } : s)}
                            className="w-28 rounded border border-white/10 bg-[#0B0B1D] px-2 py-1"
                          />
                          <span className="text-[#4D5070]">/ {metric.targetValue}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-white/8 bg-[#0C0D22] p-4">
              <h3 className="mb-3 text-[14px] font-semibold">Weekly reviews</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((week) => (
                  <div key={week} className="rounded border border-white/8 bg-[#090A1D] p-3">
                    <p className="mb-2 text-[12px] font-medium">Week {week}</p>
                    <div className="space-y-2">
                      {questions.map((question) => (
                        <div key={`${week}-${question.key}`}>
                          <label className="mb-1 block text-[11px] text-[#8E95C3]">{question.question}</label>
                          <textarea
                            value={state.reviews[week]?.[question.key] ?? ""}
                            onChange={(e) => setState((s) => {
                              if (!s) return s;
                              return {
                                ...s,
                                reviews: {
                                  ...s.reviews,
                                  [week]: {
                                    ...s.reviews[week],
                                    [question.key]: e.target.value,
                                  },
                                },
                              };
                            })}
                            rows={2}
                            className="w-full rounded border border-white/10 bg-[#0B0B1D] px-2 py-1.5 text-[12px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
