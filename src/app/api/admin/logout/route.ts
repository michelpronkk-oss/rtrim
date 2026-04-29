import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

