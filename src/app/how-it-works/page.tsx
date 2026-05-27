import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";
import { MotionFade } from "@/components/app/motion-section";

export const metadata: Metadata = {
  title: "How RunTrim Works",
  description:
    "See the five-step RunTrim flow: start a guarded run, keep agents in scope, verify changes, review PASS/WARN/BLOCKED, then restore or continue.",
  alternates: { canonical: "https://www.runtrim.com/how-it-works" },
  openGraph: {
    title: "How RunTrim Works | RunTrim",
    description:
      "Start a guarded run, execute inside scope, run finish verification, and recover or continue with proof.",
    url: "https://www.runtrim.com/how-it-works",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "How RunTrim Works" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How RunTrim Works | RunTrim",
    description:
      "Start a guarded run, execute inside scope, run finish verification, and recover or continue with proof.",
    images: ["/opengraph-image"],
  },
};

const STEPS = [
  {
    n: "01",
    title: "Start a guarded run",
    command: "runtrim start",
    body: "RunTrim prepares project memory, agent instructions, and protocol state before edits start.",
  },
  {
    n: "02",
    title: "Create scoped contract",
    command: 'runtrim agent "your task" --copy',
    body: "The run gets a contract with objective, allowed scope, and stop rules so the agent does not drift silently.",
  },
  {
    n: "03",
    title: "Agent works inside scope",
    command: "agent executes task",
    body: "Your agent applies changes inside the contract boundaries. Scope expansion requires explicit approval.",
  },
  {
    n: "04",
    title: "Finish verification",
    command: "runtrim finish",
    body: "RunTrim checks changed files, risky paths, and proof gaps, then returns PASS, WARN, or BLOCKED.",
  },
  {
    n: "05",
    title: "Restore or continue",
    command: "runtrim restore last --preview",
    body: "If needed, restore locally or continue from a generated continuation prompt without starting cold.",
  },
];

const VERDICTS = [
  {
    title: "PASS",
    body: "Run evidence and scope checks passed. Safe to review and proceed.",
  },
  {
    title: "WARN",
    body: "Non-blocking risk found. Proceed only after explicit human review.",
  },
  {
    title: "BLOCKED",
    body: "Needs review and is not trusted yet. Approve scoped amendment or restore.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="rt-page-in min-h-screen overflow-x-hidden bg-[#08090b] text-[#f4f5f7]">
      <PublicNav />

      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)",
          }}
        />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade>
            <span className="inline-flex rounded-full border border-[#a78bfa]/25 bg-[#a78bfa]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#a78bfa]">
              How it works
            </span>
            <h1 className="mt-5 text-[clamp(34px,5.4vw,62px)] font-medium leading-[1.04] tracking-[-0.033em] text-[#f4f5f7]">
              RunTrim controls the run lifecycle around your agent.
            </h1>
            <p className="mt-5 max-w-[760px] text-[17px] leading-[1.6] text-[#c9ccd2]">
              RunTrim is the control, verification and recovery layer for AI coding agents. It enforces scope before edits, verifies changes after edits, and gives you safe recovery and continuation paths.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/app/install"
                data-rt-event="install_cta_clicked"
                className="inline-flex h-10 items-center justify-center rounded-[7px] border border-white bg-[#f4f5f7] px-4 text-[13px] font-medium text-[#0b0d10] transition-colors hover:bg-white"
              >
                Install CLI
              </Link>
              <Link
                href="/faq"
                className="inline-flex h-10 items-center justify-center rounded-[7px] border border-white/14 px-4 text-[13px] font-medium text-[#c9ccd2] transition-colors hover:border-white/28 hover:bg-[#16191e] hover:text-[#f4f5f7]"
              >
                Read FAQ
              </Link>
            </div>
          </MotionFade>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <MotionFade>
          <section className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
            <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">Five-step run flow</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-[8px] border border-white/8 bg-[#090b0e] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7d8493]">Step {step.n}</p>
                  <h3 className="mt-1 text-[15px] font-semibold text-[#f4f5f7]">{step.title}</h3>
                  <code className="mt-2 block rounded border border-white/8 bg-[#08090b] px-2 py-1 font-mono text-[11px] text-[#c9ccd2]">
                    {step.command}
                  </code>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#8a8f98]">{step.body}</p>
                </article>
              ))}
            </div>
          </section>
        </MotionFade>

        <MotionFade delay={0.06}>
          <section className="mt-5 rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
            <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">Finish verdicts</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {VERDICTS.map((item) => (
                <article key={item.title} className="rounded-[8px] border border-white/8 bg-[#090b0e] p-4">
                  <h3 className="text-[14px] font-semibold text-[#f4f5f7]">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#8a8f98]">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </MotionFade>

        <MotionFade delay={0.1}>
          <section className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
              <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">What stays local by default</h2>
              <ul className="mt-4 space-y-2.5 text-[13px] text-[#c9ccd2]">
                {[
                  "Source code stays local by default.",
                  "Restore apply happens locally.",
                  "Env file contents are not uploaded.",
                  "Cloud sync (paid plans) is metadata-oriented.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 text-[#a78bfa]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
              <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">Why this is not Git or an orchestrator</h2>
              <ul className="mt-4 space-y-2.5 text-[13px] text-[#c9ccd2]">
                {[
                  "Git tracks version history; RunTrim governs AI run behavior.",
                  "Orchestrators route models; RunTrim adds contracts, verification, and recovery.",
                  "RunTrim works with Claude, Codex, Cursor, ChatGPT, DeepSeek, and others.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 text-[#a78bfa]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </MotionFade>

        <MotionFade delay={0.14}>
          <section className="mt-5 rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">Typical outcomes after guarded runs</h2>
            <ul className="mt-4 space-y-2.5 text-[13px] text-[#c9ccd2]">
              {[
                "Less repeated context loading across sessions.",
                "Fewer off-scope edits that require cleanup.",
                "Faster recovery when a run needs rollback or continuation.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 text-[#a78bfa]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </MotionFade>
      </main>

      <PublicFooter />
    </div>
  );
}
