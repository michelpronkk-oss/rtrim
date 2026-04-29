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

const AGENTS = ["Claude", "Codex", "Cursor", "ChatGPT", "Other"] as const;

type EarlyAccessVariant = "pro" | "builder";

interface EarlyAccessModalTriggerProps {
  label: string;
  className?: string;
  variant?: EarlyAccessVariant;
}

const VARIANT_COPY: Record<
  EarlyAccessVariant,
  { title: string; subtitle: string; submitLabel: string; source: string }
> = {
  pro: {
    title: "Join Pro early access",
    subtitle:
      "Cloud sync and hosted dashboard access are rolling out to approved solo builders.",
    submitLabel: "Join Pro early access",
    source: "homepage_pro",
  },
  builder: {
    title: "Join Builder early access",
    subtitle:
      "Multi-project control and advanced workflow access are rolling out to approved builder users.",
    submitLabel: "Join Builder early access",
    source: "homepage_builder",
  },
};

/* Shared input class — font-size 16px prevents iOS auto-zoom on focus */
const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#090918] px-3.5 py-3 text-[16px] leading-none text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-[#7C6DFA]/50 transition-colors sm:text-[14px]";

export function EarlyAccessModalTrigger({
  label,
  className,
  variant = "pro",
}: EarlyAccessModalTriggerProps) {
  const [email, setEmail]     = useState("");
  const [role, setRole]       = useState("");
  const [agent, setAgent]     = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const copy = VARIANT_COPY[variant];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role, agent, useCase, source: copy.source }),
    }).catch(() => null);

    if (!response) {
      setStatus("error");
      setMessage("Request failed. Please try again.");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (!response.ok || !body.ok) {
      setStatus("error");
      setMessage(body.error || "Could not submit your request.");
      return;
    }

    setStatus("success");
    setMessage("You are on the list. Check your inbox for confirmation.");
    setEmail("");
    setRole("");
    setAgent("");
    setUseCase("");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {label}
        </button>
      </DialogTrigger>

      <DialogContent
        className={[
          /* Desktop: centred card */
          "border border-white/12 bg-[#0B0D23] text-[#EDEEFF]",
          "shadow-[0_28px_80px_rgba(0,0,0,0.55)]",
          "max-w-[640px] rounded-xl p-7",
          /* Mobile overrides handled by the @media rule in globals.css —
             DialogContent becomes a bottom sheet with no transform.
             We only need to set sensible padding here. */
          "max-sm:p-5 max-sm:pb-8",
        ].join(" ")}
      >
        {/* Mobile drag handle — visual affordance for a bottom sheet */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-[22px] font-semibold tracking-[-0.02em] text-[#EDEEFF] sm:text-[24px]">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-6 text-[#8E95C3] sm:text-[14px]">
            {copy.subtitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {/* Email — full width, required */}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputCls}
          />

          {/* Role + Agent side by side on sm+ */}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              autoComplete="organization-title"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (optional)"
              className={inputCls}
            />
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className={inputCls}
              style={{ colorScheme: "dark" }}
            >
              <option value="">Agent (optional)</option>
              {AGENTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Use case — full width */}
          <input
            type="text"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Use case (optional)"
            className={inputCls}
          />

          {/* Submit row */}
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-[#7C6DFA] px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60 sm:w-auto"
            >
              {status === "loading" ? "Submitting..." : copy.submitLabel}
            </button>
            {message && (
              <p
                className={`text-[12px] leading-snug ${
                  status === "success" ? "text-[#4DE8B0]" : "text-[#F0BF72]"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          <p className="text-[11px] text-[#4A5270]">
            Local CLI remains free and works without an account.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
