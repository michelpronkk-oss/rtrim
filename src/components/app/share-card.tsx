import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

interface ShareCardProps {
  project: string;
  runsGuarded: number;
  estimatedTokens: string;
  estimatedDollars: string;
  riskReduction: string;
  className?: string;
}

export function ShareCard({ project, runsGuarded, estimatedTokens, estimatedDollars, riskReduction, className }: ShareCardProps) {
  const shareText = [
    `RunTrim report for ${project}`,
    `${runsGuarded} runs guarded`,
    `${estimatedTokens} tokens trimmed (estimated)`,
    `${estimatedDollars} spend avoided (estimated)`,
    `${riskReduction}% avg risk reduction`,
  ].join("\n");

  return (
    <div className={cn("surface-panel overflow-hidden rounded-lg", className)}>
      <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Run summary</p>
          <p className="mt-1 text-sm font-semibold text-[#EEEEF2]">{project}</p>
        </div>
        <CopyButton text={shareText} label="Copy" />
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/7">
        <div className="bg-[#0D0E1C] px-5 py-5 hover:bg-[#111226] transition-colors">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Runs guarded</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#EEEEF2]">{runsGuarded}</p>
        </div>
        <div className="bg-[#0D0E1C] px-5 py-5 hover:bg-[#111226] transition-colors">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Risk reduction</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0DDB9E]">{riskReduction}%</p>
        </div>
        <div className="bg-[#0D0E1C] px-5 py-5 hover:bg-[#111226] transition-colors">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Est. tokens</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#EEEEF2]">{estimatedTokens}</p>
        </div>
        <div className="bg-[#0D0E1C] px-5 py-5 hover:bg-[#111226] transition-colors">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4E72]">Est. spend</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[#0DDB9E]">{estimatedDollars}</p>
        </div>
      </div>

      <div className="border-t border-white/7 px-5 py-3">
        <p className="font-mono text-[11px] text-[#2E3050]">Local estimates only. No code is uploaded in V1.</p>
      </div>
    </div>
  );
}
