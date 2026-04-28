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

export function ProjectCard({ name, lastRun, currentState, estimatedWasteTrimmed, nextSafeAction, risk = "low", className }: ProjectCardProps) {
  return (
    <div className={cn("surface-panel rounded-lg p-5 transition-colors hover:bg-[#111226]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#EEEEF2]">{name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-[#2E3050]">{lastRun}</p>
        </div>
        <RiskBadge risk={risk} size="sm" />
      </div>

      <div className="my-4 h-px bg-white/7" />

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">State</dt>
          <dd className="mt-1.5 text-[13px] leading-relaxed text-[#8888A8]">{currentState}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Est. trimmed</dt>
          <dd className="mt-1.5 text-[13px] font-bold tabular-nums text-[#0DDB9E]">{estimatedWasteTrimmed}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded border border-white/7 bg-[#07080F] px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Next safe action</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#8888A8]">{nextSafeAction}</p>
      </div>
    </div>
  );
}
