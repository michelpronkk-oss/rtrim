"use client";

import { motion } from "framer-motion";

interface RiskMapItem {
  system: string;
  state: "safe" | "sensitive" | "blocked" | "needs_verification";
  note: string;
}

const STATE_CONFIG = {
  safe:              { dot: "bg-[#4DE8B0]", badge: "border-[#4DE8B0]/25 bg-[#4DE8B0]/8 text-[#4DE8B0]",    label: "Safe",         pulse: false },
  sensitive:         { dot: "bg-[#7BAEFF]", badge: "border-[#7BAEFF]/25 bg-[#7BAEFF]/8 text-[#7BAEFF]",    label: "Sensitive",    pulse: false },
  needs_verification:{ dot: "bg-[#F0BF72]", badge: "border-[#F0BF72]/25 bg-[#F0BF72]/8 text-[#F0BF72]",    label: "Verify first", pulse: true  },
  blocked:           { dot: "bg-[#FF7B5C]", badge: "border-[#FF7B5C]/25 bg-[#FF7B5C]/8 text-[#FF7B5C]",    label: "Blocked",      pulse: true  },
};

export function RiskMap({ items }: { items: RiskMapItem[] }) {
  return (
    <section className="surface-panel rounded-xl">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">System risk map</p>
        <span className="font-mono text-[10px] text-[#2E2E50]">{items.length} systems</span>
      </div>
      <div className="divide-y divide-white/8">
        {items.map((item, i) => {
          const cfg = STATE_CONFIG[item.state];
          return (
            <motion.div
              key={item.system}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              <div className="relative size-2 shrink-0">
                <div className={`size-2 rounded-full ${cfg.dot}`} />
                {cfg.pulse && (
                  <div className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping opacity-40`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold capitalize text-[#EDEEFF]">{item.system}</p>
                <p className="text-[12px] text-[#4D5070]">{item.note}</p>
              </div>
              <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${cfg.badge}`}>
                {cfg.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
