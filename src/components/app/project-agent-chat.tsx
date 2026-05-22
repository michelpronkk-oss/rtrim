"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type ProjectAgentSummary = {
  recentRunsCount: number;
  latestRunTask: string | null;
  latestRunRisk: string | null;
  latestProofGaps: number;
  estimatedTokensSaved: number;
  estimatedCostSaved: number;
};

type ProjectAgentResponse = {
  ok: boolean;
  answer?: string;
  actions?: string[];
  contextUsed?: Record<string, unknown>;
  error?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: string[];
};

const SUGGESTED_PROMPTS = [
  "What should I do next?",
  "Explain my latest run",
  "What proof is missing?",
  "Create a safe contract",
  "Create a Claude handoff",
  "Which files are risky?",
];

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `~${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `~${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function formatCost(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return "$0.00";
}

function initialAssistantMessage(summary: ProjectAgentSummary): Message {
  const latestTask = summary.latestRunTask ?? "No synced run yet";
  const latestRisk = summary.latestRunRisk ?? "not captured";

  return {
    id: "intro",
    role: "assistant",
    text: [
      "Ask about your latest run, proof gaps, risk areas, or next safe action.",
      "",
      "Synced context snapshot:",
      `- Recent runs: ${summary.recentRunsCount}`,
      `- Latest run: ${latestTask}`,
      `- Latest risk: ${latestRisk}`,
      `- Latest proof gaps: ${summary.latestProofGaps}`,
    ].join("\n"),
  };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/7 bg-[#0d1016] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#596070]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-[#f4f5f7]">{value}</p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/12 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f97a7]">
      {label}
    </span>
  );
}

export function ProjectAgentChat({
  canUseAgent,
  summary,
}: {
  canUseAgent: boolean;
  summary: ProjectAgentSummary;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => [initialAssistantMessage(summary)]);

  const hasRuns = summary.recentRunsCount > 0;

  const stats = useMemo(
    () => [
      { label: "Recent runs", value: String(summary.recentRunsCount) },
      { label: "Latest run", value: summary.latestRunTask ?? "No synced run yet" },
      { label: "Proof gaps", value: String(summary.latestProofGaps) },
      { label: "Tokens saved", value: formatNumber(summary.estimatedTokensSaved) },
      { label: "Cost saved", value: formatCost(summary.estimatedCostSaved) },
    ],
    [summary],
  );

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading || !canUseAgent) return;

    setError(null);
    setLoading(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api/project-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const body = (await response.json()) as ProjectAgentResponse;

      if (!response.ok || !body.ok || !body.answer) {
        setError("Could not get a Project Agent response. Try again in a moment.");
        return;
      }

      const assistantText = body.answer;
      if (!assistantText) {
        setError("Could not get a Project Agent response. Try again in a moment.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: assistantText,
          actions: body.actions,
        },
      ]);
    } catch {
      setError("Could not get a Project Agent response. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && input.trim()) {
        void sendMessage(input);
      }
    }
  }

  return (
    <div className="space-y-6 pb-2">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f15] px-5 py-5 sm:px-6 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,109,250,0.22) 0%, rgba(124,109,250,0) 70%)" }}
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a6070]">Project Agent</p>
        <h1 className="mt-1 text-[1.55rem] font-bold tracking-[-0.03em] text-[#f5f7fa] sm:text-[1.8rem]">
          Project Agent
        </h1>
        <p className="mt-2 max-w-[820px] text-[13px] leading-[1.8] text-[#8b93a3]">
          Your project-aware RunTrim agent for runs, risks, proof gaps, contracts, and handoffs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill label="Synced context" />
          <StatusPill label="Read-only" />
          <StatusPill label="No code execution" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </section>

      {!canUseAgent && (
        <section className="rounded-xl border border-[#7C6DFA]/26 bg-[#7C6DFA]/7 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#b8abff]">Pro required</p>
          <p className="mt-1 text-[13px] leading-[1.7] text-[#ddd6ff]">
            Project Agent is available on paid plans. Start a Pro trial to unlock project-aware guidance and handoff suggestions.
          </p>
          <Link
            href="/app/trial"
            className="mt-3 inline-flex rounded-lg border border-[#7C6DFA]/35 bg-[#7C6DFA]/14 px-3.5 py-2 text-[12px] font-medium text-[#e3dcff] transition-colors hover:bg-[#7C6DFA]/22"
          >
            Start 3-day Pro trial
          </Link>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="flex min-h-[560px] flex-col rounded-2xl border border-white/10 bg-[#0b0f15]">
          <div className="border-b border-white/8 px-4 py-3 sm:px-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a6070]">Suggested prompts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!canUseAgent || loading}
                  onClick={() => {
                    setInput(prompt);
                    if (canUseAgent) {
                      void sendMessage(prompt);
                    }
                  }}
                  className="rounded-lg border border-white/12 bg-[#121721] px-3 py-1.5 text-[12px] text-[#c7cdd8] transition-colors hover:border-white/20 hover:bg-[#171d28] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {!hasRuns && (
                <div className="rounded-xl border border-white/10 bg-[#10151e] px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a7283]">No synced runs yet</p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-[#a5adbc]">
                    Connect the CLI and run your first guarded task to unlock project memory.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href="/app/connect"
                      className="rounded-md border border-white/14 bg-white/[0.02] px-3 py-1.5 text-[12px] text-[#d5dbe7] transition-colors hover:border-white/22"
                    >
                      Connect CLI
                    </Link>
                    <code className="font-mono text-[11px] text-[#8a92a3]">runtrim go "your task"</code>
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        isUser
                          ? "max-w-[92%] rounded-xl border border-[#7C6DFA]/35 bg-[#7C6DFA]/12 px-4 py-3 sm:max-w-[78%]"
                          : "max-w-[92%] rounded-xl border border-white/10 bg-[#111722] px-4 py-3 sm:max-w-[84%]"
                      }
                    >
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6b7283]">
                        {isUser ? "You" : "Project Agent"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[12.8px] leading-[1.75] text-[#d5dbe6]">
                        {message.text}
                      </p>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {message.actions.map((action, index) => (
                            <p
                              key={`${message.id}-action-${index}`}
                              className="rounded border border-white/10 bg-[#0e131c] px-2 py-1 font-mono text-[11px] text-[#a1a9b9]"
                            >
                              {action}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-white/10 bg-[#111722] px-4 py-3">
                    <p className="font-mono text-[11px] text-[#9199aa]">Project Agent is thinking...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/8 px-4 py-3 sm:px-5">
              {error && <p className="mb-2 text-[12px] text-[#FFAC98]">{error}</p>}
              <form onSubmit={onSubmit}>
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    rows={2}
                    placeholder={
                      canUseAgent
                        ? "Ask about your runs, risks, proof gaps, or next safe action..."
                        : "Upgrade to use Project Agent"
                    }
                    disabled={!canUseAgent || loading}
                    className="min-h-[54px] flex-1 resize-none rounded-xl border border-white/12 bg-[#0f141d] px-3 py-2 text-[13px] text-[#f4f5f7] outline-none transition-colors placeholder:text-[#616979] focus:border-[#7C6DFA]/45 disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  <button
                    type="submit"
                    disabled={!canUseAgent || loading || !input.trim()}
                    className="h-[54px] rounded-xl bg-[#7C6DFA] px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loading ? "Thinking" : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-[#0c1016] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a6070]">Project state</p>
            <div className="mt-3 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#8c94a4]">Recent runs</span>
                <span className="font-mono text-[#dde2ea]">{summary.recentRunsCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#8c94a4]">Latest risk</span>
                <span className="font-mono text-[#dde2ea]">{summary.latestRunRisk ?? "not captured"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#8c94a4]">Latest proof gaps</span>
                <span className="font-mono text-[#dde2ea]">{summary.latestProofGaps}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0c1016] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a6070]">Quick actions</p>
            <div className="mt-3 space-y-2">
              {SUGGESTED_PROMPTS.slice(1).map((prompt) => (
                <button
                  key={`quick-${prompt}`}
                  type="button"
                  disabled={!canUseAgent || loading}
                  onClick={() => {
                    setInput(prompt);
                    if (canUseAgent) {
                      void sendMessage(prompt);
                    }
                  }}
                  className="w-full rounded-lg border border-white/12 bg-[#111722] px-3 py-2 text-left text-[12px] text-[#c8cfd9] transition-colors hover:border-white/20 hover:bg-[#171d28] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0c1016] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a6070]">Guardrails</p>
            <div className="mt-3 space-y-2 text-[12px] text-[#b7becc]">
              <p>Read-only project guidance</p>
              <p>No execution or deployment actions</p>
              <p>Uses synced project context and run history</p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
