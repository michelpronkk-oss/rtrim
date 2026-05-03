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

function runDate(run: RunRow): string {
  const when =
    toTimeMs(run.evaluated_at_local) ??
    toTimeMs(run.created_at_local) ??
    toTimeMs(run.created_at) ??
    toTimeMs(run.synced_at);
  if (!when) return "-";
  return new Date(when).toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  guarded: "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  passed:  "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  partial: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  failed:  "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
  split:   "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
};

const RISK_BADGE: Record<string, string> = {
  low:    "border-[#4DE8B0]/22 bg-[#4DE8B0]/8 text-[#9EE6CD]",
  medium: "border-[#F0BF72]/22 bg-[#F0BF72]/8 text-[#F2C88D]",
  high:   "border-[#FF7B5C]/22 bg-[#FF7B5C]/8 text-[#FFAC98]",
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
    <span className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.08em] ${cls}`}>
      {label}
    </span>
  );
}

function formatTokens(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `~${(n / 1_000).toFixed(0)}k`;
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
    <div className="mx-auto max-w-[92rem] space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Runs</p>
        <h1 className="mt-1 text-[1.5rem] font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-[1.6rem]">
          Run history
        </h1>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-white/7 bg-[#0C0C20] px-5 py-10 text-center sm:px-6 sm:py-12">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <History className="size-5 text-[#9E91FF]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#EDEEFF]">
            No synced runs yet.
          </h2>
          <p className="mx-auto mt-2 max-w-[400px] text-[13px] leading-[1.7] text-[#5E6A88]">
            Every synced run includes the prompt, contract, memory, risk score, token savings, and continuation pack. Sync opens for early access plans.
          </p>
          <Link
            href="/app/early-access"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Join early access
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090A1A]">
          <div className="border-b border-white/10 bg-[#0E1024]/90 px-4 py-3 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#3F4868]">
              Recent guarded runs
            </p>
          </div>

          {/* Desktop table header — hidden on mobile */}
          <div className="hidden grid-cols-[minmax(0,4.8fr)_minmax(0,1.5fr)_max-content_max-content_minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-x-6 border-b border-white/8 bg-[#0C0E21] px-6 py-3 md:grid">
            {["Task", "Project", "Status", "Risk", "Tokens saved", "Date", ""].map((h) => (
              <p key={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4460]">{h}</p>
            ))}
          </div>

          {runs.map((run, i) => {
            const tokens       = formatTokens(run.estimated_tokens_trimmed);
            const dateStr      = runDate(run);
            const projectName  = run.project_id ? (projectMap[run.project_id] ?? null) : null;
            const statusLabel  = formatStatusLabel(run.status);
            const riskLabel    = run.risk_after ?? run.risk_before;
            const borderClass  = i < runs.length - 1 ? "border-b border-white/6" : "";
            const bgStyle      = { background: i % 2 === 0 ? "#0B0C1F" : "#090A1B" };

            return (
              <Link
                key={run.id}
                href={`/app/runs/${run.id}`}
                className={`group block transition-colors hover:bg-white/[0.025] ${borderClass}`}
                style={bgStyle}
              >
                {/* ── Mobile card (hidden md+) ─────────────────── */}
                <div className="px-4 py-4 md:hidden">
                  {/* Task title — 2 lines max */}
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug text-[#EDEEFF]">
                    {run.task ?? "Untitled run"}
                  </p>

                  {/* Badges + project */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge label={statusLabel} kind="status" />
                    <Badge label={riskLabel}    kind="risk"   />
                    {projectName && (
                      <span className="font-mono text-[10px] text-[#4D5070]">{projectName}</span>
                    )}
                  </div>

                  {/* Date + tokens + arrow */}
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-[11px] text-[#5B638A]">{dateStr}</p>
                      {tokens && (
                        <p className="font-mono text-[11px] text-[#7A80A0]">{tokens} tokens</p>
                      )}
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-[#4D5070] transition-colors group-hover:text-[#7680AA]" />
                  </div>
                </div>

                {/* ── Desktop table row (hidden mobile) ───────── */}
                <div className="hidden items-center gap-x-6 px-6 py-3 md:grid md:grid-cols-[minmax(0,4.8fr)_minmax(0,1.5fr)_max-content_max-content_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                  <p className="truncate pr-2 text-[13px] font-medium text-[#EDEEFF]">
                    {run.task ?? "Untitled run"}
                  </p>
                  <p className="font-mono text-[11px] text-[#4D5070]">
                    {projectName ?? "-"}
                  </p>
                  <Badge label={statusLabel} kind="status" />
                  <Badge label={riskLabel}   kind="risk"   />
                  <p className="font-mono text-[12px] text-[#A5ABC6]">{tokens ?? "-"}</p>
                  <p className="font-mono text-[11px] text-[#5B638A]">{dateStr}</p>
                  <ArrowRight className="size-3.5 text-[#4D5070] transition-colors group-hover:text-[#7680AA]" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
