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
  const cancelUrl  = `${siteUrl}/pricing`;

  let dodoRes: Response;
  try {
    dodoRes = await fetch("https://api.dodopayments.com/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        billing: {
          city: "",
          country: "US",
          state: "",
          street: "",
          zipcode: "",
        },
        customer: {
          email: user.email ?? "",
          name: user.email ?? "",
          create_new_customer: true,
        },
        product_id: productId,
        quantity: 1,
        return_url: successUrl,
        payment_link: true,
        metadata: {
          user_id: user.id,
          supabase_user_id: user.id,
        },
      }),
    });
  } catch (err) {
    console.error("[/api/billing/checkout] Dodo API fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to reach payment provider. Try again." },
      { status: 502 }
    );
  }

  if (!dodoRes.ok) {
    const body = await dodoRes.text().catch(() => "");
    console.error("[/api/billing/checkout] Dodo API error:", dodoRes.status, body);
    return NextResponse.json(
      { ok: false, error: "Payment provider returned an error. Try again." },
      { status: 502 }
    );
  }

  const data = await dodoRes.json().catch(() => null);
  const url: string | undefined = data?.payment_link;

  if (!url) {
    console.error("[/api/billing/checkout] No payment_link in Dodo response:", data);
    return NextResponse.json(
      { ok: false, error: "Could not create checkout link. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
