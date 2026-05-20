'use client';

import { useState } from "react";

export function CopyContextButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center rounded-md border border-white/12 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#a7acb6] transition-colors hover:border-white/20 hover:text-[#d5dae3]"
    >
      {copied ? "Copied" : "Copy next run context"}
    </button>
  );
}