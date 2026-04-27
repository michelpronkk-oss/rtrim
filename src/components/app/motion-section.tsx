"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn(className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}

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
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
