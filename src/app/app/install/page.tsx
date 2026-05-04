import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/app/copy-button";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

export const metadata: Metadata = {
  title: "Install RunTrim | Local-first AI run control",
  description:
    "Install RunTrim, initialize your repo, and start guiding AI coding runs with local memory, scoped prompts, monitoring, and checks.",
  alternates: {
    canonical: "https://www.runtrim.com/app/install",
  },
  robots: {
    index: true,
    follow: true,
  },
};

function CommandRow({ command }: { command: string }) {
  const copyKey =
    command === "npm install -g runtrim"
      ? "npm_install_global"
      : command === "runtrim start"
      ? "runtrim_start"
      : command === 'runtrim go "your task"'
      ? "runtrim_go"
      : undefined;
  return (
    <div
      className="flex max-w-full items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-2.5"
      style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-[#a78bfa] sm:text-[12px]">
        {command}
      </code>
      <CopyButton text={command} className="shrink-0" trackCommandKey={copyKey} />
    </div>
  );
}

export default function InstallPage() {
  const quickStart = [
    "npm install -g runtrim",
    'runtrim go "your task"',
  ];

  const directCommands = [
    { step: "1", title: "Guided menu", command: "runtrim start", note: "Use this when you want RunTrim to choose the next safe command." },
    { step: "2", title: "Prepare", command: 'runtrim prepare "your task"', note: "Manual guarded prompt generation when you want explicit control." },
    { step: "3", title: "Open panel", command: "runtrim panel --monitor", note: "Open the local browser panel and monitor drift during a run." },
    { step: "4", title: "Check", command: "runtrim check", note: "Review changed files and proof gaps after edits." },
    { step: "5", title: "Show memory", command: "runtrim memory", note: "Resume from current project memory." },
    { step: "6", title: "Continue", command: "runtrim continue --reason usage_limit", note: "Create a continuation prompt when a session runs out of context or usage." },
  ];

  const commandModeCommands = [
    "runtrim agent set <agent>",
    'runtrim run "your task"',
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090b] text-[#f4f5f7]">
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(8,9,11,0.72)",
          backdropFilter: "saturate(140%) blur(12px)",
          WebkitBackdropFilter: "saturate(140%) blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="mx-auto flex items-center gap-7"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)", height: 60 }}
        >
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
              runtrim
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-3">
            {[
              { href: "/",          label: "Home"       },
              { href: "/#protocol", label: "Protocol"   },
              { href: "/plans",     label: "Plans"      },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{ fontSize: 13, color: "#8a8f98", padding: "7px 10px", borderRadius: 5, transition: "color 0.15s, background 0.15s" }}
                className="hover:text-[#f4f5f7] hover:bg-white/6"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 32, padding: "0 14px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "transparent", color: "#8a8f98",
              fontSize: 13, transition: "color 0.15s, border-color 0.15s, background 0.15s",
            }}
            className="hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
          >
            Homepage
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-7 min-w-0">
        <header>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#f4f5f7]">Install RunTrim</h1>
          <p className="mt-1 text-[13px] text-[#8a8f98]">RunTrim runs locally in your repo. Source code is not uploaded in V1.</p>
          <p className="mt-1 text-[12px] text-[#5a5f68]">No account required for local CLI.</p>
          <p className="mt-1 text-[12px] text-[#5a5f68]">Free includes 1 tracked local repo. A tracked repo is one codebase with its own .runtrim workspace.</p>
        </header>

        <section className=" overflow-hidden rounded-xl border border-white/6">
          <div className="border-b border-white/6 px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Primary quick start</p>
            <h2 className="mt-1 text-[16px] font-semibold text-[#f4f5f7]">Install once. Start in any repo.</h2>
            <p className="mt-1 text-[12px] text-[#8a8f98]">Use one daily command to prepare a guarded prompt and start the run.</p>
          </div>
          <div className="grid min-w-0 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0 space-y-2.5">
              {quickStart.map((command) => (
                <CommandRow key={command} command={command} />
              ))}
              <div className="pt-1">
                <p className="text-[11px] text-[#5a5f68]">go prepares a guarded prompt, copies it for your agent, records the run locally, and tells you what to do next.</p>
                <Link
                  href="/how-it-works"
                  data-rt-event="how_it_works_clicked"
                  className="mt-1 inline-flex text-[12px] font-medium text-[#97A3BA] transition-colors hover:text-[#f4f5f7]"
                >
                  See the operator flow
                </Link>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-white/6 bg-[#0c0e11] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">What each command does</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#c9ccd2]">
                <li><span className="text-[#f4f5f7]">runtrim go &quot;your task&quot;</span> is the fastest daily path for guarded prompt creation and local run tracking.</li>
                <li><span className="text-[#f4f5f7]">runtrim start</span> is the guided menu when you want RunTrim to choose the next safe command.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className=" rounded-xl p-5">
          <h2 className="text-[16px] font-semibold text-[#f4f5f7]">Choose your agent mode</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#8a8f98]">
            Start with copy mode. It works with Claude, Codex, Cursor, ChatGPT, and any agent UI. Command mode is optional if you have a local agent CLI.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-[#7C6DFA]/30 bg-[#0c0e11] p-4">
              <div className="flex items-center gap-2.5">
                <p className="text-[14px] font-semibold text-[#f4f5f7]">Copy mode</p>
                <span className="rounded border border-[#7C6DFA]/35 bg-[#7C6DFA]/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#a78bfa]">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">RunTrim prepares the contract and copies it for your agent.</p>
              <div className="mt-3 space-y-2.5">
                <CommandRow command='runtrim go "your task"' />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#5a5f68]">
                Copy mode is the default. Use <code className="font-mono text-[#8a8f98]">runtrim agent set copy</code> if you changed modes before.
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-white/6 bg-[#0c0e11] p-4">
              <div className="flex items-center gap-2.5">
                <p className="text-[14px] font-semibold text-[#f4f5f7]">Command mode</p>
                <span className="rounded border border-white/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8C93BE]">
                  Optional
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">
                RunTrim can wrap a configured local agent command and record run metadata. Use this only if you have a local agent CLI configured.
              </p>
              <div className="mt-3 space-y-2.5">
                {commandModeCommands.map((command) => (
                  <CommandRow key={command} command={command} />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#5a5f68]">
                Examples: <code className="font-mono text-[#8a8f98]">claude</code>, <code className="font-mono text-[#8a8f98]">codex</code>, or{" "}
                <code className="font-mono text-[#8a8f98]">custom &quot;&lt;command&gt;&quot;</code>.
              </p>
            </div>
          </div>
        </section>

        <section className=" rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Daily shortcut</p>
          <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">runtrim go prepares a guarded prompt, copies it for your agent, records the run locally, and prints next steps.</p>
          <div className="mt-3">
            <CommandRow command='runtrim go "your task"' />
          </div>
        </section>

        <section className=" rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Direct commands</p>
          <p className="mt-1 text-[12px] text-[#8a8f98]">Manual controls when you want explicit command-by-command operation.</p>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/6 bg-[#0c0e11]">
            {directCommands.map((item, index) => (
              <div
                key={item.step}
                className={`flex min-w-0 gap-3 px-4 py-3.5 ${index < directCommands.length - 1 ? "border-b border-white/6" : ""}`}
              >
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-white/6 bg-[#090918] font-mono text-[10px] text-[#7C6DFA]">
                  {item.step}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#f4f5f7]">{item.title}</p>
                  <div className="mt-2">
                    <CommandRow command={item.command} />
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className=" rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Dashboard sync private beta</p>
          <div className="mt-3 rounded-lg border border-white/6 bg-[#0c0e11] p-4">
            <p className="text-[14px] font-semibold text-[#f4f5f7]">Cloud sync is in private beta</p>
            <p className="mt-2 text-[13px] leading-6 text-[#8a8f98]">
              RunTrim Free works locally without an account. Cloud sync and hosted run history are rolling out to approved early access users.
            </p>
            <p className="mt-2 text-[12px] leading-6 text-[#7F8BA3]">
              When enabled, sync uploads run metadata, generated RunTrim prompts, changed file paths, project memory and estimates. Source code stays local.
            </p>
            <div className="mt-4">
              <EarlyAccessModalTrigger
                label="Join Pro early access"
                variant="pro"
                className="inline-flex rounded-md bg-[#7C6DFA] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
              />
            </div>
            <p className="mt-3 text-[11px] text-[#5a5f68]">Approved testers receive their sync setup instructions by email.</p>
          </div>
        </section>

        </div>
      </main>
    </div>
  );
}


