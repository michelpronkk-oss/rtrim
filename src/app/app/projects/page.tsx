import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { getSyncedProjects } from "@/lib/dashboard-sync";

const PREVIEW = [
  {
    name: "runtrim",
    stack: "Next.js",
    latestState: "Partial verification",
    nextSafeAction: "Confirm root cause and verification steps before new scope.",
    debt: 3,
    guarded: 18,
    tokens: 384000,
    sensitive: ["auth", "middleware", "database"],
    lastSync: "Preview",
  },
  {
    name: "checkout-service",
    stack: "Node",
    latestState: "Split required",
    nextSafeAction: "Audit auth flow only. No edits.",
    debt: 2,
    guarded: 9,
    tokens: 126000,
    sensitive: ["billing", "webhooks"],
    lastSync: "Preview",
  },
  {
    name: "api-gateway",
    stack: "Node",
    latestState: "Passed",
    nextSafeAction: "Guard next task. Ready for new scope.",
    debt: 0,
    guarded: 5,
    tokens: 58000,
    sensitive: ["auth", "rate-limiting"],
    lastSync: "Preview",
  },
];

export default async function ProjectsPage() {
  const syncedProjects = await getSyncedProjects();
  const hasSyncedData = syncedProjects.length > 0;
  const rows = hasSyncedData
    ? syncedProjects.map((p) => ({
        name: p.name,
        stack: Array.isArray(p.stack) && p.stack.length > 0 ? p.stack.join(", ") : "auto",
        latestState: p.last_status || "unknown",
        nextSafeAction: p.next_safe_action || "Run runtrim check before continuing.",
        debt: ["partial", "needs_verification", "no_changes_detected"].includes((p.last_status || "").toLowerCase()) ? 1 : 0,
        guarded: 0,
        tokens: Number(p.estimated_tokens_trimmed ?? 0),
        sensitive: ["auth", "middleware", "database", "billing"],
        lastSync: p.updated_at
          ? new Date(p.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : "Unknown",
      }))
    : PREVIEW;

  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);
  const totalDebt = rows.reduce((s, r) => s + r.debt, 0);

  return (
    <AppShell active="/app/projects">
      <div className="mx-auto w-full max-w-[1340px] space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#EDEEFF]">Projects</h1>
            <p className="mt-0.5 text-[13px] text-[#4D5070]">
              {hasSyncedData ? "Synced project memory and run context." : "Preview state. Configure sync to load real project metadata."}
            </p>
          </div>
          {!hasSyncedData ? (
            <div className="hidden rounded border border-white/8 bg-[#0D0C22] px-3 py-2 font-mono text-[11px] text-[#6870A0] sm:block">
              Local-first until sync is configured.
            </div>
          ) : null}
        </div>

        {!hasSyncedData ? (
          <section className="surface-panel rounded-xl p-5">
            <p className="text-[13px] text-[#C0C2E8]">No synced project yet.</p>
            <p className="mt-2 font-mono text-[12px] text-[#6870A0]">runtrim init</p>
            <p className="mt-1 font-mono text-[12px] text-[#6870A0]">runtrim sync</p>
          </section>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-white/8">
          <div className="grid grid-cols-3 gap-px bg-white/8">
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Projects tracked</p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-[#9E91FF]">{rows.length}</p>
            </div>
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Est. tokens trimmed</p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-[#9E91FF]">~{totalTokens.toLocaleString("en-US")}</p>
            </div>
            <div className="bg-[#0D0C22] px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Verification debt</p>
              <p className={`mt-2.5 text-3xl font-bold tabular-nums tracking-tight ${totalDebt > 0 ? "text-[#F0BF72]" : "text-[#4DE8B0]"}`}>{totalDebt}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((project) => (
            <article key={project.name} className="surface-panel overflow-hidden rounded-xl transition-colors hover:border-white/14">
              <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-[15px] font-bold text-[#EDEEFF]">{project.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#4D5070]">{project.stack}</p>
                </div>
                <RunStatusBadge status={project.latestState} />
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/8">
                <div className="bg-[#0D0C22] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Tokens trimmed</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-[#9E91FF]">~{project.tokens.toLocaleString("en-US")}</p>
                </div>
                <div className="bg-[#0D0C22] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Runs guarded</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-[#EDEEFF]">{project.guarded || "Synced"}</p>
                </div>
              </div>

              <div className="divide-y divide-white/8">
                <div className="px-5 py-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Current state</p>
                  <p className="mt-1 text-[13px] text-[#C0C2E8]">{project.latestState}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Next safe action</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#9699BE]">{project.nextSafeAction}</p>
                </div>
              </div>

              <div className="border-t border-white/8 px-5 py-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {project.sensitive.map((s) => (
                    <span key={s} className="rounded border border-white/8 px-2 py-0.5 font-mono text-[10px] text-[#4D5070]">{s}</span>
                  ))}
                  <span className="ml-auto font-mono text-[10px] text-[#2E2E50]">{project.lastSync}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!hasSyncedData ? (
          <div className="flex gap-3">
            <Link href="/app/install" className="rounded border border-white/8 px-3.5 py-2 text-[12px] text-[#6870A0] transition-colors hover:border-white/14 hover:text-[#9699BE]">
              Open install guide
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
