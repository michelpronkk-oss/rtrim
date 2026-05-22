import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getEntitlements, currentPeriod, effectivePlanId } from "@/lib/entitlements";

export const runtime = "nodejs";

/**
 * POST /api/cli/usage/bridge-run
 *
 * Called by `runtrim go` before starting a Bridge Mode session.
 * - Free plan: checks monthly limit and increments if under limit.
 * - Pro/Builder/Team: always allowed, no counter maintained.
 *
 * Returns { allowed, usage } so the CLI can proceed or show upgrade message.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const rawToken = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!rawToken || !rawToken.startsWith("rt_live_")) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid CLI token." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data: profile } = await supabase
    .from("runtrim_profiles")
    .select("id, plan, plan_status, bridge_runs_used, bridge_runs_period, current_period_end")
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });
  }

  // Update last used (fire and forget)
  supabase
    .from("runtrim_profiles")
    .update({ cli_token_last_used_at: new Date().toISOString() })
    .eq("id", profile.id)
    .then(() => {});

  const rawPlan    = (profile.plan as string) || "free";
  const planStatus = (profile.plan_status as string | null) ?? null;
  const periodEnd  = (profile.current_period_end as string | null) ?? null;
  // Canceled-but-in-period users keep their entitlements until period_end
  const plan  = effectivePlanId(rawPlan, planStatus, periodEnd);
  const ents  = getEntitlements(plan);
  const limit = ents.bridgeRunsPerMonth;

  // Unlimited plans — always allowed, skip counter
  if (limit === null) {
    return NextResponse.json({
      ok: true,
      allowed: true,
      plan,
      usage: { bridgeRunsUsed: null, bridgeRunsLimit: null, period: currentPeriod() },
    });
  }

  // Free plan — check and increment
  const period       = currentPeriod();
  const storedPeriod = profile.bridge_runs_period as string | null;
  const currentUsed  = storedPeriod === period
    ? ((profile.bridge_runs_used as number) || 0)
    : 0; // period rolled over → reset

  if (currentUsed >= limit) {
    return NextResponse.json({
      ok: true,
      allowed: false,
      plan,
      usage: { bridgeRunsUsed: currentUsed, bridgeRunsLimit: limit, period },
    });
  }

  // Increment
  const newUsed = currentUsed + 1;
  await supabase
    .from("runtrim_profiles")
    .update({ bridge_runs_used: newUsed, bridge_runs_period: period })
    .eq("id", profile.id);

  return NextResponse.json({
    ok: true,
    allowed: true,
    plan,
    usage: { bridgeRunsUsed: newUsed, bridgeRunsLimit: limit, period },
  });
}
