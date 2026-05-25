"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { needsPaymentUpdate } from "@/lib/billing-cta";

type BuilderState =
  | "checking"
  | "logged-out"
  | "free"
  | "trial-used"
  | "past-due"
  | "pro"
  | "builder"
  | "team";

interface BuilderCtaButtonProps {
  className?: string;
}

const GATE_OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(8,9,11,0.88)",
  backdropFilter: "blur(10px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "0 20px",
};

const GATE_CARD: React.CSSProperties = {
  background: "#0c0e11",
  border: "1px solid rgba(255,255,255,0.1)",
  borderTop: "2px solid rgba(167,139,250,0.5)",
  borderRadius: 12,
  padding: "28px 28px 24px",
  maxWidth: 440,
  width: "100%",
};

function BuilderGate({ ctaLabel, ctaHref, onClose }: {
  ctaLabel: string;
  ctaHref: string;
  onClose: () => void;
}) {
  return (
    <div style={GATE_OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={GATE_CARD}>
        <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Builder
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.02em", marginBottom: 12 }}>
          Get Builder.
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#8a8f98", marginBottom: 20 }}>
          Builder starts after Pro is active. Start Pro to unlock cloud history, synced memory and dashboard access. Builder adds unlimited projects, advanced recovery history and priority guardrails.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            href={ctaHref}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 40, borderRadius: 6, fontSize: 13, fontWeight: 600,
              background: "#f4f5f7", color: "#0b0d10",
              border: "1px solid white", textDecoration: "none",
            }}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 40, borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: "transparent", color: "#8a8f98",
              border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
            }}
          >
            Back to plans
          </button>
        </div>
      </div>
    </div>
  );
}

export function BuilderCtaButton({ className }: BuilderCtaButtonProps) {
  const [state, setState] = useState<BuilderState>("checking");
  const [showGate, setShowGate] = useState(false);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then((d: {
        loggedIn: boolean;
        plan: string;
        planStatus: string | null;
        paymentSubscriptionId: string | null;
      }) => {
        if (!d.loggedIn) { setState("logged-out"); return; }
        if (needsPaymentUpdate(d.planStatus)) { setState("past-due"); return; }

        const isActive = d.planStatus === "active" || d.planStatus === "trialing";

        if (d.plan === "team"    && isActive) { setState("team");    return; }
        if (d.plan === "builder" && isActive) { setState("builder"); return; }
        if (d.plan === "pro"     && isActive) { setState("pro");     return; }

        const hasUsedTrial = !!d.paymentSubscriptionId;
        setState(hasUsedTrial ? "trial-used" : "free");
      })
      .catch(() => setState("logged-out"));
  }, []);

  async function handleUpgrade() {
    setCheckoutState("loading");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "builder" }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null) as { ok?: boolean; url?: string } | null;
    if (data?.url) { window.location.href = data.url; return; }
    setCheckoutState("error");
  }

  if (state === "checking") {
    return (
      <button type="button" disabled aria-hidden="true" className={`rt-btn-loading ${className ?? ""}`}>
        Get Builder
      </button>
    );
  }

  if (state === "builder") {
    return (
      <Link href="/app" className={className} style={{ opacity: 0.5, pointerEvents: "none", cursor: "default" }}>
        Current plan
      </Link>
    );
  }

  if (state === "team") {
    return (
      <Link href="/app" className={className} style={{ opacity: 0.5, pointerEvents: "none", cursor: "default" }}>
        Included in Team
      </Link>
    );
  }

  if (state === "past-due") {
    return <Link href="/app/billing" className={className}>Update payment method</Link>;
  }

  // Signed-out, Free, trial-used: "Get Builder" + gate on click
  if (state === "logged-out" || state === "free" || state === "trial-used") {
    const ctaLabel = state === "trial-used" ? "Upgrade to Pro" : "Start Pro";
    const ctaHref  = state === "logged-out" ? "/login?next=/app/trial"
                   : state === "free"       ? "/app/trial"
                                            : "/app/billing";
    return (
      <>
        <button type="button" onClick={() => setShowGate(true)} className={className}>
          Get Builder
        </button>
        {showGate && (
          <BuilderGate ctaLabel={ctaLabel} ctaHref={ctaHref} onClose={() => setShowGate(false)} />
        )}
      </>
    );
  }

  // Pro: eligible for Builder upgrade
  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={checkoutState === "loading"}
      className={checkoutState === "loading" ? `rt-btn-loading ${className ?? ""}` : className}
    >
      {checkoutState === "loading" ? "Loading checkout..." : "Upgrade to Builder"}
    </button>
  );
}
