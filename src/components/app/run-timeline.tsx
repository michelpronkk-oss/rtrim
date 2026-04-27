import { cn } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";

type RunStatus = "passed" | "partial" | "needs_verification" | "drift_detected" | "guarded";

interface RunEntry {
  id: string;
  task: string;
  riskBefore: string;
  riskAfter?: string;
  status: RunStatus;
  date: string;
  nextPrompt?: string;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  passed: "Passed",
  partial: "Partial",
  needs_verification: "Needs Verification",
  drift_detected: "Drift Detected",
  guarded: "Guarded",
};

const STATUS_STYLES: Record<RunStatus, string> = {
  passed: "text-emerald-400",
  partial: "text-yellow-400",
  needs_verification: "text-orange-400",
  drift_detected: "text-red-400",
  guarded: "text-muted-foreground",
};

const STATUS_DOT: Record<RunStatus, string> = {
  passed: "bg-emerald-500",
  partial: "bg-yellow-500",
  needs_verification: "bg-orange-500",
  drift_detected: "bg-red-500",
  guarded: "bg-muted-foreground/50",
};

interface RunTimelineProps {
  runs: RunEntry[];
  className?: string;
}

export function RunTimeline({ runs, className }: RunTimelineProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {runs.map((run, i) => (
        <div key={run.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "mt-1.5 size-2 rounded-full shrink-0",
                STATUS_DOT[run.status]
              )}
            />
            {i < runs.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1.5" />
            )}
          </div>
          <div className={cn("pb-6 flex-1 min-w-0", i === runs.length - 1 && "pb-0")}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{run.date}</span>
              <span className={cn("text-xs font-medium", STATUS_STYLES[run.status])}>
                {STATUS_LABELS[run.status]}
              </span>
            </div>
            <p className="text-sm text-foreground leading-snug mb-2 truncate">{run.task}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Risk before
                </span>
                <RiskBadge risk={run.riskBefore} size="sm" />
              </div>
              {run.riskAfter && (
                <>
                  <span className="text-muted-foreground/40 text-xs">to</span>
                  <RiskBadge risk={run.riskAfter} size="sm" />
                </>
              )}
            </div>
            {run.nextPrompt && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {run.nextPrompt}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
