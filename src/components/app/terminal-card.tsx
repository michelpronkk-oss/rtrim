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
  prompt:  "text-[#7EE7D8]",
  output:  "text-[#C8D4DF]",
  comment: "text-[#637080]",
  accent:  "text-[#7EE7D8] font-semibold",
  dim:     "text-[#637080]",
  header:  "text-[#9AA7B6] font-semibold tracking-[0.08em] text-[11px] uppercase",
};

export function TerminalCard({ title, lines, copyText, className, compact }: TerminalCardProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-white/8 bg-[#060A0F]", className)}>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/7"  />
            <span className="size-2.5 rounded-full bg-white/4"  />
          </div>
          {title ? <span className="font-mono text-[11px] text-[#2E3A48]">{title}</span> : null}
        </div>
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      <div className={cn("font-mono text-[13px] leading-[1.8]", compact ? "p-3" : "p-5")}>
        {lines.map((line, i) => {
          if (line.text === "") return <div key={i} className="h-2.5" />;
          return (
            <div key={i} className={cn("whitespace-pre-wrap", LINE_STYLES[line.type ?? "output"])}>
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
