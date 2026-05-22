import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { sendTrialActivationEmail, sendTrialExpiredEmail } from "@/lib/email";

export const runtime = "nodejs";

type PlanId = "free" | "pro" | "builder" | "team";

type ProfileRow = {
  id: string;
  email: string | null;
  plan: string | null;
  plan_status: string | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
};

type ExtractedFields = {
  eventType: string;
  customerId: string | null;
  customerEmail: string | null;
  subscriptionId: string | null;
  productId: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  metadataUserId: string | null;
};

type ProfileUpdate = {
  plan?: PlanId;
  plan_status?: string;
  current_period_start?: string;
  current_period_end?: string;
  payment_customer_id?: string;
  payment_subscription_id?: string;
  updated_at: string;
};

async function verifyDodoSignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const msgId = headers.get("webhook-id");
  const msgTimestamp = headers.get("webhook-timestamp");
  const msgSignature = headers.get("webhook-signature");

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  const ts = parseInt(msgTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretKey = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret, "base64");

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const computed = createHmac("sha256", secretKey).update(signedContent, "utf-8").digest("base64");

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

type DodoCustomerRecord = Record<string, unknown> & {
  id?: string;
  customer_id?: string;
  email?: string;
};

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function extractFields(payload: Record<string, unknown>): ExtractedFields {
  const data = asRecord(payload.data);
  const customer = asRecord(data.customer) as DodoCustomerRecord;
  const subscription = asRecord(data.subscription);
  const product = asRecord(data.product);
  const metadata = asRecord(data.metadata);
  const subMetadata = asRecord(subscription.metadata);
  const subCustomer = asRecord(subscription.customer);
  const items = Array.isArray(data.items) ? data.items : [];
  const item0 = asRecord(items[0]);

  const eventType = pickString(payload.type, payload.event_type)?.toLowerCase() ?? "";
  const customerEmail = pickString(
    customer.email,
    data.email,
    subCustomer.email
  )?.toLowerCase() ?? null;

  return {
    eventType,
    customerId: pickString(data.customer_id, customer.customer_id, customer.id, subscription.customer_id),
    customerEmail,
    subscriptionId: pickString(data.subscription_id, subscription.id),
    productId: pickString(data.product_id, product.id, subscription.product_id, item0.product_id),
    status: pickString(subscription.status, data.status)?.toLowerCase() ?? null,
    currentPeriodStart: pickString(subscription.current_period_start, data.previous_billing_date),
    currentPeriodEnd: pickString(subscription.current_period_end, data.next_billing_date),
    trialEnd: pickString(subscription.trial_end),
    metadataUserId: pickString(metadata.user_id, subMetadata.user_id, subMetadata.supabase_user_id),
  };
}

function resolvePlanFromProductId(productId: string | null, existingPlan: string | null): PlanId {
  const pro = (process.env.DODO_PRO_PRODUCT_ID ?? "").toLowerCase();
  const builder = (process.env.DODO_BUILDER_PRODUCT_ID ?? "").toLowerCase();
  const team = (process.env.DODO_TEAM_PRODUCT_ID ?? "").toLowerCase();

  const p = (productId ?? "").toLowerCase();
  if (p && p === builder) return "builder";
  if (p && p === team) return "team";
  if (p && p === pro) return "pro";

  if (existingPlan === "pro" || existingPlan === "builder" || existingPlan === "team") {
    return existingPlan;
  }
  return "pro";
}

function isSubscriptionEvent(eventType: string): boolean {
  return eventType.startsWith("subscription.");
}

function mapPlanStatus(eventType: string, extractedStatus: string | null, existingStatus: string | null): string | null {
  switch (eventType) {
    case "subscription.active":
      return "active";
    case "subscription.trialing":
      return "trialing";
    case "subscription.renewed":
      return "active";
    case "subscription.on_hold":
    case "subscription.failed":
      return "past_due";
    case "subscription.cancelled":
    case "subscription.canceled":
      return "canceled";
    case "subscription.expired":
      return "canceled";
    case "subscription.updated":
      if (extractedStatus) return extractedStatus;
      if (existingStatus === "active" || existingStatus === "trialing") return existingStatus;
      return "active";
    default:
      return null;
  }
}

async function resolveProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  fields: ExtractedFields
): Promise<{ row: ProfileRow | null; method: string }> {
  const selectCols = "id,email,plan,plan_status,payment_customer_id,payment_subscription_id";

  if (fields.metadataUserId) {
    const { data } = await supabase.from("runtrim_profiles").select(selectCols).eq("id", fields.metadataUserId).maybeSingle();
    if (data) return { row: data as ProfileRow, method: "metadata.user_id" };
  }

  if (fields.customerEmail) {
    const { data } = await supabase.from("runtrim_profiles").select(selectCols).ilike("email", fields.customerEmail).maybeSingle();
    if (data) return { row: data as ProfileRow, method: "email" };
  }

  if (fields.customerId) {
    const { data } = await supabase
      .from("runtrim_profiles")
      .select(selectCols)
      .eq("payment_customer_id", fields.customerId)
      .maybeSingle();
    if (data) return { row: data as ProfileRow, method: "payment_customer_id" };
  }

  if (fields.subscriptionId) {
    const { data } = await supabase
      .from("runtrim_profiles")
      .select(selectCols)
      .eq("payment_subscription_id", fields.subscriptionId)
      .maybeSingle();
    if (data) return { row: data as ProfileRow, method: "payment_subscription_id" };
  }

  return { row: null, method: "unresolved" };
}

function buildUpdate(fields: ExtractedFields, row: ProfileRow): ProfileUpdate | null {
  const now = new Date().toISOString();
  const update: ProfileUpdate = { updated_at: now };

  if (fields.customerId) update.payment_customer_id = fields.customerId;
  if (fields.subscriptionId) update.payment_subscription_id = fields.subscriptionId;
  if (fields.currentPeriodStart) update.current_period_start = fields.currentPeriodStart;
  if (fields.currentPeriodEnd || fields.trialEnd) {
    update.current_period_end = fields.trialEnd ?? fields.currentPeriodEnd ?? undefined;
  }

  if (fields.eventType === "payment.succeeded") {
    return update;
  }

  if (!isSubscriptionEvent(fields.eventType)) {
    return null;
  }

  const mappedStatus = mapPlanStatus(fields.eventType, fields.status, row.plan_status);
  if (mappedStatus) update.plan_status = mappedStatus;

  if (fields.eventType === "subscription.expired") {
    update.plan = "free";
  } else {
    update.plan = resolvePlanFromProductId(fields.productId, row.plan);
  }

  return update;
}

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

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const debug = process.env.DEBUG_DODO_WEBHOOK === "true";
  const fields = extractFields(payload);
  if (debug) {
    console.info("[/api/webhooks/dodo] debug payload:", payload);
  }

  console.info("[/api/webhooks/dodo] event:", fields.eventType);

  if (!fields.eventType) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const handledEvents = new Set([
    "payment.succeeded",
    "subscription.active",
    "subscription.trialing",
    "subscription.updated",
    "subscription.renewed",
    "subscription.on_hold",
    "subscription.failed",
    "subscription.cancelled",
    "subscription.canceled",
    "subscription.expired",
  ]);

  if (!handledEvents.has(fields.eventType)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.error("[/api/webhooks/dodo] Supabase unavailable");
    return NextResponse.json({ ok: false, error: "DB unavailable." }, { status: 503 });
  }

  const { row, method } = await resolveProfile(supabase, fields);

  console.info(
    "[/api/webhooks/dodo] resolve:",
    "method=", method,
    "hasCustomerId=", Boolean(fields.customerId),
    "hasSubscriptionId=", Boolean(fields.subscriptionId),
    "hasEmail=", Boolean(fields.customerEmail),
    "hasPeriodStart=", Boolean(fields.currentPeriodStart),
    "hasPeriodEnd=", Boolean(fields.currentPeriodEnd || fields.trialEnd)
  );

  if (!row) {
    console.warn("[/api/webhooks/dodo] unresolved profile for event:", fields.eventType);
    return NextResponse.json({ ok: true, unresolved: true });
  }

  const update = buildUpdate(fields, row);
  if (!update) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from("runtrim_profiles").update(update).eq("id", row.id);

  if (error) {
    console.error("[/api/webhooks/dodo] Profile update failed:", error.message);
    return NextResponse.json({ ok: false, error: "DB write failed." }, { status: 500 });
  }

  console.info(
    "[/api/webhooks/dodo] updated profile",
    "event=", fields.eventType,
    "id=", row.id,
    "plan=", update.plan ?? row.plan,
    "status=", update.plan_status ?? row.plan_status
  );

  const updatedStatus = update.plan_status ?? row.plan_status;
  const trialEnd = fields.trialEnd ?? fields.currentPeriodEnd ?? null;
  const targetEmail = fields.customerEmail ?? row.email;

  if (updatedStatus === "trialing" && targetEmail) {
    sendTrialActivationEmail(targetEmail, trialEnd).catch(() => {});
  }

  if ((fields.eventType === "subscription.expired" || fields.eventType === "subscription.cancelled") && targetEmail) {
    sendTrialExpiredEmail(targetEmail).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
