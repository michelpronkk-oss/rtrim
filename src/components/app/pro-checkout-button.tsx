"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProCheckoutButtonProps {
  className?: string;
  label?: string;
  /** Dodo plan to start checkout for. Defaults to "pro". */
  planId?: "pro" | "builder" | "team";
}

type AuthPlan =
  | "checking"      // resolving session + plan
  | "logged-out"    // no session → send to /login?next=/app/trial
  | "free"          // logged in, Free plan → start checkout
  | "pro";          // logged in, active Pro/trial → open dashboard

/**
 * Plan-aware Pro CTA.
 *
 * checking     → shimmer skeleton
 * logged-out   → "Start 3-day Pro trial" → /login?next=/app/trial (intent preserved)
 * free         → "Start 3-day Pro trial" → POST /api/billing/checkout → Dodo
 * pro          → "Open dashboard"        → /app
 */
export function ProCheckoutButton({
  className,
  label = "Start 3-day Pro trial",
  planId = "pro",
}: ProCheckoutButtonProps) {
  const [authPlan,      setAuthPlan]      = useState<AuthPlan>("checking");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [errMsg,        setErrMsg]        = useState("");

  // Resolve auth + plan once on mount
  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then((d: { loggedIn: boolean; plan: string; planStatus: string | null }) => {
        if (!d.loggedIn) { setAuthPlan("logged-out"); return; }
        const hasPro =
          d.plan !== "free" &&
          (d.planStatus === "active" || d.planStatus === "trialing");
        setAuthPlan(hasPro ? "pro" : "free");
      })
      .catch(() => setAuthPlan("logged-out")); // fail-safe
  }, []);

  // ── Skeleton while resolving ───────────────────────────────────────────────
  if (authPlan === "checking") {
    return (
      <button type="button" disabled aria-hidden="true"
        className={`rt-btn-loading ${className ?? ""}`}>
        {label}
      </button>
    );
  }

  // ── Already has Pro → open dashboard ──────────────────────────────────────
  if (authPlan === "pro") {
    return (
      <Link href="/app" className={className}>
        Open dashboard
      </Link>
    );
  }

  // ── Error state (checkout failed) ─────────────────────────────────────────
  if (checkoutState === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" onClick={() => setCheckoutState("idle")}
          className={className}>
          Try again
        </button>
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-geist-mono)",
          fontSize: 10,
          color: "#F0BF72",
          margin: 0,
        }}>
          {errMsg}
        </p>
      </div>
    );
  }

  // ── Checkout button (logged-out or free) ───────────────────────────────────
  async function handleClick() {
    // Logged out: preserve intent through auth by using ?next=/app/trial
    if (authPlan === "logged-out") {
      window.location.href = "/login?next=/app/trial";
      return;
    }

    // Logged in, Free: start Dodo checkout directly
    setCheckoutState("loading");
    setErrMsg("");

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null) as {
      ok?: boolean; url?: string; error?: string;
    } | null;

    if (!res?.ok || !data?.ok) {
      setErrMsg(data?.error ?? "Checkout failed — please try again.");
      setCheckoutState("error");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      // Stay in loading — browser is navigating
    } else {
      setErrMsg("No checkout URL returned. Please try again.");
      setCheckoutState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checkoutState === "loading"}
      className={checkoutState === "loading" ? `rt-btn-loading ${className ?? ""}` : className}
    >
      {checkoutState === "loading" ? "Starting trial…" : label}
    </button>
  );
}
