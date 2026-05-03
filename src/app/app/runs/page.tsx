import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { History, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Runs | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type RunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
  project_id: string | null;
};

function toTimeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function runSortTime(run: RunRow): number {
  return (
    toTimeMs(run.evaluated_at_local) ??
    toTimeMs(run.created_at_local) ??
    toTimeMs(run.created_at) ??
    toTimeMs(run.synced_at) ??
    0
  );
}

const STATUS_BADGE: Record<string, string> = {
  guarded: "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  passed: "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  partial: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  failed: "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
  split: "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

const RISK_BADGE: Record<string, string> = {
  low: "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  medium: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  high: "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

function formatStatusLabel(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const parts = normalized.split(/[_\s-]+/g).filter(Boolean);
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function Badge({ label, kind }: { label: string | null; kind: "status" | "risk" }) {
  if (!label) return <span className="font-mono text-[11px] text-[#2E3554]">-</span>;
  const map = kind === "status" ? STATUS_BADGE : RISK_BADGE;
  const cls = map[label.toLowerCase()] ?? "border-white/10 text-[#9699BE]";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em] ${cls}`}
    >
      {label}
    </span>
  );
}

function formatTokens(n: number | null) {
  if (!n) return "-";
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export default async function RunsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  const runs: RunRow[] = [];
  const projectMap: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_runs")
      .select(
        "id, task, status, risk_before, risk_after, estimated_tokens_trimmed, estimated_dollars_standard, created_at_local, evaluated_at_local, created_at, synced_at, project_id"
      )
      .eq("user_id", user.id)
      .limit(100);

    if (data) runs.push(...(data as RunRow[]));
    runs.sort((a, b) => runSortTime(b) - runSortTime(a));

    const projectIds = [...new Set(runs.map((r) => r.project_id).filter(Boolean))] as string[];
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("runtrim_projects")
        .select("id, name")
        .in("id", projectIds);
      if (projects) {
        for (const p of projects as { id: string; name: string | null }[]) {
          if (p.id) projectMap[p.id] = p.name ?? "Unnamed";
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Runs</p>
        <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
          Run history
        </h1>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <History className="size-5 text-[#9E91FF]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
            No synced runs yet.
          </h2>
          <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-[1.7] text-[#5E6A88]">
            Every synced run will include the prompt, scoped contract, memory used, risk score,
            token savings, and continuation pack. Sync opens for early access plans.
          </p>
          <Link
            href="/app/early-access"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Join early access
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090A1A]">
          <div className="border-b border-white/10 bg-[#0E1024]/90 px-6 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3F4868]">
              Recent guarded runs
            </p>
          </div>

          <div className="hidden grid-cols-[minmax(0,3.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-x-5 border-b border-white/8 bg-[#0C0E21] px-6 py-3 md:grid">
            {["Task", "Project", "Status", "Risk", "Tokens saved", "Date", ""].map((h) => (
              <p key={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4460]">
                {h}
              </p>
            ))}
          </div>

          {runs.map((run, i) => (
            <Link
              key={run.id}
              href={`/app/runs/${run.id}`}
              className={`group block px-4 py-4 transition-colors hover:bg-white/[0.02] md:grid md:grid-cols-[minmax(0,3.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] md:items-center md:gap-x-5 md:px-6 md:py-3.5 ${
                i < runs.length - 1 ? "border-b border-white/6" : ""
              }`}
              style={{ background: i % 2 === 0 ? "#0B0C1F" : "#090A1B" }}
            >
              <p className="truncate text-[13px] font-medium leading-6 text-[#EDEEFF] md:pr-2">
                {run.task ?? "Untitled run"}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] md:mt-0 md:contents">
                <p className="font-mono text-[11px] text-[#4D5070] md:text-[12px]">
                  <span className="mr-1 text-[#3A4460] md:hidden">Project</span>
                  {run.project_id ? (projectMap[run.project_id] ?? "-") : "-"}
                </p>

                <div className="flex items-center gap-2 md:justify-start">
                  <span className="text-[#3A4460] md:hidden">Status</span>
                  <Badge label={formatStatusLabel(run.status)} kind="status" />
                </div>

                <div className="flex items-center gap-2 md:justify-start">
                  <span className="text-[#3A4460] md:hidden">Risk</span>
                  <Badge label={run.risk_after ?? run.risk_before} kind="risk" />
                </div>

                <p className="font-mono text-[11px] text-[#A5ABC6] md:text-[12px]">
                  <span className="mr-1 text-[#3A4460] md:hidden">Tokens</span>
                  {formatTokens(run.estimated_tokens_trimmed)}
                </p>

                <p className="font-mono text-[11px] text-[#5B638A] md:text-[11px]">
                  <span className="mr-1 text-[#3A4460] md:hidden">Date</span>
                  {(() => {
                    const when =
                      toTimeMs(run.evaluated_at_local) ??
                      toTimeMs(run.created_at_local) ??
                      toTimeMs(run.created_at) ??
                      toTimeMs(run.synced_at);
                    return when
                      ? new Date(when).toLocaleString([], {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";
                  })()}
                </p>

                <div className="flex items-center justify-end md:justify-center">
                  <ArrowRight className="size-3.5 text-[#4D5070] transition-colors group-hover:text-[#7680AA]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
