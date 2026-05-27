import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as {
    token?: string;
    fullName?: string;
    birthDate?: string;
    country?: string;
    timezone?: string;
    phone?: string;
  } | null;

  const token = body?.token?.trim();
  const fullName = body?.fullName?.trim();
  const birthDate = body?.birthDate?.trim() || null;
  const country = body?.country?.trim();
  const timezone = body?.timezone?.trim();
  const phone = body?.phone?.trim() || null;
  if (!token || !fullName || !country || !timezone) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const { data: invite, error: inviteErr } = await supabase
    .from("admin_invites")
    .select("id,email,role,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteErr || !invite) return NextResponse.json({ ok: false, error: "invite_not_found" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ ok: false, error: "invite_not_pending" }, { status: 400 });
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "invite_expired" }, { status: 400 });
  }
  if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "email_mismatch" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { error: memberErr } = await supabase.from("admin_team_members").upsert(
    {
      email: invite.email,
      user_id: user.id,
      role: invite.role,
      status: "active",
      full_name: fullName,
      display_name: fullName,
      country,
      timezone,
      phone,
      birth_date: birthDate,
      accepted_at: nowIso,
    },
    { onConflict: "email" }
  );
  if (memberErr) return NextResponse.json({ ok: false, error: memberErr.message }, { status: 500 });

  const { error: invUpdateErr } = await supabase
    .from("admin_invites")
    .update({ status: "accepted", accepted_by: user.id, accepted_at: nowIso })
    .eq("id", invite.id);
  if (invUpdateErr) return NextResponse.json({ ok: false, error: invUpdateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

