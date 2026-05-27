import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json({ ok: true, runs: [], projects: [] });

  const like = `%${q}%`;

  const [runsRes, projectsRes] = await Promise.all([
    supabase
      .from("runtrim_runs")
      .select("id, task, verdict, agent, created_at, project_id")
      .eq("user_id", user.id)
      .ilike("task", like)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("runtrim_projects")
      .select("id, name, last_status, updated_at")
      .eq("user_id", user.id)
      .ilike("name", like)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    ok: true,
    runs: runsRes.data ?? [],
    projects: projectsRes.data ?? [],
  });
}
