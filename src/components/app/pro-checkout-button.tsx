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
  const [state,   setState]   = useState<"idle" | "loading" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState<string>("");

  async function startCheckout() {
    setState("loading");
    setErrMsg("");

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

    // Try to read the error message before deciding what to show
    const data = await res?.json().catch(() => null) as {
      ok?: boolean;
      url?: string;
      error?: string;
    } | null;

    if (!res?.ok || !data?.ok) {
      setErrMsg(data?.error ?? "Checkout failed — please try again.");
      setState("error");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      // Stay in loading — browser is navigating
    } else {
      setErrMsg("No checkout URL returned. Please try again.");
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
          {errMsg}
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
