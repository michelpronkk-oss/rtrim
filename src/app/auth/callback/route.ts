import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getEaStatusForEmail(email: string | null): Promise<string> {
  if (!email) return "none";
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.RUNTRIM_DISABLE_EA_GATE === "true"
  ) {
    return "approved";
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "approved";

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await db
    .from("runtrim_early_access")
    .select("status")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return (data?.status as string) ?? "none";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const status = await getEaStatusForEmail(user?.email ?? null);

      if (status === "approved") {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (status === "pending") {
        return NextResponse.redirect(`${origin}/access/pending`);
      }
      if (status === "rejected") {
        return NextResponse.redirect(`${origin}/access/rejected`);
      }
      return NextResponse.redirect(`${origin}/access/request`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
