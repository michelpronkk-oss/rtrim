import { AppShell } from "@/components/app/app-shell";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";

const LOCAL_PREVIEW = [
  { type: "comment" as const, text: "# local dev preview" },
  { type: "prompt" as const, text: "$ git clone https://github.com/michelpronkk-oss/rtrim" },
  { type: "prompt" as const, text: "$ cd rtrim" },
  { type: "prompt" as const, text: "$ npm install" },
  { type: "prompt" as const, text: "$ npm run runtrim -- init" },
  { type: "prompt" as const, text: '$ npm run runtrim -- run "fix checkout redirect"' },
];

const FUTURE_GLOBAL = [
  { type: "comment" as const, text: "# planned global install" },
  { type: "prompt" as const, text: "$ npm install -g runtrim" },
  { type: "prompt" as const, text: "$ runtrim init" },
  { type: "prompt" as const, text: '$ runtrim run "fix checkout redirect"' },
];

const AGENT_EXAMPLES = [
  "npm run runtrim -- agent set copy",
  "npm run runtrim -- agent set claude",
  "npm run runtrim -- agent set codex",
  'npm run runtrim -- prepare "fix checkout redirect"',
  'npm run runtrim -- prepare "fix checkout redirect" --open',
  'npm run runtrim -- run "fix checkout redirect"',
  "npm run runtrim -- check",
  "npm run runtrim -- memory",
  "npm run runtrim -- memory --prompt",
  "npm run runtrim -- report",
];

export default function InstallPage() {
  return (
    <AppShell active="/app/install">
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-[#EEEEF2]">Install</h1>
          <p className="mt-1 text-[13px] text-[#4A4E72]">RunTrim runs locally in your repository. V1 does not upload code.</p>
          <p className="mt-1 text-[13px] text-[#4A4E72]">Local CLI is free. Cloud sync and hosted history will be paid later.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#0DDB9E]">Available now</p>
            <TerminalCard title="local-preview.sh" lines={LOCAL_PREVIEW} copyText={LOCAL_PREVIEW.map((l) => l.text).join("\n")} />
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Planned</p>
            <TerminalCard title="global-install.sh" lines={FUTURE_GLOBAL} copyText={FUTURE_GLOBAL.map((l) => l.text).join("\n")} />
          </div>
        </div>

        <div className="surface-panel rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Copy mode vs command mode</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-white/7 bg-[#07080F] p-4">
              <p className="text-sm font-semibold text-[#EEEEF2]">Copy mode</p>
              <p className="mt-2 text-[13px] leading-6 text-[#4A4E72]">RunTrim guards the task and copies the contract. You paste into Claude, Codex, or Cursor.</p>
            </div>
            <div className="rounded border border-white/7 bg-[#07080F] p-4">
              <p className="text-sm font-semibold text-[#EEEEF2]">Command mode</p>
              <p className="mt-2 text-[13px] leading-6 text-[#4A4E72]">RunTrim wraps your configured local agent command and still enforces the guarded flow.</p>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-lg p-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Agent config examples</p>
          <div className="space-y-1.5">
            {AGENT_EXAMPLES.map((cmd) => (
              <div key={cmd} className="flex items-center justify-between gap-3 rounded border border-white/7 bg-[#07080F] px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#8888A8]">{cmd}</code>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">Privacy</p>
          <p className="mt-2 text-[13px] text-[#4A4E72]">RunTrim runs locally. V1 does not upload code to any external service.</p>
        </div>
      </div>
    </AppShell>
  );
}
