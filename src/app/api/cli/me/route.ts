import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getEntitlements, currentPeriod, effectivePlanId } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
    .select("id, email, plan, plan_status, bridge_runs_used, bridge_runs_period, current_period_end")
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });
  }

  // Update last used timestamp (fire and forget)
  supabase
    .from("runtrim_profiles")
    .update({ cli_token_last_used_at: new Date().toISOString() })
    .eq("id", profile.id)
    .then(() => {});

  const rawPlan    = (profile.plan as string) || "free";
  const planStatus = (profile.plan_status as string | null) ?? null;
  // Only honor paid plan entitlements while subscription is active or trialing
  const plan   = effectivePlanId(rawPlan, planStatus);
  const ents   = getEntitlements(plan);
  const period = currentPeriod();

  // Reset counter if the period rolled over
  const storedPeriod = profile.bridge_runs_period as string | null;
  const runsUsed = storedPeriod === period
    ? ((profile.bridge_runs_used as number) || 0)
    : 0;

  return NextResponse.json({
    ok: true,
    email: profile.email,
    plan,
    planStatus: planStatus ?? "active",
    currentPeriodEnd: (profile.current_period_end as string | null) ?? null,
    entitlements: {
      bridgeRunsPerMonth: ents.bridgeRunsPerMonth,
      cloudSync:          ents.cloudSync,
      advancedReports:    ents.advancedReports,
      projectMemory:      ents.projectMemory,
      advancedRisk:       ents.advancedRisk,
      exports:            ents.exports,
    },
    usage: {
      bridgeRunsUsed:  runsUsed,
      bridgeRunsLimit: ents.bridgeRunsPerMonth,
      period,
    },
  });
}
