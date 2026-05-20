import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { FolderKanban, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Projects | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type ProjectRow = {
  id: string;
  name: string | null;
  stack: string[] | null;
  local_project_id: string | null;
  last_status: string | null;
  last_task: string | null;
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
  updated_at: string | null;
};

type RunCountRow = {
  project_id: string;
  count: number;
};

const STATUS_BADGE: Record<string, string> = {
  guarded:  "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  partial:  "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  passed:   "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  failed:   "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="font-mono text-[11px] text-[#3a3e46]">—</span>;
  const key = status.toLowerCase();
  const cls = STATUS_BADGE[key] ?? "border-white/10 text-[#8a8f98]";
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${cls}`}>
      {status}
    </span>
  );
}

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  const projects: ProjectRow[] = [];
  const runCounts: Record<string, number> = {};

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_projects")
      .select("id, name, stack, local_project_id, last_status, last_task, estimated_tokens_trimmed, estimated_dollars_standard, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (data) projects.push(...(data as ProjectRow[]));

    if (projects.length > 0) {
      const ids = projects.map((p) => p.id);
      const { data: counts } = await supabase
        .from("runtrim_runs")
        .select("project_id")
        .in("project_id", ids)
        .eq("user_id", user.id);

      if (counts) {
        for (const row of counts as { project_id: string }[]) {
          runCounts[row.project_id] = (runCounts[row.project_id] ?? 0) + 1;
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">Projects</p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">
          Your projects
        </h1>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-6 py-10 sm:py-12">
          <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <FolderKanban className="size-4.5 text-[#a78bfa]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#f4f5f7]">
            No synced projects yet.
          </h2>
          <p className="mt-1.5 max-w-[440px] text-[13px] leading-[1.7] text-[#8a8f98]">
            Run <code className="font-mono text-[#a78bfa]">runtrim init</code> in a repo, then start and finish a guarded run to sync your first project. Each project tracks its own memory, run history, risk, and savings.
          </p>
          <div className="mt-5 space-y-2 max-w-[360px]">
            {[
              "runtrim init",
              'runtrim go "your first task"',
              "runtrim finish",
            ].map((cmd) => (
              <div
                key={cmd}
                className="flex items-center overflow-hidden rounded-[6px]"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#080a0d" }}
              >
                <span className="pl-3 pr-1 font-mono text-[10px] text-[#a78bfa]/60">$</span>
                <code className="flex-1 py-2 pr-2 font-mono text-[11.5px] text-[#c9ccd2]">{cmd}</code>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/app/connect"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#f4f5f7]"
            >
              Connect CLI
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/app/install"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] text-[#5a5f68] transition-colors hover:text-[#8a8f98]"
            >
              View install guide
            </Link>
          </div>
        </div>
      ) : (
        /* Project list */
        <div className="overflow-hidden rounded-xl border border-white/6">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] border-b border-white/6 bg-[#0c0e11] px-5 py-3">
            {["Project", "Runs", "Last run", "Status", ""].map((h) => (
              <p key={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3a3e46]">{h}</p>
            ))}
          </div>

          {projects.map((project, i) => (
            <div
              key={project.id}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] ${i < projects.length - 1 ? "border-b border-white/6" : ""}`}
              style={{ background: i % 2 === 0 ? "#0c0e11" : "#08090b" }}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#f4f5f7]">
                  {project.name ?? "Unnamed project"}
                </p>
                {project.stack && project.stack.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {project.stack.slice(0, 3).map((s) => (
                      <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#5a5f68]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="font-mono text-[13px] text-[#8a8f98]">
                {runCounts[project.id] ?? 0}
              </p>
              <p className="font-mono text-[11px] text-[#5a5f68]">
                {project.updated_at
                  ? new Date(project.updated_at).toLocaleDateString()
                  : "—"}
              </p>
              <StatusBadge status={project.last_status} />
              <Link
                href={`/app/runs?project=${project.id}`}
                className="text-[12px] text-[#5a5f68] transition-colors hover:text-[#a78bfa]"
              >
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
