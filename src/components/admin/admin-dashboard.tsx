"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, LogOut, Terminal, Globe, Check, X,
  AlertCircle, ArrowRight, Users, Activity, BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EarlyAccessEntry = {
  id: string;
  email: string | null;
  role: string | null;
  agent: string | null;
  use_case: string | null;
  plan_interest: string | null;
  workflow: string | null;
  biggest_pain: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  reviewed_by: string | null;
  decision_note: string | null;
  approval_email_sent_at: string | null;
  rejection_email_sent_at: string | null;
};

type MetricsResponse = {
  ok: boolean;
  summary?: Record<string, number>;
  daily?: Array<Record<string, string | number>>;
  funnel?: Array<{ step: string; count: number }>;
  topPages?: Array<{ pagePath: string; views: number; uniqueUsers: number }>;
  cliEvents?: Array<{ eventName: string; count: number; lastSeen: string }>;
  earlyAccess?: EarlyAccessEntry[];
  earlyAccessTableFound?: boolean;
  recentEvents?: Array<{ eventName: string; source: string; pagePath: string; createdAt: string }>;
};

type Tab = "overview" | "early-access" | "activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    approved:  "border-[#4DE8B0]/25 bg-[#4DE8B0]/10 text-[#4DE8B0]",
    rejected:  "border-[#FF6B6B]/25 bg-[#FF6B6B]/10 text-[#FF6B6B]",
    pending:   "border-[#8E95C3]/25 bg-[#1A1A30] text-[#8E95C3]",
    waitlisted:"border-[#F0BF72]/25 bg-[#2A2010] text-[#F0BF72]",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] ${map[s] ?? map.pending}`}>
      {s}
    </span>
  );
}

function SourcePill({ source }: { source: string }) {
  const isCli = source === "cli";
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] ${isCli ? "border-[#7C6DFA]/25 bg-[#7C6DFA]/10 text-[#9E91FF]" : "border-white/10 text-[#4D5070]"}`}>
      {isCli ? "cli" : "web"}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-white/8 pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[#3A4060] first:pl-0">
      {children}
    </th>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function Stat({
  label, value, accent = "#7C6DFA", note,
}: {
  label: string; value: string | number; accent?: string; note?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/7 bg-[#0C0D22] px-4 py-3.5">
      <div className="absolute inset-y-0 left-0 w-0.5 rounded-l-lg" style={{ background: accent }} />
      <p className="text-[11px] text-[#4D5070]">{label}</p>
      <p className="mt-1 text-[24px] font-bold tabular-nums tracking-tight text-[#EDEEFF]">{value}</p>
      {note && <p className="mt-0.5 font-mono text-[10px] text-[#2E3554]">{note}</p>}
    </div>
  );
}

// ─── Approve / Reject row ─────────────────────────────────────────────────────

type ActionState = {
  open: "approve" | "reject" | null;
  note: string;
  loading: boolean;
  done: boolean;
  emailSent?: boolean;
  error: string;
};

function EARow({
  entry,
  onDone,
}: {
  entry: EarlyAccessEntry;
  onDone: (id: string, status: string) => void;
}) {
  const [a, setA] = useState<ActionState>({
    open: null, note: "", loading: false, done: false, emailSent: undefined, error: "",
  });

  const pending = (entry.status ?? "pending") === "pending";

  async function submit(type: "approve" | "reject") {
    setA((s) => ({ ...s, loading: true, error: "" }));
    const res = await fetch(`/api/admin/early-access/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, decision_note: a.note }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setA((s) => ({ ...s, loading: false, error: json.error ?? "Failed" }));
    } else {
      setA((s) => ({ ...s, loading: false, done: true, emailSent: json.emailSent }));
      onDone(entry.id, type === "approve" ? "approved" : "rejected");
    }
  }

  const showStatus = a.done
    ? (a.open === "approve" ? "approved" : "rejected")
    : entry.status;

  return (
    <>
      <tr className="group border-t border-white/6 transition-colors hover:bg-white/[0.018]">
        {/* Email */}
        <td className="py-2.5 pr-4 font-mono text-[12px] text-[#C8D4E0]">
          {entry.email ?? "—"}
        </td>
        {/* Plan */}
        <td className="pr-4 text-[12px] text-[#8E95C3]">
          {entry.plan_interest || entry.role || "—"}
        </td>
        {/* Workflow */}
        <td className="pr-4 text-[12px] text-[#8E95C3]">
          {entry.workflow || entry.agent || "—"}
        </td>
        {/* Pain */}
        <td className="max-w-[180px] pr-4 text-[12px] text-[#5E6A88]">
          <span className="truncate block" title={entry.biggest_pain ?? entry.use_case ?? ""}>
            {entry.biggest_pain || entry.use_case || "—"}
          </span>
          {entry.notes && (
            <span className="block truncate font-mono text-[10px] text-[#3A4060]" title={entry.notes}>
              {entry.notes}
            </span>
          )}
        </td>
        {/* Status */}
        <td className="pr-4"><StatusPill status={showStatus} /></td>
        {/* Date */}
        <td className="pr-4 font-mono text-[11px] text-[#3A4060]">{fmt(entry.created_at)}</td>
        {/* Reviewed */}
        <td className="pr-4 font-mono text-[11px] text-[#3A4060]">
          {entry.approved_at ? fmt(entry.approved_at)
            : entry.rejected_at ? fmt(entry.rejected_at)
            : "—"}
        </td>
        {/* Actions */}
        <td className="py-2.5">
          {a.done ? (
            <span className={`font-mono text-[10px] ${a.emailSent === false ? "text-[#F0BF72]" : "text-[#4DE8B0]"}`}>
              {a.open === "approve" ? "Approved" : "Rejected"}
              {a.emailSent === false && " · email failed"}
            </span>
          ) : pending ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setA((s) => ({ ...s, open: s.open === "approve" ? null : "approve" }))}
                disabled={a.loading}
                className={`flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] transition-colors disabled:opacity-40 ${
                  a.open === "approve"
                    ? "border-[#4DE8B0]/40 bg-[#4DE8B0]/15 text-[#4DE8B0]"
                    : "border-[#4DE8B0]/20 bg-[#4DE8B0]/6 text-[#4DE8B0]/70 hover:border-[#4DE8B0]/35 hover:text-[#4DE8B0]"
                }`}
              >
                <Check className="size-2.5" /> Approve
              </button>
              <button
                onClick={() => setA((s) => ({ ...s, open: s.open === "reject" ? null : "reject" }))}
                disabled={a.loading}
                className={`flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] transition-colors disabled:opacity-40 ${
                  a.open === "reject"
                    ? "border-[#FF6B6B]/40 bg-[#FF6B6B]/15 text-[#FF6B6B]"
                    : "border-[#FF6B6B]/20 bg-[#FF6B6B]/6 text-[#FF6B6B]/70 hover:border-[#FF6B6B]/35 hover:text-[#FF6B6B]"
                }`}
              >
                <X className="size-2.5" /> Reject
              </button>
            </div>
          ) : (
            <span className="font-mono text-[10px] text-[#2E3554]">reviewed</span>
          )}
        </td>
      </tr>

      {/* Inline confirm panel */}
      {a.open && !a.done && (
        <tr className="border-t-0">
          <td colSpan={8} className="pb-2 pl-0 pr-0">
            <div className="mx-0 flex items-start gap-3 rounded-lg border border-white/8 bg-[#09091C] px-4 py-3">
              <div className="flex-1 space-y-2">
                <p className="font-mono text-[10px] text-[#4D5070]">
                  {a.open === "approve" ? "Approving" : "Rejecting"}{" "}
                  <span className="text-[#C8D4E0]">{entry.email}</span>
                  {a.open === "approve" && (
                    <span className="ml-2 text-[#4DE8B0]/60">— approval email will be sent</span>
                  )}
                  {a.open === "reject" && (
                    <span className="ml-2 text-[#FF6B6B]/60">— rejection email will be sent</span>
                  )}
                </p>
                <input
                  type="text"
                  value={a.note}
                  onChange={(e) => setA((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Decision note (optional)"
                  className="w-full rounded border border-white/10 bg-[#07071A] px-3 py-1.5 font-mono text-[12px] text-[#EDEEFF] placeholder-[#2E3554] outline-none focus:border-[#7C6DFA]/40"
                />
                {a.error && (
                  <p className="font-mono text-[11px] text-[#FF8F8F]">{a.error}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => submit(a.open!)}
                  disabled={a.loading}
                  className={`rounded px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    a.open === "approve"
                      ? "bg-[#4DE8B0]/15 text-[#4DE8B0] hover:bg-[#4DE8B0]/25"
                      : "bg-[#FF6B6B]/15 text-[#FF6B6B] hover:bg-[#FF6B6B]/25"
                  }`}
                >
                  {a.loading ? "Saving..." : "Confirm"}
                </button>
                <button
                  onClick={() => setA((s) => ({ ...s, open: null, note: "", error: "" }))}
                  disabled={a.loading}
                  className="rounded px-3 py-1.5 text-[11px] text-[#4D5070] transition-colors hover:text-[#9699BE] disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [eaOverrides, setEaOverrides] = useState<Record<string, string>>({});

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setFetchError("");
    const res = await fetch("/api/admin/metrics", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as MetricsResponse & { error?: string };
    if (!res.ok || !body.ok) {
      setFetchError(body.error ?? "Could not load metrics.");
    } else {
      setData(body);
      setLastFetched(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  function handleEaDone(id: string, newStatus: string) {
    setEaOverrides((prev) => ({ ...prev, [id]: newStatus }));
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const summary = data?.summary ?? {};
  const earlyAccess = (data?.earlyAccess ?? []).map((e) => ({
    ...e,
    status: eaOverrides[e.id] ?? e.status,
  }));
  const funnel     = data?.funnel ?? [];
  const topPages   = data?.topPages ?? [];
  const cliEvents  = data?.cliEvents ?? [];
  const recent     = data?.recentEvents ?? [];
  const daily      = data?.daily ?? [];
  const funnelMax  = Math.max(...funnel.map((f) => f.count), 1);

  const pending    = earlyAccess.filter((e) => e.status === "pending").length;
  const approved   = earlyAccess.filter((e) => e.status === "approved").length;
  const rejected   = earlyAccess.filter((e) => e.status === "rejected").length;
  const total      = earlyAccess.length;

  // Pending first, then newest
  const eaSorted = [...earlyAccess].sort((a, b) => {
    const ap = a.status === "pending" ? 0 : 1;
    const bp = b.status === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview",      label: "Overview" },
    { id: "early-access",  label: "Early Access", badge: pending || undefined },
    { id: "activity",      label: "Activity" },
  ];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07071A]">
        <header className="border-b border-white/8 bg-[#07071A]/95 px-6 py-3.5">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between">
            <span className="text-[15px] font-bold text-[#EDEEFF]">RunTrim Admin</span>
          </div>
        </header>
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-white/6 bg-[#0C0D22]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07071A]/96 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-5 rounded" />
            <span className="text-[14px] font-bold tracking-tight">RunTrim</span>
            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#4D5070]">
              admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="hidden font-mono text-[10px] text-[#2E3554] sm:block">
                {rel(lastFetched.toISOString())} ago
              </span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[12px] text-[#5A6480] transition-colors hover:border-white/20 hover:text-[#EDEEFF] disabled:opacity-40"
            >
              <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[12px] text-[#5A6480] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              <LogOut className="size-3" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto flex max-w-[1200px] items-end gap-0 overflow-x-auto px-5 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 pb-2.5 pt-1.5 text-[13px] font-medium transition-colors ${
                tab === t.id
                  ? "border-[#7C6DFA] text-[#EDEEFF]"
                  : "border-transparent text-[#4D5070] hover:text-[#9699BE]"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F0BF72] px-1 font-mono text-[10px] font-bold text-[#07071A]">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-6">

        {fetchError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#FF6B6B]/20 bg-[#FF6B6B]/6 px-4 py-3 text-[13px] text-[#FF8F8F]">
            <AlertCircle className="size-4 shrink-0" />
            {fetchError}
          </div>
        )}

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-5">

            {/* Pending banner */}
            {pending > 0 && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-[#F0BF72]/20 bg-[#F0BF72]/6 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="size-4 shrink-0 text-[#F0BF72]" />
                  <p className="text-[13px] font-medium text-[#F0BF72]">
                    {pending} request{pending !== 1 ? "s" : ""} pending review
                  </p>
                </div>
                <button
                  onClick={() => setTab("early-access")}
                  className="flex items-center gap-1 text-[12px] font-medium text-[#F0BF72]/80 transition-colors hover:text-[#F0BF72]"
                >
                  Review <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}

            {/* Stats — EA counts */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                <Users className="size-3" /> Early access
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat label="Pending review"  value={pending}  accent="#F0BF72" />
                <Stat label="Approved"        value={approved} accent="#4DE8B0" />
                <Stat label="Rejected"        value={rejected} accent="#FF6B6B" />
                <Stat label="Total requests"  value={total}    accent="#7C6DFA" />
              </div>
            </div>

            {/* Stats — traffic + CLI */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                <Activity className="size-3" /> Traction (7d)
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat label="Unique visitors"   value={summary.uniqueVisitors7d ?? 0} accent="#5B8BFF" note="7d" />
                <Stat label="Install copies"    value={summary.installCopies7d ?? 0}  accent="#4DE8B0" note="7d" />
                <Stat label="CLI starts"        value={summary.cliStarts7d ?? 0}       accent="#7C6DFA" note="7d" />
                <Stat label="Synced projects"   value={summary.syncedProjects30d ?? 0} accent="#9966FF" note="30d" />
              </div>
            </div>

            {/* Recent EA requests */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                  <Users className="size-3" /> Recent requests
                </p>
                {earlyAccess.length > 5 && (
                  <button
                    onClick={() => setTab("early-access")}
                    className="flex items-center gap-1 font-mono text-[10px] text-[#4D5070] transition-colors hover:text-[#9E91FF]"
                  >
                    All {earlyAccess.length} <ArrowRight className="size-3" />
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] overflow-hidden">
                {eaSorted.slice(0, 6).length === 0 ? (
                  <p className="px-4 py-5 text-[12px] text-[#3A4060]">No requests yet.</p>
                ) : (
                  eaSorted.slice(0, 6).map((e, i) => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02] ${i > 0 ? "border-t border-white/6" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#C8D4E0]">{e.email}</span>
                      <span className="hidden shrink-0 text-[11px] text-[#4D5070] sm:block">
                        {e.plan_interest || e.role || "—"}
                      </span>
                      <StatusPill status={e.status} />
                      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[#2E3554]">{fmt(e.created_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent events */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                <Terminal className="size-3" /> Recent activity
              </p>
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] overflow-hidden">
                {recent.length === 0 ? (
                  <p className="px-4 py-5 text-[12px] text-[#3A4060]">No activity yet.</p>
                ) : (
                  recent.slice(0, 10).map((e, i) => (
                    <div
                      key={`${e.eventName}-${i}`}
                      className={`flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-white/[0.02] ${i > 0 ? "border-t border-white/6" : ""}`}
                    >
                      <SourcePill source={e.source} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{e.eventName}</span>
                      <span className="hidden shrink-0 max-w-[100px] truncate font-mono text-[10px] text-[#3A4060] sm:block">
                        {e.pagePath || "—"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#2E3554]">{rel(e.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ EARLY ACCESS ══════════════════════════════════════════════════ */}
        {tab === "early-access" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#EDEEFF]">
                  Early access requests
                </h2>
                <p className="mt-0.5 text-[12px] text-[#4D5070]">
                  {pending > 0
                    ? `${pending} pending review · ${approved} approved · ${rejected} rejected`
                    : `${total} total · ${approved} approved · ${rejected} rejected`}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="flex items-center gap-1 rounded border border-[#F0BF72]/20 bg-[#F0BF72]/8 px-2 py-1 text-[#F0BF72]">
                  {pending} pending
                </span>
                <span className="flex items-center gap-1 rounded border border-[#4DE8B0]/20 bg-[#4DE8B0]/8 px-2 py-1 text-[#4DE8B0]">
                  {approved} approved
                </span>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {eaSorted.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[#3A4060]">No requests yet.</p>
              ) : eaSorted.map((e, i) => (
                <div key={`${e.id}-${i}`} className="rounded-lg border border-white/7 bg-[#0C0D22] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[12px] text-[#C8D4E0]">{e.email}</span>
                    <StatusPill status={e.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#4D5070]">
                    {(e.plan_interest || e.role) && <span>{e.plan_interest || e.role}</span>}
                    {(e.workflow || e.agent) && <span>· {e.workflow || e.agent}</span>}
                    <span>· {fmt(e.created_at)}</span>
                  </div>
                  {(e.biggest_pain || e.notes) && (
                    <p className="mt-1 truncate text-[11px] text-[#4D5070]">
                      {e.biggest_pain || e.use_case}{e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  )}
                  {e.status === "pending" && (
                    <p className="mt-2 text-[11px] text-[#4D5070]">
                      Use desktop to approve / reject.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-white/7 bg-[#0C0D22] md:block">
              {eaSorted.length === 0 ? (
                <p className="px-6 py-10 text-center text-[12px] text-[#3A4060]">No requests yet.</p>
              ) : (
                <table className="w-full min-w-[900px] text-left text-[12px]">
                  <thead>
                    <tr>
                      <Th>Email</Th>
                      <Th>Plan</Th>
                      <Th>Workflow</Th>
                      <Th>Pain / notes</Th>
                      <Th>Status</Th>
                      <Th>Submitted</Th>
                      <Th>Reviewed</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {eaSorted.map((e, i) => (
                      <EARow key={`${e.id}-${i}`} entry={e} onDone={handleEaDone} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ ACTIVITY ══════════════════════════════════════════════════════ */}
        {tab === "activity" && (
          <div className="space-y-5">

            {/* Summary row */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                <BarChart2 className="size-3" /> Traffic (7d)
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Stat label="Unique visitors 24h" value={summary.uniqueVisitors24h ?? 0} accent="#5B8BFF" />
                <Stat label="Unique visitors 7d"  value={summary.uniqueVisitors7d ?? 0}  accent="#5B8BFF" />
                <Stat label="Page views 7d"        value={summary.pageViews7d ?? 0}        accent="#5B8BFF" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">

              {/* Funnel */}
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">
                  Conversion funnel (7d)
                </p>
                {funnel.length === 0 ? (
                  <p className="text-[12px] text-[#3A4060]">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {funnel.map((f, i) => (
                      <div key={f.step}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#8E95C3]">{f.step}</span>
                          <span className="font-mono text-[11px] font-semibold text-[#EDEEFF]">{f.count.toLocaleString()}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/6">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((f.count / funnelMax) * 100)}%`,
                              background: ["#5B8BFF", "#7C6DFA", "#9966FF", "#4DE8B0", "#F0BF72", "#FF7B5C"][i % 6],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top pages */}
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">Top pages (7d)</p>
                {topPages.length === 0 ? (
                  <p className="text-[12px] text-[#3A4060]">No data yet.</p>
                ) : (
                  <div className="space-y-1">
                    {topPages.map((p, i) => (
                      <div key={p.pagePath} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-white/[0.02]">
                        <span className="w-4 shrink-0 font-mono text-[10px] text-[#2E3554]">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{p.pagePath || "/"}</span>
                        <span className="shrink-0 font-mono text-[11px] text-[#EDEEFF]">{p.views}</span>
                        <span className="w-14 shrink-0 text-right font-mono text-[10px] text-[#3A4060]">{p.uniqueUsers} uniq</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* CLI events */}
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">CLI events (7d)</p>
                {cliEvents.length === 0 ? (
                  <p className="text-[12px] text-[#3A4060]">No CLI events yet.</p>
                ) : (
                  <div className="space-y-1">
                    {cliEvents.map((e) => (
                      <div key={e.eventName} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-white/[0.02]">
                        <Terminal className="size-3 shrink-0 text-[#7C6DFA]/40" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{e.eventName}</span>
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-[#EDEEFF]">{e.count}</span>
                        <span className="w-10 shrink-0 text-right font-mono text-[10px] text-[#2E3554]">{rel(e.lastSeen)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent events */}
              <div className="rounded-lg border border-white/7 bg-[#0C0D22] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">Recent events</p>
                {recent.length === 0 ? (
                  <p className="text-[12px] text-[#3A4060]">No recent events.</p>
                ) : (
                  <div className="space-y-0.5">
                    {recent.slice(0, 15).map((e, i) => (
                      <div key={`${e.eventName}-${i}`} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/[0.02]">
                        <SourcePill source={e.source} />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E95C3]">{e.eventName}</span>
                        <span className="hidden max-w-[80px] shrink-0 truncate font-mono text-[10px] text-[#3A4060] sm:block">{e.pagePath || "—"}</span>
                        <span className="shrink-0 font-mono text-[10px] text-[#2E3554]">{rel(e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily table — active days only, newest first */}
            {(() => {
              const activeDays = [...daily]
                .reverse()
                .filter((d) =>
                  [d.visitors, d.pageViews, d.installCopies, d.earlyAccess, d.cliStarts, d.cliPrepares, d.cliChecks]
                    .some((v) => Number(v ?? 0) > 0)
                );
              return (
                <div className="rounded-lg border border-white/7 bg-[#0C0D22] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3A4060]">Daily activity</p>
                    <span className="font-mono text-[10px] text-[#2E3554]">
                      {activeDays.length > 0 ? `${activeDays.length} day${activeDays.length !== 1 ? "s" : ""} with data` : "no data yet"}
                    </span>
                  </div>
                  {activeDays.length === 0 ? (
                    <p className="py-2 text-[12px] text-[#3A4060]">Activity will appear here once tracking events are connected.</p>
                  ) : (
                    <div className="-mx-5 overflow-x-auto px-5">
                      <table className="w-full min-w-[640px] text-left text-[12px]">
                        <thead>
                          <tr>
                            {["Date", "Visitors", "Views", "Installs", "EA", "CLI starts", "Prepares", "Checks"].map((h) => (
                              <Th key={h}>{h}</Th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeDays.map((d, i) => (
                            <tr key={`${d.date}-${i}`} className="border-t border-white/6 hover:bg-white/[0.015]">
                              <td className="py-2 pr-4 font-mono text-[11px] text-[#4D5070]">{String(d.date)}</td>
                              <td className="pr-4 tabular-nums text-[#8E95C3]">{Number(d.visitors ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="pr-4 tabular-nums text-[#8E95C3]">{Number(d.pageViews ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="pr-4 tabular-nums text-[#4DE8B0]">{Number(d.installCopies ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="pr-4 tabular-nums text-[#F0BF72]">{Number(d.earlyAccess ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="pr-4 tabular-nums text-[#9E91FF]">{Number(d.cliStarts ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="pr-4 tabular-nums text-[#8E95C3]">{Number(d.cliPrepares ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                              <td className="tabular-nums text-[#8E95C3]">{Number(d.cliChecks ?? 0) || <span className="text-[#2E3554]">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
