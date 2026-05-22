"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProCheckoutButtonProps {
  className?: string;
  label?: string;
  /** Dodo plan to start checkout for. Defaults to "pro". */
  planId?: "pro" | "builder" | "team";
  /**
   * Skip auth/plan check and always show the checkout button.
   * Use on the billing page where we already know the user is logged in
   * and want to allow upgrading to a different plan.
   */
  alwaysCheckout?: boolean;
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
  alwaysCheckout = false,
}: ProCheckoutButtonProps) {
  const [authPlan,      setAuthPlan]      = useState<AuthPlan>(alwaysCheckout ? "free" : "checking");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [errMsg,        setErrMsg]        = useState("");

  // Resolve auth + plan once on mount (skipped when alwaysCheckout=true)
  useEffect(() => {
    if (alwaysCheckout) return;
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
  }, [alwaysCheckout]);

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

  // ── Error state ───────────────────────────────────────────────────────────
  if (checkoutState === "error") {
    // If checkout isn't configured yet, show a clean contact fallback
    const isConfig = errMsg.toLowerCase().includes("not configured") ||
                     errMsg.toLowerCase().includes("fetch failed") ||
                     errMsg.toLowerCase().includes("unreachable");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {isConfig ? (
          <a
            href={`mailto:hello@runtrim.com?subject=RunTrim ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`}
            className={className}
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            Contact us to upgrade
          </a>
        ) : (
          <button type="button" onClick={() => setCheckoutState("idle")} className={className}>
            Try again
          </button>
        )}
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-geist-mono)",
          fontSize: 10,
          color: isConfig ? "#5a5f68" : "#F0BF72",
          margin: 0,
        }}>
          {isConfig ? "hello@runtrim.com" : errMsg}
        </p>
      </div>
    );
  }

  // ── Checkout button ────────────────────────────────────────────────────────
  async function handleClick() {
    if (authPlan === "logged-out") {
      window.location.href = "/login?next=/app/trial";
      return;
    }

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
      setErrMsg(data?.error ?? "Checkout failed. Please try again.");
      setCheckoutState("error");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      setErrMsg("No checkout URL returned. Please try again.");
      setCheckoutState("error");
    }
  }

  const loadingLabel = planId === "pro" ? "Starting trial…" : "Loading checkout…";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checkoutState === "loading"}
      className={checkoutState === "loading" ? `rt-btn-loading ${className ?? ""}` : className}
    >
      {checkoutState === "loading" ? loadingLabel : label}
    </button>
  );
}
