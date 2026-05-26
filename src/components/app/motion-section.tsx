"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import type { HTMLAttributes, CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Shared design-system easing — keep in sync across all motion
const EASE   = [0.21, 0.47, 0.32, 0.98] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };

// ── MotionSection — scroll-triggered section entrance ─────────────────────

interface MotionSectionProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  delay?: number;
  as?: "section" | "div" | "article";
}

export function MotionSection({
  children,
  delay = 0,
  as = "section",
  className,
  ...props
}: MotionSectionProps) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.38, delay, ease: EASE }}
      className={cn(className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}

// ── MotionFade — immediate-on-mount opacity fade (used above the fold) ─────

export function MotionFade({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, delay, ease: "easeOut" }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

// ── MotionCard — scroll entrance + spring hover lift ──────────────────────
// Use for standalone interactive cards (plan cards, feature cards).
// Do NOT use inside tightly-tiled grids with shared borders — the lift
// will create visual gaps. Use CSS hover classes there instead.

export function MotionCard({
  children,
  className,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -3, transition: { ...SPRING } }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ── CountUpPrice — number counts from 0 to target on scroll into view ──────
// Free plans: renders static label. Paid: animates 0 → value.

export function CountUpPrice({
  to,
  prefix = "$",
  suffix = "",
  label,
  delay = 0,
  className,
}: {
  to?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || to === undefined) return;
    const controls = animate(0, to, {
      duration: 1.1,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return controls.stop;
  }, [isInView, to, delay]);

  return (
    <span ref={ref} className={className}>
      {label ?? `${prefix}${count}${suffix}`}
    </span>
  );
}

// ── UptimeBars — 90-day status bar visualization ─────────────────────────────
// Each bar is one day: green = ok, amber = degraded, red = incident.
// Bars animate scaleY from bottom on scroll.

type DayStatus = "ok" | "degraded" | "incident";

export function UptimeBars({ days, delay = 0 }: { days: DayStatus[]; delay?: number }) {
  const COLOR: Record<DayStatus, string> = {
    ok:       "#6ee7b7",
    degraded: "#f0bf72",
    incident: "#f87171",
  };
  const OPACITY: Record<DayStatus, number> = { ok: 0.5, degraded: 1, incident: 1 };
  return (
    <div style={{ display: "flex", gap: 1.5, alignItems: "stretch", height: 26 }}>
      {days.map((s, i) => (
        <motion.div
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 1.5,
            background: COLOR[s],
            originY: 1,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: OPACITY[s] }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.22, delay: delay + i * 0.004, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── CtaBeams — 3 staggered sweep lines for final CTA section entrance ───────
// Position the parent section as relative + overflow:hidden.
// Beams sweep left→right on scroll, creating a cinematic "loading in" effect.

export function CtaBeams() {
  const beams = [
    { top: 0,  opacity: 0.9, delay: 0,    duration: 0.7 },
    { top: 3,  opacity: 0.5, delay: 0.1,  duration: 0.75 },
    { top: 7,  opacity: 0.2, delay: 0.22, duration: 0.8  },
  ];
  return (
    <>
      {beams.map((b, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: b.top,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent 0%, rgba(109,60,220,0.7) 30%, rgba(167,139,250,0.9) 60%, transparent 100%)",
            opacity: b.opacity,
            pointerEvents: "none",
            zIndex: 1,
          }}
          initial={{ x: "-100%" }}
          whileInView={{ x: "0%" }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: b.duration, delay: b.delay, ease: EASE }}
        />
      ))}
    </>
  );
}

// ── ProtocolBars — scroll-triggered fill animation for protocol step cards ──
// Each bar segment slides in from the left, staggered per segment and per card.
// Uses useRef + useInView + imperative animate for reliable mobile triggering.

export function ProtocolBars({
  active,
  cardIndex = 0,
  compact = false,
}: {
  active: boolean;
  cardIndex?: number;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isInView = useInView(containerRef, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;
    barRefs.current.forEach((el, j) => {
      if (!el) return;
      animate(el, { x: ["-100%", "0%"] }, {
        duration: 0.55,
        delay: cardIndex * 0.08 + j * 0.07,
        ease: EASE,
      });
    });
  }, [isInView, cardIndex]);

  return (
    <div
      ref={containerRef}
      style={{ marginTop: compact ? 0 : "auto", paddingTop: compact ? 0 : 16, display: "flex", gap: 4 }}
    >
      {[0, 1, 2, 3].map((j) => (
        <div
          key={j}
          style={{ flex: 1, height: 3, borderRadius: 2, background: "#131619", overflow: "hidden" }}
        >
          <div
            ref={(el) => { barRefs.current[j] = el; }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 2,
              transform: "translateX(-100%)",
              background: active
                ? "linear-gradient(90deg, rgba(109,60,220,0.9), rgba(167,139,250,0.95))"
                : "linear-gradient(90deg, rgba(109,60,220,0.28), rgba(167,139,250,0.32))",
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── MotionAgentCard — scroll-triggered entrance + hover lift for agent grid cells ──
// Use instead of a plain <div> inside the agent grid. The gap:1 / shared-border
// grid pattern means we pass the card's own padding + background as style/className
// rather than letting MotionCard add its own border.

export function MotionAgentCard({
  children,
  index = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      whileHover={{ y: -2, transition: SPRING }}
      transition={{ duration: 0.28, delay: index * 0.055, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ── AgentStatCount — counts from 0 → N on scroll into view (for the "· 7" label) ──

export function AgentStatCount({ to, delay = 0 }: { to: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, to, {
      duration: 0.65,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return controls.stop;
  }, [isInView, to, delay]);

  return <span ref={ref}>{count}</span>;
}

// ── MotionButton — hover lift + tap press for CTAs ────────────────────────
// Renders as inline-flex so it slots into flex rows without breaking layout.
// Wrap a <Link> or <button> inside — the child retains its own styling.

export function MotionButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("inline-flex", className)}
      whileHover={{ y: -1, transition: { type: "spring", stiffness: 600, damping: 28 } }}
      whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 700, damping: 30 } }}
    >
      {children}
    </motion.div>
  );
}
