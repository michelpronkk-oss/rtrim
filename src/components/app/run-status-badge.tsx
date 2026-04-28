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
  guarded: "Guarded",
  split_required: "Split required",
  partial: "Partial",
  needs_verification: "Needs verification",
  no_changes_detected: "No changes",
  passed: "Passed",
  drift_detected: "Drift detected",
  blocked: "Blocked",
  executed: "Executed",
  checked: "Checked",
};

const STYLES: Record<RunStatus, string> = {
  guarded: "border-white/10 text-[#A5B1BF] bg-white/[0.03]",
  split_required: "border-[#FF785A]/35 text-[#FF9C88] bg-[#FF785A]/10",
  partial: "border-[#E9A84D]/35 text-[#F0BF72] bg-[#E9A84D]/10",
  needs_verification: "border-[#E9A84D]/35 text-[#F0BF72] bg-[#E9A84D]/10",
  no_changes_detected: "border-[#E9A84D]/35 text-[#F0BF72] bg-[#E9A84D]/10",
  passed: "border-[#7EE7D8]/35 text-[#9AEFE3] bg-[#7EE7D8]/10",
  drift_detected: "border-[#FF785A]/35 text-[#FF9C88] bg-[#FF785A]/10",
  blocked: "border-[#FF785A]/35 text-[#FF9C88] bg-[#FF785A]/10",
  executed: "border-white/10 text-[#A5B1BF] bg-white/[0.03]",
  checked: "border-white/10 text-[#A5B1BF] bg-white/[0.03]",
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
        "inline-flex items-center rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em]",
        STYLES[safe],
        className
      )}
    >
      {LABELS[safe]}
    </span>
  );
}
