import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout
 *
 * Creates a Dodo Payments checkout session for the Pro plan.
 * Requires an authenticated Supabase session.
 * Returns { url } — redirect the browser to this URL to complete checkout.
 *
 * Required env vars:
 *   DODO_API_KEY          — Dodo Payments secret API key
 *   DODO_PRO_PRODUCT_ID   — Product/plan ID for Pro in the Dodo dashboard
 *   NEXT_PUBLIC_SITE_URL  — e.g. https://www.runtrim.com (for redirect URLs)
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const apiKey     = process.env.DODO_API_KEY;
  const productId  = process.env.DODO_PRO_PRODUCT_ID;
  const siteUrl    = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.runtrim.com").replace(/\/$/, "");

  if (!apiKey || !productId) {
    console.error("[/api/billing/checkout] Missing DODO_API_KEY or DODO_PRO_PRODUCT_ID");
    return NextResponse.json(
      { ok: false, error: "Billing is not configured. Contact support." },
      { status: 503 }
    );
  }

  const successUrl = `${siteUrl}/app?checkout=success`;

  // Billing address is intentionally omitted — Dodo collects it at checkout.
  // Sending empty strings causes a 422 validation error from the Dodo API.
  const requestBody = {
    customer: {
      email: user.email ?? "",
      name:  user.email ?? "",
      create_new_customer: true,
    },
    product_id: productId,
    quantity: 1,
    return_url: successUrl,
    payment_link: true,
    metadata: {
      user_id:           user.id,
      supabase_user_id:  user.id,
    },
  };

  let dodoRes: Response;
  try {
    dodoRes = await fetch("https://api.dodopayments.com/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error("[/api/billing/checkout] Dodo API fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not reach payment provider. Check your connection and try again." },
      { status: 502 }
    );
  }

  if (!dodoRes.ok) {
    const rawBody = await dodoRes.text().catch(() => "");
    console.error("[/api/billing/checkout] Dodo API error:", dodoRes.status, rawBody);

    // Forward the Dodo error message if parseable, so the UI can show it
    let dodoMessage: string | undefined;
    try {
      const parsed = JSON.parse(rawBody) as { message?: string; error?: string; detail?: string };
      dodoMessage = parsed.message ?? parsed.error ?? parsed.detail;
    } catch { /* ignore */ }

    return NextResponse.json(
      {
        ok: false,
        error: dodoMessage ?? `Payment provider error (${dodoRes.status}). Try again.`,
        dodoStatus: dodoRes.status,
      },
      { status: 502 }
    );
  }

  const data = await dodoRes.json().catch(() => null) as Record<string, unknown> | null;

  // Dodo returns the checkout URL in the `payment_link` field
  const url = (data?.payment_link ?? data?.url ?? data?.checkout_url) as string | undefined;

  if (!url) {
    console.error("[/api/billing/checkout] No checkout URL in Dodo response:", JSON.stringify(data));
    return NextResponse.json(
      { ok: false, error: "Checkout link missing from provider response. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
