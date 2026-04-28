"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-white/7 px-2 py-1 font-mono text-[11px] text-[#4A4E72] transition-colors hover:border-white/12 hover:text-[#8888A8]",
        className
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="size-3 text-[#0DDB9E]" /> : <Copy className="size-3" />}
      <span className={copied ? "text-[#0DDB9E]" : ""}>{copied ? "Copied" : label}</span>
    </button>
  );
}
