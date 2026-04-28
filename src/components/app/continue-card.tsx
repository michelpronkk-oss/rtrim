"use client";

import { motion } from "framer-motion";
import { Terminal, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { useState } from "react";
import { RunStatusBadge } from "./run-status-badge";

interface ContinueCardProps {
  project: string;
  status: string;
  lastUpdated: string;
  syncState: string;
  currentFocus: string;
  nextSafeAction: string;
  lastTask: string;
  changedFilesCount: number;
  missingProofItems: string[];
  detectedRiskSystems: string[];
  nextSafePrompt: string;
}

function PromptCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded border border-white/8 px-2.5 py-1 font-mono text-[11px] text-[#4D5070] transition-colors hover:border-white/14 hover:text-[#9699BE]"
    >
      {copied ? <Check className="size-3 text-[#7C6DFA]" /> : <Copy className="size-3" />}
      <span className={copied ? "text-[#7C6DFA]" : ""}>{copied ? "Copied" : "Copy prompt"}</span>
    </button>
  );
}

export function ContinueCard(props: ContinueCardProps) {
  const {
    project, status, lastUpdated, syncState, currentFocus,
    nextSafeAction, lastTask, changedFilesCount,
    missingProofItems, detectedRiskSystems, nextSafePrompt,
  } = props;

  const hasDebt = missingProofItems.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0D0C22]"
    >
      {/* Gradient top edge */}
      <div className="absolute inset-x-0 top-0 h-px brand-gradient opacity-60" />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border border-[#7C6DFA]/25 bg-[#7C6DFA]/10">
            <Terminal className="size-4 text-[#7C6DFA]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">{project}</h2>
              <RunStatusBadge status={status} />
            </div>
            <p className="mt-0.5 text-[12px] text-[#8E95C3]">{currentFocus}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-white/10 bg-[#0E1026] px-2.5 py-1 font-mono text-[11px] text-[#8E95C3]">{syncState}</span>
          <span className="rounded border border-white/10 bg-[#0E1026] px-2.5 py-1 font-mono text-[11px] text-[#8E95C3]">{lastUpdated}</span>
        </div>
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-2 gap-px bg-white/8 sm:grid-cols-4">
        {[
          { label: "Last task", value: lastTask, truncate: true },
          { label: "Changed files", value: `${changedFilesCount} files` },
          { label: "Verification debt", value: `${missingProofItems.length} open items`, warn: hasDebt },
          { label: "Next safe action", value: nextSafeAction, truncate: true },
        ].map(({ label, value, truncate, warn }) => (
          <div key={label} className="bg-[#0D0C22] px-5 py-3.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5D638D]">{label}</p>
            <p className={`mt-1 text-[13px] leading-5 ${warn ? "text-[#F0BF72]" : "text-[#C0C2E8]"} ${truncate ? "line-clamp-1" : ""}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Risk systems row */}
      {detectedRiskSystems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-6 py-3">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3 text-[#4D5070]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Protected systems</span>
          </div>
          {detectedRiskSystems.map((s) => (
            <span key={s} className="rounded border border-white/8 px-2 py-0.5 font-mono text-[11px] text-[#6870A0]">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Next safe prompt */}
      <div className="border-t border-white/8 px-6 py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasDebt && <AlertTriangle className="size-3.5 text-[#F0BF72]" />}
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Next safe prompt</p>
          </div>
          <PromptCopy text={nextSafePrompt} />
        </div>
        <div className="rounded-lg border border-white/8 bg-[#090918] px-4 py-3.5">
          <p className="font-mono text-[13px] leading-6 text-[#C0C2E8]">
            {nextSafePrompt || "Run runtrim check or runtrim memory --prompt to generate."}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["runtrim memory --prompt", "runtrim check", "runtrim sync"].map((cmd) => (
            <code key={cmd} className="rounded border border-white/8 bg-[#090918] px-2.5 py-1 font-mono text-[11px] text-[#4D5070]">
              {cmd}
            </code>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
