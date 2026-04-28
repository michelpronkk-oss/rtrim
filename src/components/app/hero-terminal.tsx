"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const COMMAND = 'npm run runtrim -- run "fix checkout redirect"';
const TYPE_SPEED = 36;

type LT = "prompt" | "output" | "comment" | "accent" | "dim" | "header";
interface Line { type?: LT; text: string; }

const LINE_STYLES: Record<LT, string> = {
  prompt:  "text-[#0DDB9E]",
  output:  "text-[#C4C4D4]",
  comment: "text-[#4A4E72]",
  accent:  "text-[#0DDB9E] font-semibold",
  dim:     "text-[#4A4E72]",
  header:  "text-[#8888A8] font-semibold tracking-[0.08em] text-[11px] uppercase",
};

const OUTPUT: Line[] = [
  { type: "dim",    text: "  auditing task..." },
  { text: "" },
  { type: "dim",    text: "  score         47 / 100" },
  { type: "dim",    text: "  systems found  auth  middleware  billing" },
  { type: "accent", text: "  risk          HIGH" },
  { type: "accent", text: "  decision      SPLIT REQUIRED" },
  { text: "" },
  { type: "header", text: "next safe prompt" },
  { type: "output", text: '  "Audit auth flow only. No edits."' },
  { text: "" },
  { type: "dim",    text: "  ~27,000 tokens saved from one blocked run." },
];

export function HeroTerminal() {
  const [charCount,    setCharCount]    = useState(0);
  const [outputCount,  setOutputCount]  = useState(0);
  const [phase,        setPhase]        = useState<"typing" | "pause" | "output" | "done">("typing");
  const [cursorOn,     setCursorOn]     = useState(true);

  // Type command
  useEffect(() => {
    if (phase !== "typing") return;
    if (charCount >= COMMAND.length) { setPhase("pause"); return; }
    const t = setTimeout(() => setCharCount(c => c + 1), TYPE_SPEED);
    return () => clearTimeout(t);
  }, [charCount, phase]);

  // Hold after typing
  useEffect(() => {
    if (phase !== "pause") return;
    const t = setTimeout(() => setPhase("output"), 420);
    return () => clearTimeout(t);
  }, [phase]);

  // Reveal output lines
  useEffect(() => {
    if (phase !== "output") return;
    if (outputCount >= OUTPUT.length) { setPhase("done"); return; }
    const t = setTimeout(() => setOutputCount(c => c + 1), 72);
    return () => clearTimeout(t);
  }, [phase, outputCount]);

  // Cursor blink
  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  const showCursor = phase === "typing" || phase === "pause";

  return (
    <div className="overflow-hidden rounded-lg border border-white/7 bg-[#06070F]">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/7 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/7"  />
          <span className="size-2.5 rounded-full bg-white/4"  />
        </div>
        <span className="font-mono text-[11px] text-[#2E3050]">runtrim</span>
      </div>

      <div className="p-5 font-mono text-[13px] leading-[1.8]">
        {/* Comment */}
        <div className="text-[#4A4E72]"># guard a task before the agent runs</div>
        <div className="h-2.5" />

        {/* Prompt with typing cursor */}
        <div className="text-[#0DDB9E]">
          $ {COMMAND.slice(0, charCount)}
          {showCursor && (
            <span
              className={cn(
                "inline-block w-[0.5em] h-[0.85em] align-middle bg-[#0DDB9E] ml-px",
                cursorOn ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </div>

        {/* Output lines revealed one by one */}
        {OUTPUT.slice(0, outputCount).map((line, i) => {
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
