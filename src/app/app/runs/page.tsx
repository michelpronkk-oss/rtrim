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
  estimated_tokens_saved: number | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
  project_id: string | null;
  changed_files: string[] | null;
  missing_proof_items: string[] | null;
  raw_report: string | null;
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
  if (!label) return <span className="font-mono text-[11px] text-[#3a3e46]">-</span>;
  const map = kind === "status" ? STATUS_BADGE : RISK_BADGE;
  const cls = map[label.toLowerCase()] ?? "border-white/10 text-[#8a8f98]";
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.08em] ${cls}`}>
      {label}
    </span>
  );
}

function formatTokens(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

type RestoreStatus = {
  available: boolean;
  hasSyncedMetadata: boolean;
  sensitiveSkipped: boolean;
};

function parseRestoreStatus(rawReport: string | null): RestoreStatus {
  if (!rawReport) {
    return { available: false, hasSyncedMetadata: false, sensitiveSkipped: true };
  }
  try {
    const parsed = JSON.parse(rawReport) as Record<string, unknown>;
    const restore =
      (parsed.restore as Record<string, unknown> | undefined) ??
      (parsed.restore_point as Record<string, unknown> | undefined) ??
      (parsed.restorePoint as Record<string, unknown> | undefined) ??
      null;
    if (!restore) {
      return { available: false, hasSyncedMetadata: false, sensitiveSkipped: true };
    }
    const available = restore.available !== false;
    const sensitiveSkipped = restore.sensitiveSkipped !== false;
    return { available, hasSyncedMetadata: true, sensitiveSkipped };
  } catch {
    return { available: false, hasSyncedMetadata: false, sensitiveSkipped: true };
  }
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
        "id, task, status, risk_before, risk_after, estimated_tokens_trimmed, estimated_tokens_saved, created_at_local, evaluated_at_local, created_at, synced_at, project_id, changed_files, missing_proof_items, raw_report"
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
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">Runs</p>
        <h1 className="mt-1 text-[1.5rem] font-bold tracking-[-0.03em] text-[#f4f5f7] sm:text-[1.6rem]">Run history</h1>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-[#0c0e11] px-6 py-10 sm:py-12">
          <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-[#7C6DFA]/22 bg-[#7C6DFA]/8">
            <History className="size-4.5 text-[#a78bfa]/70" />
          </div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-[#f4f5f7]">No guarded runs yet.</h2>
          <p className="mt-1.5 max-w-[440px] text-[13px] leading-[1.7] text-[#8a8f98]">
            Start with a task in any project. Finish it, then sync to see the contract, risk score, token savings, and continuation pack here.
          </p>
          <div className="mt-5 space-y-2 max-w-[360px]">
            {["runtrim start", "runtrim doctor", "runtrim agent \"fix a small bug\" --copy", "runtrim finish"].map((cmd) => (
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090A1A]">
          <div className="border-b border-white/10 bg-[#111317]/90 px-4 py-3 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Recent guarded runs</p>
          </div>

          <div className="hidden grid-cols-[minmax(0,4fr)_minmax(0,1.2fr)_max-content_max-content_max-content_max-content_minmax(0,1.2fr)_auto] items-center gap-x-5 border-b border-white/8 bg-[#111317] px-6 py-3 md:grid">
            {["Task", "Project", "Status", "Risk", "Files", "Proof gaps", "Tokens saved", ""].map((h) => (
              <p key={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3a3e46]">{h}</p>
            ))}
          </div>

          {runs.map((run, i) => {
            const tokens = formatTokens(run.estimated_tokens_saved ?? run.estimated_tokens_trimmed);
            const dateStr = runDate(run);
            const projectName = run.project_id ? (projectMap[run.project_id] ?? null) : null;
            const statusLabel = formatStatusLabel(run.status);
            const statusNormalized = (statusLabel ?? "").toLowerCase();
            const riskLabel = run.risk_after ?? run.risk_before;
            const filesChanged = run.changed_files?.length ?? 0;
            const proofGaps = run.missing_proof_items?.length ?? 0;
            const restore = parseRestoreStatus(run.raw_report);
            const borderClass = i < runs.length - 1 ? "border-b border-white/6" : "";
            const bgStyle = { background: i % 2 === 0 ? "#0B0C1F" : "#090A1B" };

            return (
              <Link
                key={run.id}
                href={`/app/runs/${run.id}`}
                className={`group block transition-colors hover:bg-white/[0.025] ${borderClass}`}
                style={bgStyle}
              >
                <div className="space-y-2 px-4 py-4 md:hidden">
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug text-[#f4f5f7]">{run.task ?? "Untitled run"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={statusLabel} kind="status" />
                    <Badge label={riskLabel} kind="risk" />
                    {projectName && <span className="font-mono text-[10px] text-[#5a5f68]">{projectName}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <p className="font-mono text-[#8a8f98]">Files: {filesChanged}</p>
                    <p className="font-mono text-[#8a8f98]">Proof gaps: {proofGaps}</p>
                    <p className="font-mono text-[#8a8f98]">Tokens: {tokens ?? "-"}</p>
                    <p className="font-mono text-[#8a8f98]">{dateStr}</p>
                  </div>
                  <p className="font-mono text-[10px] text-[#6f7692]">
                    {restore.hasSyncedMetadata && restore.available
                      ? "Restore available (local apply via CLI)"
                      : "Restore point is local. Use: runtrim restore last --preview"}
                  </p>
                  {(statusNormalized === "warn" || statusNormalized === "blocked") && (
                    <p className="font-mono text-[10px] text-[#8a8f98]">Preview restore before continuing.</p>
                  )}
                </div>

                <div className="hidden items-center gap-x-5 px-6 py-3 md:grid md:grid-cols-[minmax(0,4fr)_minmax(0,1.2fr)_max-content_max-content_max-content_max-content_minmax(0,1.2fr)_auto]">
                  <p className="truncate pr-2 text-[13px] font-medium text-[#f4f5f7]">{run.task ?? "Untitled run"}</p>
                  <p className="truncate font-mono text-[11px] text-[#5a5f68]">{projectName ?? "-"}</p>
                  <Badge label={statusLabel} kind="status" />
                  <Badge label={riskLabel} kind="risk" />
                  <p className="font-mono text-[11px] text-[#8a8f98]">{filesChanged}</p>
                  <p className="font-mono text-[11px] text-[#8a8f98]">{proofGaps}</p>
                  <p className="font-mono text-[12px] text-[#8a8f98]">{tokens ?? "-"}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f96a3]">
                      {restore.hasSyncedMetadata && restore.available ? "restore available" : "local restore"}
                    </span>
                    {(statusNormalized === "warn" || statusNormalized === "blocked") && (
                      <span className="rounded border border-[#F0BF72]/20 bg-[#F0BF72]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#F2C88D]">
                        preview restore
                      </span>
                    )}
                    <p className="font-mono text-[11px] text-[#5a5f68]">{dateStr}</p>
                    <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9ca2ad]">Open report</span>
                    <ArrowRight className="size-3.5 text-[#5a5f68] transition-colors group-hover:text-[#7680AA]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
