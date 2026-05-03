import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEarlyAccessConfirmation,
  sendEarlyAccessNotification,
} from "@/lib/email";
import { recordEvent } from "@/lib/analytics-events";

export const runtime = "nodejs";

type Payload = {
  email?: string;
  role?: string;
  agent?: string;
  useCase?: string;
  source?: string;
  // Extended fields (dashboard early access form)
  planInterest?: string;
  workflow?: string;
  biggestPain?: string;
  notes?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Payload;
  const email = (payload.email ?? "").trim().toLowerCase();
  const role = (payload.role ?? "").trim();
  const agent = (payload.agent ?? "").trim();
  const useCase = (payload.useCase ?? "").trim();
  const source = (payload.source ?? "homepage").trim() || "homepage";
  const planInterest = (payload.planInterest ?? "").trim() || null;
  const workflow = (payload.workflow ?? "").trim() || null;
  const biggestPain = (payload.biggestPain ?? "").trim() || null;
  const notes = (payload.notes ?? "").trim() || null;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "A valid email is required." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Early access is unavailable right now. Please try again later.",
      },
      { status: 503 }
    );
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("runtrim_early_access").insert({
    email,
    role: role || null,
    agent: agent || null,
    use_case: useCase || null,
    source,
    plan_interest: planInterest,
    workflow,
    biggest_pain: biggestPain,
    notes,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not save early access request." },
      { status: 500 }
    );
  }

  await recordEvent({
    eventName: "early_access_submitted",
    source: "web",
    pagePath: "/",
    metadata: {
      agent: agent || "",
      role: role || "",
      hasUseCase: Boolean(useCase),
    },
  });

  const createdAtIso = new Date().toISOString();
  const [confirmationSent, notificationSent] = await Promise.all([
    sendEarlyAccessConfirmation(email).catch(() => false),
    sendEarlyAccessNotification({
      email,
      role,
      agent,
      useCase,
      source,
      createdAtIso,
    }).catch(() => false),
  ]);

  if (!confirmationSent) {
    return NextResponse.json({
      ok: true,
      message: "Joined early access. Confirmation email may be delayed.",
      emailStatus: {
        confirmationSent: false,
        notificationSent,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    emailStatus: {
      confirmationSent: true,
      notificationSent,
    },
  });
}
