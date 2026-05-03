import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Run Report | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type FullRunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  score_before: number | null;
  score_after: number | null;
  risk_reduction_percent: number | null;
  estimated_tokens_trimmed: number | null;
  estimated_dollars_standard: number | null;
  estimated_dollars_expensive: number | null;
  changed_files: string[] | null;
  missing_proof_items: string[] | null;
  detected_risks: string[] | null;
  sensitive_areas: string[] | null;
  watch_status: string | null;
  watch_warnings: string[] | null;
  next_safe_prompt: string | null;
  latest_prompt: string | null;
  continuation_prompt: string | null;
  created_at_local: string | null;
  synced_at: string | null;
  project_id: string | null;
  user_id: string | null;
};

const RISK_COLOR: Record<string, string> = {
  low:    "text-[#4DE8B0]",
  medium: "text-[#F0BF72]",
  high:   "text-[#FF7B5C]",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/7 bg-[#0C0C20] p-5">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">{title}</p>
      {children}
    </div>
  );
}

function DataRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="shrink-0 text-[12px] text-[#5E6A88]">{label}</span>
      <span className={`text-right text-[12px] text-[#C8D4DF] ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-[#2E3554]">—</span>}
      </span>
    </div>
  );
}

function StringList({ items, emptyLabel }: { items: string[] | null; emptyLabel?: string }) {
  if (!items || items.length === 0) {
    return <p className="text-[12px] text-[#2E3554]">{emptyLabel ?? "None recorded"}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] text-[#9699BE]">
          <span className="mt-1 size-1 shrink-0 rounded-full bg-white/20" />
          <span className="font-mono">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  if (!supabase) notFound();

  const { data: run } = await supabase
    .from("runtrim_runs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();

  const r = run as FullRunRow;

  // Fetch project name
  let projectName: string | null = null;
  if (r.project_id) {
    const { data: proj } = await supabase
      .from("runtrim_projects")
      .select("name")
      .eq("id", r.project_id)
      .maybeSingle();
    projectName = (proj as { name: string | null } | null)?.name ?? null;
  }

  const riskLevel = r.risk_after ?? r.risk_before;
  const riskColor = RISK_COLOR[riskLevel?.toLowerCase() ?? ""] ?? "text-[#9699BE]";

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/app/runs"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4D5070] transition-colors hover:text-[#9E91FF]"
        >
          <ArrowLeft className="size-3.5" />
          Back to runs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4D5070]">Run report</p>
            <h1 className="mt-1 max-w-[600px] text-[1.3rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#EDEEFF]">
              {r.task ?? "Untitled run"}
            </h1>
            {projectName && (
              <p className="mt-1 font-mono text-[12px] text-[#4D5070]">{projectName}</p>
            )}
          </div>
          {riskLevel && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0C0C20] px-4 py-2">
              <Shield className={`size-4 ${riskColor}`} />
              <span className={`font-mono text-[13px] font-semibold uppercase tracking-[0.06em] ${riskColor}`}>
                {riskLevel} risk
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Status",       value: r.status ?? "—" },
          { label: "Risk before",  value: r.risk_before ?? "—" },
          { label: "Risk after",   value: r.risk_after ?? "—" },
          { label: "Risk drop",    value: r.risk_reduction_percent != null ? `${r.risk_reduction_percent}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-white/7 bg-[#0C0C20] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">{label}</p>
            <p className="mt-1.5 font-mono text-[14px] font-semibold text-[#EDEEFF]">{value}</p>
          </div>
        ))}
      </div>

      {/* Task + timestamps */}
      <Section title="Run details">
        <DataRow label="Task" value={r.task} />
        <DataRow
          label="Estimated tokens saved"
          value={r.estimated_tokens_trimmed != null
            ? r.estimated_tokens_trimmed.toLocaleString()
            : null}
          mono
        />
        <DataRow
          label="Estimated cost saved"
          value={r.estimated_dollars_standard != null
            ? `$${r.estimated_dollars_standard.toFixed(4)}`
            : null}
          mono
        />
        <DataRow label="Run at (local)" value={r.created_at_local} mono />
        <DataRow
          label="Synced at"
          value={r.synced_at ? new Date(r.synced_at).toLocaleString() : null}
          mono
        />
      </Section>

      {/* Prompt */}
      {r.latest_prompt && (
        <Section title="Original prompt">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/6 bg-[#07071A] p-4 font-mono text-[12px] leading-[1.75] text-[#9699BE]">
            {r.latest_prompt}
          </pre>
        </Section>
      )}

      {/* Continuation prompt */}
      {r.continuation_prompt && (
        <Section title="Continuation pack">
          <p className="mb-3 text-[12px] text-[#5E6A88]">
            Paste this into the next agent session to resume cleanly.
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/6 bg-[#07071A] p-4 font-mono text-[12px] leading-[1.75] text-[#9699BE]">
            {r.continuation_prompt}
          </pre>
        </Section>
      )}

      {/* Next safest step */}
      {r.next_safe_prompt && (
        <Section title="Next safest step">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[#4DE8B0]/12 bg-[#4DE8B0]/5 p-4 font-mono text-[12px] leading-[1.75] text-[#9EE6CD]">
            {r.next_safe_prompt}
          </pre>
        </Section>
      )}

      {/* Changed files */}
      <Section title="Changed files">
        {r.changed_files && r.changed_files.length > 0 ? (
          <StringList items={r.changed_files} />
        ) : (
          <p className="text-[12px] text-[#2E3554]">No changed files recorded.</p>
        )}
      </Section>

      {/* Risk signals */}
      <div className="grid gap-3 md:grid-cols-2">
        <Section title="Detected risks">
          <StringList items={r.detected_risks} emptyLabel="No risks detected" />
        </Section>
        <Section title="Sensitive areas">
          <StringList items={r.sensitive_areas} emptyLabel="No sensitive areas flagged" />
        </Section>
      </div>

      {/* Proof gaps */}
      {r.missing_proof_items && r.missing_proof_items.length > 0 && (
        <Section title="Proof gaps">
          <div className="flex items-start gap-2.5 rounded-lg border border-[#F0BF72]/15 bg-[#F0BF72]/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#F0BF72]/70" />
            <StringList items={r.missing_proof_items} />
          </div>
        </Section>
      )}

      {/* Watch */}
      {r.watch_warnings && r.watch_warnings.length > 0 && (
        <Section title="Watch warnings">
          <p className="mb-2 font-mono text-[11px] text-[#4D5070]">
            status: {r.watch_status ?? "—"}
          </p>
          <StringList items={r.watch_warnings} />
        </Section>
      )}

      {/* Placeholder for Builder+ fields */}
      <div className="rounded-xl border border-white/6 bg-[#08081C] px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-[#7C6DFA]/50" />
          <div>
            <p className="text-[13px] font-semibold text-[#EDEEFF]">
              Full contract view requires Builder or higher.
            </p>
            <p className="mt-0.5 text-[12px] text-[#4D5070]">
              Allowed scope, forbidden scope, stop conditions, and scope drift detection are Builder-tier fields. Early access is open.
            </p>
            <Link
              href="/app/early-access"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#7C6DFA] transition-colors hover:text-[#B2A7FF]"
            >
              Join early access
              <ArrowLeft className="size-3 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
