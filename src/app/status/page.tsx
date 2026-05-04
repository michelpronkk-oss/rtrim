import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-[#08090b] text-[#f4f5f7]">

      {/* Nav */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(8,9,11,0.72)",
          backdropFilter: "saturate(140%) blur(12px)",
          WebkitBackdropFilter: "saturate(140%) blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="mx-auto flex items-center gap-7"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)", height: 60 }}
        >
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
            <span style={{ ...MONO, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
              runtrim
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-3">
            {[
              { href: "/",            label: "Home"      },
              { href: "/plans",       label: "Plans"     },
              { href: "/app/install", label: "Docs"      },
              { href: "/changelog",   label: "Changelog" },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{ fontSize: 13, color: "#8a8f98", padding: "7px 10px", borderRadius: 5, transition: "color 0.15s, background 0.15s" }}
                className="hover:text-[#f4f5f7] hover:bg-white/6"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <Link
            href="/app/install"
            style={{
              display: "inline-flex", alignItems: "center",
              height: 32, padding: "0 14px", borderRadius: 6,
              background: "#f4f5f7", color: "#0b0d10",
              fontSize: 13, fontWeight: 500, border: "1px solid #fff",
              transition: "background 0.15s",
            }}
            className="hover:bg-white"
          >
            Install CLI
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div
        className="py-14 sm:py-16"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#a78bfa", fontWeight: 500 }}>sys</span>
            System status
          </span>
          <h1
            className="mt-5"
            style={{ fontSize: "clamp(28px,3.6vw,40px)", lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, color: "#f4f5f7" }}
          >
            Current health for RunTrim web, dashboard sync, CLI protocol, and agent bridge.
          </h1>

          {/* Overall badge */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-[10px] px-4 py-3" style={{ border: "1px solid rgba(110,231,183,0.2)", background: "rgba(110,231,183,0.04)" }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#6ee7b7",
                boxShadow: "0 0 0 3px rgba(110,231,183,0.15), 0 0 10px rgba(110,231,183,0.3)",
                display: "inline-block", flexShrink: 0,
              }}
            />
            <span style={{ ...MONO, fontSize: 12, color: "#6ee7b7", fontWeight: 500, letterSpacing: "0.04em" }}>
              All systems normal
            </span>
          </div>

          {/* Last updated */}
          <p className="mt-5" style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>
            Updated manually during early access. Last check: May 2026.
          </p>
        </div>
      </div>

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-4 rounded" />
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
