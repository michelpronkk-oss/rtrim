import { cn } from "@/lib/utils";

type Risk = "low" | "medium" | "high" | "critical" | "none";

const LABELS: Record<Risk, string> = {
  none:     "None",
  low:      "Low",
  medium:   "Medium",
  high:     "High",
  critical: "Critical",
};

const STYLES: Record<Risk, string> = {
  none:     "border-[#0DDB9E]/20 text-[#0DDB9E]",
  low:      "border-[#0DDB9E]/20 text-[#0DDB9E]",
  medium:   "border-[#5B8BFF]/20 text-[#5B8BFF]",
  high:     "border-[#FFA94D]/20 text-[#FFA94D]",
  critical: "border-[#FF4444]/20 text-[#FF4444]",
};

interface RiskBadgeProps {
  risk: Risk | string;
  className?: string;
  size?: "sm" | "md";
}

export function RiskBadge({ risk, className, size = "md" }: RiskBadgeProps) {
  const r = (risk as Risk) in LABELS ? (risk as Risk) : "none";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono uppercase tracking-[0.1em]",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        STYLES[r],
        className
      )}
    >
      {LABELS[r]}
    </span>
  );
}
