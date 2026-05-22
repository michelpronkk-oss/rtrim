import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyButton } from "@/components/app/copy-button";
import { PublicNav } from "@/components/app/public-nav";

export const metadata: Metadata = {
  title: "Install RunTrim | Local-first AI run control",
  description:
    "Install RunTrim, initialize your repo, and start guiding AI coding runs with local memory, scoped prompts, monitoring, and checks.",
  alternates: {
    canonical: "https://www.runtrim.com/app/install",
  },
  robots: { index: true, follow: true },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function Cmd({ text, trackKey }: { text: string; trackKey?: string }) {
  return (
    <div
      className="flex items-center overflow-hidden rounded-[8px]"
      style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <span style={{ ...MONO, fontSize: 11, color: "#a78bfa", padding: "0 6px 0 14px", flexShrink: 0 }}>$</span>
      <code style={{ ...MONO, fontSize: 12, color: "#c9ccd2", flex: 1, padding: "10px 8px 10px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
        {text}
      </code>
      <div style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "8px 12px", flexShrink: 0 }}>
        <CopyButton text={text} trackCommandKey={trackKey} />
      </div>
    </div>
  );
}

function SectionCard({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0c0e11" }}
    >
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg, #111317, #0c0e11)" }}
      >
        <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>{kicker}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const DIRECT_COMMANDS = [
  { n: "01", cmd: "runtrim init",                         note: "Initialize protocol, memory, and agent pointers in a repo." },
  { n: "02", cmd: 'runtrim go "your task"',               note: "Compile a scoped contract, load memory, and copy the guarded prompt." },
  { n: "03", cmd: "runtrim check",                        note: "Review changed files and proof gaps after the agent runs." },
  { n: "04", cmd: "runtrim finish",                       note: "Run the finish check: scope, risk, diff size, forbidden writes." },
  { n: "05", cmd: "runtrim memory",                       note: "Show project memory and resume context." },
  { n: "06", cmd: "runtrim continue --reason usage_limit", note: "Build a continuation prompt when a session hits context or usage limits." },
];

export default function InstallPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">
      <PublicNav />

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Hero :  same grid/glow as all public pages Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        {/* Line grid */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)" }} />
        {/* Violet glow */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)" }} />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          {/* Eyebrow */}
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 32, padding: "0 12px",
              border: "1px solid rgba(110,231,183,0.22)", borderRadius: 6,
              background: "rgba(110,231,183,0.04)",
              ...MONO, fontSize: 11, color: "#6ee7b7", letterSpacing: "0.07em", textTransform: "uppercase",
            }}
          >
            <span
              className="rt-live-dot"
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }}
            />
            Free CLI
          </span>

          <h1
            className="mt-5"
            style={{ fontSize: "clamp(34px, 5.4vw, 62px)", lineHeight: 1.04, letterSpacing: "-0.033em", fontWeight: 500, color: "#f4f5f7", maxWidth: 760 }}
          >
            Install RunTrim.{" "}
            <em style={{ fontStyle: "normal", color: "#8a8f98" }}>
              Start any repo in one command.
            </em>
          </h1>

          <p className="mt-5" style={{ fontSize: 17, lineHeight: 1.6, color: "#c9ccd2", maxWidth: 520 }}>
            Runs locally in your repo. No account required. Source code is never uploaded.
          </p>

          {/* Hero install command :  all elements share height: 40px */}
          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <div
              className="flex items-center overflow-hidden rounded-[8px]"
              style={{
                height: 40,
                background: "#0c0e11",
                border: "1px solid rgba(167,139,250,0.25)",
                boxShadow: "0 0 0 1px rgba(167,139,250,0.06)",
              }}
            >
              <span style={{ ...MONO, fontSize: 12, color: "#a78bfa", padding: "0 6px 0 14px", flexShrink: 0 }}>$</span>
              <code style={{ ...MONO, fontSize: 13, color: "#c9ccd2", padding: "0 10px 0 0" }}>
                npm install -g runtrim
              </code>
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "0 12px", height: "100%", display: "flex", alignItems: "center", flexShrink: 0 }}>
                <CopyButton text="npm install -g runtrim" trackCommandKey="npm_install_global" />
              </div>
            </div>
            <Link
              href="/plans"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 40, padding: "0 16px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent", color: "#8a8f98",
                fontSize: 13, transition: "color 0.15s, border-color 0.15s, background 0.15s",
              }}
              className="group hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
            >
              View plans
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1" style={{ ...MONO, fontSize: 10.5, color: "#3a3e46" }}>
            <span>No account required</span>
            <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)", display: "inline-block", alignSelf: "center" }} />
            <span>Works with Claude, Codex, Cursor</span>
            <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)", display: "inline-block", alignSelf: "center" }} />
            <span>Local first</span>
          </div>
        </div>
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Content Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div
        className="mx-auto py-12 sm:py-16 space-y-5"
        style={{ maxWidth: 1240, padding: "48px clamp(20px,4vw,40px) 80px" }}
      >

        {/* Quick start */}
        <SectionCard kicker="Quick start">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
                Install once. Start in any repo.
              </h2>
              <p className="mt-1.5" style={{ fontSize: 13, color: "#5a5f68" }}>
                Two commands cover the daily workflow.
              </p>
              <div className="mt-4 space-y-2.5">
                <Cmd text="npm install -g runtrim" trackKey="npm_install_global" />
                <Cmd text='runtrim go "your task"' trackKey="runtrim_go" />
              </div>
            </div>
            <div
              className="rounded-[8px] p-4"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#08090b" }}
            >
              <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                What runtrim go does
              </p>
              <ul className="mt-3 space-y-2" style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.6 }}>
                <li><span style={{ color: "#f4f5f7" }}>Compiles a scoped contract.</span> Task, memory, allowed scope, forbidden files.</li>
                <li><span style={{ color: "#f4f5f7" }}>Copies the guarded prompt.</span> Paste into Claude, Codex, Cursor, or any agent.</li>
                <li><span style={{ color: "#f4f5f7" }}>Records the run locally.</span> History, savings, and continuation pack.</li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* Agent mode */}
        <SectionCard kicker="Agent mode">
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
            Choose how RunTrim delivers the prompt.
          </h2>
          <p className="mt-1.5 mb-4" style={{ fontSize: 13, color: "#5a5f68" }}>
            Copy mode works with every agent. Command mode wraps a local CLI directly.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div
              className="rounded-[8px] p-4"
              style={{ border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.04)" }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Copy mode</p>
                <span
                  style={{ ...MONO, fontSize: 10, color: "#a78bfa", border: "1px solid rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.08)", padding: "1px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}
                >
                  Recommended
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#8a8f98", marginBottom: 12 }}>Prepares the contract and copies it. Paste into any agent UI.</p>
              <Cmd text='runtrim go "your task"' />
            </div>
            <div
              className="rounded-[8px] p-4"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#08090b" }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7" }}>Command mode</p>
                <span
                  style={{ ...MONO, fontSize: 10, color: "#5a5f68", border: "1px solid rgba(255,255,255,0.09)", padding: "1px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}
                >
                  Optional
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#8a8f98", marginBottom: 12 }}>Wraps a configured local agent CLI. Use only if you have one set up.</p>
              <div className="space-y-2">
                <Cmd text="runtrim agent set <agent>" />
                <Cmd text='runtrim run "your task"' />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Protocol flow */}
        <SectionCard kicker="Protocol flow">
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em", marginBottom: 16 }}>
            Full command reference.
          </h2>
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" }}>
            {DIRECT_COMMANDS.map((item, i) => (
              <div
                key={item.n}
                className="flex items-start gap-4"
                style={{
                  padding: "14px 16px",
                  borderBottom: i < DIRECT_COMMANDS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  background: i % 2 === 0 ? "#08090b" : "#0c0e11",
                }}
              >
                <span
                  style={{ ...MONO, fontSize: 10, color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 4, padding: "2px 6px", background: "rgba(167,139,250,0.06)", flexShrink: 0, marginTop: 2 }}
                >
                  {item.n}
                </span>
                <div className="min-w-0 flex-1">
                  <code style={{ ...MONO, fontSize: 12.5, color: "#c9ccd2" }}>{item.cmd}</code>
                  <p className="mt-1" style={{ fontSize: 12, color: "#5a5f68" }}>{item.note}</p>
                </div>
                <div className="shrink-0">
                  <CopyButton text={item.cmd} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Cloud sync */}
        <SectionCard kicker="Cloud sync">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <h2 style={{ fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
                Cloud sync is available now.
              </h2>
              <p className="mt-2" style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.65, maxWidth: 560 }}>
                The free CLI runs entirely locally. Cloud sync and hosted run history are available for live plans. When connected, sync uploads run metadata only - source code stays local.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 rounded-[7px] bg-[#f4f5f7] px-4 py-2 text-[13px] font-medium text-[#0b0d10] border border-white transition-colors hover:bg-white"
              >
                View plans
              </Link>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
