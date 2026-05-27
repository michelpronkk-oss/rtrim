import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-roles-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { role?: string; status?: string } | null;
  const p = await params;

  const patch: Record<string, unknown> = {};
  if (body?.role && ["owner", "admin", "content_va", "analyst"].includes(body.role)) patch.role = body.role;
  if (body?.status && ["active", "invited", "disabled"].includes(body.status)) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await supabase.from("admin_team_members").update(patch).eq("id", p.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

