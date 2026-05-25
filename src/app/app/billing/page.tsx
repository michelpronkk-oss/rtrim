import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { needsPaymentUpdate, trialEligible } from "@/lib/billing-cta";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";
import { ManageBillingButton } from "./_components/manage-billing-button";

export const metadata: Metadata = {
  title: "Billing | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

const PLANS = [
  {
    id:       "pro",
    name:     "Pro",
    price:    "$29",
    per:      "/ month",
    trial:    "3-day free trial",
    desc:     "Personal agent control with cloud sync and memory history.",
    features: [
      "Everything in Free",
      "Auto-sync dashboard",
      "Cloud run history",
      "Memory sync",
      "Synced reports",
      "Synced restore metadata history",
      "Savings/history reports",
    ],
    featured: true,
  },
  {
    id:       "builder",
    name:     "Builder",
    price:    "$49",
    per:      "/ month",
    trial:    null as string | null,
    desc:     "For founders shipping production code with AI agents daily.",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Advanced reports",
      "Priority guardrails and Run Compiler access",
      "Multi-project memory",
      "Multi-project recovery history",
      "Higher run/history limits",
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
      "Approvals",
      "Audit logs",
      "Shared recovery and audit logs",
      "Shared run history",
      "Team policies and GitHub checks (coming soon)",
    ],
    featured: false,
  },
] as const;

type BillingCta =
  | { kind: "checkout"; label: string }
  | { kind: "manage"; label: string }
  | { kind: "contact"; label: string; helper?: string };

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  let rawPlan    = "free";
  let planStatus = null as string | null;
  let periodEnd  = null as string | null;
  let paymentSubscriptionId = null as string | null;
  let paymentCustomerId = null as string | null;

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_profiles")
      .select("plan, plan_status, current_period_end, payment_subscription_id, payment_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      rawPlan    = (data.plan as string) || "free";
      planStatus = (data.plan_status as string | null) ?? null;
      periodEnd  = (data.current_period_end as string | null) ?? null;
      paymentSubscriptionId = (data.payment_subscription_id as string | null) ?? null;
      paymentCustomerId = (data.payment_customer_id as string | null) ?? null;
    }
  }

  const plan        = effectivePlanId(rawPlan, planStatus, periodEnd);
  const isFree      = plan === "free";
  const isTrialing  = plan !== "free" && planStatus === "trialing";
  const isCanceled  = (planStatus === "canceled" || planStatus === "cancelled");
  const isPastDue   = needsPaymentUpdate(planStatus);
  const canceledInPeriod = isCanceled && plan !== "free"; // access still active
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

    // Payment failed is the highest-priority state — direct to billing portal first
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
      if (targetPlanId === "builder") return { kind: "checkout" as const, label: "Upgrade to Builder" };
      if (targetPlanId === "team") return { kind: "contact" as const, label: "Contact for Team" };
      return { kind: "checkout" as const, label: `Get ${planLabel(targetPlanId)}` };
    }

    const canManageBilling = canOpenBillingPortal;
    if (currentPlan === "pro") {
      if (targetPlanId === "builder") {
        return { kind: "contact" as const, label: "Contact to upgrade" };
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* Header */}
      <div>
        <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {isFree && !isPastDue ? "Get started" : "Billing"}
        </p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">
          {isFree && !isPastDue ? "Choose your plan." : "Plan and billing"}
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8a8f98]">
          {isPastDue
            ? "Update your payment method to restore access."
            : isFree
              ? isTrialEligible
                ? "The RunTrim dashboard is a Pro feature. Start a 3-day free trial, no commitment."
                : "The RunTrim dashboard is a Pro feature. Upgrade to continue."
              : isTrialing
                ? `Pro trial active${trialEnd ? ` — ends ${trialEnd}` : ""}. You have full Pro access.`
                : `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan active.`}
        </p>
      </div>

      {/* Status banners */}
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
        <div
          className="rounded-xl px-5 py-4"
          style={{
            border: isTrialing ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(77,232,176,0.2)",
            background: isTrialing ? "rgba(167,139,250,0.05)" : "rgba(77,232,176,0.04)",
          }}
        >
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
            {isTrialing && (
              <Link href="/plans" className="shrink-0 rounded-lg border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-4 py-2 text-[12px] font-medium text-[#a78bfa] transition-colors hover:bg-[#7C6DFA]/18">
                View plan details
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-3.5 sm:grid-cols-3">
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
                <div
                  className="absolute right-3 top-3 rounded px-2 py-0.5"
                  style={{ ...MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(77,232,176,0.1)", border: "1px solid rgba(77,232,176,0.25)", color: "#4DE8B0" }}
                >
                  Current
                </div>
              )}

              {/* Card header */}
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
                    <span
                      style={{
                        ...MONO, fontSize: 10, color: "#a78bfa",
                        border: "1px solid rgba(167,139,250,0.25)",
                        borderRadius: 4, padding: "1px 7px",
                        background: "rgba(167,139,250,0.06)",
                      }}
                    >
                      {p.trial}
                    </span>
                  </div>
                ) : (
                  <div style={{ height: 22 }} />
                )}
                <p className="mt-2 text-[12px] leading-[1.55] text-[#8a8f98]">{p.desc}</p>
              </div>

              {/* Features */}
              <div className="flex-1 px-5 py-4">
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-[#c9ccd2]">
                      <Check
                        className="mt-0.5 size-3.5 shrink-0"
                        style={{ color: isPro ? "#a78bfa" : "#5a5f68" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
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
                          <ManageBillingButton
                            className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                          />
                        );
                      }
                      return (
                        <div className="space-y-1.5">
                          <a
                            href="mailto:hello@runtrim.com?subject=Manage%20RunTrim%20billing"
                            className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                          >
                            Contact support
                          </a>
                          <p className="text-center text-[11px] text-[#8a8f98]">Billing portal is available after checkout.</p>
                        </div>
                      );
                    case "contact":
                      return (
                        <div className="space-y-1.5">
                          <a
                            href="mailto:hello@runtrim.com?subject=Manage%20RunTrim%20billing"
                            className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                          >
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

      {/* Account */}
      <div className="rounded-xl border border-white/6 bg-[#0c0e11] overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>Account</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[13px] text-[#8a8f98]">Email</span>
            <span style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{user.email}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[13px] text-[#8a8f98]">Support</span>
            <a href="mailto:hello@runtrim.com" style={{ ...MONO, fontSize: 12, color: "#5a5f68" }} className="transition-colors hover:text-[#f4f5f7]">
              hello@runtrim.com
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
