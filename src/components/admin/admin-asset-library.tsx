"use client";

import { useEffect, useState } from "react";
import { growthCreate, growthDelete, growthList, growthUpdate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

export const ASSET_STORAGE_KEY = "runtrim_admin_assets_v1";

export type Asset = {
  id: string;
  name: string;
  type: "visual" | "reel" | "screenshot" | "proof" | "caption" | "hook" | "design export";
  source: "Claude Design" | "screenshot" | "generated" | "manual";
  status: "raw" | "approved" | "used" | "archived";
  fileLink: string;
  notes: string;
  relatedPost: string;
  createdAt: string;
};

const ASSET_TYPES: Asset["type"][] = ["visual", "reel", "screenshot", "proof", "caption", "hook", "design export"];
const SOURCES: Asset["source"][]   = ["Claude Design", "screenshot", "generated", "manual"];
const STATUSES: Asset["status"][]  = ["raw", "approved", "used", "archived"];
const STATUS_FILTERS = ["all", ...STATUSES] as const;

const STATUS_COLOR: Record<string, string> = {
  raw:      "#f5a524",
  approved: "#6ee7b7",
  used:     "#a78bfa",
  archived: "#3a3e46",
};

const TYPE_COLOR: Record<string, string> = {
  visual:          "#a78bfa",
  reel:            "#f87171",
  screenshot:      "#8a8f98",
  proof:           "#6ee7b7",
  caption:         "#f5a524",
  hook:            "#a78bfa",
  "design export": "#5a5f68",
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fromDb(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    type: (row.type as Asset["type"]) ?? "visual",
    source: (row.source as Asset["source"]) ?? "manual",
    status: (row.status as Asset["status"]) ?? "raw",
    fileLink: String(row.file_link ?? ""),
    notes: String(row.notes ?? ""),
    relatedPost: String(row.related_post_id ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toDb(item: Omit<Asset, "id" | "createdAt">) {
  return {
    name: item.name,
    type: item.type,
    source: item.source,
    status: item.status,
    file_link: item.fileLink || null,
    notes: item.notes,
    related_post_id: item.relatedPost || null,
  };
}

const BLANK: Omit<Asset, "id" | "createdAt"> = {
  name: "", type: "visual", source: "manual", status: "raw", fileLink: "", notes: "", relatedPost: "",
};

export function AdminAssetLibraryContent() {
  const [items,     setItems]     = useState<Asset[]>([]);
  const [filter,    setFilter]    = useState<typeof STATUS_FILTERS[number]>("all");
  const [typeFilter,setTypeFilter]= useState<string>("all");
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...BLANK });

  useEffect(() => {
    void (async () => {
      const rows = await growthList<Record<string, unknown>>("assets");
      setItems(rows.map(fromDb));
    })();
  }, []);

  function openAdd() { setForm({ ...BLANK }); setEditId(null); setShowForm(true); }
  function openEdit(a: Asset) {
    const { id, createdAt, ...rest } = a;
    void id; void createdAt;
    setForm(rest);
    setEditId(a.id);
    setShowForm(true);
  }

  async function submit() {
    if (!form.name.trim()) return;
    if (editId) {
      const row = await growthUpdate<Record<string, unknown>>("assets", editId, toDb(form));
      if (row) setItems((prev) => prev.map((i) => (i.id === editId ? fromDb(row) : i)));
    } else {
      const row = await growthCreate<Record<string, unknown>>("assets", toDb(form));
      if (row) setItems((prev) => [fromDb(row), ...prev]);
    }
    setShowForm(false);
  }

  async function updateStatus(id: string, status: Asset["status"]) {
    const row = await growthUpdate<Record<string, unknown>>("assets", id, { status });
    if (row) setItems((prev) => prev.map((i) => (i.id === id ? fromDb(row) : i)));
  }

  async function remove(id: string) {
    if (!confirm("Remove this asset?")) return;
    const ok = await growthDelete("assets", id);
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  let filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  if (typeFilter !== "all") filtered = filtered.filter((i) => i.type === typeFilter);

  const statusCounts: Record<string, number> = { all: items.length };
  for (const s of STATUSES) statusCounts[s] = items.filter((i) => i.status === s).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>asset library</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Assets</h2>
        </div>
        <button
          onClick={openAdd}
          style={{ height: 32, padding: "0 14px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.40)", background: "rgba(167,139,250,0.10)", color: "#a78bfa", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          + Add asset
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => {
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ ...MONO, height: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`, background: active ? "#16191e" : "transparent", color: active ? "#f4f5f7" : "#5a5f68", fontSize: 11, cursor: "pointer" }}>
              {s}{statusCounts[s] > 0 ? ` ${statusCounts[s]}` : ""}
            </button>
          );
        })}
        <span style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", alignSelf: "center" }} />
        {["all", ...ASSET_TYPES].map((t) => {
          const active = typeFilter === t;
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ ...MONO, height: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"}`, background: active ? "#16191e" : "transparent", color: active ? "#c9ccd2" : "#3a3e46", fontSize: 11, cursor: "pointer" }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, background: "#0c0e11", padding: 16 }}>
          <p style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            {editId ? "Edit asset" : "Add asset"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Asset name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hero visual v2"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Asset["type"] })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Asset["source"] })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Asset["status"] })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>File / link</label>
              <input value={form.fileLink} onChange={(e) => setForm({ ...form, fileLink: e.target.value })} placeholder="https://..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Related post</label>
              <input value={form.relatedPost} onChange={(e) => setForm({ ...form, relatedPost: e.target.value })} placeholder="Post title or ID"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Context, usage notes..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "#0c0e11", padding: "32px 20px", textAlign: "center" }}>
          <p style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}>No assets in this view.</p>
          <p style={{ fontSize: 12, color: "#3a3e46", marginTop: 6 }}>Add visuals, screenshots, captions and hooks as you create them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Type + status */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${TYPE_COLOR[a.type]}15`, border: `1px solid ${TYPE_COLOR[a.type]}35`, color: TYPE_COLOR[a.type] }}>{a.type}</span>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${STATUS_COLOR[a.status]}0d`, border: `1px solid ${STATUS_COLOR[a.status]}35`, color: STATUS_COLOR[a.status] }}>{a.status}</span>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#5a5f68" }}>{a.source}</span>
              </div>
              {/* Name */}
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7", margin: 0 }}>{a.name}</p>
              {/* Notes */}
              {a.notes && <p style={{ fontSize: 12, color: "#8a8f98", margin: 0, lineHeight: 1.5 }}>{a.notes}</p>}
              {/* Related post */}
              {a.relatedPost && <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", margin: 0 }}>Post: {a.relatedPost}</p>}
              {/* Link */}
              {a.fileLink && (
                <a href={a.fileLink} target="_blank" rel="noopener noreferrer"
                  style={{ ...MONO, fontSize: 10.5, color: "#a78bfa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {a.fileLink}
                </a>
              )}
              {/* Actions */}
              <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                {a.status === "raw" && (
                  <button onClick={() => updateStatus(a.id, "approved")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(110,231,183,0.25)", background: "rgba(110,231,183,0.06)", color: "#6ee7b7", cursor: "pointer" }}>
                    Approve
                  </button>
                )}
                {a.status === "approved" && (
                  <button onClick={() => updateStatus(a.id, "used")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.06)", color: "#a78bfa", cursor: "pointer" }}>
                    Mark used
                  </button>
                )}
                {a.status !== "archived" && (
                  <button onClick={() => updateStatus(a.id, "archived")}
                    style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#3a3e46", cursor: "pointer" }}>
                    Archive
                  </button>
                )}
                <button onClick={() => openEdit(a)}
                  style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f68", cursor: "pointer" }}>
                  Edit
                </button>
                <button onClick={() => remove(a.id)}
                  style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(248,113,113,0.18)", background: "transparent", color: "#f87171", cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
