import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";

export const metadata: Metadata = {
  title: "Billing | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

const PLAN_LABEL: Record<string, string> = {
  free:    "Free",
  pro:     "Pro",
  builder: "Builder",
  team:    "Team",
};

const STATUS_LABEL: Record<string, string> = {
  active:   "Active",
  trialing: "Trial active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();

  let rawPlan       = "free";
  let planStatus    = null as string | null;
  let periodEnd     = null as string | null;

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

  const plan        = effectivePlanId(rawPlan, planStatus);
  const isTrialing  = plan !== "free" && planStatus === "trialing";
  const isFree      = plan === "free";
  const isPro       = plan === "pro" && !isTrialing;
  const trialEnd    = isTrialing && periodEnd ? formatDate(periodEnd) : null;

  const MONO: React.CSSProperties = {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">Billing</p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">
          Plan and billing
        </h1>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-white/6 bg-[#0c0e11] overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Current plan
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Plan name + status */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[22px] font-bold tracking-[-0.02em] text-[#f4f5f7]">
                {PLAN_LABEL[plan] ?? "Free"}
              </p>
              {planStatus && planStatus !== "active" && (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  {STATUS_LABEL[planStatus] ?? planStatus}
                </p>
              )}
              {isTrialing && trialEnd && (
                <p className="mt-0.5 text-[12px] text-[#a78bfa]">
                  Trial ends {trialEnd}
                </p>
              )}
              {isFree && (
                <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                  5 Bridge Mode runs per month. Cloud sync not included.
                </p>
              )}
            </div>

            {/* Plan badge */}
            <span
              className="rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em]"
              style={
                plan === "pro"
                  ? { borderColor: "rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", color: "#a78bfa" }
                  : plan === "builder"
                  ? { borderColor: "rgba(77,232,176,0.25)", background: "rgba(77,232,176,0.08)", color: "#4DE8B0" }
                  : { borderColor: "rgba(255,255,255,0.1)", color: "#6A7398" }
              }
            >
              {isTrialing ? "Pro Trial" : PLAN_LABEL[plan] ?? "Free"}
            </span>
          </div>

          {/* Upgrade CTA for free users */}
          {isFree && (
            <div className="rounded-[8px] border border-[#7C6DFA]/20 bg-[#7C6DFA]/5 px-4 py-4">
              <p className="text-[13px] font-semibold text-[#f4f5f7]">Upgrade to Pro</p>
              <p className="mt-1 text-[12px] leading-[1.6] text-[#8a8f98]">
                Unlimited Bridge Mode, auto-sync dashboard, cloud run history, memory sync, and savings reports. Includes a 3-day free trial.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ProCheckoutButton
                  label="Start 3-day Pro trial"
                  className="rounded-lg bg-[#7C6DFA] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60"
                />
                <Link href="/plans" className="text-[12px] text-[#5a5f68] transition-colors hover:text-[#8a8f98]">
                  View all plans
                  <ArrowRight className="ml-1 inline size-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Trial active — CTA to keep Pro */}
          {isTrialing && (
            <div className="rounded-[8px] border border-[#7C6DFA]/20 bg-[#7C6DFA]/5 px-4 py-4">
              <p className="text-[13px] font-semibold text-[#f4f5f7]">Keep Pro after your trial</p>
              <p className="mt-1 text-[12px] leading-[1.6] text-[#8a8f98]">
                Your trial gives you full Pro access. If you added a payment method at checkout, Pro continues automatically at $29/month after the trial ends.
              </p>
              <Link
                href="/plans"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-4 py-2 text-[12px] font-medium text-[#a78bfa] transition-colors hover:bg-[#7C6DFA]/18"
              >
                View plan details
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}

          {/* Active paid plan */}
          {isPro && (
            <p className="text-[12px] text-[#5a5f68]">
              Pro plan active. To manage your subscription, contact{" "}
              <a href="mailto:hello@runtrim.com" className="text-[#8a8f98] transition-colors hover:text-[#f4f5f7]">
                hello@runtrim.com
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-white/6 bg-[#0c0e11] overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Account
          </p>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-[#8a8f98]">Email</span>
            <span style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-[#8a8f98]">Questions</span>
            <a
              href="mailto:hello@runtrim.com"
              className="font-mono text-[12px] text-[#5a5f68] transition-colors hover:text-[#f4f5f7]"
            >
              hello@runtrim.com
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
