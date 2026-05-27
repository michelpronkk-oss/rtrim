"use client";

import { useEffect, useState } from "react";
import { type ContentItem, type ContentStatus } from "@/components/admin/admin-content-calendar";
import { type Asset } from "@/components/admin/admin-asset-library";
import { type Reply } from "@/components/admin/admin-reply-inbox";
import { growthList, growthUpdate } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function fromPost(row: Record<string, unknown>): ContentItem {
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

function fromAsset(row: Record<string, unknown>): Asset {
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

function fromReply(row: Record<string, unknown>): Reply {
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

export function AdminApprovalsContent() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [assets,       setAssets]       = useState<Asset[]>([]);
  const [replies,      setReplies]      = useState<Reply[]>([]);

  useEffect(() => {
    void (async () => {
      const [postRows, assetRows, replyRows] = await Promise.all([
        growthList<Record<string, unknown>>("posts"),
        growthList<Record<string, unknown>>("assets"),
        growthList<Record<string, unknown>>("replies"),
      ]);
      setContentItems(postRows.map(fromPost));
      setAssets(assetRows.map(fromAsset));
      setReplies(replyRows.map(fromReply));
    })();
  }, []);

  function updateContentStatus(id: string, status: ContentStatus) {
    void (async () => {
      const row = await growthUpdate<Record<string, unknown>>("posts", id, { status });
      if (row) setContentItems((prev) => prev.map((i) => (i.id === id ? fromPost(row) : i)));
    })();
  }

  function updateAssetStatus(id: string, status: Asset["status"]) {
    void (async () => {
      const row = await growthUpdate<Record<string, unknown>>("assets", id, { status });
      if (row) setAssets((prev) => prev.map((a) => (a.id === id ? fromAsset(row) : a)));
    })();
  }

  function updateReplyStatus(id: string, status: Reply["status"]) {
    void (async () => {
      const row = await growthUpdate<Record<string, unknown>>("replies", id, { status });
      if (row) setReplies((prev) => prev.map((r) => (r.id === id ? fromReply(row) : r)));
    })();
  }

  const postsNeedingReview  = contentItems.filter((i) => i.status === "Needs review");
  const draftsNeedingApproval = replies.filter((r) => r.status === "drafted");
  const rawAssets           = assets.filter((a) => a.status === "raw");
  const scheduledNoApproval = contentItems.filter((i) => i.status === "Scheduled");

  const totalPending = postsNeedingReview.length + draftsNeedingApproval.length + rawAssets.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>approvals</p>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Approvals</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: totalPending > 0 ? "#f5a524" : "#8a8f98" }}>
          {totalPending > 0 ? `${totalPending} items need attention` : "Nothing pending right now."}
        </p>
      </div>

      {/* Posts needing approval */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <p style={{ ...MONO, fontSize: 10, color: postsNeedingReview.length > 0 ? "#f5a524" : "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            Posts needing review
          </p>
          <span style={{ ...MONO, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: postsNeedingReview.length > 0 ? "rgba(245,165,36,0.12)" : "#111317", border: `1px solid ${postsNeedingReview.length > 0 ? "rgba(245,165,36,0.30)" : "rgba(255,255,255,0.06)"}`, color: postsNeedingReview.length > 0 ? "#f5a524" : "#3a3e46" }}>
            {postsNeedingReview.length}
          </span>
        </div>
        {postsNeedingReview.length === 0 ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 16px", background: "#0c0e11" }}>
            <p style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>No posts awaiting review.</p>
          </div>
        ) : (
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
            {postsNeedingReview.map((item, i) => (
              <div key={item.id} style={{ padding: "13px 16px", borderBottom: i < postsNeedingReview.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title || "(untitled)"}
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ ...MONO, fontSize: 10, color: "#8a8f98" }}>{item.platform}</span>
                      {item.hook && <span style={{ ...MONO, fontSize: 10, color: "#5a5f68" }}>{item.hook.slice(0, 60)}{item.hook.length > 60 ? "..." : ""}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateContentStatus(item.id, "Approved")}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(110,231,183,0.30)", background: "rgba(110,231,183,0.08)", color: "#6ee7b7", cursor: "pointer" }}>
                      Approve
                    </button>
                    <button onClick={() => updateContentStatus(item.id, "Draft")}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8a8f98", cursor: "pointer" }}>
                      Send back
                    </button>
                  </div>
                </div>
                {item.caption && (
                  <p style={{ fontSize: 12, color: "#8a8f98", marginTop: 8, lineHeight: 1.5, maxWidth: 600 }}>
                    {item.caption.slice(0, 200)}{item.caption.length > 200 ? "..." : ""}
                  </p>
                )}
                {item.visualLink && (
                  <a href={item.visualLink} target="_blank" rel="noopener noreferrer"
                    style={{ ...MONO, fontSize: 10.5, color: "#a78bfa", display: "block", marginTop: 6 }}>
                    Visual: {item.visualLink}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reply drafts needing approval */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <p style={{ ...MONO, fontSize: 10, color: draftsNeedingApproval.length > 0 ? "#a78bfa" : "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            Replies needing approval
          </p>
          <span style={{ ...MONO, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: draftsNeedingApproval.length > 0 ? "rgba(167,139,250,0.12)" : "#111317", border: `1px solid ${draftsNeedingApproval.length > 0 ? "rgba(167,139,250,0.30)" : "rgba(255,255,255,0.06)"}`, color: draftsNeedingApproval.length > 0 ? "#a78bfa" : "#3a3e46" }}>
            {draftsNeedingApproval.length}
          </span>
        </div>
        {draftsNeedingApproval.length === 0 ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 16px", background: "#0c0e11" }}>
            <p style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>No reply drafts awaiting approval.</p>
          </div>
        ) : (
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
            {draftsNeedingApproval.map((r, i) => (
              <div key={r.id} style={{ padding: "13px 16px", borderBottom: i < draftsNeedingApproval.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ ...MONO, fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98" }}>{r.platform}</span>
                  <span style={{ ...MONO, fontSize: 10, color: r.priority === "high" ? "#f87171" : r.priority === "medium" ? "#f5a524" : "#8a8f98" }}>{r.priority}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={() => updateReplyStatus(r.id, "approved")}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(110,231,183,0.30)", background: "rgba(110,231,183,0.08)", color: "#6ee7b7", cursor: "pointer" }}>
                      Approve
                    </button>
                    <button onClick={() => updateReplyStatus(r.id, "needs reply")}
                      style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8a8f98", cursor: "pointer" }}>
                      Revise
                    </button>
                  </div>
                </div>
                {r.commentText && (
                  <div style={{ padding: "7px 10px", borderRadius: 5, background: "#111317", fontSize: 12, color: "#8a8f98", lineHeight: 1.5, marginBottom: 6 }}>
                    {r.commentText}
                  </div>
                )}
                {r.suggestedReply && (
                  <div style={{ padding: "7px 10px", borderRadius: 5, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.12)", fontSize: 12, color: "#c4b5fd", lineHeight: 1.5 }}>
                    {r.suggestedReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Raw assets needing approval */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <p style={{ ...MONO, fontSize: 10, color: rawAssets.length > 0 ? "#f5a524" : "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            Visuals needing approval
          </p>
          <span style={{ ...MONO, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: rawAssets.length > 0 ? "rgba(245,165,36,0.12)" : "#111317", border: `1px solid ${rawAssets.length > 0 ? "rgba(245,165,36,0.30)" : "rgba(255,255,255,0.06)"}`, color: rawAssets.length > 0 ? "#f5a524" : "#3a3e46" }}>
            {rawAssets.length}
          </span>
        </div>
        {rawAssets.length === 0 ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 16px", background: "#0c0e11" }}>
            <p style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>No raw assets awaiting approval.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rawAssets.map((a) => (
              <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: 12 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", color: "#8a8f98" }}>{a.type}</span>
                  <span style={{ ...MONO, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(245,165,36,0.25)", background: "rgba(245,165,36,0.08)", color: "#f5a524" }}>raw</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f5f7", margin: "0 0 4px" }}>{a.name}</p>
                {a.notes && <p style={{ fontSize: 12, color: "#8a8f98", margin: "0 0 8px" }}>{a.notes}</p>}
                {a.fileLink && (
                  <a href={a.fileLink} target="_blank" rel="noopener noreferrer" style={{ ...MONO, fontSize: 10.5, color: "#a78bfa", display: "block", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.fileLink}
                  </a>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateAssetStatus(a.id, "approved")}
                    style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(110,231,183,0.30)", background: "rgba(110,231,183,0.08)", color: "#6ee7b7", cursor: "pointer" }}>
                    Approve
                  </button>
                  <button onClick={() => updateAssetStatus(a.id, "archived")}
                    style={{ ...MONO, fontSize: 10, height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#3a3e46", cursor: "pointer" }}>
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scheduled items */}
      {scheduledNoApproval.length > 0 && (
        <section>
          <p style={{ ...MONO, fontSize: 10, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
            Scheduled · {scheduledNoApproval.length}
          </p>
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
            {scheduledNoApproval.map((item, i) => (
              <div key={item.id} style={{ padding: "11px 16px", borderBottom: i < scheduledNoApproval.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...MONO, fontSize: 10, color: "#8a8f98" }}>{item.platform}</span>
                <span style={{ fontSize: 13, color: "#f4f5f7", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                {item.scheduledDate && <span style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>{item.scheduledDate}</span>}
                <button onClick={() => updateContentStatus(item.id, "Posted")}
                  style={{ ...MONO, fontSize: 10, height: 24, padding: "0 8px", borderRadius: 4, border: "1px solid rgba(110,231,183,0.20)", background: "rgba(110,231,183,0.06)", color: "#6ee7b7", cursor: "pointer" }}>
                  Mark posted
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
