import { cn } from "@/lib/utils";

type Risk = "low" | "medium" | "high" | "critical" | "none";

const LABELS: Record<Risk, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STYLES: Record<Risk, string> = {
  none: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
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
        "inline-flex items-center rounded-sm border font-mono uppercase tracking-wider",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        STYLES[r],
        className
      )}
    >
      {LABELS[r]}
    </span>
  );
}
