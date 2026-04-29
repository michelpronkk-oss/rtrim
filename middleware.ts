import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_ACCESS_COOKIE, isAppAccessCodeConfigured, isAppGateBypassed } from "@/lib/app-gate";

function shouldGatePath(pathname: string): boolean {
  return pathname.startsWith("/app") && pathname !== "/app/install" && pathname !== "/app/access";
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!shouldGatePath(pathname)) {
    return NextResponse.next();
  }

  if (isAppGateBypassed()) {
    return NextResponse.next();
  }

  if (!isAppAccessCodeConfigured()) {
    const redirectUrl = new URL("/app/access", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  const accessCookie = request.cookies.get(APP_ACCESS_COOKIE)?.value;
  if (accessCookie === "granted") {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/app/access", request.url);
  redirectUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
