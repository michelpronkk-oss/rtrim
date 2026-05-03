"use client";

import { motion } from "framer-motion";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const LEFT_LINES = [
  { kind: "prompt",  text: '$ [paste into Claude]'                                       },
  { kind: "input",   text: '"Fix the billing redirect. The project uses React 18,'       },
  { kind: "input",   text: " TypeScript, Next.js. Auth is NextAuth, db is Prisma/"       },
  { kind: "input",   text: " Postgres, Stripe for payments, API at /api..."              },
  { kind: "blank",   text: ""                                                             },
  { kind: "warn",    text: "  Context window: 38% used on setup alone"                   },
  { kind: "blank",   text: ""                                                             },
  { kind: "dim",     text: "  [2h 41m later]"                                            },
  { kind: "error",   text: "  Context limit reached"                                     },
  { kind: "error",   text: "  Files changed: 47  (12 out of scope)"                      },
  { kind: "error",   text: "  Modified: auth middleware"                                  },
  { kind: "error",   text: "  Modified: database schema"                                  },
  { kind: "dim",     text: "  No run record saved"                                       },
  { kind: "dim",     text: "  Next session starts from scratch"                          },
];

const RIGHT_LINES = [
  { kind: "prompt",  text: '$ runtrim run "fix billing redirect"'                        },
  { kind: "blank",   text: ""                                                             },
  { kind: "ok",      text: "  Scope:    billing route, checkout client"                  },
  { kind: "guard",   text: "  Forbidden: auth, db schema, env files"                     },
  { kind: "neutral", text: "  Budget:   25,000 tokens"                                   },
  { kind: "ok",      text: "  Memory:   project context loaded"                          },
  { kind: "accent",  text: "  Status:   guarded"                                         },
  { kind: "blank",   text: ""                                                             },
  { kind: "dim",     text: "  [context limit]"                                           },
  { kind: "blank",   text: ""                                                             },
  { kind: "prompt",  text: "$ runtrim continue --reason context_limit"                   },
  { kind: "ok",      text: "  Continuation pack built"                                   },
  { kind: "neutral", text: "  Changed: billing/route.ts (14 lines)"                      },
  { kind: "ok",      text: "  Scope: intact. Next session resumes cleanly."              },
];

const LEFT_COLOR: Record<string, string> = {
  prompt:  "text-[#4A5575]",
  input:   "text-[#3E4868]",
  warn:    "text-[#F0BF72]/70",
  error:   "text-[#FF6B6B]/65",
  dim:     "text-[#2E3550]",
  blank:   "",
};

const RIGHT_COLOR: Record<string, string> = {
  prompt:  "text-[#9E91FF]",
  ok:      "text-[#4DE8B0]/80",
  guard:   "text-[#F0BF72]/75",
  neutral: "text-[#C8D4DF]",
  accent:  "text-[#9E91FF] font-semibold",
  dim:     "text-[#3A4560]",
  blank:   "",
};

function TerminalPanel({
  side,
  label,
  lines,
  colorMap,
  motionProps,
}: {
  side: "left" | "right";
  label: string;
  lines: { kind: string; text: string }[];
  colorMap: Record<string, string>;
  motionProps: object;
}) {
  const isLeft = side === "left";
  return (
    <motion.div
      {...motionProps}
      className={`overflow-hidden rounded-xl border font-mono text-[12px] ${
        isLeft
          ? "border-[#FF5C5C]/12 bg-[#0B0808]"
          : "border-[#7C6DFA]/18 bg-[#070A10]"
      } lg:rounded-none ${
        isLeft ? "lg:rounded-l-xl" : "lg:rounded-r-xl"
      }`}
      style={
        isLeft
          ? { boxShadow: "inset 0 0 40px rgba(255,92,92,0.03)" }
          : { boxShadow: "inset 0 0 40px rgba(124,109,250,0.04)" }
      }
    >
      {/* Title bar */}
      <div
        className={`flex items-center gap-3 border-b px-4 py-2.5 ${
          isLeft ? "border-[#FF5C5C]/10 bg-[#0D0808]" : "border-[#7C6DFA]/12 bg-[#080A12]"
        }`}
      >
        <div className="flex gap-1.5">
          <span className={`size-2.5 rounded-full ${isLeft ? "bg-[#FF5F57]/50" : "bg-[#FF5F57]/25"}`} />
          <span className={`size-2.5 rounded-full ${isLeft ? "bg-[#FFBD2E]/50" : "bg-[#FFBD2E]/25"}`} />
          <span className={`size-2.5 rounded-full ${isLeft ? "bg-[#28CA41]/25" : "bg-[#28CA41]/50"}`} />
        </div>
        <span className={`text-[10px] uppercase tracking-[0.1em] ${isLeft ? "text-[#3A2A2A]" : "text-[#3A4560]"}`}>
          {label}
        </span>
        {!isLeft && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#7C6DFA] opacity-70" />
            <span className="text-[10px] text-[#7C6DFA]/60">guarded</span>
          </div>
        )}
        {isLeft && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#FF5C5C] opacity-40" />
            <span className="text-[10px] text-[#FF5C5C]/40">unguarded</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 leading-[1.8]">
        {lines.map((line, i) => {
          if (line.kind === "blank") return <div key={i} className="h-1.5" />;
          return (
            <div key={i} className={`whitespace-pre-wrap break-all ${colorMap[line.kind] ?? "text-[#C8D4DF]"}`}>
              {line.text}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function BeforeAfterSection() {
  return (
    <section className="border-t border-white/8 bg-[#07071A]">
      <div className="mx-auto max-w-6xl px-6 py-24">

        {/* Header */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">
            The contrast
          </p>
          <h2 className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#EDEEFF] sm:text-[2.4rem]">
            This is what it looks like.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[14px] leading-[1.75] text-[#5E6A88]">
            Same task. One run unguarded, one run controlled.
          </p>
        </motion.div>

        {/* Panels wrapper */}
        <div className="relative">

          {/* Desktop: side-by-side with VS badge */}
          <div className="grid gap-0 lg:grid-cols-2">
            <TerminalPanel
              side="left"
              label="no guardrails"
              lines={LEFT_LINES}
              colorMap={LEFT_COLOR}
              motionProps={{
                initial: { opacity: 0, x: -24 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true, margin: "-80px" },
                transition: { duration: 0.52, ease: EASE },
              }}
            />

            {/* Mobile divider */}
            <div className="flex items-center gap-4 py-4 lg:hidden">
              <div className="h-px flex-1 bg-white/6" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#3A4460]">vs</span>
              <div className="h-px flex-1 bg-white/6" />
            </div>

            <TerminalPanel
              side="right"
              label="runtrim — guarded"
              lines={RIGHT_LINES}
              colorMap={RIGHT_COLOR}
              motionProps={{
                initial: { opacity: 0, x: 24 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true, margin: "-80px" },
                transition: { duration: 0.52, delay: 0.1, ease: EASE },
              }}
            />
          </div>

          {/* Desktop VS badge — positioned over the center seam */}
          <motion.div
            className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center justify-center lg:flex"
            initial={{ opacity: 0, scale: 0.75 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.38, delay: 0.28, ease: EASE }}
          >
            <div
              className="flex size-10 items-center justify-center rounded-full border border-white/12 bg-[#07071A] font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#4A5270]"
              style={{ boxShadow: "0 0 0 4px #07071A, 0 0 16px rgba(0,0,0,0.8)" }}
            >
              vs
            </div>
          </motion.div>
        </div>

        {/* Caption */}
        <motion.p
          className="mt-5 text-center font-mono text-[11px] text-[#2A2A45]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          Left: context wasted, scope drifted, no record. Right: contract-first, scoped, continues cleanly.
        </motion.p>
      </div>
    </section>
  );
}
