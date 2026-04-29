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

const VARIANT_COPY: Record<EarlyAccessVariant, { title: string; subtitle: string; submitLabel: string; source: string }> = {
  pro: {
    title: "Join Pro early access",
    subtitle: "Cloud sync and hosted dashboard access are rolling out to approved solo builders.",
    submitLabel: "Join Pro early access",
    source: "homepage_pro",
  },
  builder: {
    title: "Join Builder early access",
    subtitle: "Multi-project control and advanced workflow access are rolling out to approved builder users.",
    submitLabel: "Join Builder early access",
    source: "homepage_builder",
  },
};

export function EarlyAccessModalTrigger({ label, className, variant = "pro" }: EarlyAccessModalTriggerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [agent, setAgent] = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const copy = VARIANT_COPY[variant];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const response = await fetch("/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        role,
        agent,
        useCase,
        source: copy.source,
      }),
    }).catch(() => null);

    if (!response) {
      setStatus("error");
      setMessage("Request failed. Please try again.");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
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
        <button type="button" className={className}>{label}</button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[680px] border border-white/12 bg-[#0B0D23] p-5 text-[#EDEEFF] shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:w-full sm:rounded-xl sm:p-7">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#EDEEFF]">{copy.title}</DialogTitle>
          <DialogDescription className="max-w-[56ch] text-[14px] leading-7 text-[#8E95C3]">
            {copy.subtitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-3.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="sm:col-span-2 rounded-lg border border-white/10 bg-[#090918] px-3.5 py-2.5 text-[16px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20 sm:text-[14px]"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (optional)"
            className="rounded-lg border border-white/10 bg-[#090918] px-3.5 py-2.5 text-[16px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20 sm:text-[14px]"
          />
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#090918] px-3.5 py-2.5 text-[16px] text-[#EDEEFF] outline-none focus:border-white/20 sm:text-[14px]"
          >
            <option value="">Agent (optional)</option>
            {AGENTS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input
            type="text"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Use case (optional)"
            className="sm:col-span-2 rounded-lg border border-white/10 bg-[#090918] px-3.5 py-2.5 text-[16px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20 sm:text-[14px]"
          />
          <div className="sm:col-span-2 mt-1 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60 sm:w-auto"
            >
              {status === "loading" ? "Submitting..." : copy.submitLabel}
            </button>
            {message && (
              <p className={`text-[12px] ${status === "success" ? "text-[#4DE8B0]" : "text-[#F0BF72]"}`}>
                {message}
              </p>
            )}
          </div>
          <p className="sm:col-span-2 text-[12px] text-[#6870A0]">Local CLI remains free and works without an account.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
