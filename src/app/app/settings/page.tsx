import { AppShell } from "@/components/app/app-shell";

export default function SettingsPage() {
  return (
    <AppShell active="/app/settings">
      <div className="mx-auto w-full max-w-[1180px] space-y-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Settings</h1>
          <p className="mt-0.5 text-[13px] text-[#4D5070]">Local-first controls for sync, workspace behavior, and environment setup.</p>
        </div>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Workspace</p>
          <p className="mt-2 text-[13px] text-[#C0C2E8]">RunTrim tracks run history, prompt history, reusable context, and savings visibility.</p>
          <p className="mt-2 text-[12px] text-[#8C93BE]">Run history is stored locally first. Sync remains optional.</p>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Cloud sync private beta</p>
          <p className="mt-2 text-[13px] text-[#C0C2E8]">Current V0 token-based sync is for approved testers. Join Pro early access for access.</p>
          <div className="mt-3 rounded-lg border border-white/8 bg-[#090918] p-3 font-mono text-[12px] leading-6 text-[#9E91FF]">
            <p>runtrim auth set &lt;token&gt;</p>
            <p>runtrim config set dashboard-url https://www.runtrim.com/app</p>
            <p>runtrim sync</p>
          </div>
          <a
            href="/#early-access"
            className="mt-3 inline-flex rounded border border-white/8 px-3 py-1.5 text-[12px] text-[#6870A0] transition-colors hover:border-white/14 hover:text-[#9699BE]"
          >
            Join Pro early access
          </a>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Public environment hints</p>
          <p className="mt-2 text-[12px] text-[#8C93BE]">Set only non-secret values in your local runtime as needed:</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "RUNTRIM_SYNC_URL",
              "NEXT_PUBLIC_SUPABASE_URL",
              "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            ].map((envKey) => (
              <div key={envKey} className="rounded border border-white/8 bg-[#0D0C22] px-3 py-2 font-mono text-[12px] text-[#C0C2E8]">
                {envKey}
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-xl p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Local-first behavior</p>
          <ul className="mt-2 space-y-1.5 text-[12px] text-[#9AA7B6]">
            <li>RunTrim sync stores run metadata, prompts, changed file paths, and status.</li>
            <li>RunTrim does not upload source code or secret file contents.</li>
            <li>CLI remains fully usable without sync configuration.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
