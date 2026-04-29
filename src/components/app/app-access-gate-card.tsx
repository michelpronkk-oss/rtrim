"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

interface AppAccessGateCardProps {
  accessConfigured: boolean;
  nextPath: string;
  showDevNote: boolean;
}

export function AppAccessGateCard({ accessConfigured, nextPath, showDevNote }: AppAccessGateCardProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessConfigured) {
      setStatus("error");
      setMessage("Cloud dashboard access is temporarily unavailable.");
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
      setMessage(body.error || "That access code is not valid.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0A0C21] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#6C779A]">PRIVATE BETA</p>
          <h1 className="mt-2 text-[31px] font-bold leading-tight tracking-[-0.03em] text-[#EDEEFF]">RunTrim Cloud is in private beta</h1>
          <p className="mt-4 max-w-[56ch] text-[14px] leading-7 text-[#9AA7B6]">
            The local CLI is free and does not require an account. Hosted memory and synced run history are currently available to approved testers.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/app/install"
              className="rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
            <EarlyAccessModalTrigger
              label="Join Pro early access"
              variant="pro"
              className="rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#AEB8CA] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0E1128] p-4 sm:p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#A9B3C7]">Approved tester?</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
            <button
              type="submit"
              disabled={status === "loading" || !accessConfigured}
              className="w-full rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {status === "loading" ? "Checking..." : "Open dashboard"}
            </button>
            <p className="text-[11px] leading-5 text-[#6F7A9A]">Cloud sync stores metadata only. Source code stays local.</p>
            {!accessConfigured ? <p className="text-[12px] text-[#F0BF72]">Cloud dashboard access is temporarily unavailable.</p> : null}
            {showDevNote ? (
              <p className="text-[11px] text-[#7281A3]">Development note: RUNTRIM_APP_ACCESS_CODE is not configured.</p>
            ) : null}
            {message ? <p className="text-[12px] text-[#F0BF72]">{message}</p> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
