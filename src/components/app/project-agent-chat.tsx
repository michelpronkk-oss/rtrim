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

const SUGGESTIONS = [
  "What should I do next?",
  "Explain latest run",
  "Missing proof",
  "Safe contract",
  "Claude handoff",
  "Risky files",
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

function renderMessageText(text: string) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={`blank-${index}`} className="h-2" />;

        if (trimmed.startsWith("- ")) {
          return (
            <p key={`bullet-${index}`} className="pl-4 text-[13px] leading-[1.75] text-[#d6dbe4]">
              <span className="mr-2 text-[#8f98a8]">*</span>
              {trimmed.slice(2)}
            </p>
          );
        }

        if (/runtrim\s+(go|finish|sync|agent|bridge)/i.test(trimmed)) {
          return (
            <code
              key={`cmd-${index}`}
              className="block rounded-md border border-white/12 bg-[#111722] px-2.5 py-1.5 font-mono text-[11.5px] text-[#c4cbda]"
            >
              {trimmed}
            </code>
          );
        }

        return (
          <p key={`line-${index}`} className="text-[13px] leading-[1.75] text-[#d6dbe4]">
            {trimmed}
          </p>
        );
      })}
    </div>
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
  const [messages, setMessages] = useState<Message[]>([]);

  const hasConversation = messages.length > 0;
  const hasRuns = summary.recentRunsCount > 0;

  const latestRunLabel = summary.latestRunTask ?? "none";

  const contextStrip = useMemo(
    () => [
      `Recent runs ${summary.recentRunsCount}`,
      `Proof gaps ${summary.latestProofGaps}`,
      `Tokens saved ${formatNumber(summary.estimatedTokensSaved)}`,
      `Latest run ${latestRunLabel}`,
      `Cost saved ${formatCost(summary.estimatedCostSaved)}`,
    ],
    [
      latestRunLabel,
      summary.estimatedCostSaved,
      summary.estimatedTokensSaved,
      summary.latestProofGaps,
      summary.recentRunsCount,
    ],
  );

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading || !canUseAgent) return;

    setError(null);
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
      },
    ]);
    setInput("");

    try {
      const response = await fetch("/api/project-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const body = (await response.json()) as ProjectAgentResponse;
      const assistantText = body.answer;

      if (!response.ok || !body.ok || !assistantText) {
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
    <div className="mx-auto min-h-[calc(100vh-170px)] w-full max-w-[980px] px-1 pb-6 pt-3 sm:pt-6">
      <div className="flex min-h-full flex-col">
        {!hasConversation && (
          <section className="flex flex-col items-center px-2 pt-8 text-center sm:pt-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#666f81]">Project Agent</p>
            <h1 className="mt-2 max-w-[760px] text-[2rem] font-semibold tracking-[-0.03em] text-[#f5f7fb] sm:text-[2.4rem]">
              What should RunTrim help you understand?
            </h1>
            <p className="mt-3 max-w-[720px] text-[14px] leading-[1.75] text-[#98a1b3]">
              Ask about runs, risks, proof gaps, contracts, or your next safe action.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 font-mono text-[10.5px] text-[#7f889b]">
              <span>Synced context</span>
              <span>·</span>
              <span>Read-only</span>
              <span>·</span>
              <span>No code execution</span>
              {!hasRuns && (
                <>
                  <span>·</span>
                  <span>No synced runs yet</span>
                  <span>·</span>
                  <span>Connect CLI to unlock project memory</span>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {contextStrip.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/10 bg-[#0f141d] px-2.5 py-1 font-mono text-[10.5px] text-[#9aa3b6]"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {hasConversation && (
          <section className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-[#7f889b]">
            <span>Synced context</span>
            <span>·</span>
            <span>Read-only</span>
            <span>·</span>
            <span>No code execution</span>
          </section>
        )}

        {!canUseAgent && (
          <section className="mt-4 rounded-xl border border-[#7C6DFA]/26 bg-[#7C6DFA]/8 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#c3b8ff]">Pro required</p>
            <p className="mt-1 text-[13px] leading-[1.7] text-[#dfd8ff]">
              Project Agent is available on paid plans. Start a Pro trial to unlock project-aware chat and handoff suggestions.
            </p>
            <Link
              href="/app/trial"
              className="mt-3 inline-flex rounded-lg border border-[#7C6DFA]/35 bg-[#7C6DFA]/16 px-3.5 py-2 text-[12px] font-medium text-[#e5deff] transition-colors hover:bg-[#7C6DFA]/24"
            >
              Start 3-day Pro trial
            </Link>
          </section>
        )}

        <section className={`mt-5 flex-1 ${hasConversation ? "" : "flex flex-col"}`}>
          <div className={`${hasConversation ? "space-y-5" : "hidden"}`}>
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                  <div className={isUser ? "max-w-[88%] sm:max-w-[72%]" : "max-w-[96%] sm:max-w-[88%]"}>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6f7789]">
                      {isUser ? "You" : "Project Agent"}
                    </p>

                    {isUser ? (
                      <div className="rounded-2xl border border-[#7C6DFA]/34 bg-[#7C6DFA]/14 px-4 py-2.5 text-[13px] leading-[1.75] text-[#e2ddff]">
                        {renderMessageText(message.text)}
                      </div>
                    ) : (
                      <div className="px-1">{renderMessageText(message.text)}</div>
                    )}

                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 px-1">
                        {message.actions.map((action, index) => (
                          <span
                            key={`${message.id}-action-${index}`}
                            className="rounded-md border border-white/12 bg-[#111722] px-2.5 py-1 font-mono text-[11px] text-[#a7b0c0]"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <p className="font-mono text-[11px] text-[#9099ab]">Thinking through project context...</p>
            )}
          </div>

          {!hasConversation && (
            <div className="mt-auto pt-7 sm:pt-10">
              {!hasRuns && (
                <div className="mb-3 text-center">
                  <p className="text-[12.5px] text-[#9aa3b5]">
                    No synced runs yet. Run your first guarded task to unlock project memory.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <code className="rounded-md border border-white/12 bg-[#101621] px-2.5 py-1.5 font-mono text-[11px] text-[#c6cedd]">
                      runtrim go "your task"
                    </code>
                    <Link href="/app/connect" className="text-[12px] text-[#c3cbda] transition-colors hover:text-[#f2f5fb]">
                      Connect CLI
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            {error && <p className="mb-2 text-[12px] text-[#FFAC98]">{error}</p>}

            <form onSubmit={onSubmit}>
              <div className="rounded-[22px] border border-white/12 bg-[#0f151f] p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-[#7C6DFA]/46 focus-within:shadow-[0_0_0_1px_rgba(124,109,250,0.24)]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    rows={3}
                    placeholder={
                      canUseAgent
                        ? "Ask about your runs, risks, proof gaps, or next safe action..."
                        : "Upgrade to use Project Agent"
                    }
                    disabled={!canUseAgent || loading}
                    className="min-h-[72px] flex-1 resize-none bg-transparent px-2 py-1 text-[13.5px] leading-[1.65] text-[#f3f6fb] outline-none placeholder:text-[#697184] disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  <button
                    type="submit"
                    disabled={!canUseAgent || loading || !input.trim()}
                    className="h-10 rounded-xl bg-[#7C6DFA] px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loading ? "Thinking" : "Send"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={!canUseAgent || loading}
                  onClick={() => {
                    setInput(suggestion);
                    if (canUseAgent) {
                      void sendMessage(suggestion);
                    }
                  }}
                  className="rounded-full border border-white/12 bg-[#101620] px-3 py-1.5 text-[12px] text-[#c7cfdd] transition-colors hover:border-white/22 hover:bg-[#141c29] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <p className="mt-2 font-mono text-[10px] text-[#727b8e]">Press Enter to send. Use Shift+Enter for a new line.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
