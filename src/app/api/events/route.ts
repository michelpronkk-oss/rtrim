import { NextResponse } from "next/server";
import { z } from "zod";
import { recordEvent } from "@/lib/analytics-events";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  eventName: z.string().min(1).max(120),
  source: z.enum(["web", "cli"]).optional(),
  anonymousId: z.string().max(120).optional(),
  sessionId: z.string().max(120).optional(),
  projectId: z.string().max(160).optional(),
  cliVersion: z.string().max(60).optional(),
  pagePath: z.string().max(180).optional(),
  referrer: z.string().max(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const result = await recordEvent(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

