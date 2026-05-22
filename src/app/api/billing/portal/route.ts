import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const apiKey = process.env.DODO_API_KEY?.trim();
  if (!apiKey) {
    console.error("[/api/billing/portal] Missing DODO_API_KEY.");
    return NextResponse.json({ ok: false, error: "missing_dodo_api_key" }, { status: 503 });
  }

  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const requestOrigin = (() => {
    try {
      return new URL(request.url).origin;
    } catch {
      return "";
    }
  })();
  const siteUrl = (envSiteUrl || requestOrigin).replace(/\/$/, "");
  if (!siteUrl) {
    console.error("[/api/billing/portal] Missing NEXT_PUBLIC_SITE_URL and request origin fallback.");
    return NextResponse.json({ ok: false, error: "missing_site_url" }, { status: 503 });
  }

  const dodoEnv =
    process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() ||
    process.env.DODO_ENVIRONMENT?.trim() ||
    "";

  const documentedEndpoint = new URL("https://api.dodopayments.com/customer-portal");
  documentedEndpoint.searchParams.set("customer_id", customerId);
  documentedEndpoint.searchParams.set("send_email", "false");
  documentedEndpoint.searchParams.set("return_url", `${siteUrl}/app/billing`);
  if (dodoEnv) {
    documentedEndpoint.searchParams.set("environment", dodoEnv);
  }

  const legacyEndpoint = `https://api.dodopayments.com/customers/${encodeURIComponent(customerId)}/customer-portal/session`;
  console.info("[/api/billing/portal] dodo_endpoint_primary:", documentedEndpoint.toString());
  console.info("[/api/billing/portal] dodo_method_primary:", "GET");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let dodoRes: Response | null = null;
  try {
    dodoRes = await fetch(documentedEndpoint.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error ? String(err.cause ?? "") : "";
    console.error("[/api/billing/portal] dodo_network_error:", { name, message, cause });
    clearTimeout(timeout);
    return NextResponse.json({ ok: false, error: "dodo_portal_network_error" }, { status: 502 });
  }
  clearTimeout(timeout);

  if (dodoRes && !dodoRes.ok) {
    const bodyText = await dodoRes.text().catch(() => "");
    console.error("[/api/billing/portal] dodo_portal_primary_failed:", {
      status: dodoRes.status,
      body: bodyText,
    });

    const shouldTryLegacy = dodoRes.status === 404 || dodoRes.status === 405 || dodoRes.status === 400;
    if (shouldTryLegacy) {
      console.info("[/api/billing/portal] trying_legacy_endpoint:", legacyEndpoint);
      try {
        dodoRes = await fetch(legacyEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            return_url: `${siteUrl}/app/billing`,
          }),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "UnknownError";
        const message = err instanceof Error ? err.message : String(err);
        const cause = err instanceof Error ? String(err.cause ?? "") : "";
        console.error("[/api/billing/portal] dodo_network_error_legacy:", { name, message, cause });
        return NextResponse.json({ ok: false, error: "dodo_portal_network_error" }, { status: 502 });
      }

      if (!dodoRes.ok) {
        const legacyBody = await dodoRes.text().catch(() => "");
        console.error("[/api/billing/portal] dodo_portal_legacy_failed:", {
          status: dodoRes.status,
          body: legacyBody,
        });
        return NextResponse.json({ ok: false, error: "dodo_portal_failed" }, { status: 502 });
      }
    } else {
      return NextResponse.json({ ok: false, error: "dodo_portal_failed" }, { status: 502 });
    }
  }

  const payload = (await dodoRes?.json().catch(() => null)) as
    | { link?: string; url?: string; customer_portal_url?: string; portal_url?: string }
    | null;
  const url = payload?.link ?? payload?.url ?? payload?.customer_portal_url ?? payload?.portal_url;
  console.info("[/api/billing/portal] dodo_response_status:", dodoRes?.status ?? 0);
  console.info("[/api/billing/portal] dodo_response_has_url:", Boolean(url));

  if (!url) {
    return NextResponse.json({ ok: false, error: "dodo_portal_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
