import type { Metadata } from "next";
import Link from "next/link";
import { RunTrimMark } from "@/components/app/runtrim-logo";
import { ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";

export const metadata: Metadata = {
  title: "Status | RunTrim",
  description: "Current health for RunTrim web, dashboard sync, CLI protocol, and agent bridge.",
  alternates: { canonical: "https://www.runtrim.com/status" },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const STATUS_GROUPS = [
  {
    name: "Website",
    status: "Operational",
    desc: "Public site, plans, install, and docs pages.",
  },
  {
    name: "Dashboard",
    status: "Operational",
    desc: "App dashboard, run history, projects, and reports.",
  },
  {
    name: "CLI sync",
    status: "Operational",
    desc: "Login, cloud sync, and automatic run sync.",
  },
  {
    name: "Bridge Mode",
    status: "Operational",
    desc: "runtrim init, runtrim go, runtrim finish, and local protocol files.",
  },
  {
    name: "Early access",
    status: "Operational",
    desc: "Request access, Pro, Builder, and Team review flow.",
  },
];

export default function StatusPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">

      <PublicNav />

      {/* Hero */}
      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)" }} />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 10px 4px 8px",
              border: "1px solid rgba(110,231,183,0.22)", borderRadius: 999,
              background: "rgba(110,231,183,0.04)",
              fontFamily: "var(--font-geist-mono)", fontSize: 11,
              color: "#6ee7b7", letterSpacing: "0.07em", textTransform: "uppercase",
            }}
          >
            <span className="rt-live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }} />
            System status
          </span>

          <h1
            className="mt-5"
            style={{ fontSize: "clamp(34px, 5.4vw, 62px)", lineHeight: 1.04, letterSpacing: "-0.033em", fontWeight: 500, color: "#f4f5f7", maxWidth: 760 }}
          >
            Current health for RunTrim web, dashboard sync, CLI protocol, and agent bridge.
          </h1>

          <div className="mt-6 inline-flex items-center gap-3 rounded-[10px] px-4 py-3" style={{ border: "1px solid rgba(110,231,183,0.2)", background: "rgba(110,231,183,0.04)" }}>
            <span className="rt-live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }} />
            <span style={{ ...MONO, fontSize: 12, color: "#6ee7b7", fontWeight: 500, letterSpacing: "0.04em" }}>All systems normal</span>
          </div>

          <p className="mt-4" style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>
            Updated manually during early access. Last check: May 2026.
          </p>
        </div>
      </section>

      {/* Status groups */}
      <div className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-6 space-y-3">
          {STATUS_GROUPS.map(({ name, status, desc }) => (
            <div
              key={name}
              className="flex items-start justify-between gap-6 rounded-[10px] px-5 py-4"
              style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="min-w-0">
                <p style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>
                  {name}
                </p>
                <p className="mt-1" style={{ fontSize: 13, color: "#5a5f68" }}>
                  {desc}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 pt-0.5">
                <span
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#6ee7b7",
                    boxShadow: "0 0 6px rgba(110,231,183,0.5)",
                    display: "inline-block",
                  }}
                />
                <span style={{ ...MONO, fontSize: 11, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident history */}
      <div
        className="py-10 sm:py-12"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <p style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
            Incident history
          </p>
          <div
            className="rounded-[10px] px-5 py-4"
            style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p style={{ fontSize: 13, color: "#5a5f68" }}>
              No incidents reported.
            </p>
          </div>
          <p className="mt-6" style={{ ...MONO, fontSize: 11, color: "#3a3e46", lineHeight: 1.7 }}>
            This page is currently maintained manually during early access. Automated uptime monitoring is not yet connected.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="py-14 sm:py-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "radial-gradient(800px 400px at 50% 0%, rgba(109,76,242,0.07), transparent 60%)" }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p style={{ fontSize: 18, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.015em", lineHeight: 1.4 }}>
            Before any AI agent touches your code, run it through RunTrim.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/app/install"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 38, padding: "0 16px", borderRadius: 7,
                background: "#f4f5f7", color: "#0b0d10",
                fontSize: 13, fontWeight: 500, border: "1px solid #fff",
                transition: "background 0.15s",
              }}
              className="group hover:bg-white"
            >
              Install free CLI
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/plans"
              style={{
                display: "inline-flex", alignItems: "center",
                height: 38, padding: "0 16px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent", color: "#8a8f98",
                fontSize: 13, transition: "color 0.15s, border-color 0.15s, background 0.15s",
              }}
              className="hover:text-[#f4f5f7] hover:border-white/28 hover:bg-[#111317]"
            >
              Request access
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 0 56px" }}>
        <div
          className="mx-auto grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}
        >
          <div style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 10 }}>
            <RunTrimMark size={16} bg="#0c0e11" bgRadius={3} />
              runtrim · system status
          </div>
          <div className="flex gap-[18px]">
            {[
              { href: "/",            label: "Home"       },
              { href: "/plans",       label: "Plans"      },
              { href: "/changelog",   label: "Changelog"  },
              { href: "/privacy",     label: "Privacy"    },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{ fontSize: 12.5, color: "#5a5f68", transition: "color 0.15s" }}
                className="hover:text-[#f4f5f7]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
