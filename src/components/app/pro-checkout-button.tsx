"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface ProCheckoutButtonProps {
  className?: string;
  label?: string;
}

/**
 * Wires the Pro "Start 3-day Pro trial" CTA to /api/billing/checkout.
 *
 * - Logged-out  → redirect to /login
 * - Logged-in   → POST /api/billing/checkout → redirect to Dodo checkout URL
 * - Loading     → disabled button with "Starting trial…" label
 * - Error       → inline error with "Try again" reset
 */
export function ProCheckoutButton({
  className,
  label = "Start 3-day Pro trial",
}: ProCheckoutButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function startCheckout() {
    setState("loading");

    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/billing/checkout", { method: "POST" }).catch(
      () => null
    );

    if (!res?.ok) {
      setState("error");
      return;
    }

    const data = await res.json().catch(() => null) as { url?: string } | null;

    if (data?.url) {
      window.location.href = data.url;
      // Stay in loading — browser is navigating
    } else {
      setState("error");
    }
  }

  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          onClick={() => setState("idle")}
          className={className}
        >
          Try again
        </button>
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-geist-mono)",
            fontSize: 10,
            color: "#F0BF72",
            margin: 0,
          }}
        >
          Checkout failed — please try again
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={state === "loading"}
      className={
        state === "loading" ? `rt-btn-loading ${className ?? ""}` : className
      }
    >
      {state === "loading" ? "Starting trial…" : label}
    </button>
  );
}
