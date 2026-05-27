import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { requireAdminRole } from "@/lib/admin-roles-server";

export const runtime = "nodejs";

const RESOURCE_TABLE: Record<string, string> = {
  posts: "growth_posts",
  assets: "growth_assets",
  replies: "growth_replies",
  approvals: "growth_approvals",
  "daily-logs": "growth_daily_logs",
};

export async function GET(_: Request, { params }: { params: Promise<{ resource: string }> }) {
  const auth = await requireAdminRole(["owner", "admin", "content_va", "analyst"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const p = await params;
  const table = RESOURCE_TABLE[p.resource];
  if (!table) return NextResponse.json({ ok: false, error: "invalid_resource" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const auth = await requireAdminRole(["owner", "admin", "content_va"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const p = await params;
  const table = RESOURCE_TABLE[p.resource];
  if (!table) return NextResponse.json({ ok: false, error: "invalid_resource" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { row?: Record<string, unknown> } | null;
  if (!body?.row) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });

  const { data, error } = await supabase.from(table).insert(body.row).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const auth = await requireAdminRole(["owner", "admin", "content_va"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const p = await params;
  const table = RESOURCE_TABLE[p.resource];
  if (!table) return NextResponse.json({ ok: false, error: "invalid_resource" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { id?: string; patch?: Record<string, unknown> } | null;
  if (!body?.id || !body?.patch) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });

  const patch = { ...body.patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from(table).update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const auth = await requireAdminRole(["owner", "admin", "content_va"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const p = await params;
  const table = RESOURCE_TABLE[p.resource];
  if (!table) return NextResponse.json({ ok: false, error: "invalid_resource" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });

  const { error } = await supabase.from(table).delete().eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

