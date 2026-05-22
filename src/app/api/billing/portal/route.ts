import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.error("[/api/billing/portal] Supabase service unavailable.");
    return NextResponse.json({ ok: false, error: "missing_customer_id" }, { status: 400 });
  }

  const { data } = await supabase
    .from("runtrim_profiles")
    .select("payment_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = (data?.payment_customer_id as string | null)?.trim() ?? "";
  console.info("[/api/billing/portal] customer_id_present:", Boolean(customerId));
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "missing_customer_id" }, { status: 400 });
  }

  const apiKey = (process.env.DODO_PAYMENTS_API_KEY ?? process.env.DODO_API_KEY ?? "").trim();
  if (!apiKey) {
    console.error("[/api/billing/portal] Missing DODO_PAYMENTS_API_KEY/DODO_API_KEY.");
    return NextResponse.json({ ok: false, error: "missing_dodo_api_key" }, { status: 503 });
  }

  const client = new DodoPayments({ bearerToken: apiKey });
  console.info("[/api/billing/portal] dodo_sdk_call:", "customers.customerPortal.create");

  let session: { link?: string; url?: string } | null = null;
  try {
    session = await client.customers.customerPortal.create(customerId);
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error ? String(err.cause ?? "") : "";
    console.error("[/api/billing/portal] dodo_portal_failed:", { name, message, cause });
    return NextResponse.json({ ok: false, error: "dodo_portal_failed" }, { status: 502 });
  }

  const url = session?.link ?? session?.url;
  console.info("[/api/billing/portal] dodo_response_status:", "sdk_success");
  console.info("[/api/billing/portal] dodo_response_has_url:", Boolean(url));

  if (!url) {
    return NextResponse.json({ ok: false, error: "dodo_portal_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
