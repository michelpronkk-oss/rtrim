import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
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

function projectInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.replace(/[-_]/g, " ").split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function verdictInfo(status: string | null): { label: string; color: string; bg: string; border: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "passed" || s === "completed" || s === "guarded")
    return { label: "passed", color: "#6ee7b7", bg: "rgba(110,231,183,0.06)", border: "rgba(110,231,183,0.25)" };
  if (s === "warned" || s === "partial")
    return { label: "review", color: "#f5a524", bg: "rgba(245,165,36,0.06)", border: "rgba(245,165,36,0.25)" };
  if (s === "blocked" || s === "failed")
    return { label: "blocked", color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.28)" };
  return { label: status ?? "—", color: "#8a8f98", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" };
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const liveCount = projects.filter((p) => {
    const s = (p.last_status ?? "").toLowerCase();
    return s === "passed" || s === "completed" || s === "guarded";
  }).length;

  return (
    <div className="w-full min-w-0 overflow-x-hidden" style={{ maxWidth: 1320, margin: "0 auto" }}>

      {/* ── Page head ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
            <span style={{ color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)", padding: "1px 7px", borderRadius: 4, letterSpacing: "0.04em" }}>projects</span>
            <span>{projects.length} tracked{liveCount > 0 ? ` · ${liveCount} active` : ""}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: "#f4f5f7", lineHeight: 1.1 }}>Projects</h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "#8a8f98", maxWidth: 560 }}>
            A project is any repo initialized with <code style={{ ...MONO, color: "#a78bfa" }}>runtrim start</code>. Each one gets its own memory, scope rules, and run history.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, width: "100%" }} className="sm:w-auto">
          <Link
            href="/app/runs"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 44, padding: "0 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid rgba(255,255,255,0.16)", color: "#c9ccd2", textDecoration: "none", width: "100%" }}
            className="sm:w-auto"
            
          >
            View all runs
          </Link>
        </div>
      </div>

      {/* ── Filter row ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em" }}>All projects</h2>
        <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.06em" }}>workspace</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", width: "100%" }} className="sm:w-auto">
          {[`All ${projects.length}`, "Active", "Idle"].map((chip, i) => (
            <span
              key={chip}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 9px",
                border: `1px solid ${i === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)"}`,
                borderRadius: 5, fontSize: 12,
                color: i === 0 ? "#f4f5f7" : "#8a8f98",
                background: i === 0 ? "#16191e" : "#0c0e11",
              }}
            >
              {i === 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7" }} />}
              {chip}
            </span>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
          {/* Add project dashed card */}
          <div style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 12, background: "transparent", padding: 18, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", minHeight: 240, textAlign: "center", alignItems: "center" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.30)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>Add a project</span>
            <span style={{ fontSize: 12.5, color: "#8a8f98", maxWidth: 280 }}>
              Run <code style={{ ...MONO, color: "#a78bfa" }}>runtrim start</code> in any repo to initialize memory, scope, and finish-check rules.
            </span>
            <div style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", padding: "7px 11px", borderRadius: 6, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
              <span style={{ color: "#a78bfa" }}>$</span>
              <span style={{ overflowX: "auto", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%" }}>cd ~/your-repo &amp;&amp; runtrim start</span>
            </div>
          </div>

          {/* Info card */}
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", margin: 0 }}>Quick start</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["runtrim start", "runtrim doctor", 'runtrim agent "your first task" --copy', "runtrim finish"].map((cmd) => (
                <div key={cmd} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, background: "#16191e", border: "1px solid rgba(255,255,255,0.07)", ...MONO, fontSize: 11.5, color: "#c9ccd2", overflow: "hidden" }}>
                  <span style={{ color: "#a78bfa", flexShrink: 0 }}>$</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{cmd}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
              <Link href="/app/connect" style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.14)", color: "#c9ccd2", textDecoration: "none" }}
                className="hover:border-white/28 hover:text-white transition-colors">
                Connect CLI
              </Link>
              <Link href="/app/install" style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 6, fontSize: 12, color: "#5a5f68", textDecoration: "none" }}
                className="hover:text-[#8a8f98] transition-colors">
                View install guide
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ── Project grid ─────────────────────────────────────── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] mb-6">
            {projects.map((project) => {
              const runs = runCounts[project.id] ?? 0;
              const verdict = verdictInfo(project.last_status);
              const initials = projectInitials(project.name);
              const stack = project.stack ?? [];

              return (
                <Link
                  key={project.id}
                  href={`/app/runs?project=${project.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 14, transition: "border-color 0.15s, background 0.15s", cursor: "pointer" }}
                    className="hover:border-white/20 hover:bg-[#0e1116] transition-all"
                  >
                    {/* Project head */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #1a1f2a, #11141a)", border: "1px solid rgba(255,255,255,0.10)", display: "grid", placeItems: "center", flexShrink: 0, color: "#a78bfa", ...MONO, fontSize: 14, fontWeight: 600 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em", margin: 0 }}>
                          {project.name ?? "Unnamed project"}
                        </h3>
                        {stack.length > 0 && (
                          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {stack.slice(0, 3).map((s) => (
                              <span key={s} style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", padding: "1px 6px", borderRadius: 4, background: "#16191e", border: "1px solid rgba(255,255,255,0.07)" }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...MONO, fontSize: 10, color: verdict.color, border: `1px solid ${verdict.border}`, background: verdict.bg, padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 5px currentColor" }} />
                        {verdict.label}
                      </span>
                    </div>

                    {/* Task preview */}
                    {project.last_task && (
                      <p style={{ fontSize: 12.5, color: "#8a8f98", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.last_task}
                      </p>
                    )}

                    {/* Meta strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3" style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ ...MONO, fontSize: 9.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Runs</span>
                        <span style={{ fontSize: 14, color: "#f4f5f7", fontWeight: 500, letterSpacing: "-0.01em" }}>{runs}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ ...MONO, fontSize: 9.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Last run</span>
                        <span style={{ fontSize: 13, color: verdict.color, fontWeight: 500 }}>{verdict.label}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ ...MONO, fontSize: 9.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>Active</span>
                        <span style={{ fontSize: 13, color: "#8a8f98" }}>{relativeDate(project.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add project card */}
            <div
              style={{ border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 12, background: "transparent", padding: 18, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", minHeight: 220, textAlign: "center", alignItems: "center", transition: "background 0.15s, border-color 0.15s", cursor: "default" }}
              className="hover:bg-[#0c0e11] hover:border-[#a78bfa]/40 transition-all"
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.30)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7" }}>Add a project</span>
              <span style={{ fontSize: 12.5, color: "#8a8f98", maxWidth: 260 }}>
                Run <code style={{ ...MONO, color: "#a78bfa" }}>runtrim start</code> in any repo to initialize scope, memory and finish-check rules.
              </span>
              <div style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", padding: "7px 11px", borderRadius: 6, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
                <span style={{ color: "#a78bfa" }}>$</span>
                <span style={{ overflowX: "auto", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%" }}>cd ~/your-repo &amp;&amp; runtrim start</span>
              </div>
            </div>
          </div>

          {/* Archive section */}
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>archive</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>Archived projects</span>
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.06em" }}>soft-deleted · 30 day retention</span>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ ...MONO, fontSize: 10, color: "#5a5f68", border: "1px solid rgba(255,255,255,0.10)", padding: "2px 8px", borderRadius: 4 }}>0</span>
              </div>
            </div>
            <div style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: "#16191e", border: "1px solid rgba(255,255,255,0.07)", display: "grid", placeItems: "center", color: "#3a3e46" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10h18M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em", margin: 0 }}>Nothing archived</p>
              <p style={{ fontSize: 13.5, color: "#8a8f98", maxWidth: 420, lineHeight: 1.5, margin: 0 }}>Archived projects keep their run history and restore points for 30 days, then move to cold storage.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
