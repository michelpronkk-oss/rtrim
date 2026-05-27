import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-roles-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { sendAdminInviteEmail } from "@/lib/email";

export const runtime = "nodejs";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.runtrim.com"
  ).replace(/\/+$/, "");
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const p = await params;
  const { data: invite, error: fetchErr } = await supabase
    .from("admin_invites")
    .select("id,email,role,note,status")
    .eq("id", p.id)
    .maybeSingle();

  if (fetchErr || !invite) return NextResponse.json({ ok: false, error: "invite_not_found" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ ok: false, error: "invite_not_pending" }, { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabase
    .from("admin_invites")
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq("id", p.id);

  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

  const inviteUrl = `${appUrl()}/admin/invite/${token}`;
  await sendAdminInviteEmail({
    toEmail: invite.email,
    role: invite.role,
    inviterName: "Michel",
    inviteUrl,
    note: invite.note ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

