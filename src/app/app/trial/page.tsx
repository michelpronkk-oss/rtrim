"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * /app/trial
 *
 * Auto-initiates the Pro trial checkout as soon as the user arrives.
 * Used as the ?next= destination after magic-link login so checkout intent
 * is preserved through the auth flow.
 *
 * Flow:
 *   Logged-out user clicks "Start 3-day Pro trial"
 *   → /login?next=/app/trial
 *   → magic link → /auth/callback?next=/app/trial
 *   → lands here → POST /api/billing/checkout → Dodo checkout URL
 */
export default function TrialPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/checkout", { method: "POST" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; url?: string; error?: string }) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error ?? "Could not start your trial. Please try again.");
        }
      })
      .catch(() => setError("Could not reach checkout. Please try again."));
  }, []);

  const MONO: React.CSSProperties = {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-8">
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
            className="rounded-lg px-4 py-2 text-[13px] text-[#5a5f68] transition-colors hover:text-[#8a8f98]"
          >
            Back to plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 pt-8">
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
  );
}
