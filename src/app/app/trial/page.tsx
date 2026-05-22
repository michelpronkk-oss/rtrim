"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RunTrimLogo } from "@/components/app/runtrim-logo";

/**
 * /app/trial
 *
 * Auto-initiates the Pro trial checkout as soon as the user arrives.
 * Used as the ?next= destination after magic-link login so checkout intent
 * is preserved through the auth flow.
 *
 * Flow:
 *   Logged-out user clicks "Start 3-day Pro trial"
 *   â†’ /login?next=/app/trial
 *   â†’ magic link â†’ /auth/callback?next=/app/trial
 *   â†’ lands here â†’ POST /api/billing/checkout â†’ Dodo checkout URL
 */
export default function TrialPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then((planData: { loggedIn?: boolean; hasActiveAccess?: boolean }) => {
        if (planData.loggedIn && planData.hasActiveAccess) {
          window.location.href = "/app/billing";
          return;
        }
        return fetch("/api/billing/checkout", { method: "POST" })
          .then((r) => r.json())
          .then((data: { ok?: boolean; url?: string; error?: string; message?: string }) => {
            if (data.url) {
              window.location.href = data.url;
              return;
            }
            if (data.error === "already_subscribed") {
              setError(
                data.message ??
                "You already have an active RunTrim subscription. Manage billing to update or cancel your plan."
              );
              return;
            }
            setError(data.error ?? "Could not start your trial. Please try again.");
          });
      })
      .catch(() => setError("Could not reach checkout. Please try again."));
  }, []);

  const MONO: React.CSSProperties = {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#08090b] text-[#f4f5f7]">
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
        <main className="mx-auto flex max-w-6xl px-6 py-16 sm:py-20 justify-center">
          <div className="w-full max-w-md rounded-[10px] border border-white/10 bg-[#0c0e11] p-6 space-y-4">
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Trial
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
              Could not start trial.
            </p>
            <p style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.6 }}>
              {error}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setError(null); window.location.reload(); }}
                className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#f4f5f7]"
              >
                Try again
              </button>
              <Link
                href="/plans"
                className="rounded-lg px-4 py-2 text-[13px] text-[#8a8f98] transition-colors hover:text-[#f4f5f7]"
              >
                Back to plans
              </Link>
              {error.includes("active RunTrim subscription") && (
                <Link
                  href="/app/billing"
                  className="rounded-lg px-4 py-2 text-[13px] text-[#8a8f98] transition-colors hover:text-[#f4f5f7]"
                >
                  Manage billing
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f5f7]">
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
      <main className="mx-auto flex max-w-6xl px-6 py-16 sm:py-20 justify-center">
        <div className="w-full max-w-md rounded-[10px] border border-white/10 bg-[#0c0e11] p-6 space-y-3">
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Trial
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
            Starting your Pro trial...
          </p>
          <p style={{ fontSize: 13, color: "#8a8f98" }}>
            Redirecting to checkout.
          </p>
        </div>
      </main>
    </div>
  );
}
