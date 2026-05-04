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
}

/**
 * Auth-aware CTA.
 * - Checking → shimmer skeleton (avoids layout shift and blank flash)
 * - Logged in  → "Open app/dashboard" link
 * - Logged out → EA modal trigger
 */
export function SmartCta({
  label,
  className,
  variant = "pro",
  openAppLabel = "Open app",
  openAppClassName,
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

  return (
    <EarlyAccessModalTrigger
      label={label}
      variant={variant}
      className={className}
    />
  );
}
