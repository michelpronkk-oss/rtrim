"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface NewRunModalProps {
  open: boolean;
  onClose: () => void;
  hasConnectedCli: boolean;
}

export function NewRunModal({ open, onClose, hasConnectedCli }: NewRunModalProps) {
  const [task, setTask]     = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const safeTask = task.trim() || "your task here";
  const command  = `runtrim agent "${safeTask.replace(/"/g, '\\"')}" --copy`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 500,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prepare a guarded run"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, calc(100vw - 32px))",
          zIndex: 501,
          background: "#0c0e11",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              New run
            </p>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em", marginTop: 2 }}>
              Prepare a guarded run
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#5a5f68",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Task input */}
          <div>
            <label
              htmlFor="new-run-task"
              style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", display: "block", marginBottom: 7 }}
            >
              Task description
            </label>
            <input
              id="new-run-task"
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCopy(); if (e.key === "Escape") onClose(); }}
              placeholder="e.g. Fix checkout webhook handler"
              autoFocus
              style={{
                width: "100%",
                padding: "9px 13px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "#111317",
                color: "#f4f5f7",
                fontSize: 14,
                outline: "none",
                letterSpacing: "-0.005em",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Command preview */}
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 7 }}>
              Command preview
            </p>
            <div style={{
              display: "flex", alignItems: "center",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#080a0d",
              overflow: "hidden",
            }}>
              <span style={{ ...MONO, fontSize: 12, color: "#a78bfa", padding: "0 4px 0 12px", flexShrink: 0 }}>$</span>
              <code style={{
                ...MONO, fontSize: 12, color: "#c9ccd2",
                flex: 1, padding: "10px 8px 10px 0",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {command}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: "0 14px", height: 40, minWidth: 72,
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  background: "transparent",
                  color: copied ? "#6ee7b7" : "#5a5f68",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span style={{ ...MONO, fontSize: 10.5, letterSpacing: "0.04em" }}>
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            </div>
            <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 6, lineHeight: 1.5 }}>
              Paste in your terminal. RunTrim scopes the run — your agent executes locally.
            </p>
          </div>

          {/* CLI/MCP status */}
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid ${hasConnectedCli ? "rgba(110,231,183,0.18)" : "rgba(245,165,36,0.18)"}`,
            background: hasConnectedCli ? "rgba(110,231,183,0.04)" : "rgba(245,165,36,0.04)",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", marginTop: 4, flexShrink: 0,
              background: hasConnectedCli ? "#6ee7b7" : "#f5a524",
              boxShadow: `0 0 6px ${hasConnectedCli ? "#6ee7b7" : "#f5a524"}`,
            }} />
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>
                {hasConnectedCli ? "CLI connected" : "CLI not connected yet"}
              </p>
              <p style={{ fontSize: 12, color: "#8a8f98", marginTop: 3, lineHeight: 1.55 }}>
                {hasConnectedCli
                  ? "RunTrim creates a contract locally. Your agent runs on your machine. Results sync here after runtrim finish."
                  : "Run runtrim login in your terminal to connect. Source code never leaves your machine."}
              </p>
            </div>
          </div>

          {/* Local-first note */}
          <p style={{ ...MONO, fontSize: 10, color: "#2e3138", letterSpacing: "0.06em", textAlign: "center" }}>
            Source code stays local · execution happens in your terminal
          </p>

        </div>
      </div>
    </>
  );
}
