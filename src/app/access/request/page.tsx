"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { RunTrimLogo } from "@/components/app/runtrim-logo";

const PLAN_OPTIONS = ["Pro", "Builder", "Team", "Agent"] as const;

export default function AccessRequestPage() {
  const [email, setEmail]   = useState("");
  const [plan, setPlan]     = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        planInterest: plan || undefined,
        source: "access-request",
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Something went wrong. Try again.");
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#08090b]">
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,9,11,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-6">
          <Link href="/" className="no-underline">
            <RunTrimLogo size={20} />
          </Link>
          <Link href="/app/install" className="text-[12px] text-[#8a8f98] transition-colors hover:text-[#f4f5f7]">
            Install free CLI
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[460px] rounded-[10px] border border-white/10 bg-[#0c0e11] p-6 sm:p-7">

          <div className="mb-6 flex size-10 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <Shield className="size-5 text-[#9E91FF]/70" />
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">
            Invite only
          </p>

          {!done ? (
            <>
              <h1 className="mt-2 text-[1.7rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
                Request access to RunTrim.
              </h1>
              <p className="mt-3 text-[13px] leading-[1.75] text-[#5E6A88]">
                RunTrim cloud dashboard is now available for live plans. The free CLI remains local-first, and cloud features are available directly in Pro, Builder, and Team.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-white/10 bg-[#0C0C20] px-4 py-3 font-mono text-[14px] text-[#EDEEFF] placeholder-[#2E3554] outline-none transition-colors focus:border-[#7C6DFA]/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]">
                    Plan interest
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLAN_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(plan === p ? "" : p)}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                          plan === p
                            ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/12 text-[#C4B8FF]"
                            : "border-white/8 text-[#7F84AE] hover:border-white/16"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-[#FF5C5C]/18 bg-[#FF5C5C]/8 px-4 py-3 font-mono text-[12px] text-[#FF8F8F]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C6DFA] px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(124,109,250,0.45), 0 8px 20px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  {loading ? "Submitting..." : "Get started"}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>

              <div className="mt-8 border-t border-white/6 pt-6">
                <p className="text-[12px] text-[#3A3F5A]">
                  Free CLI works locally without an account.
                </p>
                <Link
                  href="/app/install"
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#6870A0] transition-colors hover:text-[#9E91FF]"
                >
                  Install free CLI
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-4">
              <h1 className="text-[1.7rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
                Request received.
              </h1>
              <p className="mt-3 text-[13px] leading-[1.75] text-[#5E6A88]">
                We will review your request and reach out to{" "}
                <span className="font-mono text-[#C8D4DF]">{email}</span> when access is available.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/install"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ boxShadow: "0 4px 16px rgba(124,109,250,0.28)" }}
                >
                  Install free CLI
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                >
                  Back to home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
