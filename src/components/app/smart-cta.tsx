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
 * Drop-in replacement for EarlyAccessModalTrigger that is auth-aware.
 *
 * - Logged in  → renders an "Open app" link (user is approved, already in)
 * - Not logged in → renders the EA modal trigger as normal
 *
 * Defaults to showing the modal until the session check resolves so there
 * is no layout shift for the majority of visitors who are not logged in.
 */
export function SmartCta({
  label,
  className,
  variant = "pro",
  openAppLabel = "Open app",
  openAppClassName,
}: SmartCtaProps) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session?.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
