"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface GenerateTokenButtonProps {
  hasConnectedCli?: boolean;
  cliCreatedAt?: string | null;
}

export function GenerateTokenButton({ hasConnectedCli = false, cliCreatedAt }: GenerateTokenButtonProps) {
  const [newToken,   setNewToken]   = useState<string | null>(null);
  const [visible,    setVisible]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setConfirming(false);
    const res  = await fetch("/api/cli-token/generate", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not generate token.");
    } else {
      setNewToken(json.token as string);
      setVisible(true);
    }
    setLoading(false);
  }

  async function copy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Confirm regenerate ──────────────────────────────────────────────────
  if (confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 7, border: "1px solid rgba(245,165,36,0.22)", background: "rgba(245,165,36,0.05)" }}>
          <AlertTriangle size={13} style={{ color: "#f5a524", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12.5, color: "#f4f5f7", fontWeight: 500, margin: 0 }}>This will invalidate your existing token.</p>
            <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: "3px 0 0" }}>Any machine using the old token will stop syncing.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={generate} disabled={loading}
            style={{ height: 30, padding: "0 12px", borderRadius: 6, background: "#a78bfa", color: "#0b0d10", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Generating..." : "Yes, regenerate"}
          </button>
          <button onClick={() => setConfirming(false)}
            style={{ height: 30, padding: "0 12px", borderRadius: 6, background: "transparent", color: "#5a5f68", fontSize: 12, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Token display row (existing masked OR new token) ────────────────────
  const showingNewToken = newToken !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Token field */}
      <div style={{ padding: "10px 14px", background: "#16191e", border: `1px solid ${showingNewToken ? "rgba(110,231,183,0.22)" : "rgba(255,255,255,0.10)"}`, borderRadius: 7, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {showingNewToken ? (
          <>
            {/* Eye toggle */}
            <button onClick={() => setVisible((v) => !v)} style={{ background: "none", border: "none", color: "#5a5f68", cursor: "pointer", display: "flex", flexShrink: 0, padding: 0 }}>
              {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <code style={{ ...MONO, flex: 1, fontSize: 12.5, color: "#6ee7b7", overflow: "hidden", textOverflow: visible ? "unset" : "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {visible ? newToken : newToken.replace(/(?<=.{12})./g, "•")}
            </code>
            {/* Copy */}
            <button onClick={copy} style={{ display: "inline-flex", alignItems: "center", gap: 5, ...MONO, fontSize: 11, color: copied ? "#6ee7b7" : "#5a5f68", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, transition: "color 0.1s" }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </>
        ) : hasConnectedCli ? (
          <>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: "#6ee7b7", flexShrink: 0 }}><path d="M5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/></svg>
            <code style={{ ...MONO, flex: 1, fontSize: 12.5, color: "#6ee7b7", minWidth: 0 }}>rt_live_••••••••••••••••••••</code>
          </>
        ) : (
          <span style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}>Generate a token to pair this machine</span>
        )}
      </div>

      {/* Show-once note when new token is visible */}
      {showingNewToken && (
        <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: 0, lineHeight: 1.5 }}>
          Copy this token now — it will not be shown again. Run <span style={{ color: "#a78bfa" }}>runtrim login</span> and paste it when prompted.
        </p>
      )}

      {/* Created date */}
      {cliCreatedAt && !showingNewToken && (
        <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: 0 }}>
          created <span style={{ color: "#c9ccd2" }}>
            {new Date(cliCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </p>
      )}

      {/* Error */}
      {error && <p style={{ ...MONO, fontSize: 11, color: "#f87171", margin: 0 }}>{error}</p>}

      {/* Action button */}
      {showingNewToken ? (
        <button onClick={() => setConfirming(true)}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, ...MONO, fontSize: 11, color: "#3a3e46", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.1s" }}
          className="hover:text-[#8a8f98]">
          <RefreshCw size={11} />
          Regenerate token
        </button>
      ) : hasConnectedCli ? (
        <button onClick={() => setConfirming(true)}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, ...MONO, fontSize: 11, color: "#3a3e46", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.1s" }}
          className="hover:text-[#8a8f98]">
          <RefreshCw size={11} />
          Regenerate token
        </button>
      ) : (
        <button onClick={generate} disabled={loading}
          style={{ alignSelf: "flex-start", height: 32, padding: "0 14px", borderRadius: 6, background: "#f4f5f7", color: "#0b0d10", fontSize: 12.5, fontWeight: 600, border: "1px solid #fff", cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, transition: "background 0.12s" }}
          className="hover:bg-white">
          {loading ? "Generating..." : "Generate CLI token"}
        </button>
      )}
    </div>
  );
}
