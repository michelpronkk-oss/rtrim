"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { needsPaymentUpdate, trialEligible } from "@/lib/billing-cta";

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
  | "checking"     // resolving session + plan
  | "logged-out"   // no session → send to /login?next=/app/trial
  | "free"         // logged in, Free plan, trial eligible → start trial checkout
  | "trial_used"   // logged in, Free plan, trial already used → upgrade checkout
  | "past_due"     // logged in, payment failed → billing page
  | "pro";         // logged in, active paid plan → open dashboard

/**
 * Plan-aware Pro CTA.
 *
 * checking     → shimmer skeleton
 * logged-out   → label prop             → /login?next=/app/trial
 * free         → label prop             → POST /api/billing/checkout → Dodo (trial)
 * trial_used   → "Upgrade to Pro"       → POST /api/billing/checkout → Dodo (upgrade)
 * past_due     → "Update payment method"→ /app/billing
 * pro          → "Open dashboard"       → /app
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
      .then((d: {
        loggedIn: boolean;
        plan: string;
        planStatus: string | null;
        paymentSubscriptionId: string | null;
      }) => {
        if (!d.loggedIn) { setAuthPlan("logged-out"); return; }

        // Active paid plan
        const hasPro =
          d.plan !== "free" &&
          (d.planStatus === "active" || d.planStatus === "trialing");
        if (hasPro) { setAuthPlan("pro"); return; }

        // Payment failed — user must fix billing first
        if (needsPaymentUpdate(d.planStatus)) { setAuthPlan("past_due"); return; }

        // Trial eligibility check
        if (trialEligible({ plan: d.plan, planStatus: d.planStatus, paymentSubscriptionId: d.paymentSubscriptionId })) {
          setAuthPlan("free");
        } else {
          setAuthPlan("trial_used");
        }
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

  // ── Already has active paid plan → open dashboard ─────────────────────────
  if (authPlan === "pro") {
    return (
      <Link href="/app/billing" className={className}>
        {planId === "pro" ? "Manage Pro" : "Manage billing"}
      </Link>
    );
  }

  // ── Payment failed → send to billing to fix ───────────────────────────────
  if (authPlan === "past_due") {
    return (
      <Link href="/app/billing" className={className}>
        Update payment method
      </Link>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (checkoutState === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" onClick={() => setCheckoutState("idle")} className={className}>
          Try again
        </button>
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-geist-mono)",
          fontSize: 10,
          color: "#F0BF72",
          margin: 0,
        }}>
          {errMsg.includes("not_configured") || errMsg.includes("unreachable") || errMsg.includes("fetch failed")
            ? "Contact hello@runtrim.com if this persists"
            : errMsg}
        </p>
      </div>
    );
  }

  // ── Checkout button (free → trial, trial_used → upgrade, logged-out → login) ─
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

  // trial_used shows "Upgrade to Pro" regardless of the label prop;
  // the checkout flow is identical — only the copy changes.
  const effectiveLabel = authPlan === "trial_used" ? "Upgrade to Pro" : label;
  const isTrialFlow    = authPlan === "free" && planId === "pro";
  const loadingLabel   = isTrialFlow ? "Starting trial…" : "Loading checkout…";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checkoutState === "loading"}
      className={checkoutState === "loading" ? `rt-btn-loading ${className ?? ""}` : className}
    >
      {checkoutState === "loading" ? loadingLabel : effectiveLabel}
    </button>
  );
}
