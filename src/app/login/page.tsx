"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowRight } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError("Sign-in link expired or invalid. Request a new one.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase  = getSupabaseBrowserClient();
    const nextParam = searchParams.get("next");
    // Only forward relative paths to prevent open-redirect abuse
    const safeNext  = nextParam && nextParam.startsWith("/") ? nextParam : null;
    const callbackUrl = safeNext
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${window.location.origin}/auth/callback`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callbackUrl },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many sign-in attempts. Wait a few minutes and try again.");
      } else if (msg.includes("invalid email") || msg.includes("unable to validate")) {
        setError("Enter a valid email address.");
      } else {
        setError("Could not send sign-in link. Try again in a moment.");
      }
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#07071A]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#07071A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <Link
            href="/app/install"
            className="text-[13px] text-[#4D5070] transition-colors hover:text-[#EDEEFF]"
          >
            Install CLI
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">

          {/* Label */}
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">
            RunTrim Dashboard
          </p>

          {!sent ? (
            <>
              <h1 className="text-[1.7rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
                Sign in to continue.
              </h1>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
                Enter your email. We send a sign-in link. No password required.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-3">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#4D5070]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-white/10 bg-[#0C0C20] px-4 py-3 font-mono text-[14px] text-[#EDEEFF] placeholder-[#2E3554] outline-none transition-colors focus:border-[#7C6DFA]/50 focus:ring-0"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-[#FF5C5C]/18 bg-[#FF5C5C]/8 px-4 py-3 font-mono text-[12px] text-[#FF8F8F]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#7C6DFA] px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(124,109,250,0.45), 0 8px 20px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  {loading ? "Sending..." : "Send sign-in link"}
                  {!loading && (
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[12px] leading-[1.7] text-[#3A3F5A]">
                Dashboard is for early access plans.
                <br />
                Free CLI works locally without an account.{" "}
                <Link href="/app/install" className="text-[#6870A0] transition-colors hover:text-[#9E91FF]">
                  Install CLI
                </Link>
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-[#4DE8B0]/18 bg-[#4DE8B0]/6 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4DE8B0]/70">
                Check your inbox
              </p>
              <h2 className="mt-2 text-[1.3rem] font-bold tracking-[-0.02em] text-[#EDEEFF]">
                Sign-in link sent.
              </h2>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
                We sent a link to{" "}
                <span className="font-mono text-[#C8D4DF]">{email}</span>.
                Click it to access your dashboard. The link expires in 1 hour.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="mt-5 text-[12px] text-[#4D5070] transition-colors hover:text-[#9E91FF]"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07071A]" />}>
      <LoginForm />
    </Suspense>
  );
}
