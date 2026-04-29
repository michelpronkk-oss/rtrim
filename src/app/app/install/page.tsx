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
  return (
    <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-[#D7DEE7] sm:text-[12px]">
        {command}
      </code>
      <CopyButton text={command} className="shrink-0" />
    </div>
  );
}

export default function InstallPage() {
  const quickStart = [
    "npm install -g runtrim",
    "runtrim start",
  ];

  const manualDailyLoop = [
    { step: "1", title: "Initialize", command: "runtrim init", note: "Initialize baseline files when you want explicit setup control." },
    { step: "2", title: "Prepare", command: 'runtrim prepare "fix checkout redirect"', note: "Create the guarded prompt before agent edits." },
    { step: "3", title: "Monitor", command: "runtrim panel --monitor", note: "Keep local state visible while work is in progress." },
    { step: "4", title: "Check", command: "runtrim check", note: "Verify result quality and missing proof." },
    { step: "5", title: "Show memory", command: "runtrim memory", note: "Resume from current project memory." },
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
            <p className="mt-1 text-[12px] text-[#9AA7B6]">RunTrim will guide you through init, prepare, panel, check and memory.</p>
          </div>
          <div className="grid min-w-0 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0 space-y-2.5">
              {quickStart.map((command) => (
                <CommandRow key={command} command={command} />
              ))}
            </div>
            <div className="min-w-0 rounded-lg border border-white/8 bg-[#090F18] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5D638D]">What each command does</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#C0C2E8]">
                <li><span className="text-[#EDEEFF]">start</span> checks project state and guides the next step.</li>
                <li><span className="text-[#EDEEFF]">guided run</span> can initialize RunTrim if needed and route to prepare, monitor, check, and memory flows.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Manual daily loop</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#EDEEFF]">Prepare, monitor, check, and memory</h2>
          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-5">
            {manualDailyLoop.map((item) => (
              <div key={item.step} className="min-w-0 rounded-lg border border-white/8 bg-[#0E151E] p-3">
                <p className="font-mono text-[10px] text-[#6870A0]">Step {item.step}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#EDEEFF]">{item.title}</p>
                <code className="mt-2 block max-w-full overflow-x-auto whitespace-nowrap rounded border border-white/8 bg-[#090918] px-2 py-1 font-mono text-[11px] text-[#D7DEE7]">
                  {item.command}
                </code>
                <p className="mt-2 text-[12px] leading-5 text-[#9AA7B6]">{item.note}</p>
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

        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="surface-panel min-w-0 rounded-xl p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Local development preview</p>
            <p className="mt-1 text-[13px] text-[#9AA7B6]">Use these commands only when developing RunTrim itself.</p>
            <div className="mt-4 space-y-2.5">
              <CommandRow command="git clone https://github.com/michelpronkk-oss/rtrim" />
              <CommandRow command="cd rtrim" />
              <CommandRow command="npm install" />
              <CommandRow command="npm run runtrim -- init" />
              <CommandRow command={'npm run runtrim -- prepare "fix checkout redirect"'} />
            </div>
          </div>

          <div className="surface-panel min-w-0 rounded-xl p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Advanced modes</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
                <p className="text-[13px] font-semibold text-[#EDEEFF]">Copy mode</p>
                <p className="mt-1 text-[12px] leading-5 text-[#9AA7B6]">RunTrim prepares the contract and copies it for your agent.</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
                <p className="text-[13px] font-semibold text-[#EDEEFF]">Command mode</p>
                <p className="mt-1 text-[12px] leading-5 text-[#9AA7B6]">RunTrim can wrap a configured local agent command and record run metadata.</p>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
