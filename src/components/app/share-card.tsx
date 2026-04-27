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

export function ShareCard({
  project,
  runsGuarded,
  estimatedTokens,
  estimatedDollars,
  riskReduction,
  className,
}: ShareCardProps) {
  const shareText = [
    `RunTrim report for ${project}`,
    `${runsGuarded} runs guarded`,
    `~${estimatedTokens} tokens trimmed (estimated)`,
    `~${estimatedDollars} model spend avoided (estimated)`,
    `${riskReduction}% avg. risk reduction`,
    "",
    "runtrim.dev",
  ].join("\n");

  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            RunTrim Report
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">{project}</p>
        </div>
        <CopyButton text={shareText} label="Copy report" />
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Runs guarded
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{runsGuarded}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Risk reduction
          </p>
          <p className="text-2xl font-bold text-accent mt-1">{riskReduction}%</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Est. tokens trimmed
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{estimatedTokens}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Est. spend avoided
          </p>
          <p className="text-2xl font-bold text-accent mt-1">{estimatedDollars}</p>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border">
        <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
          Savings are estimated. RunTrim does not upload code.
        </p>
      </div>
    </div>
  );
}
