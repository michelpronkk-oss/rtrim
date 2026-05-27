import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });

  const tokenHash = hashToken(token);
  const { data: invite, error } = await supabase
    .from("admin_invites")
    .select("id,email,role,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invite) return NextResponse.json({ ok: false, state: "not_found" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ ok: false, state: "not_pending" }, { status: 400 });
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, state: "expired" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    invite: { email: invite.email, role: invite.role, expiresAt: invite.expires_at },
  });
}

