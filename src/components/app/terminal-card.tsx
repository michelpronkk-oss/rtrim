import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

interface TerminalLine {
  type?: "prompt" | "output" | "comment" | "accent" | "dim" | "header";
  text: string;
}

interface TerminalCardProps {
  title?: string;
  lines: TerminalLine[];
  copyText?: string;
  className?: string;
  compact?: boolean;
}

const LINE_STYLES: Record<NonNullable<TerminalLine["type"]>, string> = {
  prompt: "text-accent",
  output: "text-foreground/80",
  comment: "text-muted-foreground",
  accent: "text-accent font-medium",
  dim: "text-muted-foreground/60",
  header: "text-foreground font-semibold uppercase tracking-wider text-[11px]",
};

export function TerminalCard({
  title,
  lines,
  copyText,
  className,
  compact,
}: TerminalCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-[oklch(0.07_0_0)] overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
          </div>
          {title && (
            <span className="ml-2 text-xs font-mono text-muted-foreground">{title}</span>
          )}
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className={cn("font-mono text-sm", compact ? "p-3 space-y-0.5" : "p-5 space-y-1")}>
        {lines.map((line, i) => {
          if (line.text === "") {
            return <div key={i} className="h-3" />;
          }
          return (
            <div
              key={i}
              className={cn(
                "leading-relaxed whitespace-pre-wrap",
                LINE_STYLES[line.type ?? "output"]
              )}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
