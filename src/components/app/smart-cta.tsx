"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

interface SmartCtaProps {
  label: string;
  className?: string;
  variant?: "pro" | "builder";
  /** Label shown when the user is logged in. Defaults to "Open app". */
  openAppLabel?: string;
  /** Class applied to the Open app link. Falls back to className. */
  openAppClassName?: string;
  /**
   * When true, logged-out users are sent to /login instead of the EA modal.
   * Use for Builder and Team where the flow is: sign in → then request access.
   */
  loginRedirect?: boolean;
  /**
   * When set, logged-out users see a plain link to this URL (e.g. "/app/install").
   * Takes precedence over loginRedirect. Use for Free plan so guests get the
   * install guide while signed-in users see "Open dashboard".
   */
  loggedOutHref?: string;
}

/**
 * Auth-aware CTA.
 * - Checking          → shimmer skeleton (avoids layout shift and blank flash)
 * - Logged in         → "Open dashboard" link to /app
 * - Logged out + loggedOutHref set → plain link to that URL
 * - Logged out + loginRedirect     → /login link
 * - Logged out (default)           → EA modal trigger
 */
export function SmartCta({
  label,
  className,
  variant = "pro",
  openAppLabel = "Open app",
  openAppClassName,
  loginRedirect = false,
  loggedOutHref,
}: SmartCtaProps) {
  const [loggedIn,  setLoggedIn]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session?.user);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Skeleton while session resolves — reuse caller's className so sizing matches
  if (checking) {
    return (
      <button
        type="button"
        disabled
        aria-hidden="true"
        className={`rt-btn-loading ${className ?? ""}`}
      >
        {label}
      </button>
    );
  }

  if (loggedIn) {
    return (
      <Link href="/app" className={openAppClassName ?? className}>
        {openAppLabel}
      </Link>
    );
  }

  if (loggedOutHref) {
    return (
      <Link href={loggedOutHref} className={className}>
        {label}
      </Link>
    );
  }

  if (loginRedirect) {
    return (
      <Link href="/login" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <EarlyAccessModalTrigger
      label={label}
      variant={variant}
      className={className}
    />
  );
}
