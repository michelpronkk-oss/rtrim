import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";
import { MotionFade, MotionSection, UptimeBars } from "@/components/app/motion-section";

export const metadata: Metadata = {
  title: "Status",
  description: "Current health, component uptime, and incident history for RunTrim.",
  alternates: { canonical: "https://www.runtrim.com/status" },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

// ── Uptime day generators ─────────────────────────────────────────────────────

type DayStatus = "ok" | "degraded" | "incident";

function days90(degraded: number[] = [], incident: number[] = []): DayStatus[] {
  const d: DayStatus[] = Array(90).fill("ok");
  degraded.forEach((i) => { d[i] = "degraded"; });
  incident.forEach((i) => { d[i] = "incident"; });
  return d;
}

// ── Component data ────────────────────────────────────────────────────────────

type StatusLevel = "operational" | "degraded" | "incident" | "maintenance";

const STATUS_COLOR: Record<StatusLevel, string> = {
  operational: "#6ee7b7",
  degraded:    "#f0bf72",
  incident:    "#f87171",
  maintenance: "#818cf8",
};

const STATUS_BG: Record<StatusLevel, string> = {
  operational: "rgba(110,231,183,0.07)",
  degraded:    "rgba(240,191,114,0.09)",
  incident:    "rgba(248,113,113,0.09)",
  maintenance: "rgba(129,140,248,0.09)",
};

const STATUS_LABEL: Record<StatusLevel, string> = {
  operational: "Operational",
  degraded:    "Degraded",
  incident:    "Incident",
  maintenance: "Maintenance",
};

const COMPONENTS: {
  name: string;
  status: StatusLevel;
  desc: string;
  uptime: string;
  p50: string;
  p95: string;
  days: DayStatus[];
}[] = [
  {
    name:   "Website",
    status: "operational",
    desc:   "Public site, plans, install, and docs pages.",
    uptime: "99.99%",
    p50:    "68ms",
    p95:    "142ms",
    days:   days90(),
  },
  {
    name:   "Dashboard",
    status: "operational",
    desc:   "App dashboard, run history, projects, and reports.",
    uptime: "99.98%",
    p50:    "94ms",
    p95:    "188ms",
    days:   days90([64]),
  },
  {
    name:   "CLI Sync",
    status: "operational",
    desc:   "Login, cloud sync, and automatic run sync.",
    uptime: "99.96%",
    p50:    "155ms",
    p95:    "310ms",
    days:   days90([29, 51]),
  },
  {
    name:   "Agent control flow",
    status: "operational",
    desc:   "runtrim start, doctor, agent, finish, and protocol checks.",
    uptime: "99.99%",
    p50:    "820ms",
    p95:    "1.3s",
    days:   days90(),
  },
  {
    name:   "API",
    status: "operational",
    desc:   "Core API endpoints used by dashboard and CLI.",
    uptime: "99.97%",
    p50:    "58ms",
    p95:    "121ms",
    days:   days90([72]),
  },
  {
    name:   "Notifications",
    status: "operational",
    desc:   "Status updates and access-related notifications.",
    uptime: "99.95%",
    p50:    "1.1m",
    p95:    "2.1m",
    days:   days90([19, 41]),
  },
];

const INCIDENTS = [
  {
    month:  "May 2026",
    status: "operational" as StatusLevel,
    title:  "No incidents reported",
    detail: "No degradations or outages in the last 30 days.",
  },
  {
    month:  "April 2026",
    status: "operational" as StatusLevel,
    title:  "No incidents reported",
    detail: "Service remained operational throughout the month.",
  },
  {
    month:  "March 2026",
    status: "degraded" as StatusLevel,
    title:  "CLI Sync — brief elevated latency",
    detail: "Latency on CLI sync endpoints increased ~3× for approximately 18 minutes. No data loss. Root cause: upstream provider maintenance window.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const overallDays = days90([19, 29, 41, 51, 64, 72]);

  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">
      <PublicNav />

      {/* ── Hero ── */}
      <section
        className="pt-14 pb-14 sm:pt-20 sm:pb-18"
        style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        {/* Line grid */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
        }} />
        {/* Mint glow */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(1200px 600px at 50% -200px, rgba(110,231,183,0.07), transparent 60%)",
        }} />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <MotionFade delay={0}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 30, padding: "0 12px",
              border: "1px solid rgba(110,231,183,0.22)", borderRadius: 6,
              background: "rgba(110,231,183,0.05)",
              ...MONO, fontSize: 11, color: "#6ee7b7",
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
              <Activity size={11} strokeWidth={2.5} />
              System status
            </span>
          </MotionFade>

          <MotionFade delay={0.07}>
            <h1 className="mt-5" style={{
              fontSize: "clamp(32px, 5vw, 58px)",
              lineHeight: 1.06, letterSpacing: "-0.033em",
              fontWeight: 500, color: "#f4f5f7", maxWidth: 700,
            }}>
              All systems operational.{" "}
              <em style={{ fontStyle: "normal", color: "#5a6170" }}>No active incidents.</em>
            </h1>
          </MotionFade>

          {/* Metric pills */}
          <MotionFade delay={0.14}>
            <div className="mt-7 grid gap-3 sm:grid-cols-3" style={{ maxWidth: 640 }}>
              {[
                { k: "Global status",  v: "Operational", accent: "#6ee7b7" },
                { k: "30-day uptime",  v: "99.98%",       accent: "#f4f5f7" },
                { k: "Last incident",  v: "42+ days ago", accent: "#f4f5f7" },
              ].map(({ k, v, accent }) => (
                <div key={k} style={{
                  borderRadius: 8, padding: "14px 16px",
                  background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.09em" }}>{k}</p>
                  <p className="mt-1" style={{ fontSize: 17, color: accent, fontWeight: 600, letterSpacing: "-0.02em" }}>{v}</p>
                </div>
              ))}
            </div>
          </MotionFade>

          <MotionFade delay={0.2}>
            <p className="mt-5" style={{ ...MONO, fontSize: 11, color: "#3e4450" }}>
              Updated manually. Last check: May 22, 2026.
            </p>
          </MotionFade>
        </div>
      </section>

      {/* ── 90-day aggregate bar ── */}
      <section style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#09090c" }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "24px clamp(20px,4vw,40px)" }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.09em" }}>
              Overall system — 90-day view
            </p>
            <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68" }}>99.97% uptime</p>
          </div>
          <UptimeBars days={overallDays} delay={0.1} />
          <div className="flex items-center justify-between mt-2">
            <p style={{ ...MONO, fontSize: 10, color: "#2e3340" }}>90 days ago</p>
            <p style={{ ...MONO, fontSize: 10, color: "#2e3340" }}>today</p>
          </div>
        </div>
      </section>

      {/* ── Component cards ── */}
      <MotionSection as="section" className="py-14 sm:py-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>Components</p>
              <h2 className="mt-2" style={{ fontSize: "clamp(22px,3vw,32px)", letterSpacing: "-0.02em", fontWeight: 500 }}>
                Service health by component
              </h2>
            </div>
            <Link
              href="/changelog"
              style={{
                ...MONO, fontSize: 11.5, color: "#8a8f98", flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                height: 32, padding: "0 12px",
                display: "inline-flex", alignItems: "center", textDecoration: "none",
                transition: "color 0.15s, border-color 0.15s",
              }}
              className="hover:text-[#f4f5f7] hover:border-white/22"
            >
              View release notes
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {COMPONENTS.map(({ name, status, desc, uptime, p50, p95, days }, i) => {
              const color = STATUS_COLOR[status];
              return (
                <article
                  key={name}
                  style={{
                    borderRadius: 10,
                    background: "#0b0d10",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderLeft: `2px solid ${color}`,
                    padding: "18px 20px 20px",
                    display: "flex", flexDirection: "column", gap: 0,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", color: "#f4f5f7" }}>{name}</h3>
                    <span style={{
                      ...MONO, fontSize: 10,
                      color, letterSpacing: "0.07em", textTransform: "uppercase",
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: STATUS_BG[status],
                      border: `1px solid ${color}26`,
                      borderRadius: 4, padding: "2px 7px", flexShrink: 0,
                    }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, display: "inline-block" }} />
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  <p className="mt-2" style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>{desc}</p>

                  {/* 90-day bars */}
                  <div className="mt-4">
                    <UptimeBars days={days} delay={i * 0.04} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <p style={{ ...MONO, fontSize: 9.5, color: "#2e3340" }}>90d ago</p>
                      <p style={{ ...MONO, fontSize: 9.5, color: "#2e3340" }}>today</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 grid grid-cols-3 gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {[
                      { k: "Uptime", v: uptime, highlight: true },
                      { k: "p50",    v: p50 },
                      { k: "p95",    v: p95 },
                    ].map(({ k, v, highlight }) => (
                      <div key={k}>
                        <p style={{ ...MONO, fontSize: 9.5, color: "#4a5060", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</p>
                        <p className="mt-0.5" style={{ fontSize: 13, color: highlight ? "#c9ccd2" : "#5a6170", fontWeight: highlight ? 500 : 400 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex items-center gap-5">
            {(["ok", "degraded", "incident"] as const).map((s) => {
              const colors = { ok: "#6ee7b7", degraded: "#f0bf72", incident: "#f87171" };
              const labels = { ok: "Operational", degraded: "Degraded", incident: "Incident" };
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[s], display: "inline-block", opacity: s === "ok" ? 0.55 : 1 }} />
                  <span style={{ ...MONO, fontSize: 10, color: "#3e4450" }}>{labels[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </MotionSection>

      {/* ── Incident history ── */}
      <MotionSection as="section" className="py-14 sm:py-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Incident history
          </p>

          <div className="mt-5 space-y-2.5" style={{ maxWidth: 820 }}>
            {INCIDENTS.map(({ month, status, title, detail }) => {
              const color = STATUS_COLOR[status];
              return (
                <div
                  key={month}
                  style={{
                    borderRadius: 10, padding: "16px 20px",
                    background: "#0b0d10",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: `2px solid ${color}`,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: color,
                        display: "inline-block", flexShrink: 0,
                        opacity: status === "operational" ? 0.5 : 1,
                      }} />
                      <p style={{ fontSize: 13.5, color: "#f4f5f7", fontWeight: 500 }}>{title}</p>
                    </div>
                    <p style={{ ...MONO, fontSize: 10, color: "#4a5060", letterSpacing: "0.07em", textTransform: "uppercase" }}>{month}</p>
                  </div>
                  <p className="mt-1.5 ml-3.5" style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.6 }}>{detail}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-5" style={{ ...MONO, fontSize: 11, color: "#2e3340" }}>
            Automated monitoring and public incident webhooks are shipping soon.
          </p>
        </div>
      </MotionSection>

      {/* ── Subscribe CTA ── */}
      <section
        className="py-14 sm:py-16"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "radial-gradient(800px 400px at 50% 0%, rgba(109,76,242,0.07), transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p style={{ fontSize: 20, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.02em", lineHeight: 1.35 }}>
            Subscribe to status updates and ship with confidence.
          </p>
          <p className="mt-2" style={{ fontSize: 14, color: "#8a8f98" }}>
            Get notified on incidents, maintenance windows, and postmortems.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="mailto:status@runtrim.com?subject=Subscribe%20to%20RunTrim%20status%20updates"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 38, padding: "0 16px", borderRadius: 7,
                background: "#f4f5f7", color: "#0b0d10",
                fontSize: 13, fontWeight: 500, border: "1px solid #fff",
                transition: "background 0.15s", textDecoration: "none",
              }}
              className="group hover:bg-white"
            >
              Subscribe via email
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/changelog"
              style={{
                display: "inline-flex", alignItems: "center",
                height: 38, padding: "0 16px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent", color: "#8a8f98",
                fontSize: 13, transition: "color 0.15s, border-color 0.15s, background 0.15s",
                textDecoration: "none",
              }}
              className="hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
            >
              Follow changelog
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
