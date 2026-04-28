import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  className?: string;
}

export function MetricCard({ label, value, sub, accent, className }: MetricCardProps) {
  return (
    <div className={cn("surface-panel rounded-lg p-5 transition-colors hover:bg-[#111226]", className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">{label}</p>
      <p className={cn("mt-3 text-2xl font-bold tabular-nums tracking-tight", accent ? "text-[#0DDB9E]" : "text-[#EEEEF2]")}>
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[13px] text-[#4A4E72]">{sub}</p> : null}
    </div>
  );
}
