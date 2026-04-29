"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  /** The raw number to count up to */
  end: number;
  /** Display as ~Xk instead of raw number */
  kiloFormat?: boolean;
  /** Prefix before the number */
  prefix?: string;
  /** Suffix after the number */
  suffix?: string;
  /** Duration in ms */
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  end,
  kiloFormat = false,
  prefix = "",
  suffix = "",
  duration = 1600,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;

    let startTs: number | null = null;

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out quart — fast start, smooth settle
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(end * eased));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [isInView, end, duration]);

  const display = kiloFormat
    ? `~${Math.round(value / 1000)}k`
    : String(value);

  return (
    <span ref={ref} className={cn(className)}>
      {prefix}
      {isInView ? display : kiloFormat ? "~0k" : "0"}
      {suffix}
    </span>
  );
}
