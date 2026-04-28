import { cn } from "@/lib/utils";

type RunStatus =
  | "guarded"
  | "split_required"
  | "partial"
  | "needs_verification"
  | "no_changes_detected"
  | "passed"
  | "drift_detected"
  | "blocked"
  | "executed"
  | "checked";

const LABELS: Record<RunStatus, string> = {
  guarded:             "Guarded",
  split_required:      "Split required",
  partial:             "Partial",
  needs_verification:  "Needs verification",
  no_changes_detected: "No changes",
  passed:              "Passed",
  drift_detected:      "Drift detected",
  blocked:             "Blocked",
  executed:            "Executed",
  checked:             "Checked",
};

const STYLES: Record<RunStatus, string> = {
  guarded:             "border-[#7C6DFA]/30 text-[#9E91FF] bg-[#7C6DFA]/8",
  split_required:      "border-[#FF7B5C]/30 text-[#FF9C80] bg-[#FF7B5C]/8",
  partial:             "border-[#F0BF72]/30 text-[#F0BF72] bg-[#F0BF72]/8",
  needs_verification:  "border-[#F0BF72]/30 text-[#F0BF72] bg-[#F0BF72]/8",
  no_changes_detected: "border-[#F0BF72]/30 text-[#F0BF72] bg-[#F0BF72]/8",
  passed:              "border-[#4DE8B0]/30 text-[#4DE8B0] bg-[#4DE8B0]/8",
  drift_detected:      "border-[#FF7B5C]/30 text-[#FF9C80] bg-[#FF7B5C]/8",
  blocked:             "border-[#FF7B5C]/30 text-[#FF9C80] bg-[#FF7B5C]/8",
  executed:            "border-white/10 text-[#A8AACC] bg-white/[0.04]",
  checked:             "border-white/10 text-[#A8AACC] bg-white/[0.04]",
};

interface RunStatusBadgeProps {
  status: string;
  className?: string;
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const normalized = (status || "guarded").toLowerCase() as RunStatus;
  const safe: RunStatus = normalized in LABELS ? normalized : "guarded";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
        STYLES[safe],
        className
      )}
    >
      {LABELS[safe]}
    </span>
  );
}
