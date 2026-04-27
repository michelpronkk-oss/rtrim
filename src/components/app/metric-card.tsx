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
    <div
      className={cn(
        "flex flex-col gap-3 rounded-sm border border-border bg-card p-5",
        "transition-colors duration-200 hover:border-accent/30",
        className
      )}
    >
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-3xl font-bold tracking-tight leading-none",
          accent ? "text-accent" : "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
      )}
    </div>
  );
}
