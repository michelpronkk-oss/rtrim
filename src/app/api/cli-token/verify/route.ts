import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const rawToken = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!rawToken || !rawToken.startsWith("rt_live_")) {
    return NextResponse.json({ ok: false, error: "Missing or invalid token." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data: profile } = await supabase
    .from("runtrim_profiles")
    .select("id, email")
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, email: profile.email });
}
