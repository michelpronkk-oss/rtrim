import { AppShell } from "@/components/app/app-shell";
import { CommandWorkflowCard } from "@/components/app/command-workflow-card";

export default function InstallPage() {
  return (
    <AppShell active="/app/install">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Operator setup guide</h1>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">Local-first workflow. No source code upload in V1.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CommandWorkflowCard
            title="Local preview"
            description="Bootstrap RunTrim inside a repository."
            commands={[
              "git clone https://github.com/michelpronkk-oss/rtrim",
              "cd rtrim",
              "npm install",
              "npm run runtrim -- init",
            ]}
          />
          <CommandWorkflowCard
            title="Guard without running"
            description="Generate and review run contract only."
            commands={[
              'npm run runtrim -- guard "fix checkout redirect"',
              'npm run runtrim -- prepare "fix checkout redirect" --print',
            ]}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CommandWorkflowCard
            title="Prepare prompt file"
            description="Create .runtrim/latest-prompt.md without executing an agent."
            commands={[
              'npm run runtrim -- prepare "fix checkout redirect"',
              'npm run runtrim -- prepare "fix checkout redirect" --open',
            ]}
          />
          <CommandWorkflowCard
            title="Run with wrapper"
            description="Guard and execute with configured agent command mode."
            commands={[
              "npm run runtrim -- agent set claude",
              'npm run runtrim -- run "fix checkout redirect"',
            ]}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CommandWorkflowCard
            title="Check and memory"
            description="Evaluate the run and load continuation context."
            commands={[
              "npm run runtrim -- watch",
              "npm run runtrim -- watch --once --strict",
              "npm run runtrim -- check",
              "npm run runtrim -- memory",
              "npm run runtrim -- memory --prompt",
            ]}
          />
          <CommandWorkflowCard
            title="Dashboard sync private beta"
            description="Sync metadata only. Full account auth is planned."
            commands={[
              "npm run runtrim -- auth set <token>",
              "npm run runtrim -- config set dashboard-url https://your-domain.com/app",
              "npm run runtrim -- sync",
            ]}
          />
        </div>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Copy mode vs command mode</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
              <p className="text-sm font-semibold text-[#E4EBF3]">Copy mode</p>
              <p className="mt-1 text-[13px] text-[#9AA7B6]">RunTrim prepares contract text. You paste it into Claude, Codex, Cursor, or ChatGPT.</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
              <p className="text-sm font-semibold text-[#E4EBF3]">Command mode</p>
              <p className="mt-1 text-[13px] text-[#9AA7B6]">RunTrim wraps your local agent command and records execution metadata for check and memory.</p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Privacy</p>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">The CLI does the work locally. Sync uploads project metadata, not source code, raw file contents, or .env values.</p>
        </section>
      </div>
    </AppShell>
  );
}
