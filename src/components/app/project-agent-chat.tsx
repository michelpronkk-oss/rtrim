"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

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
      "Project Agent is grounded in your synced RunTrim context.",
      "",
      "Current context:",
      `- Recent runs: ${summary.recentRunsCount}`,
      `- Latest run: ${latestTask}`,
      `- Latest risk: ${latestRisk}`,
      `- Latest proof gaps: ${summary.latestProofGaps}`,
      "",
      "Ask for next safe action, run explanation, proof gaps, contract suggestions, or a Claude/Codex handoff.",
    ].join("\n"),
  };
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

  const stats = useMemo(
    () => [
      { label: "Recent runs", value: String(summary.recentRunsCount) },
      { label: "Latest run", value: summary.latestRunTask ?? "None" },
      { label: "Proof gaps", value: String(summary.latestProofGaps) },
      { label: "Estimated tokens saved", value: formatNumber(summary.estimatedTokensSaved) },
      { label: "Estimated cost saved", value: formatCost(summary.estimatedCostSaved) },
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/8 bg-[#0c0f13] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Project Agent</p>
        <h1 className="mt-1 text-[1.45rem] font-bold tracking-[-0.02em] text-[#f4f5f7] sm:text-[1.6rem]">Project Agent</h1>
        <p className="mt-2 max-w-[740px] text-[13px] leading-[1.7] text-[#8a8f98]">
          Ask RunTrim about your runs, risks, proof gaps, and next safe action.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/6 bg-[#0c0e11] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">{stat.label}</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-[#f4f5f7]">{stat.value}</p>
          </div>
        ))}
      </section>

      {!canUseAgent && (
        <section className="rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/6 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a78bfa]/80">Pro required</p>
          <p className="mt-1 text-[13px] text-[#d8d0ff]">
            Project Agent is available on paid plans. Start a Pro trial to ask about run history, proof gaps, and safe contracts.
          </p>
          <Link
            href="/app/trial"
            className="mt-3 inline-flex rounded-lg border border-[#7C6DFA]/35 bg-[#7C6DFA]/14 px-3.5 py-2 text-[12px] font-medium text-[#d8d0ff] transition-colors hover:bg-[#7C6DFA]/20"
          >
            Start 3-day Pro trial
          </Link>
        </section>
      )}

      <section className="rounded-xl border border-white/8 bg-[#0c0f13] p-4 sm:p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">Suggested prompts</p>
        <div className="flex flex-wrap gap-2">
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
              className="rounded-lg border border-white/10 bg-[#11151b] px-3 py-1.5 text-left text-[12px] text-[#c5cad3] transition-colors hover:border-white/20 hover:bg-[#141923] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0f13] p-4 sm:p-5">
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "assistant" ? "rounded-lg border border-white/8 bg-[#10141a] px-3 py-3" : "rounded-lg border border-[#7C6DFA]/25 bg-[#7C6DFA]/8 px-3 py-3"}
            >
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">
                {message.role === "assistant" ? "Project Agent" : "You"}
              </p>
              <p className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.7] text-[#d3d8e2]">{message.text}</p>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.actions.map((action, index) => (
                    <p key={`${message.id}-action-${index}`} className="font-mono text-[11px] text-[#9fa6b4]">
                      {action}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-[12px] text-[#FFAC98]">{error}</p>
        )}

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={canUseAgent ? "Ask about your latest run, risks, proof, or next safe action" : "Upgrade to use Project Agent"}
            disabled={!canUseAgent || loading}
            className="h-10 flex-1 rounded-lg border border-white/10 bg-[#10141a] px-3 text-[13px] text-[#f4f5f7] outline-none transition-colors placeholder:text-[#5a5f68] focus:border-[#7C6DFA]/45 disabled:cursor-not-allowed disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={!canUseAgent || loading || !input.trim()}
            className="h-10 rounded-lg bg-[#7C6DFA] px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
