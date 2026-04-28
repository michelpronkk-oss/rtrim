"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const VIEWS = [
  {
    id: "history",
    label: "runtrim history",
    command: "$ runtrim history",
    lines: [
      "projects tracked: 4",
      "runs captured: 47",
      "prompts reused: 23",
      "",
      "latest runs",
      "run_047  fix checkout redirect                 partial",
      "run_046  auth audit and middleware review      passed",
      "run_045  billing and schema rewrite attempt    split_required",
    ],
  },
  {
    id: "savings",
    label: "runtrim savings",
    command: "$ runtrim savings",
    lines: [
      "projects tracked: 4",
      "runs captured: 47",
      "prompts reused: 23",
      "est. tokens saved: 847,000",
      "est. cost saved: $4.12",
      "",
      "note: estimates are derived from local run history",
    ],
  },
  {
    id: "report",
    label: "runtrim report",
    command: "$ runtrim report",
    lines: [
      "status: partial",
      "verification debt: 4 runs",
      "watch warnings: 2",
      "next safe action: runtrim check",
      "",
      "memory layer",
      "prompt history: active",
      "reusable context: active",
    ],
  },
] as const;

export function HeroTerminal() {
  const [selected, setSelected] = useState<(typeof VIEWS)[number]["id"]>("history");
  const active = useMemo(() => VIEWS.find((v) => v.id === selected) ?? VIEWS[0], [selected]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#090D16] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/7"  />
          <span className="size-2.5 rounded-full bg-white/4"  />
        </div>
        <span className="font-mono text-[11px] text-[#4F5D72]">runtrim preview</span>
      </div>
      <div className="border-b border-white/10 px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setSelected(view.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
                selected === view.id
                  ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/15 text-[#C4B8FF]"
                  : "border-white/10 text-[#6F7F96] hover:border-white/20 hover:text-[#A7B4C8]"
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 font-mono text-[12px] leading-[1.8]">
        <div className="mb-2 text-[#9E91FF]">{active.command}</div>
        {active.lines.map((line, i) => {
          if (line === "") return <div key={i} className="h-2.5" />;
          const isNote = line.startsWith("note:");
          const isHeading = line === "latest runs" || line === "memory layer";
          return (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap",
                isHeading
                  ? "pt-1 uppercase tracking-[0.08em] text-[#6F7F96]"
                  : isNote
                  ? "text-[#5C6B82]"
                  : "text-[#C8D4DF]"
              )}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
