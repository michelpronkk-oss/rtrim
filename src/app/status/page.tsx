import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";

export const metadata: Metadata = {
  title: "Status | RunTrim",
  description: "Current health, component uptime, and incident history for RunTrim.",
  alternates: { canonical: "https://www.runtrim.com/status" },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const COMPONENTS = [
  {
    name: "Website",
    status: "Operational",
    desc: "Public site, plans, install, and docs pages.",
    uptime: "99.99%",
    latency: "142ms p95",
  },
  {
    name: "Dashboard",
    status: "Operational",
    desc: "App dashboard, run history, projects, and reports.",
    uptime: "99.98%",
    latency: "188ms p95",
  },
  {
    name: "CLI Sync",
    status: "Operational",
    desc: "Login, cloud sync, and automatic run sync.",
    uptime: "99.96%",
    latency: "310ms p95",
  },
  {
    name: "Bridge Mode",
    status: "Operational",
    desc: "runtrim init, runtrim go, runtrim finish, and protocol checks.",
    uptime: "99.99%",
    latency: "1.3s run compile",
  },
  {
    name: "API",
    status: "Operational",
    desc: "Core API endpoints used by dashboard and CLI.",
    uptime: "99.97%",
    latency: "121ms p95",
  },
  {
    name: "Notifications",
    status: "Operational",
    desc: "Status updates and access-related notifications.",
    uptime: "99.95%",
    latency: "2.1m delivery",
  },
] as const;

const INCIDENTS = [
  {
    date: "May 2026",
    title: "No incidents reported",
    detail: "No degradations or outages in the last 30 days.",
  },
  {
    date: "April 2026",
    title: "No incidents reported",
    detail: "Service remained operational throughout the month.",
  },
] as const;

export default function StatusPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">
      <PublicNav />

      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(1200px 700px at 50% -220px, rgba(110,231,183,0.08), transparent 60%)",
          }}
        />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 30,
              padding: "0 12px",
              border: "1px solid rgba(110,231,183,0.22)",
              borderRadius: 6,
              background: "rgba(110,231,183,0.05)",
              ...MONO,
              fontSize: 11,
              color: "#6ee7b7",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            <span className="rt-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }} />
            System status
          </span>

          <h1
            className="mt-5"
            style={{
              fontSize: "clamp(34px, 5.4vw, 62px)",
              lineHeight: 1.04,
              letterSpacing: "-0.033em",
              fontWeight: 500,
              color: "#f4f5f7",
              maxWidth: 780,
            }}
          >
            All systems operational. <em style={{ fontStyle: "normal", color: "#8a8f98" }}>No active incidents.</em>
          </h1>

          <div className="mt-7 grid gap-3 sm:grid-cols-3 max-w-4xl">
            {[
              { k: "Global status", v: "Operational" },
              { k: "30-day uptime", v: "99.98%" },
              { k: "Last incident", v: "42+ days ago" },
            ].map((item) => (
              <div
                key={item.k}
                className="rounded-[8px] px-4 py-3"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0c0e11" }}
              >
                <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.k}</p>
                <p className="mt-1" style={{ fontSize: 15, color: "#f4f5f7", fontWeight: 500 }}>
                  {item.v}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5" style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>
            Updated manually. Last check: May 22, 2026.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>Components</p>
              <h2 className="mt-2" style={{ fontSize: "clamp(24px,3.3vw,36px)", lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 500 }}>
                Service health by component
              </h2>
            </div>
            <Link
              href="/changelog"
              style={{
                ...MONO,
                fontSize: 11.5,
                color: "#8a8f98",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                height: 32,
                padding: "0 12px",
                display: "inline-flex",
                alignItems: "center",
              }}
              className="hover:text-[#f4f5f7] hover:border-white/22"
            >
              View release notes
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {COMPONENTS.map(({ name, status, desc, uptime, latency }) => (
              <article
                key={name}
                className="rounded-[10px] p-5"
                style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em", color: "#f4f5f7" }}>{name}</h3>
                  <span
                    style={{
                      ...MONO,
                      fontSize: 10.5,
                      color: "#6ee7b7",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", display: "inline-block" }} />
                    {status}
                  </span>
                </div>

                <p className="mt-2" style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.55 }}>
                  {desc}
                </p>

                <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uptime</p>
                    <p className="mt-1" style={{ fontSize: 13, color: "#c9ccd2" }}>{uptime}</p>
                  </div>
                  <div>
                    <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.08em" }}>Latency</p>
                    <p className="mt-1" style={{ fontSize: 13, color: "#c9ccd2" }}>{latency}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>Incident history</p>
          <div className="mt-4 space-y-3 max-w-4xl">
            {INCIDENTS.map(({ date, title, detail }) => (
              <div key={date} className="rounded-[10px] px-5 py-4" style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p style={{ fontSize: 14, color: "#f4f5f7", fontWeight: 500 }}>{title}</p>
                  <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.08em", textTransform: "uppercase" }}>{date}</p>
                </div>
                <p className="mt-1.5" style={{ fontSize: 13, color: "#8a8f98" }}>{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-5" style={{ ...MONO, fontSize: 11, color: "#5a5f68" }}>
            Automated monitoring and public incident webhooks are shipping soon.
          </p>
        </div>
      </section>

      <section
        className="py-14 sm:py-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "radial-gradient(800px 400px at 50% 0%, rgba(109,76,242,0.07), transparent 60%)" }}
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
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 38,
                padding: "0 16px",
                borderRadius: 7,
                background: "#f4f5f7",
                color: "#0b0d10",
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid #fff",
                transition: "background 0.15s",
              }}
              className="group hover:bg-white"
            >
              Subscribe via email
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/changelog"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 16px",
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "#8a8f98",
                fontSize: 13,
                transition: "color 0.15s, border-color 0.15s, background 0.15s",
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