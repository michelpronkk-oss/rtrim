import { AppShell } from "@/components/app/app-shell";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { getSyncedProjects } from "@/lib/dashboard-sync";

const PREVIEW = [
  {
    name: "rtrim",
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
];

export default async function ProjectsPage() {
  const syncedProjects = await getSyncedProjects();
  const rows =
    syncedProjects.length > 0
      ? syncedProjects.map((p) => ({
          name: p.name,
          stack: p.stack || "auto",
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

  return (
    <AppShell active="/app/projects">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">Project intelligence</h1>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">Use this list to see which projects need verification, containment, or continuation.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((project) => (
            <article key={project.name} className="surface-panel rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-semibold text-[#F5F7FA]">{project.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#7D8A99]">{project.stack}</p>
                </div>
                <RunStatusBadge status={project.latestState} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2">
                  <p className="font-mono uppercase text-[#6D7B8C]">Verification debt</p>
                  <p className="mt-1 text-[#F0BF72]">{project.debt} open items</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2">
                  <p className="font-mono uppercase text-[#6D7B8C]">Tokens trimmed</p>
                  <p className="mt-1 text-[#9AEFE3]">~{project.tokens.toLocaleString("en-US")}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2">
                  <p className="font-mono uppercase text-[#6D7B8C]">Runs guarded</p>
                  <p className="mt-1 text-[#D7DEE7]">{project.guarded || "Synced"}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2">
                  <p className="font-mono uppercase text-[#6D7B8C]">Last sync</p>
                  <p className="mt-1 text-[#D7DEE7]">{project.lastSync}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/8 bg-[#0E151E] p-3">
                <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Latest state</p>
                <p className="mt-1 text-[12px] text-[#D7DEE7]">{project.latestState}</p>
                <p className="mt-2 text-[12px] text-[#9AA7B6]">Next safe action: {project.nextSafeAction}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {project.sensitive.map((s) => (
                  <span key={s} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#B8C7D7]">
                    {s}
                  </span>
                ))}
              </div>

              <button className="mt-4 rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#A5B1BF] hover:text-[#E4EBF3]">
                Open memory
              </button>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
