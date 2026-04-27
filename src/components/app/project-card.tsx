import { cn } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";

interface ProjectCardProps {
  name: string;
  lastRun: string;
  currentState: string;
  estimatedWasteTrimmed: string;
  nextSafeAction: string;
  risk?: string;
  className?: string;
}

export function ProjectCard({
  name,
  lastRun,
  currentState,
  estimatedWasteTrimmed,
  nextSafeAction,
  risk = "low",
  className,
}: ProjectCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card p-5 flex flex-col gap-4",
        "hover:border-accent/25 transition-colors duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground leading-none">{name}</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono">{lastRun}</p>
        </div>
        <RiskBadge risk={risk} size="sm" />
      </div>

      <div className="h-px bg-border" />

      <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
        <div>
          <dt className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
            State
          </dt>
          <dd className="mt-1 text-foreground">{currentState}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
            Est. Waste Trimmed
          </dt>
          <dd className="mt-1 text-accent">{estimatedWasteTrimmed}</dd>
        </div>
      </dl>

      <div className="rounded-sm bg-muted/50 px-3 py-2.5">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
          Next safe action
        </p>
        <p className="text-xs text-foreground leading-relaxed">{nextSafeAction}</p>
      </div>
    </div>
  );
}
