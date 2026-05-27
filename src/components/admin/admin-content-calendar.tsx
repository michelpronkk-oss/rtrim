"use client";

import { useEffect, useState } from "react";
import { growthCreate, growthDelete, growthList, growthUpdate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

export const CONTENT_STORAGE_KEY = "runtrim_admin_content_v1";

export type ContentItem = {
  id: string;
  title: string;
  hook: string;
  platform: string;
  postType: string;
  bucket: string;
  caption: string;
  visualLink: string;
  status: ContentStatus;
  owner: string;
  scheduledDate: string;
  postedUrl: string;
  performance: string;
  nextAction: string;
  createdAt: string;
};

export type ContentStatus =
  | "Idea"
  | "Draft"
  | "Needs visual"
  | "Visual ready"
  | "Needs review"
  | "Approved"
  | "Scheduled"
  | "Posted"
  | "Measured"
  | "Repurpose"
  | "Archived";

export type ContentBucket =
  | "Pain"
  | "Product"
  | "Trust"
  | "Proof"
  | "Education"
  | "Founder"
  | "Competitor"
  | "Launch";

const PLATFORMS  = ["X", "LinkedIn", "Reddit", "Instagram", "Hacker News", "Indie Hackers", "Product Hunt", "Other"] as const;
const POST_TYPES = ["text", "image", "reel", "thread", "carousel", "story", "video", "poll", "other"] as const;
const BUCKETS: ContentBucket[]       = ["Pain", "Product", "Trust", "Proof", "Education", "Founder", "Competitor", "Launch"];
const STATUSES: ContentStatus[]      = ["Idea", "Draft", "Needs visual", "Visual ready", "Needs review", "Approved", "Scheduled", "Posted", "Measured", "Repurpose", "Archived"];
const STATUS_FILTER_LIST             = ["all", ...STATUSES] as const;
const BUCKET_FILTER_LIST             = ["all", ...BUCKETS] as const;

const STATUS_COLOR: Partial<Record<ContentStatus, string>> = {
  "Idea":          "#5a5f68",
  "Draft":         "#8a8f98",
  "Needs visual":  "#f5a524",
  "Visual ready":  "#f5a524",
  "Needs review":  "#f5a524",
  "Approved":      "#6ee7b7",
  "Scheduled":     "#a78bfa",
  "Posted":        "#6ee7b7",
  "Measured":      "#6ee7b7",
  "Repurpose":     "#a78bfa",
  "Archived":      "#3a3e46",
};

const BUCKET_COLOR: Partial<Record<ContentBucket, string>> = {
  Pain:       "#f87171",
  Product:    "#a78bfa",
  Trust:      "#6ee7b7",
  Proof:      "#6ee7b7",
  Education:  "#f5a524",
  Founder:    "#8a8f98",
  Competitor: "#f87171",
  Launch:     "#a78bfa",
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fromDb(row: Record<string, unknown>): ContentItem {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    hook: String(row.hook ?? ""),
    platform: String(row.platform ?? "X"),
    postType: String(row.post_type ?? "text"),
    bucket: String(row.bucket ?? "Pain"),
    caption: String(row.caption ?? ""),
    visualLink: String(row.visual_link ?? ""),
    status: (row.status as ContentStatus) ?? "Idea",
    owner: String(row.owner ?? ""),
    scheduledDate: String(row.scheduled_date ?? ""),
    postedUrl: String(row.posted_url ?? ""),
    performance: String(row.performance ?? ""),
    nextAction: String(row.next_action ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toDb(item: Omit<ContentItem, "id" | "createdAt">) {
  return {
    title: item.title,
    hook: item.hook,
    platform: item.platform,
    post_type: item.postType,
    bucket: item.bucket,
    caption: item.caption,
    visual_link: item.visualLink,
    status: item.status,
    owner: item.owner,
    scheduled_date: item.scheduledDate || null,
    posted_url: item.postedUrl || null,
    performance: item.performance,
    next_action: item.nextAction,
  };
}

const BLANK: Omit<ContentItem, "id" | "createdAt"> = {
  title: "", hook: "", platform: "X", postType: "text", bucket: "Pain",
  caption: "", visualLink: "", status: "Idea", owner: "",
  scheduledDate: "", postedUrl: "", performance: "", nextAction: "",
};

type ViewMode = "table" | "board";

export function AdminContentCalendarContent() {
  const [items,         setItems]         = useState<ContentItem[]>([]);
  const [statusFilter,  setStatusFilter]  = useState<typeof STATUS_FILTER_LIST[number]>("all");
  const [bucketFilter,  setBucketFilter]  = useState<typeof BUCKET_FILTER_LIST[number]>("all");
  const [view,          setView]          = useState<ViewMode>("table");
  const [showForm,      setShowForm]      = useState(false);
  const [editId,        setEditId]        = useState<string | null>(null);
  const [form,          setForm]          = useState({ ...BLANK });
  const [expandId,      setExpandId]      = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const rows = await growthList<Record<string, unknown>>("posts");
      setItems(rows.map(fromDb));
    })();
  }, []);

  function openAdd() { setForm({ ...BLANK }); setEditId(null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openEdit(item: ContentItem) {
    const { id, createdAt, ...rest } = item;
    void id; void createdAt;
    setForm(rest);
    setEditId(item.id);
    setShowForm(true);
    setExpandId(null);
  }

  async function submit() {
    if (!form.title.trim()) return;
    if (editId) {
      const row = await growthUpdate<Record<string, unknown>>("posts", editId, toDb(form));
      if (row) setItems((prev) => prev.map((i) => (i.id === editId ? fromDb(row) : i)));
    } else {
      const row = await growthCreate<Record<string, unknown>>("posts", toDb(form));
      if (row) setItems((prev) => [fromDb(row), ...prev]);
    }
    setShowForm(false);
  }

  async function updateStatus(id: string, status: ContentStatus) {
    const row = await growthUpdate<Record<string, unknown>>("posts", id, { status });
    if (row) setItems((prev) => prev.map((i) => (i.id === id ? fromDb(row) : i)));
  }

  async function remove(id: string) {
    if (!confirm("Remove this content item?")) return;
    const ok = await growthDelete("posts", id);
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
    if (expandId === id) setExpandId(null);
  }

  let filtered = statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);
  if (bucketFilter !== "all") filtered = filtered.filter((i) => i.bucket === bucketFilter);

  const statusCounts: Record<string, number> = { all: items.length };
  for (const s of STATUSES) statusCounts[s] = items.filter((i) => i.status === s).length;

  function StatusPill({ status }: { status: ContentStatus }) {
    const color = STATUS_COLOR[status] ?? "#5a5f68";
    return (
      <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${color}35`, background: `${color}0d`, color, whiteSpace: "nowrap" as const }}>
        {status}
      </span>
    );
  }

  function BucketPill({ bucket }: { bucket: string }) {
    const color = BUCKET_COLOR[bucket as ContentBucket] ?? "#5a5f68";
    return (
      <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${color}25`, background: "transparent", color, whiteSpace: "nowrap" as const }}>
        {bucket}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>content calendar</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Content</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#8a8f98" }}>{items.length} items across all platforms</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, overflow: "hidden" }}>
            {(["table", "board"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ ...MONO, height: 30, padding: "0 10px", border: "none", background: view === v ? "#16191e" : "transparent", color: view === v ? "#f4f5f7" : "#5a5f68", fontSize: 11, cursor: "pointer" }}>
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            style={{ height: 32, padding: "0 14px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.40)", background: "rgba(167,139,250,0.10)", color: "#a78bfa", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            + Add item
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {STATUS_FILTER_LIST.map((s) => {
          const active = statusFilter === s;
          const color = s !== "all" ? (STATUS_COLOR[s as ContentStatus] ?? "#5a5f68") : "#8a8f98";
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ ...MONO, height: 27, padding: "0 9px", borderRadius: 5, border: `1px solid ${active ? `${color}40` : "rgba(255,255,255,0.07)"}`, background: active ? `${color}0d` : "transparent", color: active ? color : "#5a5f68", fontSize: 10.5, cursor: "pointer" }}>
              {s}{statusCounts[s] > 0 ? ` ${statusCounts[s]}` : ""}
            </button>
          );
        })}
      </div>

      {/* Bucket filters */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {BUCKET_FILTER_LIST.map((b) => {
          const active = bucketFilter === b;
          const color = b !== "all" ? (BUCKET_COLOR[b as ContentBucket] ?? "#5a5f68") : "#8a8f98";
          return (
            <button key={b} onClick={() => setBucketFilter(b)}
              style={{ ...MONO, height: 25, padding: "0 8px", borderRadius: 4, border: `1px solid ${active ? `${color}35` : "rgba(255,255,255,0.05)"}`, background: active ? `${color}0a` : "transparent", color: active ? color : "#3a3e46", fontSize: 10, cursor: "pointer" }}>
              {b}
            </button>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, background: "#0c0e11", padding: 16 }}>
          <p style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            {editId ? "Edit item" : "Add content item"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Title / headline</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What is this post about?"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Hook (first line)</label>
              <input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="The opening line that earns the scroll..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Post type</label>
              <select value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {POST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Bucket</label>
              <select value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {BUCKETS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit" }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Caption</label>
              <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={3} placeholder="Full post caption..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Visual link</label>
              <input value={form.visualLink} onChange={(e) => setForm({ ...form, visualLink: e.target.value })} placeholder="https://..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Owner</label>
              <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="@handle"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Scheduled date</label>
              <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", colorScheme: "dark", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Posted URL</label>
              <input value={form.postedUrl} onChange={(e) => setForm({ ...form, postedUrl: e.target.value })} placeholder="https://..."
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Performance</label>
              <input value={form.performance} onChange={(e) => setForm({ ...form, performance: e.target.value })} placeholder="e.g. 12k impressions, 84 likes"
                style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "7px 10px", color: "#f4f5f7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ ...MONO, fontSize: 10, color: "#5a5f68", display: "block", marginBottom: 4 }}>Next action</label>
              <input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} placeholder="What needs to happen next?"
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

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "#0c0e11", padding: "32px 20px", textAlign: "center" }}>
          <p style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}>No content items in this view.</p>
          <p style={{ fontSize: 12, color: "#3a3e46", marginTop: 6 }}>Add ideas, drafts, and scheduled posts to track the full pipeline.</p>
        </div>
      ) : view === "table" ? (
        /* TABLE VIEW */
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          {/* Desktop header */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: "1fr 90px 80px 100px 100px 80px auto", gap: 10, padding: "10px 16px", background: "#111317", borderBottom: "1px solid rgba(255,255,255,0.06)", ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            <span>Title</span><span>Platform</span><span>Bucket</span><span>Status</span><span>Scheduled</span><span>Owner</span><span></span>
          </div>

          {filtered.map((item, i) => {
            const isExpanded = expandId === item.id;
            const isLast = i === filtered.length - 1;
            return (
              <div key={item.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                {/* Desktop row */}
                <div
                  className="hidden md:grid cursor-pointer hover:bg-white/[0.018]"
                  onClick={() => setExpandId(isExpanded ? null : item.id)}
                  style={{ gridTemplateColumns: "1fr 90px 80px 100px 100px 80px auto", gap: 10, padding: "11px 16px", alignItems: "center", transition: "background 0.1s" }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: 13, color: "#f4f5f7", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || "(untitled)"}</p>
                    {item.hook && <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.hook}</p>}
                  </div>
                  <span style={{ ...MONO, fontSize: 11, color: "#8a8f98" }}>{item.platform}</span>
                  <BucketPill bucket={item.bucket} />
                  <StatusPill status={item.status} />
                  <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{item.scheduledDate || "—"}</span>
                  <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{item.owner || "—"}</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      style={{ ...MONO, fontSize: 10, height: 24, padding: "0 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f68", cursor: "pointer" }}>
                      Edit
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                      style={{ ...MONO, fontSize: 10, height: 24, padding: "0 7px", borderRadius: 4, border: "1px solid rgba(248,113,113,0.18)", background: "transparent", color: "#f87171", cursor: "pointer" }}>
                      Del
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden" style={{ padding: "14px 16px" }}
                  onClick={() => setExpandId(isExpanded ? null : item.id)}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <StatusPill status={item.status} />
                    <BucketPill bucket={item.bucket} />
                    <span style={{ ...MONO, fontSize: 10, color: "#8a8f98" }}>{item.platform}</span>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: "#f4f5f7", margin: "0 0 4px" }}>{item.title || "(untitled)"}</p>
                  {item.hook && <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", margin: 0 }}>{item.hook}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8a8f98", cursor: "pointer" }}>
                      Edit
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 4, border: "1px solid rgba(248,113,113,0.18)", background: "transparent", color: "#f87171", cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: "12px 16px 16px", background: "#080a0d", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.caption && (
                        <div className="sm:col-span-2">
                          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", marginBottom: 4 }}>Caption</p>
                          <p style={{ fontSize: 12.5, color: "#c9ccd2", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.caption}</p>
                        </div>
                      )}
                      {item.visualLink && (
                        <div>
                          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", marginBottom: 4 }}>Visual link</p>
                          <a href={item.visualLink} target="_blank" rel="noopener noreferrer" style={{ ...MONO, fontSize: 11, color: "#a78bfa" }}>{item.visualLink}</a>
                        </div>
                      )}
                      {item.postedUrl && (
                        <div>
                          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", marginBottom: 4 }}>Posted URL</p>
                          <a href={item.postedUrl} target="_blank" rel="noopener noreferrer" style={{ ...MONO, fontSize: 11, color: "#6ee7b7" }}>{item.postedUrl}</a>
                        </div>
                      )}
                      {item.performance && (
                        <div>
                          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", marginBottom: 4 }}>Performance</p>
                          <p style={{ ...MONO, fontSize: 12, color: "#f4f5f7" }}>{item.performance}</p>
                        </div>
                      )}
                      {item.nextAction && (
                        <div>
                          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", marginBottom: 4 }}>Next action</p>
                          <p style={{ fontSize: 12.5, color: "#c9ccd2" }}>{item.nextAction}</p>
                        </div>
                      )}
                    </div>
                    {/* Quick status transitions */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                      {STATUSES.filter((s) => s !== item.status).slice(0, 5).map((s) => (
                        <button key={s} onClick={() => updateStatus(item.id, s)}
                          style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f68", cursor: "pointer" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* BOARD VIEW - columns by status bucket */
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 12, minWidth: "max-content", paddingBottom: 4 }}>
            {(["Idea", "Draft", "Needs review", "Approved", "Scheduled", "Posted"] as ContentStatus[]).map((colStatus) => {
              const colItems = filtered.filter((i) => i.status === colStatus);
              const color = STATUS_COLOR[colStatus] ?? "#5a5f68";
              return (
                <div key={colStatus} style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <StatusPill status={colStatus} />
                    <span style={{ ...MONO, fontSize: 10, color: "#5a5f68" }}>{colItems.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {colItems.length === 0 ? (
                      <div style={{ border: `1px dashed ${color}20`, borderRadius: 8, padding: "20px 12px", textAlign: "center" }}>
                        <p style={{ ...MONO, fontSize: 10, color: "#3a3e46" }}>empty</p>
                      </div>
                    ) : colItems.map((item) => (
                      <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, background: "#0c0e11", padding: 12 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: "#f4f5f7", margin: "0 0 6px" }}>{item.title || "(untitled)"}</p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ ...MONO, fontSize: 10, color: "#8a8f98" }}>{item.platform}</span>
                          <BucketPill bucket={item.bucket} />
                        </div>
                        {item.scheduledDate && <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", marginTop: 6 }}>{item.scheduledDate}</p>}
                        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                          <button onClick={() => openEdit(item)} style={{ ...MONO, fontSize: 10, height: 22, padding: "0 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f68", cursor: "pointer" }}>Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
