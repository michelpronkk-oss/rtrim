import { cn } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";

type RunStatus = "passed" | "partial" | "needs_verification" | "drift_detected" | "guarded" | "split_required";

interface RunEntry {
  id: string;
  task: string;
  riskBefore: string;
  riskAfter?: string;
  status: RunStatus;
  date: string;
  nextPrompt?: string;
  changed?: string;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  passed:             "Passed",
  partial:            "Partial",
  needs_verification: "Needs verification",
  drift_detected:     "Drift detected",
  guarded:            "Guarded",
  split_required:     "Split required",
};

const STATUS_COLOR: Record<RunStatus, string> = {
  passed:             "text-[#0DDB9E]",
  partial:            "text-[#5B8BFF]",
  needs_verification: "text-[#5B8BFF]",
  drift_detected:     "text-[#FF4444]",
  guarded:            "text-[#8888A8]",
  split_required:     "text-[#FFA94D]",
};

const DOT_COLOR: Record<RunStatus, string> = {
  passed:             "bg-[#0DDB9E]",
  partial:            "bg-[#5B8BFF]",
  needs_verification: "bg-[#5B8BFF]",
  drift_detected:     "bg-[#FF4444]",
  guarded:            "bg-[#4A4E72]",
  split_required:     "bg-[#FFA94D]",
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
            <div className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT_COLOR[run.status])} />
            {i < runs.length - 1 ? <div className="mt-2 w-px flex-1 bg-white/7" /> : null}
          </div>
          <div className={cn("min-w-0 flex-1 pb-6", i === runs.length - 1 && "pb-0")}>
            <div className="mb-1 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[11px] text-[#2E3050]">{run.date}</span>
              <span className={cn("font-mono text-[11px] font-semibold", STATUS_COLOR[run.status])}>
                {STATUS_LABELS[run.status]}
              </span>
            </div>
            <p className="mb-2 text-sm leading-snug text-[#EEEEF2]">{run.task}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#2E3050]">Risk</span>
              <RiskBadge risk={run.riskBefore} size="sm" />
              {run.riskAfter ? (
                <>
                  <span className="text-[11px] text-[#2E3050]">to</span>
                  <RiskBadge risk={run.riskAfter} size="sm" />
                </>
              ) : null}
              {run.changed ? <span className="text-[11px] text-[#2E3050]">{run.changed}</span> : null}
            </div>
            {run.nextPrompt ? (
              <p className="mt-2 text-[13px] leading-relaxed text-[#4A4E72]">{run.nextPrompt}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
