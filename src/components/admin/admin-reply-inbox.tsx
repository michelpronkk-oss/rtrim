"use client";

import { useEffect, useState } from "react";
import { growthCreate, growthDelete, growthList, growthUpdate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

export const REPLY_STORAGE_KEY = "runtrim_admin_replies_v1";

export type Reply = {
  id: string;
  platform: string;
  postUrl: string;
  commentText: string;
  suggestedReply: string;
  priority: "high" | "medium" | "low";
  status: "needs reply" | "drafted" | "approved" | "replied" | "ignored";
  owner: string;
  createdAt: string;
};

const PLATFORMS = ["X", "LinkedIn", "Reddit", "Instagram", "Hacker News", "Indie Hackers", "Product Hunt", "Other"];
const PRIORITIES: Reply["priority"][] = ["high", "medium", "low"];
const STATUSES: Reply["status"][] = ["needs reply", "drafted", "approved", "replied", "ignored"];
const STATUS_FILTERS = ["all", ...STATUSES] as const;

const PRIORITY_COLOR: Record<string, string> = {
  high: "#f87171",
  medium: "#f5a524",
  low: "#8a8f98",
};

const STATUS_COLOR: Record<string, string> = {
  "needs reply": "#f5a524",
  drafted:       "#a78bfa",
  approved:      "#6ee7b7",
  replied:       "#6ee7b7",
  ignored:       "#3a3e46",
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fromDb(row: Record<string, unknown>): Reply {
  return {
    id: String(row.id ?? ""),
    platform: String(row.platform ?? "X"),
    postUrl: String(row.post_url ?? ""),
    commentText: String(row.comment_text ?? ""),
    suggestedReply: String(row.suggested_reply ?? ""),
    priority: (row.priority as Reply["priority"]) ?? "medium",
    status: (row.status as Reply["status"]) ?? "needs reply",
    owner: String(row.owner ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toDb(item: Omit<Reply, "id" | "createdAt">) {
  return {
    platform: item.platform,
    post_url: item.postUrl || null,
    comment_text: item.commentText,
    suggested_reply: item.suggestedReply,
    priority: item.priority,
    status: item.status,
    owner: item.owner,
  };
}

const BLANK: Omit<Reply, "id" | "createdAt"> = {
  platform: "X", postUrl: "", commentText: "", suggestedReply: "",
  priority: "medium", status: "needs reply", owner: "",
};

export function AdminReplyInboxContent() {
  const [items,       setItems]      = useState<Reply[]>([]);
  const [filter,      setFilter]     = useState<typeof STATUS_FILTERS[number]>("all");
  const [showForm,    setShowForm]   = useState(false);
  const [editId,      setEditId]     = useState<string | null>(null);
  const [form,        setForm]       = useState({ ...BLANK });

  useEffect(() => {
    void (async () => {
      const rows = await growthList<Record<string, unknown>>("replies");
      setItems(rows.map(fromDb));
    })();
  }, []);

  function openAdd() { setForm({ ...BLANK }); setEditId(null); setShowForm(true); }
  function openEdit(r: Reply) {
    const { id, createdAt, ...rest } = r;
    void id; void createdAt;
    setForm(rest);
    setEditId(r.id);
    setShowForm(true);
  }

  async function submit() {
    if (!form.commentText.trim()) return;
    if (editId) {
      const row = await growthUpdate<Record<string, unknown>>("replies", editId, toDb(form));
      if (row) setItems((prev) => prev.map((i) => (i.id === editId ? fromDb(row) : i)));
    } else {
      const row = await growthCreate<Record<string, unknown>>("replies", toDb(form));
      if (row) setItems((prev) => [fromDb(row), ...prev]);
    }
    setShowForm(false);
  }

  async function updateStatus(id: string, status: Reply["status"]) {
    const row = await growthUpdate<Record<string, unknown>>("replies", id, { status });
    if (row) setItems((prev) => prev.map((i) => (i.id === id ? fromDb(row) : i)));
  }

  async function remove(id: string) {
    if (!confirm("Remove this reply?")) return;
    const ok = await growthDelete("replies", id);
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts: Record<string, number> = { all: items.length };
  for (const s of STATUSES) counts[s] = items.filter((i) => i.status === s).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>reply inbox</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Replies</h2>
        </div>
        <button
          onClick={openAdd}
          style={{ height: 32, padding: "0 14px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.40)", background: "rgba(167,139,250,0.10)", color: "#a78bfa", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          + Add reply
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                ...MONO, height: 28, padding: "0 10px", borderRadius: 6,
                border: `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
                background: active ? "#16191e" : "transparent",
                color: active ? "#f4f5f7" : "#5a5f68",
                fontSize: 11, cursor: "pointer",
              }}
            >
              {s}{counts[s] > 0 ? ` ${counts[s]}` : ""}
            </button>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, background: "#0c0e11", padding: 16 }}>
          <p style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            {editId ? "Edit reply" : "Add reply"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Reply["priority"] })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Post URL</label>
              <input value={form.postUrl} onChange={(e) => setForm({ ...form, postUrl: e.target.value })} placeholder="https://..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Comment / reply text</label>
              <textarea value={form.commentText} onChange={(e) => setForm({ ...form, commentText: e.target.value })} rows={3} placeholder="Paste the comment text here..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Suggested reply</label>
              <textarea value={form.suggestedReply} onChange={(e) => setForm({ ...form, suggestedReply: e.target.value })} rows={3} placeholder="Draft the reply here..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Reply["status"] })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Owner</label>
              <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="e.g. @handle"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={submit}
              style={{ height: 30, padding: "0 14px", borderRadius: 6, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {editId ? "Save" : "Add"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ height: 30, padding: "0 12px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#8a8f98", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "#0c0e11", padding: "32px 20px", textAlign: "center" }}>
          <p style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}>No replies in this view.</p>
          <p style={{ fontSize: 12, color: "#3a3e46", marginTop: 6 }}>Add replies as comments come in across platforms.</p>
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          {filtered.map((r, i) => (
            <div key={r.id} style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.10)", color: "#8a8f98" }}>{r.platform}</span>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${PRIORITY_COLOR[r.priority]}40`, background: `${PRIORITY_COLOR[r.priority]}0d`, color: PRIORITY_COLOR[r.priority] }}>{r.priority}</span>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${STATUS_COLOR[r.status]}40`, background: `${STATUS_COLOR[r.status]}0d`, color: STATUS_COLOR[r.status] }}>{r.status}</span>
                {r.owner && <span style={{ ...MONO, fontSize: 10, color: "#5a5f68" }}>{r.owner}</span>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(r)} style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f68", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(248,113,113,0.20)", background: "transparent", color: "#f87171", cursor: "pointer" }}>Remove</button>
                </div>
              </div>
              {/* Comment */}
              {r.commentText && (
                <div style={{ padding: "8px 10px", borderRadius: 6, background: "#111317", fontSize: 12.5, color: "#8a8f98", lineHeight: 1.5, marginBottom: 8 }}>
                  {r.commentText}
                </div>
              )}
              {/* Suggested reply */}
              {r.suggestedReply && (
                <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.12)", fontSize: 12.5, color: "#c4b5fd", lineHeight: 1.5, marginBottom: 8 }}>
                  {r.suggestedReply}
                </div>
              )}
              {/* Post URL */}
              {r.postUrl && (
                <a href={r.postUrl} target="_blank" rel="noopener noreferrer" style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", marginBottom: 8 }}>
                  {r.postUrl}
                </a>
              )}
              {/* Quick status actions */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.status === "needs reply" && (
                  <button onClick={() => updateStatus(r.id, "drafted")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", cursor: "pointer" }}>
                    Mark drafted
                  </button>
                )}
                {r.status === "drafted" && (
                  <button onClick={() => updateStatus(r.id, "approved")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.08)", color: "#6ee7b7", cursor: "pointer" }}>
                    Approve
                  </button>
                )}
                {(r.status === "approved" || r.status === "drafted") && (
                  <button onClick={() => updateStatus(r.id, "replied")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.08)", color: "#6ee7b7", cursor: "pointer" }}>
                    Mark replied
                  </button>
                )}
                {r.status !== "ignored" && r.status !== "replied" && (
                  <button onClick={() => updateStatus(r.id, "ignored")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#3a3e46", cursor: "pointer" }}>
                    Ignore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
