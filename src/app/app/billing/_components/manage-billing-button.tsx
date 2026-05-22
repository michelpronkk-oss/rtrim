"use client";

import { useState } from "react";

type ManageBillingButtonProps = {
  className?: string;
};

const PORTAL_ERROR = "Could not open billing portal. Contact hello@runtrim.com if this persists.";

export function ManageBillingButton({ className }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; url?: string } | null;

    if (!res?.ok || !data?.ok || !data?.url) {
      setError(PORTAL_ERROR);
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={loading ? `rt-btn-loading ${className ?? ""}` : className}
      >
        {loading ? "Opening billing portal..." : "Manage billing"}
      </button>
      {error && (
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-geist-mono)",
            fontSize: 10,
            color: "#F0BF72",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
