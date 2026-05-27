import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { requireAdminRole } from "@/lib/admin-roles-server";
import { sendAdminInviteEmail } from "@/lib/email";

export const runtime = "nodejs";

const INVITE_ROLE_SET = new Set(["admin", "content_va", "analyst"]);

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

export async function GET() {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("admin_team_members")
    .select("id,email,username,display_name,full_name,role,status,invited_at,accepted_at")
    .order("invited_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, members: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { email?: string; role?: string; note?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role?.trim().toLowerCase();
  const note = body?.note?.trim() || null;

  if (!email || !role || !INVITE_ROLE_SET.has(role)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteErr } = await supabase
    .from("admin_invites")
    .insert({
      email,
      role,
      note,
      token_hash: tokenHash,
      status: "pending",
      expires_at: expiresAt,
      invited_by: auth.userId,
    })
    .select("id")
    .single();

  if (inviteErr) return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 500 });

  await supabase.from("admin_team_members").upsert(
    {
      email,
      role,
      status: "invited",
      invited_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  const inviteUrl = `${appUrl()}/admin/invite/${token}`;
  await sendAdminInviteEmail({
    toEmail: email,
    role: role as "admin" | "content_va" | "analyst",
    inviterName: "Michel",
    inviteUrl,
    note: note ?? undefined,
  });

  return NextResponse.json({ ok: true, inviteId: invite.id });
}

