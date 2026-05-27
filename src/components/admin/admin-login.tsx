"use client";

import { useState } from "react";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error === "invalid_credentials" ? "Invalid admin credentials." : "Could not sign in.");
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6">
        <div className="w-full rounded-xl border border-white/10 bg-[#0C0D22] p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7380A3]">RunTrim Admin</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">
            Growth, activation and revenue console.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin username"
              className="w-full rounded-lg border border-white/10 bg-[#090918] px-3.5 py-3 text-[14px] text-[#EDEEFF] outline-none focus:border-white/20"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full rounded-lg border border-white/10 bg-[#090918] px-3.5 py-3 text-[14px] text-[#EDEEFF] outline-none focus:border-white/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            {error ? <p className="text-[12px] text-[#F0BF72]">{error}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}
