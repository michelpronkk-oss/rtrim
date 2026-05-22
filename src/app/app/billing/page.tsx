import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";

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
    desc:     "Cloud sync, unlimited Bridge Mode, run history, memory, and savings reports.",
    features: [
      "Unlimited Bridge Mode",
      "Auto-sync dashboard",
      "Cloud run history",
      "Memory sync",
      "Continuation / handoff",
      "Savings reports",
    ],
    featured: true,
  },
  {
    id:       "builder",
    name:     "Builder",
    price:    "$49",
    per:      "/ month",
    trial:    null as string | null,
    desc:     "Advanced guardrails for founders shipping production code daily.",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Proof / drift reports",
      "Priority Run Compiler access",
      "Forbidden file controls",
      "Exportable reports",
    ],
    featured: false,
  },
  {
    id:       "team",
    name:     "Team",
    price:    "From $24",
    per:      "/ seat / month",
    trial:    null as string | null,
    desc:     "Shared protocol, shared memory, shared accountability.",
    features: [
      "Everything in Builder",
      "Shared team state",
      "Approvals + GitHub checks",
      "Audit logs",
      "SSO and roles",
      "Org-level budget rules",
    ],
    featured: false,
  },
] as const;

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  let rawPlan    = "free";
  let planStatus = null as string | null;
  let periodEnd  = null as string | null;

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_profiles")
      .select("plan, plan_status, current_period_end")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      rawPlan    = (data.plan as string) || "free";
      planStatus = (data.plan_status as string | null) ?? null;
      periodEnd  = (data.current_period_end as string | null) ?? null;
    }
  }

  const plan       = effectivePlanId(rawPlan, planStatus);
  const isFree     = plan === "free";
  const isTrialing = plan !== "free" && planStatus === "trialing";
  const trialEnd   = isTrialing && periodEnd ? formatDate(periodEnd) : null;

  const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* Header */}
      <div>
        <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {isFree ? "Get started" : "Billing"}
        </p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">
          {isFree ? "Choose your plan." : "Plan and billing"}
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8a8f98]">
          {isFree
            ? "The RunTrim dashboard is a Pro feature. Start a 3-day free trial, no commitment."
            : isTrialing
            ? `Pro trial active${trialEnd ? ` — ends ${trialEnd}` : ""}. You have full Pro access.`
            : `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan active.`}
        </p>
      </div>

      {/* Active plan banner (non-free) */}
      {!isFree && (
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
                  ? trialEnd ? `Trial ends ${trialEnd}. Full Pro access until then.` : "3-day trial. Full Pro access."
                  : "Your subscription is active."}
              </p>
            </div>
            {isTrialing && (
              <Link
                href="/plans"
                className="shrink-0 rounded-lg border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-4 py-2 text-[12px] font-medium text-[#a78bfa] transition-colors hover:bg-[#7C6DFA]/18"
              >
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
                {p.trial && (
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
                )}
                {!p.trial && <div style={{ height: 22 }} />}
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
                {isPro ? (
                  isCurrentPlan && !isTrialing ? (
                    <p className="text-center text-[12px] text-[#5a5f68]">
                      Contact{" "}
                      <a href="mailto:hello@runtrim.com" className="text-[#8a8f98] hover:text-[#f4f5f7] transition-colors">
                        hello@runtrim.com
                      </a>{" "}
                      to manage.
                    </p>
                  ) : (
                    <ProCheckoutButton
                      planId="pro"
                      label="Start 3-day free trial"
                      className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-semibold transition-colors bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white disabled:opacity-60"
                    />
                  )
                ) : (
                  <ProCheckoutButton
                    planId={p.id}
                    label={`Get ${p.name}`}
                    className="inline-flex w-full h-10 items-center justify-center rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e] disabled:opacity-60"
                  />
                )}
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
