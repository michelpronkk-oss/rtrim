"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

type AgentTarget = "claude-code" | "cursor" | "codex" | "generic";

const AGENT_LABELS: Record<AgentTarget, string> = {
  "claude-code": "Claude Code",
  "cursor":      "Cursor",
  "codex":       "Codex",
  "generic":     "Generic agent",
};

const AGENT_OPTIONS: { value: AgentTarget; label: string }[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "cursor",      label: "Cursor"      },
  { value: "codex",       label: "Codex"       },
  { value: "generic",     label: "Generic agent" },
];

function generateHandoff(task: string): string {
  const t = task || "your task here";
  const escaped = t.replace(/"/g, '\\"');
  return `Use this RunTrim-guarded task.

Task:
${t}

Before editing:
- Use the RunTrim contract from the generated handoff.
- Stay inside scope.
- Treat billing, auth, middleware, env and config as risky unless explicitly allowed.
- Before saying done, run or ask me to run \`runtrim finish\`.
- If blocked, stop and report. Do not claim completion.

Start locally with:
runtrim agent "${escaped}" --copy`;
}

interface NewRunModalProps {
  open: boolean;
  onClose: () => void;
  hasConnectedCli: boolean;
}

export function NewRunModal({ open, onClose, hasConnectedCli }: NewRunModalProps) {
  const [task,          setTask]          = useState("");
  const [agent,         setAgent]         = useState<AgentTarget>("claude-code");
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedHandoff, setCopiedHandoff] = useState(false);

  if (!open) return null;

  const safeTask = task.trim() || "your task here";
  const command  = `runtrim agent "${safeTask.replace(/"/g, '\\"')}" --copy`;
  const handoff  = generateHandoff(task.trim());

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch { /* ignore */ }
  }

  async function handleCopyHandoff() {
    try {
      await navigator.clipboard.writeText(handoff);
      setCopiedHandoff(true);
      setTimeout(() => setCopiedHandoff(false), 2000);
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
          width: "min(600px, calc(100vw - 24px))",
          maxHeight: "88vh",
          zIndex: 501,
          background: "#0c0e11",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              New guarded run
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

        {/* Body — scrollable */}
        <div style={{
          padding: "20px",
          display: "flex", flexDirection: "column", gap: 18,
          overflowY: "auto",
          flex: 1,
        }}>

          {/* A. Task input */}
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
              onKeyDown={(e) => { if (e.key === "Enter") handleCopyCommand(); if (e.key === "Escape") onClose(); }}
              placeholder="Fix checkout bug without touching billing or auth"
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
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* B. Agent target selection */}
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
              Agent target
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {AGENT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAgent(value)}
                  style={{
                    padding: "7px 4px",
                    borderRadius: 7,
                    border: `1px solid ${agent === value ? "rgba(167,139,250,0.40)" : "rgba(255,255,255,0.08)"}`,
                    background: agent === value ? "rgba(167,139,250,0.10)" : "transparent",
                    color: agent === value ? "#a78bfa" : "#8a8f98",
                    fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.12s",
                    textAlign: "center",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 6 }}>
              Changes handoff copy labels only. Does not dispatch to agents.
            </p>
          </div>

          {/* C. MCP / CLI / execution status strip */}
          <div style={{
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "#080a0d",
            overflow: "hidden",
          }}>
            {/* CLI */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              alignItems: "center", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: hasConnectedCli ? "#6ee7b7" : "#f5a524",
                  boxShadow: `0 0 6px ${hasConnectedCli ? "#6ee7b7" : "#f5a524"}`,
                }} />
                <span style={{ fontSize: 12.5, color: "#f4f5f7" }}>CLI</span>
              </div>
              <span style={{ ...MONO, fontSize: 11, color: hasConnectedCli ? "#6ee7b7" : "#f5a524" }}>
                {hasConnectedCli ? "connected" : "not connected"}
              </span>
            </div>
            {/* MCP */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              alignItems: "center", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: "#3a3e46",
                }} />
                <span style={{ fontSize: 12.5, color: "#f4f5f7" }}>MCP</span>
              </div>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>
                not tracked yet
              </span>
            </div>
            {/* Execution */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "10px 14px",
              alignItems: "center", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: "#6ee7b7",
                  boxShadow: "0 0 6px #6ee7b7",
                }} />
                <span style={{ fontSize: 12.5, color: "#f4f5f7" }}>Execution</span>
              </div>
              <span style={{ ...MONO, fontSize: 11, color: "#6ee7b7" }}>
                local
              </span>
            </div>
          </div>

          {!hasConnectedCli && (
            <p style={{ ...MONO, fontSize: 11, color: "#f5a524", letterSpacing: "0.02em", lineHeight: 1.55 }}>
              Connect CLI first for dashboard sync. Run{" "}
              <code style={{ color: "#c9ccd2" }}>runtrim login</code> in your terminal.
            </p>
          )}

          {/* D. Contract preview */}
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
              Contract preview
            </p>
            <div style={{
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "#080a0d",
              overflow: "hidden",
            }}>
              {[
                { k: "Task",        v: safeTask },
                { k: "Mode",        v: "guarded handoff" },
                { k: "Scope",       v: "RunTrim generates the full contract locally" },
                { k: "Risk",        v: "billing / auth / middleware / config need explicit approval" },
                { k: "Finish rule", v: "run runtrim finish before trusting output" },
                { k: "Recovery",    v: "runtrim restore if blocked" },
              ].map(({ k, v }, idx, arr) => (
                <div
                  key={k}
                  style={{
                    display: "grid", gridTemplateColumns: "88px 1fr",
                    padding: "8px 12px",
                    borderBottom: idx < arr.length - 1 ? "1px dashed rgba(255,255,255,0.04)" : "none",
                    gap: 12, alignItems: "start",
                  }}
                >
                  <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.07em", paddingTop: 1 }}>
                    {k}
                  </span>
                  <span style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", lineHeight: 1.45 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* E. Copyable local command */}
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 7 }}>
              Local command
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
                onClick={handleCopyCommand}
                style={{
                  padding: "0 14px", height: 40, minWidth: 72,
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  background: "transparent",
                  color: copiedCommand ? "#6ee7b7" : "#5a5f68",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              >
                {copiedCommand ? <Check size={11} /> : <Copy size={11} />}
                <span style={{ ...MONO, fontSize: 10.5, letterSpacing: "0.04em" }}>
                  {copiedCommand ? "Copied" : "Copy"}
                </span>
              </button>
            </div>
            <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 6, lineHeight: 1.5 }}>
              Paste in your terminal. RunTrim generates the contract locally.
            </p>
          </div>

          {/* F. Copyable agent handoff */}
          <div>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 7 }}>
              Agent handoff — {AGENT_LABELS[agent]}
            </p>
            <div style={{
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "#080a0d",
              overflow: "hidden",
            }}>
              <pre style={{
                ...MONO, fontSize: 11.5,
                color: "#8a8f98",
                lineHeight: 1.6,
                margin: 0, padding: "12px 14px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 148, overflowY: "auto",
              }}>
                {handoff}
              </pre>
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.04)",
                padding: "8px 12px",
                display: "flex", justifyContent: "flex-end",
              }}>
                <button
                  type="button"
                  onClick={handleCopyHandoff}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent",
                    color: copiedHandoff ? "#6ee7b7" : "#5a5f68",
                    cursor: "pointer",
                    transition: "color 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {copiedHandoff ? <Check size={11} /> : <Copy size={11} />}
                  <span style={{ ...MONO, fontSize: 10.5, letterSpacing: "0.04em" }}>
                    {copiedHandoff ? "Copied" : "Copy handoff"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* G. CTA hierarchy */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Primary */}
            <button
              type="button"
              onClick={handleCopyCommand}
              style={{
                flex: "1 1 140px",
                padding: "9px 16px",
                borderRadius: 8,
                background: copiedCommand ? "#6ee7b7" : "#f4f5f7",
                color: "#0b0d10",
                fontSize: 13, fontWeight: 500,
                border: "1px solid #fff",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {copiedCommand ? <Check size={12} /> : <Copy size={12} />}
              {copiedCommand ? "Command copied" : "Copy command"}
            </button>
            {/* Secondary */}
            <button
              type="button"
              onClick={handleCopyHandoff}
              style={{
                flex: "1 1 140px",
                padding: "9px 16px",
                borderRadius: 8,
                border: `1px solid ${copiedHandoff ? "rgba(110,231,183,0.40)" : "rgba(255,255,255,0.12)"}`,
                background: copiedHandoff ? "rgba(110,231,183,0.08)" : "transparent",
                color: copiedHandoff ? "#6ee7b7" : "#c9ccd2",
                fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {copiedHandoff ? <Check size={12} /> : <Copy size={12} />}
              {copiedHandoff ? "Handoff copied" : "Copy handoff"}
            </button>
          </div>

          {/* MCP note + tertiary CTA */}
          <div style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.04)",
            background: "#080a0d",
          }}>
            <p style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.55, margin: 0 }}>
              MCP makes this smoother after one-time setup. For now, copy the guarded command.
            </p>
            <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginTop: 6, lineHeight: 1.5 }}>
              To connect: <code style={{ color: "#a78bfa" }}>runtrim mcp instructions</code>
            </p>
          </div>

          {/* H. Footer trust line */}
          <p style={{ ...MONO, fontSize: 10, color: "#2e3138", letterSpacing: "0.06em", textAlign: "center" }}>
            Source stays local · execution happens in your terminal · dashboard syncs proof
          </p>

        </div>
      </div>
    </>
  );
}
