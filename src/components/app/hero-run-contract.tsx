"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, startDelay = 900, charSpeed = 42) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let iv: ReturnType<typeof setInterval>;
    t = setTimeout(() => {
      let i = 0;
      iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, charSpeed);
    }, startDelay);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [text, startDelay, charSpeed]);

  return { displayed, done };
}

// ── Animated meter ────────────────────────────────────────────────────────────

function Meter({ pct, mint, delay = 0 }: { pct: number; mint?: boolean; delay?: number }) {
  return (
    <span style={{
      flex: 1, minWidth: 120, height: 6, background: "#14171c",
      borderRadius: 3, overflow: "hidden", position: "relative",
      border: "1px solid rgba(255,255,255,0.04)", display: "block",
    }}>
      <motion.span
        style={{
          display: "block", height: "100%", borderRadius: 3,
          background: mint
            ? "linear-gradient(90deg, #10b981, #6ee7b7)"
            : "linear-gradient(90deg, #6d4cf2, #a78bfa)",
        }}
        initial={{ width: "0%" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
    </span>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ variant, children }: { variant?: "scope" | "forbid" | "mem" | "warn"; children: React.ReactNode }) {
  const map = {
    scope:  { color: "#6ee7b7", borderColor: "rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.06)" },
    forbid: { color: "#f87171", borderColor: "rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)" },
    mem:    { color: "#a78bfa", borderColor: "rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.07)" },
    warn:   { color: "#f5a524", borderColor: "rgba(245,165,36,0.3)",   background: "rgba(245,165,36,0.07)" },
  };
  const s = variant ? map[variant] : { color: "#c9ccd2", borderColor: "rgba(255,255,255,0.09)", background: "#16191e" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: 4, fontSize: "11.5px",
      ...MONO, border: `1px solid ${s.borderColor}`, background: s.background, color: s.color,
    }}>
      {children}
    </span>
  );
}

// ── Animated row ──────────────────────────────────────────────────────────────

function Row({ k, children, delay = 0 }: { k: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      style={{
        display: "grid", gridTemplateColumns: "120px 1fr", gap: 16,
        padding: "9px 16px", alignItems: "center",
        borderBottom: "1px dashed rgba(255,255,255,0.04)", ...MONO,
      }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      <span style={{ color: "#5a5f68", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {k}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, minWidth: 0 }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── HeroRunContract ───────────────────────────────────────────────────────────

export function HeroRunContract() {
  const { displayed: task, done: taskDone } = useTypewriter("fix checkout bug", 800, 44);

  return (
    <div style={{ position: "relative" }}>
      {/* Floating badge */}
      <motion.div
        style={{
          position: "absolute", right: 10, top: -14, zIndex: 2,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 6, background: "#111317",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 8px 24px -10px rgba(0,0,0,0.8)",
          ...MONO, fontSize: "10.5px", color: "#c9ccd2",
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}
        initial={{ opacity: 0, y: -8, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.2 }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7",
          boxShadow: "0 0 8px #6ee7b7", animation: "rt-contract-pulse 1.8s ease-in-out infinite",
          display: "inline-block",
        }} />
        Run #4f2a · live
      </motion.div>

      {/* Contract panel */}
      <motion.div
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #0e1116, #0a0c10)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
          boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 30px 60px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.4)",
          overflow: "hidden", ...MONO, fontSize: "12.5px", color: "#c9ccd2",
        }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 26, delay: 0.1 }}
      >
        {/* Top glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(167,139,250,0.06), transparent 30%)",
        }} />

        {/* Head */}
        <motion.div
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, #14171c, #0d1014)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 9, height: 9, borderRadius: "50%", background: "#2a2e36",
                border: "1px solid rgba(255,255,255,0.05)", display: "block",
              }} />
            ))}
          </div>
          <span style={{ color: "#5a5f68", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            runtrim · guarded run
          </span>
          <span style={{ marginLeft: "auto", color: "#5a5f68", fontSize: "11px" }}>
            repo <b style={{ color: "#c9ccd2", fontWeight: 500 }}>core/checkout-api</b>
          </span>
        </motion.div>

        {/* Body rows — staggered */}
        <div style={{ padding: "6px 0" }}>
          <Row k="Task" delay={0.38}>
            <span style={{ color: "#f4f5f7", minWidth: 120 }}>
              {task}
              {!taskDone && (
                <motion.span
                  style={{ display: "inline-block", width: 1, height: "0.85em", background: "#f4f5f7", marginLeft: 2, verticalAlign: "text-bottom" }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                />
              )}
            </span>
          </Row>
          <Row k="Memory" delay={0.5}>
            <Pill variant="mem">loaded</Pill>
            <span style={{ color: "#5a5f68", fontSize: "11.5px" }}>project context</span>
          </Row>
          <Row k="Scope" delay={0.6}>
            <Pill variant="scope">api/webhooks/**</Pill>
          </Row>
          <Row k="Forbidden" delay={0.7}>
            <Pill variant="forbid">.env*</Pill>
            <Pill variant="forbid">migrations/**</Pill>
          </Row>
          <Row k="Risk" delay={0.8}>
            <Meter pct={22} mint delay={1.1} />
            <motion.span
              style={{ color: "#6ee7b7", fontSize: "11.5px", minWidth: 56, textAlign: "right" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.1, duration: 0.3 }}
            >
              low
            </motion.span>
          </Row>
          <Row k="Finish" delay={0.9}>
            <Pill>tests pass</Pill>
            <Pill>no forbidden writes</Pill>
          </Row>
          <Row k="Sync" delay={1.0}>
            <motion.span
              style={{ color: "#6ee7b7", fontSize: "11.5px" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              ready
            </motion.span>
          </Row>
        </div>

        {/* Footer */}
        <motion.div
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.012)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "11px", color: "#8a8f98", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "#6ee7b7",
              boxShadow: "0 0 0 3px rgba(110,231,183,0.14), 0 0 10px rgba(110,231,183,0.4)",
              animation: "rt-contract-pulse 1.8s ease-in-out infinite", display: "inline-block",
            }} />
            agent: claude-3.7
          </span>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)" }} />
          <span style={{ color: "#5a5f68", fontSize: "11px" }}>
            <b style={{ color: "#c9ccd2", fontWeight: 500 }}>step 4 / 7</b> · writing tests
          </span>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)" }} />
          <span style={{ color: "#5a5f68", fontSize: "11px" }}>
            sync <b style={{ color: "#c9ccd2", fontWeight: 500 }}>cloud · paused</b>
          </span>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes rt-contract-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.55; transform:scale(0.85); }
        }
      `}</style>
    </div>
  );
}

/* ── Compact proof card for mobile hero ──────────────────────────────────────── */

const MOBILE_ROWS: { k: string; v: string; color?: string }[] = [
  { k: "task",      v: "fix checkout bug",    color: "#f4f5f7" },
  { k: "memory",    v: "loaded",              color: "#a78bfa" },
  { k: "scope",     v: "api/webhooks/**",     color: "#6ee7b7" },
  { k: "forbidden", v: ".env  migrations/**", color: "#f87171" },
  { k: "risk",      v: "low",                 color: "#6ee7b7" },
  { k: "finish",    v: "tests pass",          color: "#c9ccd2" },
  { k: "sync",      v: "ready",               color: "#6ee7b7" },
];

export function MobileContractCard() {
  return (
    <motion.div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #0e1116, #0a0c10)",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10,
        boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.7)",
        overflow: "hidden", ...MONO, fontSize: "12px", color: "#c9ccd2",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.15 }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(167,139,250,0.05), transparent 40%)",
      }} />

      {/* Head */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, #14171c, #0d1014)",
      }}>
        <span style={{ color: "#5a5f68", fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          runtrim · guarded run
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "10.5px", color: "#6ee7b7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7",
            boxShadow: "0 0 6px #6ee7b7", animation: "rt-contract-pulse 1.8s ease-in-out infinite",
            display: "inline-block", flexShrink: 0,
          }} />
          live
        </span>
      </div>

      {/* Rows */}
      <div style={{ padding: "3px 0" }}>
        {MOBILE_ROWS.map(({ k, v, color }, i) => (
          <motion.div
            key={k}
            style={{
              display: "grid", gridTemplateColumns: "76px 1fr", gap: 10,
              padding: "6px 14px", alignItems: "center",
              borderBottom: i < MOBILE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.25 + i * 0.06, ease: "easeOut" }}
          >
            <span style={{ color: "#5a5f68", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
            <span style={{ color: color ?? "#c9ccd2", fontSize: "12px", fontWeight: 500 }}>{v}</span>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <motion.div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "7px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.3 }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "10.5px", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 0 2px rgba(167,139,250,0.2)", display: "inline-block" }} />
          guarded
        </span>
        <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.09)", display: "inline-block" }} />
        <span style={{ color: "#5a5f68", fontSize: "10.5px" }}>step 4 / 7 · writing tests</span>
      </motion.div>
    </motion.div>
  );
}
