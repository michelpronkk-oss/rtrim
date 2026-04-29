"use client";

import { FormEvent, useState } from "react";
import { CopyButton } from "@/components/app/copy-button";

const AGENTS = ["Claude", "Codex", "Cursor", "ChatGPT", "Other"] as const;

export function EarlyAccessForm() {
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
    setMessage(body.message || "You are on the early access list.");
    setEmail("");
    setRole("");
    setAgent("");
    setUseCase("");
  }

  return (
    <section id="early-access" className="rounded-xl border border-white/8 bg-[#0C0C20] p-6">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4D5070]">Pro early access</p>
        <h3 className="mt-2 text-[19px] font-semibold text-[#EDEEFF]">Join Pro early access</h3>
        <p className="mt-2 text-[13px] leading-6 text-[#6870A0]">
          Free local CLI does not require an account. Cloud sync and hosted dashboard are Pro early access.
        </p>
      </div>

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
            {status === "loading" ? "Submitting..." : "Join Pro early access"}
          </button>
          {message && (
            <p className={`text-[12px] ${status === "success" ? "text-[#4DE8B0]" : "text-[#F0BF72]"}`}>
              {message}
            </p>
          )}
        </div>
      </form>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/8 bg-[#090918] px-3 py-2">
        <code className="font-mono text-[11px] text-[#6870A0]">npm install -g runtrim</code>
        <CopyButton text="npm install -g runtrim" label="Copy" />
      </div>
    </section>
  );
}
