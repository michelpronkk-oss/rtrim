"use client";

import { useEffect, useState } from "react";
import { growthList } from "@/lib/admin-growth-client";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

type Summary = Partial<Record<string, number>>;

function kv(label: string, value: string | number, note?: string, dim = false) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: "14px 16px 16px" }}>
      <div style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: dim ? "#5a5f68" : "#f4f5f7", letterSpacing: "-0.025em", lineHeight: 1.1 }}>{value}</div>
      {note && <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", marginTop: 6 }}>{note}</p>}
    </div>
  );
}

export function AdminAnalyticsLiteContent({ summary }: { summary: Summary }) {
  const [contentCount, setContentCount] = useState(0);
  const [assetCount,   setAssetCount]   = useState(0);
  const [postedCount,  setPostedCount]  = useState(0);

  useEffect(() => {
    void (async () => {
      const [posts, assets] = await Promise.all([
        growthList<Record<string, unknown>>("posts"),
        growthList<Record<string, unknown>>("assets"),
      ]);
      setContentCount(posts.length);
      setPostedCount(posts.filter((i) => i.status === "Posted").length);
      setAssetCount(assets.length);
    })();
  }, []);

  const visitors     = summary.uniqueVisitors7d ?? 0;
  const installs     = summary.installCtaClicks7d ?? 0;
  const copies       = summary.installCommandCopies7d ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>analytics</p>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "#f4f5f7" }}>Growth snapshot</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#8a8f98" }}>Traffic and content metrics. Revenue details visible to Owner / Admin only.</p>
      </div>

      {/* Traffic */}
      <section>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Traffic</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kv("Unique visitors 7d", visitors, "internal events", !visitors)}
          {kv("Install CTA clicks 7d", installs, "internal events", !installs)}
          {kv("Command copies 7d", copies, "internal events", !copies)}
        </div>
      </section>

      {/* Content pipeline */}
      <section>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Content pipeline</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kv("Content items", contentCount, "in calendar", !contentCount)}
          {kv("Posts published", postedCount, "status: Posted", !postedCount)}
          {kv("Assets", assetCount, "in library", !assetCount)}
          {kv("Platform coverage", contentCount > 0 ? "active" : "none", "tracked platforms", !contentCount)}
        </div>
      </section>

      {/* Note */}
      <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "#0c0e11", padding: "12px 14px" }}>
        <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", lineHeight: 1.6 }}>
          Revenue, MRR, and paid user data are visible to Owner and Admin roles only. Contact your admin if you need billing context for a content decision.
        </p>
      </div>
    </div>
  );
}
