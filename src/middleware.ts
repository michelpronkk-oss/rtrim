import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Refresh session — do not remove, required for @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAppPath = pathname.startsWith("/app");
  const isPublicAppPath =
    pathname.startsWith("/app/install") ||
    pathname.startsWith("/app/access");

  // Gate dashboard behind auth
  if (isAppPath && !isPublicAppPath && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login
  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next") ?? "/app";
    const dest = request.nextUrl.clone();
    dest.pathname = next;
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // Pass pathname to layouts via header (used to skip AppShell on install)
  supabaseResponse.headers.set("x-pathname", pathname);

  return supabaseResponse;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
