"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function StatusSubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/status-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage("Could not subscribe right now. Please try again.");
        return;
      }
      setState("success");
      setMessage("Subscribed. We will send status updates to this email.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Could not subscribe right now. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-wrap gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className="h-[38px] min-w-[240px] rounded-[7px] border border-white/14 bg-transparent px-3 text-[13px] text-[#f4f5f7] outline-none placeholder:text-[#5a5f68] focus:border-white/30"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex h-[38px] items-center gap-2 rounded-[7px] border border-white bg-[#f4f5f7] px-4 text-[13px] font-medium text-[#0b0d10] transition hover:bg-white disabled:opacity-60"
      >
        {state === "loading" ? "Subscribing..." : "Subscribe via email"}
        <ArrowRight className="size-3.5" />
      </button>
      <p className={`w-full text-[12px] ${state === "error" ? "text-[#F0BF72]" : "text-[#5a5f68]"}`}>
        {message || "We only send incident, maintenance, and postmortem updates."}
      </p>
    </form>
  );
}

