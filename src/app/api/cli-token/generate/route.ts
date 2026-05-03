import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });
  }

  // Generate: rt_live_<32 url-safe random chars>
  const rawToken = `rt_live_${randomBytes(24).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const now = new Date().toISOString();

  // Upsert profile with new token hash (replaces any previous token)
  const { error } = await supabase
    .from("runtrim_profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        cli_token_hash: tokenHash,
        cli_token_created_at: now,
        cli_token_last_used_at: null,
      },
      { onConflict: "id" }
    );

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not store token." }, { status: 500 });
  }

  // Return raw token exactly once — never stored
  return NextResponse.json({ ok: true, token: rawToken });
}
