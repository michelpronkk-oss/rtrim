"use client";

import { useEffect } from "react";

/**
 * AuthCodeInterceptor
 *
 * Catches the Supabase PKCE ?code= redirect on any page and forwards it to
 * /auth/callback where the session is properly exchanged.
 *
 * WHY THIS EXISTS:
 *   Supabase uses its project "Site URL" as the redirect target for signup
 *   confirmation emails. If Site URL points to the homepage (not /auth/callback),
 *   users land on the homepage with ?code=... instead of the callback route.
 *   This component intercepts that code on any page and routes correctly.
 *
 * REQUIRED SUPABASE SETTING (proper long-term fix):
 *   Dashboard -> Authentication -> URL Configuration
 *   Add https://www.runtrim.com/auth/callback to "Allowed Redirect URLs"
 *   (this makes emailRedirectTo work and makes this component redundant)
 */
export function AuthCodeInterceptor() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get("code");
    if (!code) return;

    // Read the stored intent set by the login form before OTP was sent.
    // Falls back to /app so the user lands in the dashboard.
    let next = "/app";
    try {
      const stored = localStorage.getItem("rt_auth_next");
      if (stored && stored.startsWith("/")) {
        next = stored;
        localStorage.removeItem("rt_auth_next");
      }
    } catch { /* localStorage may be unavailable */ }

    // Forward to the real auth callback with the code and the preserved intent.
    // Use replace() so the page with ?code= is removed from browser history.
    window.location.replace(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    );
  }, []);

  return null;
}
