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
      : undefined;
  return (
    <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-[#D7DEE7] sm:text-[12px]">
        {command}
      </code>
      <CopyButton text={command} className="shrink-0" trackCommandKey={copyKey} />
    </div>
  );
}

export default function InstallPage() {
  const quickStart = [
    "npm install -g runtrim",
    "runtrim start",
  ];

  const directCommands = [
    { step: "1", title: "Initialize", command: "runtrim init", note: "Initialize baseline files when you want explicit setup control." },
    { step: "2", title: "Prepare", command: 'runtrim prepare "fix checkout redirect"', note: "Create the guarded prompt before agent edits." },
    { step: "3", title: "Open panel", command: "runtrim panel --monitor", note: "Open the local browser panel and monitor drift during a run." },
    { step: "4", title: "Check", command: "runtrim check", note: "Verify result quality and missing proof." },
    { step: "5", title: "Show memory", command: "runtrim memory", note: "Resume from current project memory." },
  ];

  const commandModeCommands = [
    "runtrim agent set <agent>",
    'runtrim run "fix checkout redirect"',
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07071A] text-[#EDEEFF]">
      <header className="border-b border-white/10 bg-[#090A1D]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="min-w-0 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#how-it-works" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">How it works</Link>
            <Link href="/#pricing" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">Pricing</Link>
            <Link href="/privacy" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">Privacy</Link>
            <Link href="/terms" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">Terms</Link>
          </nav>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-white/12 px-2.5 py-1.5 text-[11px] text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF] sm:px-3 sm:text-[12px]"
          >
            Back to homepage
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-7 min-w-0">
        <header>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Install RunTrim</h1>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">RunTrim runs locally in your repo. Source code is not uploaded in V1.</p>
          <p className="mt-1 text-[12px] text-[#6870A0]">No account required for local CLI.</p>
          <p className="mt-1 text-[12px] text-[#6870A0]">Free includes 1 tracked local repo. A tracked repo is one codebase with its own .runtrim workspace.</p>
        </header>

        <section className="surface-panel overflow-hidden rounded-xl border border-white/10">
          <div className="border-b border-white/8 px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Primary quick start</p>
            <h2 className="mt-1 text-[16px] font-semibold text-[#EDEEFF]">Install once. Start in any repo.</h2>
            <p className="mt-1 text-[12px] text-[#9AA7B6]">RunTrim checks the repo, initializes local memory if needed, and tells you the next safe command.</p>
          </div>
          <div className="grid min-w-0 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0 space-y-2.5">
              {quickStart.map((command) => (
                <CommandRow key={command} command={command} />
              ))}
              <div className="pt-1">
                <p className="text-[11px] text-[#6870A0]">Not sure what happens after start? See the operator flow.</p>
                <Link
                  href="/how-it-works"
                  data-rt-event="how_it_works_clicked"
                  className="mt-1 inline-flex text-[12px] font-medium text-[#97A3BA] transition-colors hover:text-[#EDEEFF]"
                >
                  See the operator flow
                </Link>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-white/8 bg-[#090F18] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5D638D]">What each command does</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#C0C2E8]">
                <li><span className="text-[#EDEEFF]">runtrim start</span> is the guided entrypoint. It routes you to init, prepare, watch, check, continue, memory, or sync based on the current repo state.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDEEFF]">Choose your agent mode</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#9AA7B6]">
            Start with copy mode. It works with Claude, Codex, Cursor, ChatGPT, and any agent UI. Command mode is optional if you have a local agent CLI.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-[#7C6DFA]/30 bg-[#0E151E] p-4">
              <div className="flex items-center gap-2.5">
                <p className="text-[14px] font-semibold text-[#EDEEFF]">Copy mode</p>
                <span className="rounded border border-[#7C6DFA]/35 bg-[#7C6DFA]/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C4B8FF]">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[#9AA7B6]">RunTrim prepares the contract and copies it for your agent.</p>
              <div className="mt-3 space-y-2.5">
                <CommandRow command='runtrim prepare "fix checkout redirect"' />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#6870A0]">
                Copy mode is the default. Use <code className="font-mono text-[#9AA7B6]">runtrim agent set copy</code> if you changed modes before.
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-white/8 bg-[#0E151E] p-4">
              <div className="flex items-center gap-2.5">
                <p className="text-[14px] font-semibold text-[#EDEEFF]">Command mode</p>
                <span className="rounded border border-white/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8C93BE]">
                  Optional
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[#9AA7B6]">
                RunTrim can wrap a configured local agent command and record run metadata. Use this only if you have a local agent CLI configured.
              </p>
              <div className="mt-3 space-y-2.5">
                {commandModeCommands.map((command) => (
                  <CommandRow key={command} command={command} />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#6870A0]">
                Examples: <code className="font-mono text-[#9AA7B6]">claude</code>, <code className="font-mono text-[#9AA7B6]">codex</code>, or{" "}
                <code className="font-mono text-[#9AA7B6]">custom &quot;&lt;command&gt;&quot;</code>.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Direct commands</p>
          <p className="mt-1 text-[12px] text-[#9AA7B6]">Use these only when you want direct control instead of the guided start flow.</p>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/8 bg-[#0E151E]">
            {directCommands.map((item, index) => (
              <div
                key={item.step}
                className={`flex min-w-0 gap-3 px-4 py-3.5 ${index < directCommands.length - 1 ? "border-b border-white/8" : ""}`}
              >
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#090918] font-mono text-[10px] text-[#7C6DFA]">
                  {item.step}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#EDEEFF]">{item.title}</p>
                  <div className="mt-2">
                    <CommandRow command={item.command} />
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[#9AA7B6]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Dashboard sync private beta</p>
          <div className="mt-3 rounded-lg border border-white/8 bg-[#090F18] p-4">
            <p className="text-[14px] font-semibold text-[#EDEEFF]">Cloud sync is in private beta</p>
            <p className="mt-2 text-[13px] leading-6 text-[#9AA7B6]">
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
            <p className="mt-3 text-[11px] text-[#6870A0]">Approved testers receive their sync setup instructions by email.</p>
          </div>
        </section>

        </div>
      </main>
    </div>
  );
}
