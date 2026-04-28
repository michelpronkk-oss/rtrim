"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface IntelligenceMetricProps {
  label: string;
  value: string;
  interpretation: string;
  tone?: "neutral" | "violet" | "amber" | "coral" | "blue";
  className?: string;
}

const leftBorder: Record<NonNullable<IntelligenceMetricProps["tone"]>, string> = {
  neutral: "border-l-white/15",
  violet:  "border-l-[#7C6DFA]/60",
  amber:   "border-l-[#F0BF72]/60",
  coral:   "border-l-[#FF7B5C]/60",
  blue:    "border-l-[#5B8BFF]/60",
};

const valueColor: Record<NonNullable<IntelligenceMetricProps["tone"]>, string> = {
  neutral: "text-[#EDEEFF]",
  violet:  "text-[#9E91FF]",
  amber:   "text-[#F0BF72]",
  coral:   "text-[#FF7B5C]",
  blue:    "text-[#7BAEFF]",
};

function parseNumber(v: string): number | null {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function formatValue(raw: string, count: number): string {
  const prefix = raw.match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = raw.match(/[^0-9.]+$/)?.[0] ?? "";
  const decimals = raw.includes(".") ? (raw.split(".")[1]?.replace(/[^0-9]/g, "").length ?? 0) : 0;
  return `${prefix}${count.toLocaleString("en-US", { maximumFractionDigits: decimals })}${suffix}`;
}

export function IntelligenceMetric({ label, value, interpretation, tone = "neutral", className }: IntelligenceMetricProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [displayed, setDisplayed] = useState("0");
  const target = parseNumber(value);

  useEffect(() => {
    if (!isInView || target === null) { setDisplayed(value); return; }
    let frame = 0;
    const total = 52;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / total, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      setDisplayed(formatValue(value, current));
      if (frame >= total) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, value]);

  return (
    <div
      ref={ref}
      className={cn(
        "surface-panel rounded-xl border-l-2 px-5 py-4 transition-colors duration-150 hover:bg-[#111030]",
        leftBorder[tone],
        className
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">{label}</p>
      <p className={cn("mt-2.5 text-3xl font-bold tabular-nums tracking-tight", valueColor[tone])}>
        {target !== null ? displayed : value}
      </p>
      <p className="mt-1.5 text-[12px] leading-5 text-[#6870A0]">{interpretation}</p>
    </div>
  );
}
