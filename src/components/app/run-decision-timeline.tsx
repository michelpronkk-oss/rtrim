"use client";

import { motion } from "framer-motion";
import { RunStatusBadge } from "./run-status-badge";

export interface RunDecisionItem {
  id: string;
  task: string;
  status: string;
  riskBefore: string;
  riskAfter?: string;
  filesChanged: number;
  decision: string;
  nextAction: string;
  date: string;
}

const DOT: Record<string, string> = {
  passed:             "bg-[#4DE8B0]",
  guarded:            "bg-[#7C6DFA]",
  split_required:     "bg-[#FF7B5C]",
  blocked:            "bg-[#FF7B5C]",
  partial:            "bg-[#F0BF72]",
  needs_verification: "bg-[#F0BF72]",
  drift_detected:     "bg-[#FF7B5C]",
};

function dot(status: string) {
  return DOT[status.toLowerCase()] ?? "bg-[#4D5070]";
}

export function RunDecisionTimeline({ items }: { items: RunDecisionItem[] }) {
  return (
    <section className="surface-panel rounded-xl">
      <div className="border-b border-white/8 px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Run timeline</p>
      </div>
      <div className="divide-y divide-white/8">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: i * 0.06, ease: "easeOut" }}
            className="flex gap-5 px-6 py-5"
          >
            {/* Dot */}
            <div className="flex flex-col items-center pt-1">
              <div className={`size-2 shrink-0 rounded-full ${dot(item.status)}`} />
              {i < items.length - 1 && (
                <div className="mt-2 w-px flex-1 bg-white/8" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] text-[#4D5070]">{item.date}</span>
                <RunStatusBadge status={item.status} />
              </div>
              <p className="mt-2 text-[14px] font-semibold leading-snug text-[#EDEEFF]">{item.task}</p>
              <p className="mt-1.5 text-[13px] leading-5 text-[#6870A0]">{item.decision}</p>
              <div className="mt-2 flex items-center gap-4 font-mono text-[11px] text-[#4D5070]">
                <span>Risk: {item.riskBefore.toUpperCase()}{item.riskAfter ? ` -> ${item.riskAfter.toUpperCase()}` : ""}</span>
                <span>{item.filesChanged} {item.filesChanged === 1 ? "file" : "files"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
