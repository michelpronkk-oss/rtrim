"use client";

import { useEffect, useState } from "react";

type MetricsResponse = {
  ok: boolean;
  summary?: Record<string, number>;
  daily?: Array<Record<string, string | number>>;
  funnel?: Array<{ step: string; count: number }>;
  topPages?: Array<{ pagePath: string; views: number; uniqueUsers: number }>;
  cliEvents?: Array<{ eventName: string; count: number; lastSeen: string }>;
  earlyAccess?: Array<{
    email: string | null;
    role: string | null;
    agent: string | null;
    use_case: string | null;
    status: string | null;
    created_at: string;
  }>;
  earlyAccessTableFound?: boolean;
  recentEvents?: Array<{ eventName: string; source: string; pagePath: string; createdAt: string }>;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US");
}

export function AdminDashboard() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/metrics", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as MetricsResponse & { error?: string };
    if (!res.ok || !body.ok) {
      setError(body.error || "Could not load metrics.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  useEffect(() => {
    load();
  }, []);

  const summary = data?.summary ?? {};
  const daily = data?.daily ?? [];
  const funnel = data?.funnel ?? [];
  const topPages = data?.topPages ?? [];
  const cliEvents = data?.cliEvents ?? [];
  const earlyAccess = data?.earlyAccess ?? [];
  const recent = data?.recentEvents ?? [];

  return (
    <div className="min-h-screen bg-[#07071A] px-6 py-8 text-[#EDEEFF]">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em]">RunTrim Admin</h1>
            <p className="mt-1 text-[13px] text-[#9AA7B6]">
              Launch performance, installs, CLI activity and early access signal.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-lg border border-white/12 px-3 py-2 text-[12px] hover:border-white/20">
              Refresh
            </button>
            <button onClick={logout} className="rounded-lg border border-white/12 px-3 py-2 text-[12px] hover:border-white/20">
              Log out
            </button>
          </div>
        </div>

        {loading ? <p className="text-[13px] text-[#9AA7B6]">Loading metrics...</p> : null}
        {error ? <p className="text-[13px] text-[#F0BF72]">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            ["Unique visitors 24h", summary.uniqueVisitors24h ?? 0],
            ["Unique visitors 7d", summary.uniqueVisitors7d ?? 0],
            ["Page views 7d", summary.pageViews7d ?? 0],
            ["Install copies 7d", summary.installCopies7d ?? 0],
            ["Early access requests 7d", summary.earlyAccessRequests7d ?? 0],
            ["CLI starts 7d", summary.cliStarts7d ?? 0],
            ["CLI prepares 7d", summary.cliPrepares7d ?? 0],
            ["CLI checks 7d", summary.cliChecks7d ?? 0],
            ["Synced projects 30d", summary.syncedProjects30d ?? 0],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#7380A3]">{label as string}</p>
              <p className="mt-2 text-[24px] font-semibold">{value as number}</p>
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-white/10 bg-[#0C0D22] p-4">
          <h2 className="text-[15px] font-semibold">Daily activity last 30 days</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="text-[#8E95C3]">
                <tr>
                  <th>Date</th><th>Visitors</th><th>Page views</th><th>Install copies</th><th>Early access</th><th>CLI starts</th><th>CLI prepares</th><th>CLI checks</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, idx) => (
                  <tr key={`${d.date}-${idx}`} className="border-t border-white/8">
                    <td className="py-1.5">{String(d.date)}</td>
                    <td>{Number(d.visitors ?? 0)}</td>
                    <td>{Number(d.pageViews ?? 0)}</td>
                    <td>{Number(d.installCopies ?? 0)}</td>
                    <td>{Number(d.earlyAccess ?? 0)}</td>
                    <td>{Number(d.cliStarts ?? 0)}</td>
                    <td>{Number(d.cliPrepares ?? 0)}</td>
                    <td>{Number(d.cliChecks ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
            <h2 className="text-[15px] font-semibold">Funnel</h2>
            <div className="mt-3 space-y-1.5 text-[12px]">
              {funnel.map((f) => (
                <div key={f.step} className="flex items-center justify-between border-b border-white/8 pb-1">
                  <span>{f.step}</span>
                  <span>{f.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
            <h2 className="text-[15px] font-semibold">Top pages</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[12px]">
                <thead className="text-[#8E95C3]">
                  <tr><th>page_path</th><th>views</th><th>unique users</th></tr>
                </thead>
                <tbody>
                  {topPages.map((p) => (
                    <tr key={p.pagePath} className="border-t border-white/8">
                      <td className="py-1.5">{p.pagePath}</td>
                      <td>{p.views}</td>
                      <td>{p.uniqueUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
            <h2 className="text-[15px] font-semibold">CLI events</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[12px]">
                <thead className="text-[#8E95C3]">
                  <tr><th>event_name</th><th>count</th><th>last seen</th></tr>
                </thead>
                <tbody>
                  {cliEvents.map((e) => (
                    <tr key={e.eventName} className="border-t border-white/8">
                      <td className="py-1.5">{e.eventName}</td>
                      <td>{e.count}</td>
                      <td>{fmtDate(e.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0C0D22] p-4">
            <h2 className="text-[15px] font-semibold">Recent events</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead className="text-[#8E95C3]">
                  <tr><th>event_name</th><th>source</th><th>page_path</th><th>created_at</th></tr>
                </thead>
                <tbody>
                  {recent.map((e, idx) => (
                    <tr key={`${e.eventName}-${idx}`} className="border-t border-white/8">
                      <td className="py-1.5">{e.eventName}</td>
                      <td>{e.source}</td>
                      <td>{e.pagePath || "-"}</td>
                      <td>{fmtDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-xl border border-white/10 bg-[#0C0D22] p-4">
          <h2 className="text-[15px] font-semibold">Early access requests</h2>
          {data?.earlyAccessTableFound === false ? (
            <p className="mt-2 text-[12px] text-[#9AA7B6]">Early access table not found.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <thead className="text-[#8E95C3]">
                  <tr><th>email</th><th>role</th><th>agent</th><th>use_case</th><th>status</th><th>created_at</th></tr>
                </thead>
                <tbody>
                  {earlyAccess.map((e, idx) => (
                    <tr key={`${e.email}-${idx}`} className="border-t border-white/8">
                      <td className="py-1.5">{e.email || "-"}</td>
                      <td>{e.role || "-"}</td>
                      <td>{e.agent || "-"}</td>
                      <td>{e.use_case || "-"}</td>
                      <td>{e.status || "-"}</td>
                      <td>{fmtDate(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

