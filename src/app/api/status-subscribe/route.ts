import { NextResponse } from "next/server";
import { z } from "zod";
import { recordEvent } from "@/lib/analytics-events";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  email: z.string().email().max(240),
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const result = await recordEvent({
    eventName: "status_subscribe_requested",
    source: "web",
    pagePath: "/status",
    metadata: { email: parsed.data.email },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

