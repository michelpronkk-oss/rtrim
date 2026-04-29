import { AppShell } from "@/components/app/app-shell";
import { CopyButton } from "@/components/app/copy-button";

function CommandRow({ command }: { command: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#D7DEE7]">{command}</code>
      <CopyButton text={command} />
    </div>
  );
}

export default function InstallPage() {
  const quickStart = [
    "npm install -g runtrim",
    "runtrim init",
    "runtrim start",
    'runtrim prepare "fix checkout redirect"',
    "runtrim panel --monitor",
    "runtrim check",
    "runtrim memory",
  ];

  const dailyLoop = [
    { step: "1", title: "Prepare", command: 'runtrim prepare "fix checkout redirect"', note: "Create the guarded prompt before agent edits." },
    { step: "2", title: "Paste into agent", command: "Paste .runtrim/latest-prompt.md", note: "Run the scoped task in your agent." },
    { step: "3", title: "Monitor", command: "runtrim panel --monitor", note: "Keep local state visible while work is in progress." },
    { step: "4", title: "Check", command: "runtrim check", note: "Verify result quality and missing proof." },
    { step: "5", title: "Continue later", command: "runtrim memory", note: "Resume from current project memory." },
  ];

  return (
    <AppShell active="/app/install">
      <div className="mx-auto w-full max-w-[1120px] space-y-7">
        <header>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Install RunTrim</h1>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">RunTrim runs locally in your repo. Source code is not uploaded in V1.</p>
          <p className="mt-1 text-[12px] text-[#6870A0]">No account required for local CLI.</p>
        </header>

        <section className="surface-panel overflow-hidden rounded-xl border border-white/10">
          <div className="border-b border-white/8 px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Primary quick start</p>
            <h2 className="mt-1 text-[16px] font-semibold text-[#EDEEFF]">Install once, then run the daily operator flow</h2>
          </div>
          <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-2.5">
              {quickStart.map((command) => (
                <CommandRow key={command} command={command} />
              ))}
            </div>
            <div className="rounded-lg border border-white/8 bg-[#090F18] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5D638D]">What each command does</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#C0C2E8]">
                <li><span className="text-[#EDEEFF]">init</span> creates local project memory and baseline files.</li>
                <li><span className="text-[#EDEEFF]">prepare</span> creates the guarded prompt contract.</li>
                <li><span className="text-[#EDEEFF]">panel --monitor</span> keeps local run state visible while the agent works.</li>
                <li><span className="text-[#EDEEFF]">check</span> verifies changed files, risk, and proof.</li>
                <li><span className="text-[#EDEEFF]">memory</span> shows where you left off and what to do next.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Daily loop</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#EDEEFF]">Prepare, monitor, verify, continue</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {dailyLoop.map((item) => (
              <div key={item.step} className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
                <p className="font-mono text-[10px] text-[#6870A0]">Step {item.step}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#EDEEFF]">{item.title}</p>
                <code className="mt-2 block rounded border border-white/8 bg-[#090918] px-2 py-1 font-mono text-[11px] text-[#D7DEE7]">{item.command}</code>
                <p className="mt-2 text-[12px] leading-5 text-[#9AA7B6]">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5D638D]">Dashboard sync private beta</p>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">Sync uploads metadata only: run status, prompts, changed file paths, memory and estimates. It does not upload source code.</p>
          <div className="mt-4 space-y-2.5">
            <CommandRow command="runtrim auth set <token>" />
            <CommandRow command="runtrim config set dashboard-url https://www.runtrim.com/app" />
            <CommandRow command="runtrim sync" />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="surface-panel rounded-xl p-5">
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

          <div className="surface-panel rounded-xl p-5">
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
    </AppShell>
  );
}
