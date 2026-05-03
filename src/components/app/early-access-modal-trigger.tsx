"use client";

import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trackWebEvent } from "@/lib/track-client";

const AGENTS = ["Claude Code", "Codex CLI", "Cursor", "ChatGPT", "Other"] as const;
const PLANS  = ["Pro", "Builder", "Team", "Agent"] as const;

type EarlyAccessVariant = "pro" | "builder";

interface EarlyAccessModalTriggerProps {
  label: string;
  className?: string;
  variant?: EarlyAccessVariant;
}

/* Shared input/select class — 16px prevents iOS auto-zoom */
const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#090918] px-3.5 py-3 text-[16px] leading-none text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-[#7C6DFA]/50 transition-colors sm:text-[14px]";

export function EarlyAccessModalTrigger({
  label,
  className,
  variant = "pro",
}: EarlyAccessModalTriggerProps) {
  const [email,        setEmail]        = useState("");
  const [planInterest, setPlanInterest] = useState("");
  const [agent,        setAgent]        = useState("");
  const [useCase,      setUseCase]      = useState("");
  const [status,       setStatus]       = useState<"idle" | "loading" | "success" | "error" | "approved">("idle");
  const [message,      setMessage]      = useState("");
  const [open,         setOpen]         = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        planInterest: planInterest || undefined,
        agent,
        useCase,
        source: variant === "builder" ? "homepage_builder" : "homepage_pro",
      }),
    }).catch(() => null);

    if (!response) {
      setStatus("error");
      setMessage("Request failed. Please try again.");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean; error?: string; message?: string; code?: string;
    };

    if (!response.ok || !body.ok) {
      setStatus(body.code === "approved" ? "approved" : "error");
      setMessage(body.error ?? "Could not submit your request.");
      return;
    }

    setStatus("success");
    setMessage("You are on the list. Check your inbox.");
    setEmail(""); setPlanInterest(""); setAgent(""); setUseCase("");
  }

  const title = variant === "builder"
    ? "Join Builder access"
    : "Join RunTrim early access";

  const subtitle = variant === "builder"
    ? "Project guardrails, risk scores, scope drift detection, and Agent early access for serious builders."
    : "Cloud sync, run history, and Agent early access are opening for approved builders. Free CLI stays local-first.";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) trackWebEvent("early_access_opened", { variant });
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {label}
        </button>
      </DialogTrigger>

      <DialogContent
        className={[
          "border border-white/12 bg-[#0B0D23] text-[#EDEEFF]",
          "shadow-[0_28px_80px_rgba(0,0,0,0.55)]",
          "max-w-[600px] rounded-xl p-7",
          "max-sm:p-5 max-sm:pb-8",
        ].join(" ")}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-[22px] font-semibold tracking-[-0.02em] text-[#EDEEFF] sm:text-[24px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-6 text-[#8E95C3] sm:text-[14px]">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          /* New submission — on the list */
          <div className="mt-5 rounded-xl border border-[#4DE8B0]/18 bg-[#4DE8B0]/6 px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4DE8B0]/70">
              Request received
            </p>
            <p className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
              You are on the list.
            </p>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
              Check your inbox for confirmation. We will reach out when your access is approved. Free CLI is available now without an account.
            </p>
          </div>
        ) : status === "approved" ? (
          /* Email already approved — direct to sign in */
          <div className="mt-5 rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8 px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9E91FF]/70">
              Access approved
            </p>
            <p className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
              Your access is already approved.
            </p>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
              Sign in to open your RunTrim dashboard.
            </p>
            <a
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ boxShadow: "0 4px 14px rgba(124,109,250,0.28)" }}
            >
              Sign in to RunTrim
            </a>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {/* Email */}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputCls}
          />

          {/* Plan interest pills */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">
              Plan interest (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlanInterest(planInterest === p ? "" : p)}
                  className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
                    planInterest === p
                      ? "border-[#7C6DFA]/45 bg-[#7C6DFA]/15 text-[#C4B8FF]"
                      : "border-white/10 text-[#5A6280] hover:border-white/18 hover:text-[#9699BE]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Agent */}
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className={inputCls}
            style={{ colorScheme: "dark" }}
          >
            <option value="">Primary agent (optional)</option>
            {AGENTS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Biggest challenge */}
          <input
            type="text"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Biggest challenge (optional)"
            className={inputCls}
          />

          {/* Error */}
          {status === "error" && message && (
            <p className="text-[12px] text-[#F0BF72]">{message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-[#7C6DFA] px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            style={{
              boxShadow: "0 0 0 1px rgba(124,109,250,0.4), 0 4px 16px rgba(124,109,250,0.20), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {status === "loading" ? "Submitting..." : "Request access"}
          </button>

          <p className="text-[11px] text-[#3A4060]">
            Free CLI is public and local-first. No account required.
          </p>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
