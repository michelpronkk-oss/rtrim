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

interface EarlyAccessModalTriggerProps {
  label: string;
  className?: string;
}

export function EarlyAccessModalTrigger({ label, className }: EarlyAccessModalTriggerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [agent, setAgent] = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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
        source: "homepage",
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
        <button className={className}>{label}</button>
      </DialogTrigger>
      <DialogContent className="max-w-[560px] border border-white/10 bg-[#0C0C20] p-6 text-[#EDEEFF]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-semibold text-[#EDEEFF]">Join Pro early access</DialogTitle>
          <DialogDescription className="text-[13px] leading-6 text-[#8E95C3]">
            Cloud sync and hosted memory are rolling out to approved early users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-white/10 bg-[#090918] px-3 py-2 text-[13px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (optional)"
            className="rounded-lg border border-white/10 bg-[#090918] px-3 py-2 text-[13px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20"
          />
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#090918] px-3 py-2 text-[13px] text-[#EDEEFF] outline-none focus:border-white/20"
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
            className="rounded-lg border border-white/10 bg-[#090918] px-3 py-2 text-[13px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20"
          />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {status === "loading" ? "Submitting..." : "Join early access"}
            </button>
            {message && (
              <p className={`text-[12px] ${status === "success" ? "text-[#4DE8B0]" : "text-[#F0BF72]"}`}>
                {message}
              </p>
            )}
          </div>
          <p className="sm:col-span-2 text-[11px] text-[#6870A0]">Free local CLI does not require an account.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
