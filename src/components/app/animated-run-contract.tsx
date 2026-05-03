"use client";

import { motion } from "framer-motion";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const FIELDS = [
  { key: "goal",     value: "fix billing redirect",            kind: "neutral" },
  { key: "allowed",  value: "billing route, checkout client",  kind: "ok"      },
  { key: "forbidden",value: "auth, database schema, env files",kind: "warn"    },
  { key: "budget",   value: "25,000 tokens",                   kind: "neutral" },
  { key: "stop if",  value: "scope expands beyond billing",    kind: "neutral" },
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.15 },
  },
};

const row = {
  hidden:  { opacity: 0, y: 7 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
};

const divider = {
  hidden:  { opacity: 0, scaleX: 0 },
  visible: { opacity: 1, scaleX: 1, transition: { duration: 0.4, ease: EASE } },
};

const statusBadge = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE },
  },
};

const VALUE_COLOR: Record<string, string> = {
  neutral: "text-[#C8D4DF]",
  ok:      "text-[#4DE8B0]/80",
  warn:    "text-[#F0BF72]/80",
};

export function AnimatedRunContract() {
  return (
    <motion.div
      className="rounded-xl border border-[#7C6DFA]/20 bg-[#0C0C20] p-6"
      style={{
        boxShadow: "0 0 0 1px rgba(124,109,250,0.08), inset 0 1px 0 rgba(124,109,250,0.06)",
      }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {/* Title bar */}
      <motion.div
        className="mb-5 flex items-center gap-2"
        variants={row}
      >
        <span className="size-1.5 rounded-full bg-[#7C6DFA]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7C6DFA]/70">
          Run contract
        </span>
      </motion.div>

      {/* Fields */}
      <div className="space-y-3 font-mono text-[13px]">
        {FIELDS.map(({ key, value, kind }) => (
          <motion.div key={key} className="flex items-baseline gap-4" variants={row}>
            <span className="w-16 shrink-0 text-[#3A4460]">{key}</span>
            <span className={VALUE_COLOR[kind]}>{value}</span>
          </motion.div>
        ))}

        {/* Divider */}
        <motion.div
          className="h-px origin-left bg-white/5"
          variants={divider}
        />

        {/* Risk + status row */}
        <motion.div className="flex items-center justify-between" variants={row}>
          <div className="flex items-baseline gap-4">
            <span className="w-16 shrink-0 text-[#3A4460]">risk</span>
            <span className="text-[#F0BF72]/80">medium</span>
          </div>

          {/* Status badge — animates in last with a subtle glow pulse */}
          <motion.div
            variants={statusBadge}
            className="rounded-md border border-[#4DE8B0]/22 bg-[#4DE8B0]/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9EE6CD]"
            style={{ boxShadow: "0 0 12px rgba(77,232,176,0.12)" }}
          >
            guarded
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
