"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

interface AppAccessGateCardProps {
  accessConfigured: boolean;
  nextPath: string;
}

export function AppAccessGateCard({ accessConfigured, nextPath }: AppAccessGateCardProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessConfigured) {
      setStatus("error");
      setMessage("Dashboard access is not configured.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/app-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);

    if (!response) {
      setStatus("error");
      setMessage("Could not verify access right now.");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !body.ok) {
      setStatus("error");
      setMessage(body.error || "Invalid access code.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <section className="surface-panel rounded-xl border border-white/10 p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Private beta access</p>
      <h1 className="mt-2 text-[25px] font-bold tracking-[-0.03em] text-[#EDEEFF]">RunTrim Cloud is in private beta</h1>
      <p className="mt-3 max-w-[640px] text-[13px] leading-6 text-[#9AA7B6]">
        The local CLI is free and does not require an account. Cloud memory and hosted run history are currently available to approved testers.
      </p>
      {!accessConfigured ? (
        <p className="mt-3 text-[12px] text-[#F0BF72]">Dashboard access is not configured.</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-[12px] font-medium text-[#C0C2E8]" htmlFor="access-code">Access code</label>
        <input
          id="access-code"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter access code"
          className="w-full rounded-lg border border-white/10 bg-[#090918] px-3 py-2.5 text-[13px] text-[#EDEEFF] outline-none placeholder:text-[#4D5070] focus:border-white/20"
          required
          disabled={!accessConfigured}
        />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={status === "loading" || !accessConfigured}
            className="rounded-lg bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {status === "loading" ? "Checking..." : "Open dashboard"}
          </button>
          <Link
            href="/app/install"
            className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-[#A9B3C7] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Install CLI
          </Link>
          <EarlyAccessModalTrigger
            label="Join Pro early access"
            className="text-[13px] text-[#8E95C3] transition-colors hover:text-[#C4B8FF]"
          />
        </div>
        {message ? <p className="text-[12px] text-[#F0BF72]">{message}</p> : null}
      </form>
    </section>
  );
}
