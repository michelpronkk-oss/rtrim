import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

export const metadata: Metadata = {
  title: "How RunTrim Works | CLI Control Layer for AI Coding Agents",
  description:
    "RunTrim scopes AI coding runs before they start, checks what changed after, and keeps run state for the next session. Works with Claude Code, Cursor, Codex, and ChatGPT.",
  alternates: { canonical: "https://www.runtrim.com/how-it-works" },
  openGraph: {
    title: "How RunTrim Works — AI Coding Agent Control Layer",
    description:
      "Scoped contracts before, finish checks after, and run memory between sessions. Works with Claude Code, Cursor, Codex, and ChatGPT.",
    url: "https://www.runtrim.com/how-it-works",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "How RunTrim Works" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How RunTrim Works — AI Coding Agent Control Layer",
    description:
      "Scoped contracts before, finish checks after, and run memory between sessions. Works with Claude Code, Cursor, Codex, and ChatGPT.",
    images: ["/opengraph-image"],
  },
};

const PROCESS_STEPS = [
  {
    title: "Setup",
    command: "runtrim start",
    body: "Analyze the project, write memory, install agent instructions, and generate MCP snippets.",
  },
  {
    title: "Readiness",
    command: "runtrim doctor",
    body: "Check whether Claude, Cursor, Codex, and MCP setup are RunTrim-ready.",
  },
  {
    title: "Paste into your agent",
    command: 'runtrim agent "your task" --copy',
    body: "Create a scoped contract and guarded handoff, then paste into Claude, Codex, Cursor, ChatGPT, or your configured agent.",
  },
  {
    title: "Verify",
    command: "runtrim finish",
    body: "Check changed files, sensitive paths, scope drift, and proof gaps. Get PASS, WARN, or BLOCKED.",
  },
  {
    title: "Recover",
    command: "runtrim restore last --preview",
    body: "Preview and rewind a broken AI run locally without rolling back your whole branch.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07071A] text-[#EDEEFF]">
      <header className="border-b border-white/10 bg-[#090A1D]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-white/12 px-2.5 py-1.5 text-[11px] text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF] sm:px-3 sm:text-[12px]"
            >
              Back to homepage
            </Link>
            <Link
              href="/app/install"
              data-rt-event="install_cta_clicked"
              className="rounded-md bg-[#7C6DFA] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-xl border border-white/10 bg-[#0C0D22] p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7682A6]">HOW IT WORKS</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-[34px]">
            RunTrim controls the run around your agent.
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#9DABC4]">
            Start with one command. RunTrim scopes the work before the agent starts, watches what changes, and preserves the next safe step.
          </p>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#7F8BA3]">
            If you are unsure, run <code className="font-mono text-[#C0C2E8]">runtrim start</code>.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/app/install"
              data-rt-event="install_cta_clicked"
              className="rounded-md bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
            <Link
              href="/"
              className="rounded-md border border-white/12 px-4 py-2 text-[13px] font-medium text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              Back to homepage
            </Link>
          </div>
        </section>

        <section className="mt-6 grid min-w-0 gap-3 md:grid-cols-2">
          {PROCESS_STEPS.map((step, idx) => (
            <article key={step.title} className="min-w-0 rounded-xl border border-white/8 bg-[#0C0C20] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6870A0]">Step {idx + 1}</p>
              <h2 className="mt-1 text-[16px] font-semibold text-[#EDEEFF]">{step.title}</h2>
              {step.command ? (
                <code className="mt-2 block max-w-full overflow-x-auto whitespace-pre rounded border border-white/8 bg-[#090918] px-2 py-1 font-mono text-[11px] text-[#D7DEE7]">
                  {step.command}
                </code>
              ) : null}
              <p className="mt-2 text-[13px] leading-6 text-[#9AA7B6]">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-[#0C0C20] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6870A0]">What local memory means</p>
            <p className="mt-2 text-[13px] leading-6 text-[#9AA7B6]">
              RunTrim stores project memory in <code className="font-mono text-[#C0C2E8]">.runtrim</code> so the next session does not restart from scratch.
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-[#B8C3D8]">
              {[
                "Guarded prompts",
                "Run status",
                "Changed file paths",
                "Protected systems",
                "Verification debt",
                "Next safe action",
                "Continuation prompts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#7C6DFA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0C0C20] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6870A0]">What RunTrim reads</p>
            <ul className="mt-3 space-y-2 text-[13px] text-[#B8C3D8]">
              {[
                "Task text",
                "Project metadata",
                "Package and framework signals",
                "Local .runtrim memory",
                "Git diff file paths",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#7C6DFA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0C0C20] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6870A0]">What RunTrim does not upload in V1</p>
            <ul className="mt-3 space-y-2 text-[13px] text-[#B8C3D8]">
              {["Source code", ".env files", "Secrets", "Raw file contents"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#7C6DFA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/8 bg-[#0C0C20] p-5">
          <p className="text-[13px] leading-6 text-[#9AA7B6]">
            RunTrim does not need to upload source code to create a guarded run contract. Cloud sync, when enabled, is metadata-only and currently part of Pro early access.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 bg-[#0C0D22] p-6 sm:p-7">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#EDEEFF]">Start with the local CLI.</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9AA7B6]">
            Free local CLI works without an account. Cloud memory is rolling out through Pro early access.
          </p>
          <code className="mt-4 block max-w-full overflow-x-auto whitespace-pre rounded border border-white/8 bg-[#090918] px-3 py-2 font-mono text-[11px] text-[#D7DEE7]">
            npm install -g runtrim{"\n"}runtrim start{"\n"}runtrim doctor{"\n"}runtrim agent "your task" --copy{"\n"}runtrim finish
          </code>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/app/install"
              data-rt-event="install_cta_clicked"
              className="rounded-md bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
            <EarlyAccessModalTrigger
              label="Join Pro early access"
              variant="pro"
              className="inline-flex rounded-md border border-white/12 px-4 py-2 text-[13px] font-medium text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

