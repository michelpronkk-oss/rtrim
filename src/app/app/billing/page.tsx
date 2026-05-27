import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { needsPaymentUpdate, trialEligible } from "@/lib/billing-cta";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";
import { ManageBillingButton } from "./_components/manage-billing-button";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

const PLANS = [
  {
    id:       "pro",
    name:     "Pro",
    price:    "$29",
    per:      "/ month",
    trial:    "3-day trial",
    desc:     "Personal agent control with synced memory, cloud history and recovery metadata.",
    features: [
      "Everything in Free",
      "Auto-sync dashboard",
      "Cloud run history",
      "Memory sync",
      "Synced restore metadata",
      "Savings and history reports",
    ],
    featured: true,
  },
  {
    id:       "builder",
    name:     "Builder",
    price:    "$49",
    per:      "/ month",
    trial:    null as string | null,
    desc:     "Advanced guardrails for founders shipping production code with AI agents daily.",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Proof and drift reports (coming soon where not live)",
      "Priority guardrails",
      "Multi-project memory",
      "Advanced recovery history",
      "CI Gate",
    ],
    featured: false,
  },
  {
    id:       "team",
    name:     "Team",
    price:    "From $24",
    per:      "/ seat / month",
    trial:    null as string | null,
    desc:     "Shared control for teams using AI coding agents.",
    features: [
      "Everything in Builder",
      "Shared team state",
      "Approvals and audit logs",
      "Shared recovery logs",
      "GitHub checks and policies, coming soon",
      "Reviewed access for governance rollout",
    ],
    featured: false,
  },
] as const;

type BillingCta =
  | { kind: "checkout"; label: string }
  | { kind: "manage"; label: string }
  | { kind: "contact"; label: string; helper?: string };

type UsageRun = {
  estimated_tokens_saved: number | null;
  estimated_tokens_trimmed: number | null;
  estimated_cost_saved: number | null;
  estimated_dollars_standard: number | null;
  synced_at: string | null;
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  let rawPlan    = "free";
  let planStatus = null as string | null;
  let periodEnd  = null as string | null;
  let paymentSubscriptionId = null as string | null;
  let paymentCustomerId = null as string | null;

  let runsCount   = 0;
  let syncedCount = 0;
  let tokensSaved = 0;
  let costSaved   = 0;

  if (supabase) {
    const [profileResult, usageResult] = await Promise.all([
      supabase
        .from("runtrim_profiles")
        .select("plan, plan_status, current_period_end, payment_subscription_id, payment_customer_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("runtrim_runs")
        .select("estimated_tokens_saved, estimated_tokens_trimmed, estimated_cost_saved, estimated_dollars_standard, synced_at")
        .eq("user_id", user.id),
    ]);

    if (profileResult.data) {
      rawPlan    = (profileResult.data.plan as string) || "free";
      planStatus = (profileResult.data.plan_status as string | null) ?? null;
      periodEnd  = (profileResult.data.current_period_end as string | null) ?? null;
      paymentSubscriptionId = (profileResult.data.payment_subscription_id as string | null) ?? null;
      paymentCustomerId = (profileResult.data.payment_customer_id as string | null) ?? null;
    }

    if (usageResult.data) {
      const runs = usageResult.data as UsageRun[];
      runsCount   = runs.length;
      syncedCount = runs.filter(r => r.synced_at).length;
      tokensSaved = runs.reduce((s, r) => s + (r.estimated_tokens_saved ?? r.estimated_tokens_trimmed ?? 0), 0);
      costSaved   = runs.reduce((s, r) => s + (r.estimated_cost_saved ?? r.estimated_dollars_standard ?? 0), 0);
    }
  }

  const plan        = effectivePlanId(rawPlan, planStatus, periodEnd);
  const isFree      = plan === "free";
  const isTrialing  = plan !== "free" && planStatus === "trialing";
  const isCanceled  = (planStatus === "canceled" || planStatus === "cancelled");
  const isPastDue   = needsPaymentUpdate(planStatus);
  const canceledInPeriod = isCanceled && plan !== "free";
  const trialEnd    = isTrialing && periodEnd ? formatDate(periodEnd) : null;
  const periodEndFmt = periodEnd ? formatDate(periodEnd) : null;
  const hasPaymentCustomerId = Boolean(paymentCustomerId);
  const isPortalEligibleStatus =
    planStatus === "active" ||
    planStatus === "trialing" ||
    planStatus === "past_due" ||
    canceledInPeriod;
  const canOpenBillingPortal = hasPaymentCustomerId && isPortalEligibleStatus;
  const isTrialEligible = trialEligible({ plan, planStatus, paymentSubscriptionId });
  const teamCheckoutEnabled = Boolean(
    process.env.DODO_TEAM_CHECKOUT_URL?.trim() || process.env.DODO_TEAM_PRODUCT_ID?.trim()
  );

  const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

  function planLabel(planId: "pro" | "builder" | "team") {
    return planId.charAt(0).toUpperCase() + planId.slice(1);
  }

  function getPlanCta(targetPlanId: "pro" | "builder" | "team"): BillingCta {
    const currentPlan = plan as "free" | "pro" | "builder" | "team";

    if (isPastDue) {
      if (canOpenBillingPortal) return { kind: "manage" as const, label: "Update payment method" };
      return {
        kind: "contact" as const,
        label: "Contact support",
        helper: "Payment failed. Contact us to restore access.",
      };
    }

    if (currentPlan === targetPlanId) {
      if (canOpenBillingPortal) return { kind: "manage" as const, label: "Manage billing" };
      return {
        kind: "contact" as const,
        label: "Contact support",
        helper: "This subscription is not linked to a Dodo customer yet.",
      };
    }

    if (currentPlan === "free") {
      if (targetPlanId === "pro") {
        return {
          kind: "checkout" as const,
          label: isTrialEligible ? "Start 3-day Pro trial" : "Upgrade to Pro",
        };
      }
      if (targetPlanId === "builder") return { kind: "checkout" as const, label: "Get Builder" };
      if (targetPlanId === "team") return { kind: "contact" as const, label: "Contact for Team" };
      return { kind: "checkout" as const, label: `Get ${planLabel(targetPlanId)}` };
    }

    const canManageBilling = canOpenBillingPortal;
    if (currentPlan === "pro") {
      if (targetPlanId === "builder") {
        return { kind: "checkout" as const, label: "Upgrade to Builder" };
      }
      if (targetPlanId === "team") {
        return { kind: "contact" as const, label: "Contact for Team" };
      }
    }

    if (currentPlan === "builder") {
      if (targetPlanId === "pro") return { kind: "manage" as const, label: "Manage billing" };
      if (targetPlanId === "team") {
        if (!teamCheckoutEnabled) return { kind: "contact" as const, label: "Contact for Team" };
        return canManageBilling
          ? { kind: "manage" as const, label: "Manage billing" }
          : { kind: "contact" as const, label: "Contact for Team" };
      }
    }

    if (currentPlan === "team") {
      return { kind: "manage" as const, label: "Manage billing" };
    }

    return { kind: "contact" as const, label: "Contact support" };
  }

  const planColor = isPastDue ? "#f87171" : !isFree ? "#a78bfa" : "#5a5f68";
  const planGradient = !isFree && !isPastDue
    ? "radial-gradient(800px 300px at 0% 0%, rgba(167,139,250,0.10), transparent 60%), linear-gradient(180deg, #11131a, #0c0e11)"
    : isPastDue
      ? "radial-gradient(800px 300px at 0% 0%, rgba(248,113,113,0.07), transparent 60%), #0c0e11"
      : "#0c0e11";
  const heroBorderColor = !isFree && !isPastDue
    ? "rgba(167,139,250,0.30)"
    : isPastDue
      ? "rgba(248,113,113,0.25)"
      : "rgba(255,255,255,0.08)";
  const heroCornerBorderColor = !isFree && !isPastDue
    ? "rgba(167,139,250,0.20)"
    : isPastDue
      ? "rgba(248,113,113,0.20)"
      : "rgba(255,255,255,0.08)";

  const syncPct = runsCount > 0 ? Math.min((syncedCount / runsCount) * 100, 100) : 0;
  const savingsPct = costSaved > 0 ? Math.min((costSaved / 50) * 100, 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Plan hero ── */}
      <div style={{ borderRadius: 14, background: planGradient, border: `1px solid ${heroBorderColor}`, padding: "28px 30px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, padding: "10px 16px", ...MONO, fontSize: 10.5, color: planColor, letterSpacing: "0.10em", textTransform: "uppercase", borderLeft: `1px solid ${heroCornerBorderColor}`, borderBottom: `1px solid ${heroCornerBorderColor}`, borderRadius: "0 14px 0 8px", background: !isFree ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.04)" }}>
          {isPastDue ? "payment failed" : isTrialing ? "trial active" : isFree ? "free" : `${plan} active`}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p style={{ ...MONO, fontSize: 11, color: planColor, letterSpacing: "0.10em", textTransform: "uppercase", margin: 0 }}>
              {isFree ? "get started" : `runtrim ${plan}`}
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 500, letterSpacing: "-0.025em", color: "#f4f5f7", lineHeight: 1.05 }}>
              {isPastDue
                ? "Payment needs attention."
                : isFree
                  ? "Unlock the RunTrim dashboard."
                  : <>Plan &amp; Billing<span style={{ fontSize: 14, fontWeight: 400, color: "#8a8f98", marginLeft: 12, letterSpacing: "-0.005em" }}>workspace</span></>}
            </h1>
            {!isFree && !isPastDue && (
              <div style={{ ...MONO, marginTop: 10, display: "flex", gap: 14, alignItems: "center", fontSize: 12, color: "#8a8f98", letterSpacing: "0.04em", flexWrap: "wrap" }}>
                {periodEndFmt && !isTrialing && (
                  <>
                    <span>renews <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>{periodEndFmt}</strong></span>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#5a5f68", flexShrink: 0 }} />
                  </>
                )}
                {isTrialing && trialEnd && (
                  <>
                    <span>trial ends <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>{trialEnd}</strong></span>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#5a5f68", flexShrink: 0 }} />
                  </>
                )}
                <span>seats <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>1 / 1</strong></span>
                {!canceledInPeriod && (
                  <>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#5a5f68", flexShrink: 0 }} />
                    <strong style={{ color: "#f4f5f7", fontWeight: 500 }}>Auto-renew on</strong>
                  </>
                )}
              </div>
            )}
            {isFree && (
              <p style={{ fontSize: 13.5, color: "#8a8f98", lineHeight: 1.6, maxWidth: 520, margin: "8px 0 0" }}>
                The CLI stays free and local. Pro unlocks synced runs, cloud history, memory sync and restore metadata across machines.
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!isFree && !isPastDue && canOpenBillingPortal && (
              <ManageBillingButton className="inline-flex h-9 items-center justify-center rounded-[6px] border border-white/12 px-4 text-[12.5px] font-medium text-[#8a8f98] transition-colors hover:border-white/20 hover:text-[#f4f5f7]" />
            )}
            {isPastDue && canOpenBillingPortal && (
              <ManageBillingButton className="inline-flex h-9 items-center justify-center rounded-[6px] border border-[#f87171]/30 bg-[#f87171]/08 px-4 text-[12.5px] font-medium text-[#f87171] transition-colors hover:bg-[#f87171]/14" />
            )}
            {isFree && (
              <ProCheckoutButton
                planId="pro"
                label={isTrialEligible ? "Start 3-day Pro trial" : "Upgrade to Pro"}
                alwaysCheckout
                className="inline-flex h-9 items-center justify-center rounded-[6px] bg-[#f4f5f7] px-4 text-[12.5px] font-semibold text-[#0b0d10] transition-colors hover:bg-white"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Status banners ── */}
      {canceledInPeriod && (
        <div className="rounded-xl px-5 py-4" style={{ border: "1px solid rgba(240,191,114,0.25)", background: "rgba(240,191,114,0.05)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: "#F0BF72", textTransform: "uppercase", letterSpacing: "0.12em" }}>Subscription canceled</p>
              <p className="mt-1 text-[14px] font-semibold text-[#f4f5f7]">
                {periodEndFmt ? `Access continues until ${periodEndFmt}.` : "Your plan has been canceled."}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8a8f98]">Resubscribe below to keep your features.</p>
            </div>
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="rounded-xl px-5 py-4" style={{ border: "1px solid rgba(255,123,92,0.25)", background: "rgba(255,123,92,0.05)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: "#FF7B5C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Payment failed</p>
              <p className="mt-1 text-[14px] font-semibold text-[#f4f5f7]">Your last payment did not go through.</p>
              <p className="mt-0.5 text-[12px] text-[#8a8f98]">Update your payment method to keep access.</p>
            </div>
            <a href="mailto:hello@runtrim.com?subject=RunTrim payment issue" className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-[12px] font-medium text-[#8a8f98] transition-colors hover:border-white/20 hover:text-[#f4f5f7]">
              Contact support
            </a>
          </div>
        </div>
      )}

      {!isFree && !canceledInPeriod && !isPastDue && (
        <div className="rounded-xl px-5 py-4" style={{ border: isTrialing ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(77,232,176,0.2)", background: isTrialing ? "rgba(167,139,250,0.05)" : "rgba(77,232,176,0.04)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ ...MONO, fontSize: 10, color: isTrialing ? "#a78bfa" : "#4DE8B0", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {isTrialing ? "Pro Trial Active" : `${plan.charAt(0).toUpperCase() + plan.slice(1)} Active`}
              </p>
              <p className="mt-1 text-[14px] font-semibold text-[#f4f5f7]">
                {isTrialing
                  ? trialEnd ? `Trial ends ${trialEnd}. Full ${plan.charAt(0).toUpperCase() + plan.slice(1)} access until then.` : "Trial active. Full access."
                  : "Your subscription is active."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Usage strip (paid only) ── */}
      {!isFree && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Guarded runs */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Guarded runs · all time</span>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 6 }}>
              {runsCount}
              <span style={{ fontSize: 13, color: "#5a5f68", fontWeight: 400 }}>/ unlimited</span>
            </span>
            <div style={{ height: 5, borderRadius: 3, background: "#16191e", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", background: "linear-gradient(90deg, #5b50e0, #a78bfa)", borderRadius: 3, opacity: 0.6, width: "100%" }} />
            </div>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>no cap on {plan} plan</span>
          </div>

          {/* Cloud history */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Cloud history · synced</span>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 6 }}>
              {syncedCount}
              <span style={{ fontSize: 13, color: "#5a5f68", fontWeight: 400 }}>runs</span>
            </span>
            <div style={{ height: 5, borderRadius: 3, background: "#16191e", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", background: "linear-gradient(90deg, #5b50e0, #a78bfa)", borderRadius: 3, width: `${syncPct}%` }} />
            </div>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>{syncedCount} of {runsCount} runs synced</span>
          </div>

          {/* Tokens trimmed */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Tokens trimmed · all time</span>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              {formatTokens(tokensSaved)}
            </span>
            <div style={{ height: 5, borderRadius: 3, background: "#16191e", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", background: "linear-gradient(90deg, #5b50e0, #a78bfa)", borderRadius: 3, width: tokensSaved > 0 ? "65%" : "0%" }} />
            </div>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>across {runsCount} guarded runs</span>
          </div>

          {/* Estimated savings */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Estimated savings · all time</span>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#6ee7b7", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              ${costSaved.toFixed(2)}
            </span>
            <div style={{ height: 5, borderRadius: 3, background: "#16191e", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", background: "linear-gradient(90deg, #f5a524, #ffba49)", borderRadius: 3, width: `${Math.min(savingsPct, 100)}%` }} />
            </div>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>{formatTokens(tokensSaved)} tokens trimmed</span>
          </div>

        </div>
      )}

      {/* ── Plans section header ── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 2 }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.02em", margin: 0 }}>Plans</h2>
        <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>workspace · monthly billing</span>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">

        {/* Free */}
        <div className="relative flex flex-col rounded-[10px] overflow-hidden" style={{ background: "#0c0e11", border: isFree ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.07)", borderTop: isFree ? "2px solid rgba(255,255,255,0.22)" : "2px solid transparent" }}>
          {isFree && (
            <div className="absolute right-3 top-3 rounded px-2 py-0.5" style={{ ...MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(77,232,176,0.1)", border: "1px solid rgba(77,232,176,0.25)", color: "#4DE8B0" }}>Current</div>
          )}
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>Free</span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold tracking-[-0.02em] text-[#f4f5f7]">$0</span>
              <span className="text-[12px] text-[#5a5f68]">/ month</span>
            </div>
            <div style={{ height: 22 }} />
            <p className="mt-2 text-[12px] leading-[1.55] text-[#8a8f98]">Local CLI, guarded runs, and restore points. No cloud sync.</p>
          </div>
          <div className="flex-1 px-5 py-4">
            <ul className="space-y-2">
              {["runtrim CLI", "Guarded runs", "Local restore points", "Basic reports"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-[#c9ccd2]">
                  <Check className="mt-0.5 size-3.5 shrink-0" style={{ color: "#3a3e46" }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto px-5 pb-5">
            {isFree ? (
              <div className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium border border-white/8 text-[#5a5f68] cursor-default select-none">
                Current plan
              </div>
            ) : (
              <div style={{ height: 40 }} />
            )}
          </div>
        </div>

        {PLANS.map((p) => {
          const isPro = p.id === "pro";
          const isCurrentPlan = plan === p.id;

          return (
            <div
              key={p.id}
              className="relative flex flex-col rounded-[10px] overflow-hidden"
              style={{
                background: isPro
                  ? "radial-gradient(160% 100% at 0% 0%, rgba(167,139,250,0.07), transparent 55%), #0c0e11"
                  : "#0c0e11",
                border: `1px solid ${isPro ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
                borderTop: isPro ? "2px solid rgba(167,139,250,0.6)" : "2px solid transparent",
              }}
            >
              {isCurrentPlan && (
                <div className="absolute right-3 top-3 rounded px-2 py-0.5" style={{ ...MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(77,232,176,0.1)", border: "1px solid rgba(77,232,176,0.25)", color: "#4DE8B0" }}>
                  Current
                </div>
              )}
              <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ ...MONO, fontSize: 11, color: isPro ? "#a78bfa" : "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {p.name}
                </span>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold tracking-[-0.02em] text-[#f4f5f7]">{p.price}</span>
                  <span className="text-[12px] text-[#5a5f68]">{p.per}</span>
                </div>
                {p.trial && isTrialEligible ? (
                  <div className="mt-2 inline-flex">
                    <span style={{ ...MONO, fontSize: 10, color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 4, padding: "1px 7px", background: "rgba(167,139,250,0.06)" }}>
                      {p.trial}
                    </span>
                  </div>
                ) : (
                  <div style={{ height: 22 }} />
                )}
                <p className="mt-2 text-[12px] leading-[1.55] text-[#8a8f98]">{p.desc}</p>
              </div>
              <div className="flex-1 px-5 py-4">
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-[#c9ccd2]">
                      <Check className="mt-0.5 size-3.5 shrink-0" style={{ color: isPro ? "#a78bfa" : "#5a5f68" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto px-5 pb-5">
                {(() => {
                  const cta = getPlanCta(p.id);
                  switch (cta.kind) {
                    case "checkout":
                      return (
                        <ProCheckoutButton
                          planId={p.id}
                          label={cta.label}
                          alwaysCheckout={plan === "free"}
                          className={`inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] transition-colors disabled:opacity-60 ${
                            p.id === "pro"
                              ? "font-semibold bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white"
                              : "font-medium border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                          }`}
                        />
                      );
                    case "manage":
                      if (canOpenBillingPortal) {
                        return (
                          <ManageBillingButton className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]" />
                        );
                      }
                      return (
                        <div className="space-y-1.5">
                          <a href="mailto:hello@runtrim.com?subject=Manage%20RunTrim%20billing" className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]">
                            Contact support
                          </a>
                          <p className="text-center text-[11px] text-[#8a8f98]">Billing portal is available after checkout.</p>
                        </div>
                      );
                    case "contact":
                      return (
                        <div className="space-y-1.5">
                          <a href="mailto:hello@runtrim.com?subject=Manage%20RunTrim%20billing" className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]">
                            {cta.label}
                          </a>
                          {cta.helper && <p className="text-center text-[11px] text-[#8a8f98]">{cta.helper}</p>}
                        </div>
                      );
                  }
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Payment method + Billing details ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Payment method */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>payment method</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7", margin: "3px 0 0" }}>Card on file</p>
            </div>
            {canOpenBillingPortal && (
              <ManageBillingButton className="inline-flex h-8 items-center justify-center rounded-[5px] border border-white/10 px-3 text-[12px] font-medium text-[#8a8f98] transition-colors hover:border-white/18 hover:text-[#f4f5f7]" />
            )}
          </div>
          <div style={{ padding: 16 }}>
            {canOpenBillingPortal ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, background: "#111317" }}>
                  <div style={{ width: 44, height: 30, borderRadius: 5, background: "linear-gradient(135deg, #1a1f2a, #11141a)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", ...MONO, fontSize: 10, fontWeight: 600, color: "#8a8f98", flexShrink: 0 }}>
                    CARD
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ ...MONO, fontSize: 13.5, color: "#f4f5f7", letterSpacing: "0.04em", margin: 0 }}>•••• •••• •••• ••••</p>
                    <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: "2px 0 0" }}>Manage details in billing portal</p>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, ...MONO, fontSize: 10.5, color: "#6ee7b7", padding: "2px 8px", borderRadius: 4, background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.25)", whiteSpace: "nowrap" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7", flexShrink: 0 }} />
                    active
                  </span>
                </div>
                {periodEndFmt && (
                  <div style={{ marginTop: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, background: "#111317", display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: "#16191e", border: "1px solid rgba(110,231,183,0.25)", display: "grid", placeItems: "center", color: "#6ee7b7", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12.5, color: "#f4f5f7", margin: 0 }}>Next charge</p>
                      <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: "2px 0 0" }}>{periodEndFmt}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "20px 16px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 8, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#5a5f68", margin: 0 }}>No payment method on file yet.</p>
                <p style={{ fontSize: 12, color: "#5a5f68", marginTop: 4 }}>A card will appear here after your first checkout.</p>
              </div>
            )}
          </div>
        </div>

        {/* Billing details */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>billing details</p>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7", margin: "3px 0 0" }}>Account</p>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ ...MONO, fontSize: 12.5, color: "#c9ccd2", lineHeight: 1.7 }}>
              <span style={{ color: "#5a5f68" }}>Email</span>{" "}
              <span>{user.email}</span>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap", ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.04em" }}>
              <span>currency: <strong style={{ color: "#c9ccd2", fontWeight: 500 }}>USD</strong></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>support:{" "}
                <a href="mailto:hello@runtrim.com" style={{ color: "#a78bfa", textDecoration: "none" }}>
                  hello@runtrim.com
                </a>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Invoices ── */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.02em", margin: 0 }}>Invoices</h2>
          {canOpenBillingPortal && (
            <ManageBillingButton className="inline-flex items-center justify-center rounded-[5px] border border-white/8 px-3 py-1 text-[11.5px] font-medium text-[#5a5f68] transition-colors hover:border-white/14 hover:text-[#8a8f98]" />
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 100px 90px", gap: 14, padding: "10px 16px", background: "#111317", ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span>Invoice</span>
            <span>Description</span>
            <span style={{ textAlign: "right" }}>Amount</span>
            <span>Status</span>
          </div>
          <div style={{ padding: "36px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#5a5f68", margin: 0 }}>No invoices yet.</p>
            {canOpenBillingPortal && (
              <p style={{ fontSize: 12, color: "#5a5f68", marginTop: 6 }}>
                View your billing history in the{" "}
                <span style={{ color: "#a78bfa" }}>billing portal</span>.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
