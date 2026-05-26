import type { Metadata } from "next";
import { CopyButton } from "@/components/app/copy-button";
import { GenerateTokenButton } from "@/components/app/generate-token-button";
import { Terminal, Link2, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Connect CLI",
  robots: { index: false, follow: false },
};

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[2rem_1fr]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#7C6DFA]/25 bg-[#7C6DFA]/10 font-mono text-[12px] font-bold text-[#a78bfa]">
        {n}
      </div>
      <div className="min-w-0">
        <p className="mb-3 text-[14px] font-semibold text-[#f4f5f7]">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Cmd({ text, trackKey }: { text: string; trackKey?: string }) {
  return (
    <div
      className="flex items-center overflow-hidden rounded-lg"
      style={{
        background: "#090A1F",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="pl-4 pr-1 font-mono text-[12px] text-[#7C6DFA]/50">$</span>
      <code className="flex-1 py-3 pr-3 font-mono text-[13px] text-[#B8AAFF]">{text}</code>
      <div className="border-l border-white/8 px-3.5 py-3">
        <CopyButton text={text} trackCommandKey={trackKey} />
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">

      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">
          Connect
        </p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">
          Connect your CLI.
        </h1>
        <p className="mt-2 text-[13px] leading-[1.75] text-[#8a8f98]">
          Link your local RunTrim CLI to this dashboard. Once connected, run{" "}
          <code className="font-mono text-[#a78bfa]">runtrim sync</code> from any project to push
          run history, memory, and savings to your cloud dashboard.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-8">

        {/* Step 1: Install */}
        <Step n="1" title="Install the CLI">
          <div className="space-y-2">
            <Cmd text="npm install -g runtrim" trackKey="npm_install_global" />
            <p className="text-[12px] text-[#3a3e46]">
              Already installed? Skip to step 2.
            </p>
          </div>
        </Step>

        {/* Step 2: Generate token */}
        <Step n="2" title="Generate a CLI token">
          <div className="space-y-3">
            <p className="text-[13px] leading-[1.7] text-[#8a8f98]">
              Generate a token below. It will be shown exactly once. Store it securely.
            </p>
            <GenerateTokenButton />
          </div>
        </Step>

        {/* Step 3: Login */}
        <Step n="3" title="Connect the CLI">
          <div className="space-y-2">
            <Cmd text="runtrim login" />
            <p className="text-[12px] text-[#3a3e46]">
              Paste your token when prompted. Stored in{" "}
              <code className="font-mono text-[#5a5f68]">~/.runtrim/auth.json</code>.
            </p>
          </div>
        </Step>

        {/* Step 4: Sync */}
        <Step n="4" title="Sync your first project">
          <div className="space-y-2">
            <p className="text-[12px] text-[#8a8f98]">
              Navigate to any project where you have used RunTrim.
            </p>
            <Cmd text="cd your-project" />
            <Cmd text="runtrim sync" />
            <p className="text-[12px] leading-[1.6] text-[#3a3e46]">
              Runs, memory, and savings estimates from{" "}
              <code className="font-mono text-[#5a5f68]">.runtrim/</code> will appear in Projects
              and Runs after sync completes.
            </p>
          </div>
        </Step>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-5 py-5">
        <div className="flex items-start gap-3">
          <Terminal className="mt-0.5 size-4 shrink-0 text-[#7C6DFA]/60" />
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-[#f4f5f7]">
              Free CLI stays local-first.
            </p>
            <p className="text-[12px] leading-[1.7] text-[#5a5f68]">
              Cloud sync is optional. All CLI commands work without a token.
              Sync only uploads run metadata - source code never leaves your machine.
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2 border-t border-white/6 pt-6">
        <div className="flex items-start gap-2">
          <Link2 className="mt-0.5 size-3.5 shrink-0 text-[#3a3e46]" />
          <p className="text-[12px] text-[#3a3e46]">
            One token per account. Generating a new token invalidates the previous one.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <RefreshCw className="mt-0.5 size-3.5 shrink-0 text-[#3a3e46]" />
          <p className="text-[12px] text-[#3a3e46]">
            Re-run <code className="font-mono text-[#5a5f68]">runtrim sync</code> at any time
            to push the latest runs. Runs already synced are deduplicated automatically.
          </p>
        </div>
      </div>
    </div>
  );
}


