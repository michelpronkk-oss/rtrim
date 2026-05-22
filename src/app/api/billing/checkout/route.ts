import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";
const USER_FACING_CHECKOUT_ERROR =
  "We could not start the upgrade flow. Manage billing or contact hello@runtrim.com.";

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
/**
 * Static payment link URLs from the Dodo dashboard.
 * Set these in Vercel env vars as the primary checkout method —
 * they require zero API calls and are always reachable.
 *
 * Get these from: Dodo Dashboard → Products → your plan → Payment link
 */
const PAYMENT_LINK_MAP: Record<string, string | undefined> = {
  pro:     process.env.DODO_PRO_CHECKOUT_URL,
  builder: process.env.DODO_BUILDER_CHECKOUT_URL,
  team:    process.env.DODO_TEAM_CHECKOUT_URL,
};

const PRODUCT_ID_MAP: Record<string, string | undefined> = {
  pro:     process.env.DODO_PRO_PRODUCT_ID,
  builder: process.env.DODO_BUILDER_PRODUCT_ID,
  team:    process.env.DODO_TEAM_PRODUCT_ID,
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body   = await request.json().catch(() => ({})) as { planId?: string };
  const planId = (body.planId ?? "pro").toLowerCase();

  if (!["pro", "builder", "team"].includes(planId)) {
    return NextResponse.json({ ok: false, error: "Invalid plan." }, { status: 400 });
  }

  // ── Fast path: static payment link (no API call) ─────────────────────────
  // Set DODO_PRO_CHECKOUT_URL / DODO_BUILDER_CHECKOUT_URL / DODO_TEAM_CHECKOUT_URL
  // in Vercel to the payment link URL from your Dodo dashboard.
  const staticUrl = PAYMENT_LINK_MAP[planId];
  if (staticUrl) {
    console.info("[/api/billing/checkout] Using static payment link for plan:", planId);
    return NextResponse.json({ ok: true, url: staticUrl });
  }

  // ── Fallback: Dodo subscriptions API ─────────────────────────────────────
  const apiKey    = process.env.DODO_API_KEY;
  const productId = PRODUCT_ID_MAP[planId];
  const siteUrl   = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.runtrim.com").replace(/\/$/, "");
  const apiBase   = (process.env.DODO_API_BASE ?? "https://api.dodopayments.com").replace(/\/$/, "");

  if (!apiKey || !productId) {
    console.error(`[/api/billing/checkout] ${planId}: no checkout URL and no API key/product ID configured.`);
    return NextResponse.json(
      { ok: false, error: USER_FACING_CHECKOUT_ERROR },
      { status: 503 }
    );
  }

  const successUrl  = `${siteUrl}/app?checkout=success`;
  const endpointUrl = `${apiBase}/subscriptions`;

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
      user_id:          user.id,
      supabase_user_id: user.id,
    },
  };

  console.info("[/api/billing/checkout] Calling Dodo:", endpointUrl, "product:", productId);

  let dodoRes: Response;
  try {
    dodoRes = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[/api/billing/checkout] Fetch exception hitting", endpointUrl, "—", detail);
    return NextResponse.json(
      { ok: false, error: USER_FACING_CHECKOUT_ERROR },
      { status: 502 }
    );
  }

  if (!dodoRes.ok) {
    const rawBody = await dodoRes.text().catch(() => "");
    console.error("[/api/billing/checkout] Dodo API error:", dodoRes.status, rawBody);

    return NextResponse.json(
      {
        ok: false,
        error: USER_FACING_CHECKOUT_ERROR,
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
      { ok: false, error: USER_FACING_CHECKOUT_ERROR },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
