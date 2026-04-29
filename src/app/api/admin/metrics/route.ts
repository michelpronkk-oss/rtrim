import { NextResponse } from "next/server";
import { getAdminConfig, hasValidAdminSession } from "@/lib/admin-auth";
import { getAdminMetrics } from "@/lib/admin-metrics";

export const runtime = "nodejs";

export async function GET() {
  const config = getAdminConfig();
  if (!config.configured && config.isProduction) {
    return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 503 });
  }

  const allowed = await hasValidAdminSession();
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const data = await getAdminMetrics();
  return NextResponse.json(data, { status: data.ok ? 200 : 503 });
}

