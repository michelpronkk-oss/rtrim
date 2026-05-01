"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const VIEWS = [
  {
    id: "history",
    label: "runtrim history",
    command: "$ runtrim history",
    lines: [
      { text: "projects tracked: 4",                            kind: "kv"      },
      { text: "runs captured:    47",                           kind: "kv"      },
      { text: "prompts reused:   23",                           kind: "kv"      },
      { text: "",                                               kind: "blank"   },
      { text: "latest runs",                                    kind: "heading" },
      { text: "run_047  fix checkout redirect         partial", kind: "row"     },
      { text: "run_046  auth audit and middleware      passed",  kind: "row-ok"  },
      { text: "run_045  billing and schema attempt    split",   kind: "row-warn"},
    ],
  },
  {
    id: "savings",
    label: "runtrim savings",
    command: "$ runtrim savings",
    lines: [
      { text: "projects tracked:  4",          kind: "kv"     },
      { text: "runs captured:     47",         kind: "kv"     },
      { text: "prompts reused:    23",         kind: "kv"     },
      { text: "",                              kind: "blank"  },
      { text: "est. tokens saved: ~847,000",   kind: "accent" },
      { text: "est. cost saved:   ~$4.12",     kind: "accent" },
      { text: "",                              kind: "blank"  },
      { text: "estimates are derived from local run history", kind: "dim" },
    ],
  },
  {
    id: "report",
    label: "runtrim report",
    command: "$ runtrim report",
    lines: [
      { text: "status:            partial",      kind: "kv"    },
      { text: "verification debt: 4 runs",       kind: "warn"  },
      { text: "watch warnings:    2",            kind: "warn"  },
      { text: "next safe action:  runtrim check",kind: "kv"    },
      { text: "",                                kind: "blank" },
      { text: "memory layer",                    kind: "heading"},
      { text: "prompt history:    active",       kind: "ok"    },
      { text: "reusable context:  active",       kind: "ok"    },
    ],
  },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const LINE_COLOR: Record<string, string> = {
  kv:      "text-[#C8D4DF]",
  blank:   "",
  heading: "text-[#6F7F96] uppercase tracking-[0.08em] text-[10px] pt-1",
  row:     "text-[#A0AFBE]",
  "row-ok":   "text-[#C8D4DF]",
  "row-warn": "text-[#F0BF72]",
  accent:  "text-[#9E91FF] font-semibold",
  dim:     "text-[#5C6B82]",
  warn:    "text-[#F0BF72]",
  ok:      "text-[#4DE8B0]",
};

type RunStatus = "PASS" | "PART" | "SPLIT";

const STATUS_STYLES: Record<RunStatus, string> = {
  PASS: "border-[#4DE8B0]/25 bg-[#4DE8B0]/10 text-[#9EE6CD]",
  PART: "border-[#F0BF72]/25 bg-[#F0BF72]/10 text-[#F2C88D]",
  SPLIT: "border-[#FF7B5C]/25 bg-[#FF7B5C]/10 text-[#FFAC98]",
};

function parseRunRow(text: string): { id: string; task: string; status: RunStatus } | null {
  const parts = text.trim().split(/\s+/);
  const id = parts.shift();
  const rawStatus = parts.pop();

  if (!id || !rawStatus) return null;

  let status: RunStatus | null = null;
  if (rawStatus === "passed") status = "PASS";
  if (rawStatus === "partial") status = "PART";
  if (rawStatus === "split") status = "SPLIT";
  if (!status) return null;

  return {
    id,
    task: parts.join(" "),
    status,
  };
}

function RunRow({ text }: { text: string }) {
  const parsed = parseRunRow(text);
  if (!parsed) return <div className="leading-[1.75] text-[#A0AFBE]">{text}</div>;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 leading-[1.6] sm:flex-nowrap">
      <span className="shrink-0 text-[#7A8AA0]">{parsed.id}</span>
      <span className="min-w-0 flex-1 truncate text-[#A0AFBE]">{parsed.task}</span>
      <span
        className={cn(
          "ml-auto shrink-0 rounded-[6px] border px-1.5 py-[2px] text-[10px] uppercase tracking-[0.08em] rt-terminal-badge-in",
          STATUS_STYLES[parsed.status]
        )}
      >
        {parsed.status}
      </span>
    </div>
  );
}

/* ── Typewriter hook ─────────────────────────────────────── */
function useTypewriter(text: string, charDelay = 32) {
  const [count, setCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setCount(text.length);
      return;
    }
    setCount(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, charDelay);
    return () => clearInterval(id);
  }, [text, charDelay, reducedMotion]);

  return { visible: text.slice(0, count), done: count >= text.length };
}

/* ── Animated output ─────────────────────────────────────── */
function AnimatedLines({
  lines,
  active,
}: {
  lines: (typeof VIEWS)[number]["lines"];
  active: boolean;
}) {
  const [shown, setShown] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    if (!active) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [lines, active, reducedMotion]);

  return (
    <>
      {lines.slice(0, shown).map((line, i) => {
        if (line.kind === "blank") return <div key={i} className="h-2" />;
        if (line.kind === "row" || line.kind === "row-ok" || line.kind === "row-warn") {
          return <RunRow key={i} text={line.text} />;
        }
        return (
          <div
            key={i}
            className={cn("whitespace-pre leading-[1.75]", LINE_COLOR[line.kind] ?? "text-[#C8D4DF]")}
          >
            {line.text}
          </div>
        );
      })}
    </>
  );
}

/* ── Main component ──────────────────────────────────────── */
export function HeroTerminal() {
  const [selected, setSelected] = useState<ViewId>("history");
  const [animKey, setAnimKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setSelected((prev) => {
        const idx = VIEWS.findIndex((v) => v.id === prev);
        const next = VIEWS[(idx + 1) % VIEWS.length];
        return next.id;
      });
      setAnimKey((k) => k + 1);
    }, 5800);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const view = VIEWS.find((v) => v.id === selected) ?? VIEWS[0];
  const { visible: typedCmd, done: cmdDone } = useTypewriter(view.command, 30);

  function selectView(id: ViewId) {
    setSelected(id);
    setAnimKey((k) => k + 1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#07091A]">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#FF5F57]/60" />
          <span className="size-2.5 rounded-full bg-[#FFBD2E]/60" />
          <span className="size-2.5 rounded-full bg-[#28CA41]/60" />
        </div>
        <span className="font-mono text-[11px] text-[#3A4560]">runtrim — terminal</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#7C6DFA] opacity-70" />
          <span className="font-mono text-[10px] text-[#7C6DFA]/70">live</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-white/10 px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => selectView(v.id)}
              className={cn(
                "rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
                selected === v.id
                  ? "border-[#7C6DFA]/40 bg-[#7C6DFA]/15 text-[#C4B8FF]"
                  : "border-white/8 text-[#6F7F96] hover:border-white/18 hover:text-[#A7B4C8]"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output */}
      <div
        key={animKey}
        className={cn(
          "min-h-[200px] p-5 font-mono text-[12px]",
          reducedMotion ? "" : "rt-terminal-view-in"
        )}
      >
        {/* Typed command */}
        <div className="mb-3 text-[#9E91FF]">
          {typedCmd}
          {!cmdDone && (
            <span className="ml-px inline-block h-[13px] w-[7px] translate-y-[1px] animate-pulse bg-[#7C6DFA]/80" />
          )}
        </div>

        {/* Output lines, revealed after command finishes */}
        <AnimatedLines key={animKey} lines={view.lines} active={cmdDone} />
      </div>

      {/* Bottom accent bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7C6DFA]/35 to-transparent" />
    </div>
  );
}
