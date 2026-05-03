"use client";

import { useState, useEffect } from "react";
import { Zap, CheckCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const PLAN_OPTIONS = ["Pro", "Builder", "Team", "Agent"] as const;
const WORKFLOW_OPTIONS = ["Claude Code", "Codex CLI", "Cursor", "Other"] as const;
const PAIN_OPTIONS = [
  "Token burn",
  "Lost context",
  "Scope drift",
  "Broken code",
  "Team control",
  "Other",
] as const;

type Plan = (typeof PLAN_OPTIONS)[number];
type Workflow = (typeof WORKFLOW_OPTIONS)[number];
type Pain = (typeof PAIN_OPTIONS)[number];

export default function EarlyAccessPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan | "">("");
  const [workflow, setWorkflow] = useState<Workflow | "">("");
  const [pain, setPain] = useState<Pain | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from Supabase session
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !plan) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        planInterest: plan,
        workflow: workflow || undefined,
        biggestPain: pain || undefined,
        notes: notes.trim() || undefined,
        source: "dashboard",
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Something went wrong. Try again.");
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Early Access</p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
          Join the waitlist.
        </h1>
        <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
          Pro, Builder, and Team plans are entering early access with cloud sync, hosted run history, and the RunTrim Agent. Tell us where you are and what matters most.
        </p>
      </div>

      {/* Plan feature overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { plan: "Pro",     desc: "Cloud memory, advanced reports, continuation packs, Agent early access." },
          { plan: "Builder", desc: "Project guardrails, risk scores, scope drift detection, project timelines." },
          { plan: "Team",    desc: "Shared workspaces, policies, GitHub checks, audit logs, team control." },
        ].map(({ plan: p, desc }) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlan(p as Plan)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              plan === p
                ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/10"
                : "border-white/8 bg-[#0C0C20] hover:border-white/14"
            }`}
          >
            <p className={`text-[13px] font-semibold ${plan === p ? "text-[#D3CBFF]" : "text-[#EDEEFF]"}`}>
              {p}
            </p>
            <p className="mt-1.5 text-[11px] leading-[1.6] text-[#5E6A88]">{desc}</p>
          </button>
        ))}
      </div>

      {sent ? (
        <div className="rounded-xl border border-[#4DE8B0]/18 bg-[#4DE8B0]/6 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-[#4DE8B0]/70" />
            <div>
              <p className="text-[14px] font-semibold text-[#EDEEFF]">
                You are on the list.
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.7] text-[#5E6A88]">
                We will reach out to{" "}
                <span className="font-mono text-[#C8D4DF]">{email}</span> when{" "}
                <span className="text-[#EDEEFF]">{plan}</span> access opens. Free CLI continues to work locally in the meantime.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0C0C20] px-4 py-3 font-mono text-[14px] text-[#EDEEFF] placeholder-[#2E3554] outline-none transition-colors focus:border-[#7C6DFA]/50"
              placeholder="you@example.com"
            />
          </div>

          {/* Plan interest — handled by cards above, show selected */}
          {plan && (
            <div className="flex items-center gap-2 rounded-lg border border-[#7C6DFA]/20 bg-[#7C6DFA]/8 px-4 py-2.5">
              <Zap className="size-3.5 text-[#9E91FF]/70" />
              <span className="font-mono text-[12px] text-[#9E91FF]">
                {plan} plan selected
              </span>
            </div>
          )}

          {/* Workflow */}
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
              Primary workflow
            </label>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_OPTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorkflow(w)}
                  className={`rounded-lg border px-3.5 py-2 text-[12px] transition-colors ${
                    workflow === w
                      ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/12 text-[#C4B8FF]"
                      : "border-white/8 text-[#7F84AE] hover:border-white/16 hover:text-[#C3C6E8]"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Biggest pain */}
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
              Biggest pain
            </label>
            <div className="flex flex-wrap gap-2">
              {PAIN_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPain(p)}
                  className={`rounded-lg border px-3.5 py-2 text-[12px] transition-colors ${
                    pain === p
                      ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/12 text-[#C4B8FF]"
                      : "border-white/8 text-[#7F84AE] hover:border-white/16 hover:text-[#C3C6E8]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
              Notes{" "}
              <span className="normal-case tracking-normal text-[#3A3F5A]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything specific you need, your team size, your stack..."
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0C0C20] px-4 py-3 text-[13px] text-[#EDEEFF] placeholder-[#2E3554] outline-none transition-colors focus:border-[#7C6DFA]/50"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[#FF5C5C]/18 bg-[#FF5C5C]/8 px-4 py-3 font-mono text-[12px] text-[#FF8F8F]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !plan}
            className="flex items-center gap-2.5 rounded-lg bg-[#7C6DFA] px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{
              boxShadow:
                "0 0 0 1px rgba(124,109,250,0.45), 0 8px 20px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {loading ? "Submitting..." : "Request early access"}
          </button>

          <p className="text-[12px] text-[#3A3F5A]">
            Free CLI continues to work locally without any account.
          </p>
        </form>
      )}
    </div>
  );
}
