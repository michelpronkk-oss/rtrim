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
    .select("plan, plan_status")
    .eq("id", user.id)
    .maybeSingle();

  const rawPlan    = (data?.plan    as string | null) ?? "free";
  const planStatus = (data?.plan_status as string | null) ?? null;
  const plan       = effectivePlanId(rawPlan, planStatus);

  return NextResponse.json({ loggedIn: true, plan, planStatus });
}
