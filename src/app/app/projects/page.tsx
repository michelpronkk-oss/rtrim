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
  if (!status) return <span className="font-mono text-[11px] text-[#2E3554]">—</span>;
  const key = status.toLowerCase();
  const cls = STATUS_BADGE[key] ?? "border-white/10 text-[#9699BE]";
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
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Projects</p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
          Your projects
        </h1>
      </div>

      {projects.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <FolderKanban className="size-5 text-[#9E91FF]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
            No projects synced yet.
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-[1.7] text-[#5E6A88]">
            Projects appear here once your CLI starts syncing run reports. Each project tracks its own memory, run history, risk levels, and savings.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 font-mono text-[12px] text-[#4D5070]">
            runtrim go &quot;your task&quot;
          </div>
          <p className="mt-3 text-[12px] text-[#3A3F5A]">
            Run this in your project directory after{" "}
            <Link href="/app/install" className="text-[#6870A0] transition-colors hover:text-[#9E91FF]">
              installing the CLI
            </Link>
            .
          </p>
        </div>
      ) : (
        /* Project list */
        <div className="overflow-hidden rounded-xl border border-white/7">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] border-b border-white/7 bg-[#0C0C20] px-5 py-3">
            {["Project", "Runs", "Last run", "Status", ""].map((h) => (
              <p key={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4460]">{h}</p>
            ))}
          </div>

          {projects.map((project, i) => (
            <div
              key={project.id}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] ${i < projects.length - 1 ? "border-b border-white/6" : ""}`}
              style={{ background: i % 2 === 0 ? "#0C0C20" : "#0A0A1C" }}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#EDEEFF]">
                  {project.name ?? "Unnamed project"}
                </p>
                {project.stack && project.stack.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {project.stack.slice(0, 3).map((s) => (
                      <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#4D5070]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="font-mono text-[13px] text-[#9699BE]">
                {runCounts[project.id] ?? 0}
              </p>
              <p className="font-mono text-[11px] text-[#4D5070]">
                {project.updated_at
                  ? new Date(project.updated_at).toLocaleDateString()
                  : "—"}
              </p>
              <StatusBadge status={project.last_status} />
              <Link
                href={`/app/runs?project=${project.id}`}
                className="text-[12px] text-[#4D5070] transition-colors hover:text-[#9E91FF]"
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
