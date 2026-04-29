import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminConfig,
  getSessionMaxAgeSeconds,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const config = getAdminConfig();
  if (!config.configured) {
    return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 503 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  if (
    parsed.data.username.trim() !== config.username ||
    parsed.data.password !== config.password
  ) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const value = createAdminSessionValue(config.username, config.sessionSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: getSessionMaxAgeSeconds(),
    path: "/",
  });
  return res;
}
