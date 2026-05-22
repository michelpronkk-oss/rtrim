import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";

export const runtime = "nodejs";

/**
 * GET /api/billing/plan
 *
 * Returns the current session user's plan and plan_status.
 * Used by client components (ProCheckoutButton) to render the correct CTA
 * without exposing service-role queries to the browser.
 *
 * Response: { loggedIn, plan, planStatus }
 * - loggedIn: false if no session
 * - plan: "free" | "pro" | "builder" | "team" (effective — respects plan_status)
 * - planStatus: raw plan_status value or null
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false, plan: "free", planStatus: null });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ loggedIn: true, plan: "free", planStatus: null });
  }

  const { data } = await supabase
    .from("runtrim_profiles")
    .select("plan, plan_status, current_period_end, payment_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const rawPlan    = (data?.plan    as string | null) ?? "free";
  const planStatus = (data?.plan_status as string | null) ?? null;
  const currentPeriodEnd = (data?.current_period_end as string | null) ?? null;
  const paymentSubscriptionId = (data?.payment_subscription_id as string | null) ?? null;
  const plan       = effectivePlanId(rawPlan, planStatus, currentPeriodEnd);
  const periodEndMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : NaN;
  const hasFuturePeriod = Number.isFinite(periodEndMs) && periodEndMs > Date.now();
  const hasActiveAccess =
    planStatus === "active" ||
    planStatus === "trialing" ||
    (planStatus === "canceled" && hasFuturePeriod) ||
    (Boolean(paymentSubscriptionId) && hasFuturePeriod) ||
    plan !== "free";

  return NextResponse.json({
    loggedIn: true,
    plan,
    planStatus,
    currentPeriodEnd,
    paymentSubscriptionId,
    hasActiveAccess,
  });
}
