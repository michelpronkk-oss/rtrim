import { NextResponse } from "next/server";
import { APP_ACCESS_COOKIE, getConfiguredAppAccessCode, isAppGateBypassed } from "@/lib/app-gate";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const submittedCode = body?.code?.trim() || "";

  if (isAppGateBypassed() && !getConfiguredAppAccessCode()) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: APP_ACCESS_COOKIE,
      value: "granted",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  const expectedCode = getConfiguredAppAccessCode();
  if (!expectedCode) {
    return NextResponse.json({ ok: false, error: "Cloud dashboard access is temporarily unavailable." }, { status: 503 });
  }

  if (!submittedCode || submittedCode !== expectedCode) {
    return NextResponse.json({ ok: false, error: "That access code is not valid." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: APP_ACCESS_COOKIE,
    value: "granted",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
