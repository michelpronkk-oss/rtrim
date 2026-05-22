import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { sendTrialActivationEmail, sendTrialExpiredEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/dodo
 *
 * Receives Dodo Payments subscription lifecycle events and updates
 * runtrim_profiles with the correct plan, plan_status, and billing dates.
 *
 * Required env vars:
 *   DODO_WEBHOOK_SECRET — from Dodo dashboard → Webhooks → signing secret
 *                         Format: whsec_<base64> or raw base64 string
 *
 * Required DB columns on runtrim_profiles (run migration if missing):
 *   payment_customer_id     text
 *   payment_subscription_id text
 *   current_period_start    timestamptz
 *   current_period_end      timestamptz
 *
 * Events handled:
 *   subscription.active     → plan=pro, plan_status=active
 *   subscription.trialing   → plan=pro, plan_status=trialing  (if Dodo fires this)
 *   subscription.renewed    → plan=pro, plan_status=active, refresh period dates
 *   subscription.on_hold    → plan_status=past_due (keep plan, deny access via gating)
 *   subscription.cancelled  → plan=free, plan_status=canceled
 *   subscription.expired    → plan=free, plan_status=canceled
 *   subscription.failed     → plan_status=past_due
 */

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Dodo sends webhooks with webhook-id / webhook-timestamp / webhook-signature headers.
 * Signed content: "{webhook-id}.{webhook-timestamp}.{raw_body}"
 * Signature format: "v1,<base64>" (comma-separated, space between multiple entries)
 * Secret format: "whsec_<base64_key>" or plain base64.
 */
async function verifyDodoSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const msgId        = headers.get("webhook-id");
  const msgTimestamp = headers.get("webhook-timestamp");
  const msgSignature = headers.get("webhook-signature");

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const ts = parseInt(msgTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretKey = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret, "base64");

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const computed = createHmac("sha256", secretKey)
    .update(signedContent, "utf-8")
    .digest("base64");

  // webhook-signature may contain multiple space-separated "v1,<b64>" entries
  const signatures = msgSignature.split(" ");
  return signatures.some((sig) => {
    const [prefix, b64] = sig.split(",");
    if (prefix !== "v1" || !b64) return false;
    try {
      return timingSafeEqual(Buffer.from(b64), Buffer.from(computed));
    } catch {
      return false;
    }
  });
}

// ── Plan status mapping ───────────────────────────────────────────────────────

type ProfileUpdate = {
  plan?: string;
  plan_status?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  payment_customer_id?: string;
  payment_subscription_id?: string;
};

function resolvePlanFromProductId(productId: string | undefined): "pro" | "builder" | "team" {
  if (!productId) return "pro";
  const p = productId.toLowerCase();
  if (p === (process.env.DODO_BUILDER_PRODUCT_ID ?? "").toLowerCase()) return "builder";
  if (p === (process.env.DODO_TEAM_PRODUCT_ID    ?? "").toLowerCase()) return "team";
  return "pro"; // default — covers DODO_PRO_PRODUCT_ID and unknown
}

function buildProfileUpdate(eventType: string, data: DodoEventData): ProfileUpdate | null {
  const sub      = data.subscription;
  const custId   = data.customer?.id ?? sub?.customer_id ?? null;
  const subId    = sub?.id ?? null;
  const pStart   = sub?.current_period_start ?? null;
  const pEnd     = sub?.current_period_end ?? null;
  const trialEnd = sub?.trial_end ?? null;

  // Resolve which paid plan this subscription is for
  const resolvedPlan = resolvePlanFromProductId(sub?.product_id);

  const base: ProfileUpdate = {};
  if (custId) base.payment_customer_id    = custId;
  if (subId)  base.payment_subscription_id = subId;
  if (pStart) base.current_period_start   = pStart;
  if (pEnd || trialEnd) base.current_period_end = trialEnd ?? pEnd ?? null;

  // Derive plan_status from the payload status field when possible
  const subStatus = (data.subscription?.status ?? "").toLowerCase();

  switch (eventType) {
    case "subscription.created":
      if (subStatus === "trialing" || trialEnd) {
        return { ...base, plan: resolvedPlan, plan_status: "trialing", current_period_end: trialEnd ?? pEnd ?? null };
      }
      return { ...base, plan: resolvedPlan, plan_status: "active", current_period_end: pEnd ?? null };

    case "subscription.active":
      if (trialEnd && new Date(trialEnd) > new Date()) {
        return { ...base, plan: resolvedPlan, plan_status: "trialing", current_period_end: trialEnd };
      }
      return { ...base, plan: resolvedPlan, plan_status: "active", current_period_end: pEnd ?? trialEnd ?? null };

    case "subscription.trialing":
      return { ...base, plan: resolvedPlan, plan_status: "trialing", current_period_end: trialEnd ?? pEnd ?? null };

    case "subscription.renewed":
      return { ...base, plan: resolvedPlan, plan_status: "active" };

    case "subscription.on_hold":
    case "subscription.failed":
      return { ...base, plan_status: "past_due" };

    case "subscription.cancelled":
    case "subscription.canceled":
    case "subscription.expired":
      return { ...base, plan: "free", plan_status: "canceled" };

    default:
      return null; // unhandled event — ignore
  }
}

// ── Dodo event shape ──────────────────────────────────────────────────────────

type DodoEventData = {
  subscription?: {
    id?: string;
    customer_id?: string;
    product_id?: string;
    status?: string;
    current_period_start?: string;
    current_period_end?: string;
    trial_end?: string;
    metadata?: Record<string, string>;
  };
  customer?: {
    id?: string;
    email?: string;
  };
};

type DodoWebhookPayload = {
  type?: string;
  event_type?: string;   // some Dodo versions use event_type
  data?: DodoEventData;
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[/api/webhooks/dodo] DODO_WEBHOOK_SECRET not set");
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();

  const valid = await verifyDodoSignature(rawBody, request.headers, webhookSecret);
  if (!valid) {
    console.warn("[/api/webhooks/dodo] Signature verification failed");
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let payload: DodoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = (payload.type ?? payload.event_type ?? "").toLowerCase();
  const data      = payload.data ?? {};

  console.info("[/api/webhooks/dodo] event:", eventType);

  const update = buildProfileUpdate(eventType, data);
  if (!update) {
    // Unhandled event — acknowledge so Dodo stops retrying
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.error("[/api/webhooks/dodo] Supabase unavailable");
    return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });
  }

  // Resolve which user to update.
  // Priority: metadata.user_id → metadata.supabase_user_id → customer email
  const meta      = data.subscription?.metadata ?? {};
  const metaUserId = meta.user_id ?? meta.supabase_user_id ?? null;
  const custEmail  = data.customer?.email ?? null;

  if (!metaUserId && !custEmail) {
    console.error("[/api/webhooks/dodo] Cannot resolve user — no user_id in metadata and no customer email");
    return NextResponse.json({ ok: false, error: "Cannot resolve user." }, { status: 422 });
  }

  // Build and run the update
  let query = supabase.from("runtrim_profiles").update(update);

  if (metaUserId) {
    query = query.eq("id", metaUserId);
  } else {
    // Fall back to email match — case-insensitive
    query = query.eq("email", custEmail!.toLowerCase());
  }

  const { error } = await query;

  if (error) {
    console.error("[/api/webhooks/dodo] Profile update failed:", error.message);
    // Return 500 so Dodo retries
    return NextResponse.json({ ok: false, error: "DB write failed." }, { status: 500 });
  }

  console.info("[/api/webhooks/dodo] Profile updated for event:", eventType, "user_id:", metaUserId ?? custEmail);

  // ── Transactional emails — fire and forget after DB write succeeds ─────────
  // Resolve the best email address available. The customer email comes from Dodo.
  // If absent, fall back to fetching from the profile we just updated.
  const resolveEmail = async (): Promise<string | null> => {
    if (custEmail) return custEmail;
    if (!metaUserId) return null;
    const { data: row } = await supabase
      .from("runtrim_profiles")
      .select("email")
      .eq("id", metaUserId)
      .maybeSingle();
    return (row?.email as string | null) ?? null;
  };

  if (eventType === "subscription.trialing") {
    const trialEnd = data.subscription?.trial_end ?? data.subscription?.current_period_end ?? null;
    resolveEmail().then((addr) => {
      if (addr) sendTrialActivationEmail(addr, trialEnd).catch(() => {});
    }).catch(() => {});
  }

  if (eventType === "subscription.expired") {
    resolveEmail().then((addr) => {
      if (addr) sendTrialExpiredEmail(addr).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
