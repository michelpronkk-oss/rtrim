import { cn } from "@/lib/utils";

interface IntelligenceMetricProps {
  label: string;
  value: string;
  interpretation: string;
  tone?: "neutral" | "mint" | "amber" | "coral";
  className?: string;
}

const toneMap = {
  neutral: "text-[#F5F7FA]",
  mint: "text-[#7EE7D8]",
  amber: "text-[#F0BF72]",
  coral: "text-[#FF9C88]",
};

export function IntelligenceMetric({
  label,
  value,
  interpretation,
  tone = "neutral",
  className,
}: IntelligenceMetricProps) {
  return (
    <div className={cn("surface-panel rounded-xl p-4", className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight", toneMap[tone])}>{value}</p>
      <p className="mt-1 text-[12px] leading-5 text-[#9AA7B6]">{interpretation}</p>
    </div>
  );
}
