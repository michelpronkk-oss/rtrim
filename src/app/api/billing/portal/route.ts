import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const PORTAL_ERROR = "Could not open billing portal. Contact hello@runtrim.com if this persists.";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "missing_customer_id" }, { status: 404 });
  }

  const { data } = await supabase
    .from("runtrim_profiles")
    .select("payment_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = (data?.payment_customer_id as string | null)?.trim() ?? "";
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "missing_customer_id" }, { status: 404 });
  }

  const apiKey = process.env.DODO_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: PORTAL_ERROR }, { status: 503 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.runtrim.com").replace(/\/$/, "");
  const endpoint = `https://api.dodopayments.com/customers/${encodeURIComponent(customerId)}/customer-portal/session`;

  let dodoRes: Response;
  try {
    dodoRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        return_url: `${siteUrl}/app/billing`,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: PORTAL_ERROR }, { status: 502 });
  }

  if (!dodoRes.ok) {
    return NextResponse.json({ ok: false, error: PORTAL_ERROR }, { status: 502 });
  }

  const payload = (await dodoRes.json().catch(() => null)) as { link?: string; url?: string } | null;
  const url = payload?.link ?? payload?.url;

  if (!url) {
    return NextResponse.json({ ok: false, error: PORTAL_ERROR }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST." }, { status: 405 });
}
