"use client";

import { useEffect, useState } from "react";
import { growthList, growthCreate, growthUpdate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

type Summary = Partial<Record<string, number>>;

type ContentItem = { id: string; title: string; status: string; platform: string; scheduledDate?: string };
type Asset       = { id: string; name: string; type: string; status: string };
type Reply       = { id: string; platform: string; commentText: string; status: string; priority: string };

function todayKey() { return new Date().toISOString().slice(0, 10); }

export function AdminGrowthOpsContent({ summary }: { summary?: Summary }) {
  const [contentItems,   setContentItems]   = useState<ContentItem[]>([]);
  const [assets,         setAssets]         = useState<Asset[]>([]);
  const [replies,        setReplies]        = useState<Reply[]>([]);
  const [checklistDone,  setChecklistDone]  = useState(0);
  const [notes,          setNotes]          = useState("");

  useEffect(() => {
    void (async () => {
      const [posts, assets, replies, logs] = await Promise.all([
        growthList<Record<string, unknown>>("posts"),
        growthList<Record<string, unknown>>("assets"),
        growthList<Record<string, unknown>>("replies"),
        growthList<Record<string, unknown>>("daily-logs"),
      ]);
      setContentItems(
        posts.map((r) => ({
          id: String(r.id ?? ""),
          title: String(r.title ?? ""),
          status: String(r.status ?? ""),
          platform: String(r.platform ?? ""),
          scheduledDate: String(r.scheduled_date ?? ""),
        }))
      );
      setAssets(
        assets.map((r) => ({
          id: String(r.id ?? ""),
          name: String(r.name ?? ""),
          type: String(r.type ?? ""),
          status: String(r.status ?? ""),
        }))
      );
      setReplies(
        replies.map((r) => ({
          id: String(r.id ?? ""),
          platform: String(r.platform ?? ""),
          commentText: String(r.comment_text ?? ""),
          status: String(r.status ?? ""),
          priority: String(r.priority ?? "medium"),
        }))
      );
      const today = logs.find((l) => String(l.log_date ?? "") === todayKey());
      if (today) {
        const checkedArr = Array.isArray(today.checked_items) ? (today.checked_items as number[]) : [];
        setChecklistDone(checkedArr.length);
        setNotes(String(today.notes ?? ""));
      }
    })();
  }, []);

  function handleNotes(v: string) {
    setNotes(v);
    void (async () => {
      const logs = await growthList<Record<string, unknown>>("daily-logs");
      const today = logs.find((l) => String(l.log_date ?? "") === todayKey());
      if (today?.id) {
        await growthUpdate("daily-logs", String(today.id), { notes: v });
      } else {
        await growthCreate("daily-logs", { log_date: todayKey(), checked_items: [], notes: v });
      }
    })();
  }

  const needsReview    = contentItems.filter((i) => i.status === "Needs review");
  const assetsReady    = assets.filter((a) => a.status === "approved");
  const repliesPending = replies.filter((r) => r.status === "needs reply");
  const scheduled      = contentItems.filter((i) => i.status === "Scheduled");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function QuickStat({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px" }}>
        <div style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 500, color: value > 0 ? (color ?? "#f4f5f7") : "#5a5f68", letterSpacing: "-0.025em", lineHeight: 1.1 }}>{value}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>growth ops</p>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Command center</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#8a8f98" }}>{today}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat label="Posts to review"    value={needsReview.length}    color="#f5a524" />
        <QuickStat label="Assets ready"        value={assetsReady.length}    color="#6ee7b7" />
        <QuickStat label="Replies pending"     value={repliesPending.length} color="#f87171" />
        <QuickStat label="Checklist today"     value={checklistDone}         color="#a78bfa" />
      </div>

      {/* Metrics snapshot (safe for all roles) */}
      {summary && (
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Traffic snapshot - 7 days</p>
          </div>
          <div style={{ padding: "10px 0" }}>
            {[
              { label: "Unique visitors",   value: summary.uniqueVisitors7d ?? 0 },
              { label: "Install CTA clicks",value: summary.installCtaClicks7d ?? 0 },
              { label: "Command copies",    value: summary.installCommandCopies7d ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}>
                <span style={{ fontSize: 13, color: "#c9ccd2" }}>{label}</span>
                <span style={{ ...MONO, fontSize: 13, color: value > 0 ? "#f4f5f7" : "#5a5f68" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Posts needing review */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ ...MONO, fontSize: 10, color: needsReview.length > 0 ? "#f5a524" : "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Posts needing review {needsReview.length > 0 ? `· ${needsReview.length}` : ""}
            </p>
          </div>
          {needsReview.length === 0 ? (
            <p style={{ padding: "20px 16px", fontSize: 12, color: "#5a5f68" }}>No posts need review right now.</p>
          ) : (
            <div>
              {needsReview.slice(0, 5).map((item, i) => (
                <div key={item.id} style={{ padding: "10px 16px", borderBottom: i < Math.min(needsReview.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...MONO, fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98", flexShrink: 0 }}>{item.platform || "?"}</span>
                  <span style={{ fontSize: 13, color: "#c9ccd2", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || "Untitled"}</span>
                  <span style={{ ...MONO, fontSize: 10, color: "#f5a524", flexShrink: 0 }}>review</span>
                </div>
              ))}
              {needsReview.length > 5 && (
                <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", padding: "8px 16px" }}>+{needsReview.length - 5} more in Content</p>
              )}
            </div>
          )}
        </div>

        {/* Replies pending */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ ...MONO, fontSize: 10, color: repliesPending.length > 0 ? "#f87171" : "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Replies pending {repliesPending.length > 0 ? `· ${repliesPending.length}` : ""}
            </p>
          </div>
          {repliesPending.length === 0 ? (
            <p style={{ padding: "20px 16px", fontSize: 12, color: "#5a5f68" }}>No pending replies.</p>
          ) : (
            <div>
              {repliesPending.slice(0, 5).map((r, i) => (
                <div key={r.id} style={{ padding: "10px 16px", borderBottom: i < Math.min(repliesPending.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ ...MONO, fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98" }}>{r.platform}</span>
                    <span style={{ ...MONO, fontSize: 10, color: r.priority === "high" ? "#f87171" : r.priority === "medium" ? "#f5a524" : "#8a8f98" }}>{r.priority}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#8a8f98", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.commentText || "(no comment text)"}
                  </p>
                </div>
              ))}
              {repliesPending.length > 5 && (
                <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", padding: "8px 16px" }}>+{repliesPending.length - 5} more in Replies</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assets ready */}
      {assetsReady.length > 0 && (
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ ...MONO, fontSize: 10, color: "#6ee7b7", letterSpacing: "0.12em", textTransform: "uppercase" }}>Assets ready to use · {assetsReady.length}</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 16 }}>
            {assetsReady.slice(0, 8).map((a) => (
              <span key={a.id} style={{ ...MONO, fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(110,231,183,0.20)", background: "rgba(110,231,183,0.06)", color: "#6ee7b7" }}>
                {a.name}
              </span>
            ))}
            {assetsReady.length > 8 && (
              <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>+{assetsReady.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase" }}>Scheduled · {scheduled.length}</p>
          </div>
          <div>
            {scheduled.slice(0, 5).map((item, i) => (
              <div key={item.id} style={{ padding: "10px 16px", borderBottom: i < Math.min(scheduled.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ ...MONO, fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98", flexShrink: 0 }}>{item.platform || "?"}</span>
                <span style={{ fontSize: 13, color: "#c9ccd2", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                {item.scheduledDate && <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", flexShrink: 0 }}>{item.scheduledDate}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next actions */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase" }}>Next actions</p>
        </div>
        <div style={{ padding: 16 }}>
          <textarea
            value={notes}
            onChange={(e) => handleNotes(e.target.value)}
            placeholder="What needs to happen today? Key next steps, blockers, priorities..."
            rows={4}
            style={{ width: "100%", background: "#111317", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#c9ccd2", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
          <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46", marginTop: 6 }}>Saved to Supabase daily logs.</p>
        </div>
      </div>
    </div>
  );
}
