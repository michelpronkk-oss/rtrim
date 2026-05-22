import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { CopyContextButton } from "../copy-context-button";

export const metadata: Metadata = {
  title: "Run Report | RunTrim Dashboard",
  robots: { index: false, follow: false },
};

type ChangedFileRow = string | { path?: string | null; status?: string | null };

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
  estimated_tokens_saved: number | null;
  estimated_dollars_standard: number | null;
  estimated_dollars_expensive: number | null;
  estimated_cost_saved: number | null;
  changed_files: ChangedFileRow[] | null;
  watch_changed_files: ChangedFileRow[] | null;
  missing_proof_items: string[] | null;
  detected_risks: string[] | null;
  sensitive_areas: string[] | null;
  watch_status: string | null;
  watch_warnings: string[] | null;
  next_safe_prompt: string | null;
  latest_prompt: string | null;
  continuation_prompt: string | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
  project_id: string | null;
  user_id: string | null;
  goal: string | null;
  allowed_scope: string[] | null;
  forbidden_scope: string[] | null;
  stop_conditions: string[] | null;
  memory_used: boolean | null;
  memory_summary: string | null;
  token_budget: number | null;
  scope_drift_status: string | null;
  report_summary: string | null;
  original_prompt: string | null;
  contract_status: string | null;
  continuation_pack: unknown;
  next_safest_step: string | null;
  raw_report: string | null;
  // agent and model may be present on newer runs
  agent: string | null;
  model: string | null;
};

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
};

function formatStatusLabel(value: string | null): string {
  if (!value) return "Not captured";
  return value
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "Not captured";
  return `$${value.toFixed(4)}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "Not captured";
  return value.toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#0c0f13] p-4 sm:p-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">{title}</p>
      {children}
    </section>
  );
}

function ListOrFallback({
  items,
  fallback,
}: {
  items: string[] | null | undefined;
  fallback: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-[12px] text-[#6a707b]">{fallback}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span
          key={`${item}-${idx}`}
          className="rounded-md border border-white/10 bg-[#11151a] px-2.5 py-1 font-mono text-[11px] text-[#b9bfca]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function parseChangedFile(entry: ChangedFileRow): { path: string; status: string | null } {
  if (typeof entry === "string") {
    const match = entry.match(/^\s*(added|modified|deleted|renamed)\s*[:|-]\s*(.+)$/i);
    if (match) {
      return { path: match[2].trim(), status: match[1].toLowerCase() };
    }
    return { path: entry, status: null };
  }
  return { path: entry.path?.trim() || "Unknown path", status: entry.status?.toLowerCase() ?? null };
}

function inAllowedScope(path: string, allowed: string[] | null): boolean | null {
  if (!allowed || allowed.length === 0) return null;
  const normalizedPath = path.toLowerCase();
  const prefixes = allowed
    .map((item) => item.trim().toLowerCase().replace(/^\.?\//, ""))
    .filter(Boolean);
  if (prefixes.length === 0) return null;
  return prefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

function isSensitivePath(path: string, sensitive: string[] | null): boolean {
  if (!sensitive || sensitive.length === 0) return false;
  const normalizedPath = path.toLowerCase();
  return sensitive.some((item) => normalizedPath.includes(item.toLowerCase()));
}

function normalizeContinuationPack(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function summarizeScopeDrift(status: string | null, forbiddenTouched: boolean): string {
  if (forbiddenTouched) return "Forbidden area touched";
  if (!status) return "Needs review";
  const normalized = status.toLowerCase();
  if (normalized === "passed" || normalized === "inside_scope" || normalized === "clean") return "Inside scope";
  if (normalized.includes("forbidden")) return "Forbidden area touched";
  if (normalized === "none" || normalized === "no_drift") return "No drift detected";
  return "Needs review";
}

// ── Color tokens for status/risk/drift ───────────────────────────────────────

const RISK_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  low:    { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  medium: { border: "rgba(240,191,114,0.28)", bg: "rgba(240,191,114,0.08)", text: "#F2C88D" },
  high:   { border: "rgba(255,123,92,0.30)",  bg: "rgba(255,123,92,0.08)",  text: "#FFAC98" },
};

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  guarded:     { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  passed:      { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  completed:   { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  partial:     { border: "rgba(240,191,114,0.28)", bg: "rgba(240,191,114,0.08)", text: "#F2C88D" },
  in_progress: { border: "rgba(167,139,250,0.28)", bg: "rgba(167,139,250,0.08)", text: "#c7b9ff" },
  failed:      { border: "rgba(255,123,92,0.30)",  bg: "rgba(255,123,92,0.08)",  text: "#FFAC98" },
  split:       { border: "rgba(255,123,92,0.30)",  bg: "rgba(255,123,92,0.08)",  text: "#FFAC98" },
};

const DRIFT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  "inside scope":           { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  "no drift detected":      { border: "rgba(77,232,176,0.28)",  bg: "rgba(77,232,176,0.08)",  text: "#9EE6CD" },
  "needs review":           { border: "rgba(240,191,114,0.28)", bg: "rgba(240,191,114,0.08)", text: "#F2C88D" },
  "proof missing":          { border: "rgba(255,255,255,0.12)", bg: "transparent",             text: "#a8afbc" },
  "forbidden area touched": { border: "rgba(255,123,92,0.30)",  bg: "rgba(255,123,92,0.08)",  text: "#FFAC98" },
};

function coloredBadge(
  label: string,
  colorMap: Record<string, { border: string; bg: string; text: string }>,
  fallback = { border: "rgba(255,255,255,0.12)", bg: "transparent", text: "#a8afbc" },
) {
  const key = label.toLowerCase();
  const c = colorMap[key] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 10,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        borderRadius: 4,
        padding: "2px 8px",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
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

  const [{ data: run }, { data: profile }] = await Promise.all([
    supabase
      .from("runtrim_runs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("runtrim_profiles")
      .select("plan, plan_status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!run) notFound();

  const r = run as FullRunRow;
  const p = (profile as ProfileRow | null) ?? null;

  let projectName: string | null = null;
  if (r.project_id) {
    const { data: proj } = await supabase
      .from("runtrim_projects")
      .select("name")
      .eq("id", r.project_id)
      .maybeSingle();
    projectName = (proj as { name: string | null } | null)?.name ?? null;
  }

  const allChangedFilesRaw = [...(r.changed_files ?? []), ...(r.watch_changed_files ?? [])];
  const changedFiles = allChangedFilesRaw.map(parseChangedFile);
  const filesChangedCount = changedFiles.length;
  const sensitiveTouched = changedFiles.some((file) => isSensitivePath(file.path, r.sensitive_areas));
  const scopeDriftLabel = summarizeScopeDrift(r.scope_drift_status, sensitiveTouched);
  const proofGaps = r.missing_proof_items ?? [];
  const riskLevel = r.risk_after ?? r.risk_before ?? "Not captured";
  const tokenSaved = r.estimated_tokens_saved ?? r.estimated_tokens_trimmed;
  const costSaved = r.estimated_cost_saved ?? r.estimated_dollars_standard;
  const nextSafestStep = r.next_safest_step ?? r.next_safe_prompt ?? "No next-run context captured yet.";
  const continuationPack = normalizeContinuationPack(r.continuation_pack) ?? r.continuation_prompt;
  const latestPrompt = r.original_prompt ?? r.latest_prompt;
  const plan = (p?.plan ?? "free").toLowerCase();
  const planStatus = (p?.plan_status ?? "").toLowerCase();
  const isPro = plan !== "free";
  const isTrialing = isPro && planStatus === "trialing";
  const contractStatus = r.contract_status ?? "Not captured";

  const summaryItems = [
    { label: "Task", value: r.task ?? "Not captured" },
    { label: "Status", value: formatStatusLabel(r.status) },
    { label: "Risk level", value: riskLevel },
    { label: "Scope drift", value: scopeDriftLabel },
    { label: "Files changed", value: filesChangedCount.toString() },
    { label: "Proof gaps", value: proofGaps.length.toString() },
    { label: "Estimated tokens saved", value: formatNumber(tokenSaved) },
    { label: "Estimated cost saved", value: formatMoney(costSaved) },
    { label: "Next safest step", value: nextSafestStep },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link
          href="/app/runs"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#5a5f68] transition-colors hover:text-[#a78bfa]"
        >
          <ArrowLeft className="size-3.5" />
          Back to runs
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a5f68]">Run report</p>
        <h1 className="mt-1 text-[1.35rem] font-bold tracking-[-0.02em] text-[#f4f5f7] sm:text-[1.5rem]">
          {r.task ?? "Untitled run"}
        </h1>
        {projectName && <p className="mt-1 font-mono text-[12px] text-[#5a5f68]">{projectName}</p>}
      </div>

      <Section title="Executive summary">
        {/* Signal row — color-coded at a glance */}
        <div className="mb-4 flex flex-wrap gap-2">
          {coloredBadge(formatStatusLabel(r.status) || "Not captured", STATUS_COLORS)}
          {coloredBadge(riskLevel.toLowerCase() !== "not captured" ? `Risk: ${riskLevel}` : "Risk: unknown", RISK_COLORS, { border: "rgba(255,255,255,0.12)", bg: "transparent", text: "#a8afbc" })}
          {coloredBadge(scopeDriftLabel.toLowerCase(), DRIFT_COLORS)}
          {proofGaps.length > 0 && coloredBadge(`${proofGaps.length} proof gap${proofGaps.length === 1 ? "" : "s"}`, {}, { border: "rgba(240,191,114,0.28)", bg: "rgba(240,191,114,0.08)", text: "#F2C88D" })}
          {filesChangedCount > 0 && (
            <span style={{ display: "inline-block", border: "1px solid rgba(255,255,255,0.10)", color: "#8a8f98", fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 4, padding: "2px 8px" }}>
              {filesChangedCount} file{filesChangedCount === 1 ? "" : "s"} changed
            </span>
          )}
        </div>

        {/* Report summary if available */}
        {r.report_summary && (
          <p className="mb-4 text-[12.5px] leading-[1.65] text-[#c5cad3]">{r.report_summary}</p>
        )}

        {/* Metrics grid */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Tokens saved</p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#d5dae3]">{formatNumber(tokenSaved)}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Cost saved</p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#d5dae3]">{formatMoney(costSaved)}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Risk reduction</p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#d5dae3]">
              {r.risk_reduction_percent != null ? `${r.risk_reduction_percent}%` : "Not captured"}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Next safest step</p>
            <p className="mt-1 text-[12px] text-[#d5dae3] line-clamp-2">{nextSafestStep}</p>
          </div>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Section title="What happened">
          <div className="space-y-2 text-[12px] text-[#c5cad3]">
            <p><span className="text-[#7d8491]">Task:</span> {r.task ?? "Not captured"}</p>
            {r.goal && r.goal !== r.task && (
              <p><span className="text-[#7d8491]">Compiled objective:</span> {r.goal}</p>
            )}
            <p><span className="text-[#7d8491]">Status:</span> {formatStatusLabel(r.status)}</p>
            <p><span className="text-[#7d8491]">Created:</span> {r.created_at_local ?? r.created_at ?? "Not captured"}</p>
            <p><span className="text-[#7d8491]">Evaluated:</span> {r.evaluated_at_local ?? "Not evaluated yet"}</p>
            <p><span className="text-[#7d8491]">Agent:</span> {r.agent ?? r.model ?? "Not recorded"}</p>
            <p><span className="text-[#7d8491]">Project:</span> {projectName ?? "Not captured"}</p>
            {r.token_budget != null && (
              <p><span className="text-[#7d8491]">Token budget:</span> {r.token_budget.toLocaleString()}</p>
            )}
          </div>
        </Section>

        <Section title="Scope boundary">
          {(() => {
            const hasAny =
              (r.allowed_scope?.length ?? 0) > 0 ||
              (r.forbidden_scope?.length ?? 0) > 0 ||
              (r.stop_conditions?.length ?? 0) > 0 ||
              (r.sensitive_areas?.length ?? 0) > 0;
            if (!hasAny) {
              return (
                <div className="rounded-lg border border-white/6 bg-[#10141a] px-3 py-3">
                  <p className="text-[12px] text-[#6a707b]">No scope boundary was captured for this run.</p>
                  <p className="mt-1 text-[11px] text-[#4a5060]">Pro reports capture allowed scope, forbidden paths, and stop rules from every guarded run.</p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {(r.allowed_scope?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Allowed</p>
                    <ListOrFallback items={r.allowed_scope} fallback="Not captured" />
                  </div>
                )}
                {(r.forbidden_scope?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Forbidden</p>
                    <ListOrFallback items={r.forbidden_scope} fallback="Not captured" />
                  </div>
                )}
                {(r.stop_conditions?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Stop rules</p>
                    <ListOrFallback items={r.stop_conditions} fallback="Not captured" />
                  </div>
                )}
                {(r.sensitive_areas?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Sensitive areas</p>
                    <ListOrFallback items={r.sensitive_areas} fallback="Not captured" />
                  </div>
                )}
                <p className="text-[12px] text-[#c5cad3]">
                  <span className="text-[#7d8491]">Contract status:</span> {contractStatus}
                </p>
              </div>
            );
          })()}
        </Section>
      </div>

      <Section title="Files changed">
        {filesChangedCount === 0 ? (
          <p className="text-[12px] text-[#6a707b]">No agent changes detected.</p>
        ) : (
          <div className="space-y-2">
            {changedFiles.map((file, idx) => {
              const insideScope = inAllowedScope(file.path, r.allowed_scope);
              const sensitive = isSensitivePath(file.path, r.sensitive_areas);
              return (
                <div key={`${file.path}-${idx}`} className="rounded-lg border border-white/8 bg-[#11151b] p-3">
                  <p className="font-mono text-[11px] break-all text-[#d3d8e2]">{file.path}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9fa6b4]">
                      {file.status ?? "status not captured"}
                    </span>
                    <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9fa6b4]">
                      {insideScope == null ? "scope not captured" : insideScope ? "inside allowed scope" : "outside allowed scope"}
                    </span>
                    {sensitive && (
                      <span className="rounded border border-[#FF7B5C]/30 bg-[#FF7B5C]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#FFAC98]">
                        sensitive path
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Drift and risk">
          <div className="space-y-3">
            {/* Actual drift verdict */}
            <div className="flex flex-wrap items-center gap-2">
              {coloredBadge(scopeDriftLabel.toLowerCase(), DRIFT_COLORS)}
              {r.watch_status && r.watch_status.toLowerCase() !== "passed" && (
                <span className="font-mono text-[10px] text-[#6a707b] uppercase tracking-[0.08em]">
                  Watch: {r.watch_status}
                </span>
              )}
            </div>

            {/* Risk delta */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Risk before", value: r.risk_before, map: RISK_COLORS },
                { label: "Risk after",  value: r.risk_after,  map: RISK_COLORS },
                { label: "Reduction",   value: r.risk_reduction_percent != null ? `${r.risk_reduction_percent}%` : null, map: {} },
                { label: "Score after", value: r.score_after != null ? String(r.score_after) : null, map: {} },
              ].map(({ label, value, map }) => (
                <div key={label} className="rounded border border-white/8 bg-[#10141a] px-2.5 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5a5f68]">{label}</p>
                  {value ? (
                    Object.keys(map).length > 0
                      ? <div className="mt-1">{coloredBadge(value.toLowerCase(), map as typeof RISK_COLORS)}</div>
                      : <p className="mt-1 text-[12px] font-semibold tabular-nums text-[#d5dae3]">{value}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#4a5060]">Not captured</p>
                  )}
                </div>
              ))}
            </div>

            {/* Detected risks */}
            {(r.detected_risks?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Detected risks</p>
                <ListOrFallback items={r.detected_risks} fallback="" />
              </div>
            )}

            {/* Watch warnings */}
            {(r.watch_warnings?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5f6672]">Watch warnings</p>
                <ListOrFallback items={r.watch_warnings} fallback="" />
              </div>
            )}

            {(r.detected_risks?.length ?? 0) === 0 && (r.watch_warnings?.length ?? 0) === 0 && (
              <p className="text-[12px] text-[#6a707b]">No risks or warnings recorded.</p>
            )}
          </div>
        </Section>

        <Section title="Proof gaps">
          {proofGaps.length === 0 ? (
            <p className="text-[12px] text-[#6a707b]">No proof gaps recorded.</p>
          ) : (
            <div className="space-y-2">
              {proofGaps.map((item, idx) => (
                <div key={`${item}-${idx}`} className="flex items-start gap-2 rounded-lg border border-[#F0BF72]/20 bg-[#F0BF72]/8 px-3 py-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#F0BF72]" />
                  <p className="text-[12px] text-[#d4c39d]">{item}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Next run context">
        <p className="text-[12px] text-[#c5cad3]"><span className="text-[#7d8491]">Next safest step:</span> {nextSafestStep}</p>
        {continuationPack || r.next_safe_prompt ? (
          <>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-[#0b0e13] p-3 font-mono text-[11px] leading-[1.7] text-[#c8ced9]">
              {continuationPack ?? r.next_safe_prompt}
            </pre>
            <div className="mt-3">
              <CopyContextButton value={continuationPack ?? r.next_safe_prompt ?? ""} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-[#6a707b]">No next-run context captured yet.</p>
        )}
      </Section>

      <Section title="Savings">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Estimated tokens saved</p>
            <p className="mt-1 text-[12px] text-[#d5dae3]">{formatNumber(tokenSaved)}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Estimated cost saved</p>
            <p className="mt-1 text-[12px] text-[#d5dae3]">{formatMoney(costSaved)}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Standard model estimate</p>
            <p className="mt-1 text-[12px] text-[#d5dae3]">{formatMoney(r.estimated_dollars_standard)}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-[#10141a] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#626873]">Expensive model estimate</p>
            <p className="mt-1 text-[12px] text-[#d5dae3]">{formatMoney(r.estimated_dollars_expensive)}</p>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#7d8491]">
          Estimated savings based on reduced repeated context and scoped runs.
        </p>
      </Section>

      <Section title="Prompt evidence">
        {latestPrompt ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-[#0b0e13] p-3 font-mono text-[11px] leading-[1.7] text-[#c8ced9]">
            {latestPrompt}
          </pre>
        ) : (
          <p className="text-[12px] text-[#6a707b]">Not captured</p>
        )}
      </Section>

      <section className="rounded-xl border border-white/8 bg-[#0c0f13] p-4 sm:p-5">
        {isPro ? (
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-[#4DE8B0]" />
            <div>
              <p className="text-[13px] font-semibold text-[#e3e8f2]">Pro report active</p>
              <p className="mt-1 text-[12px] text-[#8f96a3]">
                Your run history, memory, savings, and next-run context are being synced.
                {isTrialing ? " Trial status is active." : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 size-4 shrink-0 text-[#F0BF72]" />
              <p className="text-[12px] text-[#8f96a3] max-w-[52ch]">
                Pro keeps synced run history, cloud memory, savings reports, and next-run context across projects.
              </p>
            </div>
            <Link
              href="/app/trial"
              className="shrink-0 rounded-md border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-3 py-1.5 text-[12px] text-[#c7b9ff] transition-colors hover:border-[#7C6DFA]/50 hover:text-[#e2daff]"
            >
              Start 3-day Pro trial
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
