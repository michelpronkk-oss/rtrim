import { NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { sendApprovalEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const allowed = await hasValidAdminSession();
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    id?: string;
    decision_note?: string;
  };
  const { id, decision_note } = body;

  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
  }

  // Fetch current row
  const { data: ea, error: fetchErr } = await supabase
    .from("runtrim_early_access")
    .select("id, email, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !ea) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("runtrim_early_access")
    .update({
      status: "approved",
      approved_at: now,
      reviewed_at: now,
      decision_note: decision_note?.trim() || null,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: "db_error", detail: updateErr.message }, { status: 500 });
  }

  // Send approval email — status update is final regardless of email result
  let emailSent = false;
  if (ea.email) {
    try {
      emailSent = await sendApprovalEmail(ea.email);
    } catch {
      emailSent = false;
    }

    if (emailSent) {
      await supabase
        .from("runtrim_early_access")
        .update({ approval_email_sent_at: new Date().toISOString() })
        .eq("id", id);
    }
  }

  return NextResponse.json({ ok: true, email: ea.email, emailSent });
}
