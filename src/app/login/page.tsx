"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowRight } from "lucide-react";
import { RunTrimLogo } from "@/components/app/runtrim-logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authError = searchParams.get("error") === "auth_failed"
    ? "Sign-in link expired or invalid. Request a new one."
    : null;

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

    // Store intent in localStorage as a fallback for when Supabase redirects
    // to Site URL (homepage) instead of /auth/callback. AuthCodeInterceptor
    // in the root layout reads this and forwards to the callback with next preserved.
    if (safeNext) {
      try { localStorage.setItem("rt_auth_next", safeNext); } catch { /* ok */ }
    }

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
    <div className="flex min-h-screen flex-col bg-[#08090b] text-[#f4f5f7]">
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

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-16 sm:py-20">
        <div className="w-full max-w-[420px] rounded-[10px] border border-white/10 bg-[#0c0e11] p-6 sm:p-7">

          {/* Label */}
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5a5f68]">
                RunTrim Dashboard
              </p>

          {!sent ? (
            <>
              <h1 className="text-[1.7rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
                Sign in to continue.
              </h1>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#8a8f98]">
                Enter your email. We send a sign-in link. No password required.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-3">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-[#5a5f68]"
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
                    className="w-full rounded-lg border border-white/10 bg-[#111317] px-4 py-3 font-mono text-[14px] text-[#EDEEFF] placeholder-[#4b5160] outline-none transition-colors focus:border-[#7C6DFA]/50 focus:ring-0"
                  />
                </div>

                {(error || authError) && (
                  <p className="rounded-lg border border-[#FF5C5C]/18 bg-[#FF5C5C]/8 px-4 py-3 font-mono text-[12px] text-[#FF8F8F]">
                    {error ?? authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#f4f5f7] px-5 py-3 text-[14px] font-semibold text-[#0b0d10] transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.9), 0 8px 20px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  {loading ? "Sending..." : "Send sign-in link"}
                  {!loading && (
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[12px] leading-[1.7] text-[#5a5f68]">
                Dashboard supports live Pro, Builder, and Team plans.
                <br />
                Free CLI works locally without an account.{" "}
                <Link href="/app/install" className="text-[#8a8f98] transition-colors hover:text-[#f4f5f7]">
                  Install CLI
                </Link>
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-[#4DE8B0]/18 bg-[#4DE8B0]/6 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4DE8B0]/80">
                Check your inbox
              </p>
              <h2 className="mt-2 text-[1.3rem] font-bold tracking-[-0.02em] text-[#EDEEFF]">
                Sign-in link sent.
              </h2>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#8a8f98]">
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
