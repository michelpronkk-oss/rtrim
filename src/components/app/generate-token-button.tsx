"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check, AlertTriangle } from "lucide-react";

export function GenerateTokenButton() {
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function generate() {
    if (token && !confirmed) {
      setConfirmed(true);
      return;
    }
    setLoading(true);
    setError(null);
    setToken(null);
    setConfirmed(false);

    const res = await fetch("/api/cli-token/generate", { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not generate token.");
    } else {
      setToken(json.token as string);
    }
    setLoading(false);
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (confirmed) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-[#F0BF72]/20 bg-[#F0BF72]/6 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#F0BF72]" />
          <div>
            <p className="text-[13px] font-semibold text-[#EDEEFF]">
              This will invalidate your existing token.
            </p>
            <p className="mt-0.5 text-[12px] text-[#5E6A88]">
              Any machine using the old token will stop syncing.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {loading ? "Generating..." : "Yes, regenerate"}
          </button>
          <button
            onClick={() => setConfirmed(false)}
            className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (token) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[#4DE8B0]/18 bg-[#4DE8B0]/5 px-4 py-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4DE8B0]/70">
            CLI token — shown once
          </p>
          <div
            className="flex items-center overflow-hidden rounded-lg"
            style={{
              background: "#090A1F",
              border: "1px solid rgba(77,232,176,0.20)",
            }}
          >
            <code className="flex-1 overflow-x-auto whitespace-nowrap px-4 py-3 font-mono text-[13px] text-[#4DE8B0]">
              {token}
            </code>
            <button
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 border-l border-[#4DE8B0]/15 px-4 py-3 font-mono text-[11px] text-[#4DE8B0]/70 transition-colors hover:text-[#4DE8B0]"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2.5 text-[12px] text-[#5E6A88]">
            Copy this token now. It will not be shown again. Run{" "}
            <code className="font-mono text-[#9E91FF]">runtrim login</code> and paste it when prompted.
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-1.5 text-[12px] text-[#3A4460] transition-colors hover:text-[#9699BE]"
        >
          <RefreshCw className="size-3.5" />
          Regenerate token
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-[12px] text-[#FF8F8F]">{error}</p>
      )}
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{
          boxShadow:
            "0 0 0 1px rgba(124,109,250,0.45), 0 4px 16px rgba(124,109,250,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {loading ? "Generating..." : "Generate CLI token"}
      </button>
    </div>
  );
}
