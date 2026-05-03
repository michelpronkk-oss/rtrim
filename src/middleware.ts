import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Edge-compatible EA status check using service role (no Node.js deps)
async function getEaStatus(email: string | null): Promise<string> {
  if (!email) return "none";

  // Dev / gate-disabled bypass
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.RUNTRIM_DISABLE_EA_GATE === "true"
  ) {
    return "approved";
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "approved"; // misconfigured — allow through

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

function eaStatusRedirect(status: string, base: NextRequest): NextResponse {
  const dest = base.nextUrl.clone();
  dest.search = "";
  if (status === "pending")  dest.pathname = "/access/pending";
  else if (status === "rejected") dest.pathname = "/access/rejected";
  else dest.pathname = "/access/request";
  return NextResponse.redirect(dest);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required by @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAppPath = pathname.startsWith("/app");
  const isPublicAppPath =
    pathname.startsWith("/app/install") ||
    pathname.startsWith("/app/access");

  // ── /app/* gate ──────────────────────────────────────────────────────────
  if (isAppPath && !isPublicAppPath) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const status = await getEaStatus(user.email ?? null);
    if (status !== "approved") {
      return eaStatusRedirect(status, request);
    }
  }

  // ── /login: redirect approved users into the app ─────────────────────────
  if (pathname === "/login" && user) {
    const status = await getEaStatus(user.email ?? null);
    if (status === "approved") {
      const next = request.nextUrl.searchParams.get("next") ?? "/app";
      const dest = request.nextUrl.clone();
      dest.pathname = next;
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    return eaStatusRedirect(status, request);
  }

  supabaseResponse.headers.set("x-pathname", pathname);
  return supabaseResponse;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
