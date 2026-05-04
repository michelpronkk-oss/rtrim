import type { Metadata } from "next";
import Link from "next/link";
import { RunTrimMark } from "@/components/app/runtrim-logo";
import { ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";

export const metadata: Metadata = {
  title: "Changelog | RunTrim",
  description: "Product updates for the RunTrim protocol, Bridge Mode, dashboard sync, and agent workflows.",
  alternates: { canonical: "https://www.runtrim.com/changelog" },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const RELEASES = [
  {
    version: "0.1.11",
    title: "Automatic cloud sync for Bridge runs",
    date: "May 2026",
    items: [
      "runtrim go now auto-syncs started runs when connected",
      "runtrim finish auto-syncs completed reports",
      "manual runtrim sync remains available as fallback",
      "failed syncs stay local and can be retried",
    ],
  },
  {
    version: "0.1.10",
    title: "Safe resting state for agent protocols",
    date: "May 2026",
    items: [
      "finished runs restore RUNTRIM.md to canonical protocol mode",
      "latest contract resets to Status: none after finish",
      "current memory resets after finish",
      "agents entering between sessions are told to start a new runtrim go contract",
    ],
  },
  {
    version: "0.1.9",
    title: "Protocol installer and agent pointers",
    date: "May 2026",
    items: [
      "runtrim init installs RUNTRIM.md, project policies, memory baseline, and agent pointers",
      "supports CLAUDE.md, AGENTS.md, and Cursor rules",
      "repo becomes RunTrim-aware after one command",
    ],
  },
  {
    version: "0.1.8",
    title: "Bridge Mode",
    date: "May 2026",
    items: [
      "runtrim go creates scoped contracts before AI agents touch code",
      "runtrim finish checks changed files, risk, proof gaps, and continuation",
      "works with Claude Code, Codex, Cursor, ChatGPT, and prompt-based agents",
    ],
  },
  {
    version: "0.1.6",
    title: "Public CLI release",
    date: "May 2026",
    items: [
      "public npm install flow",
      "local run history",
      "basic savings reports",
      "project-level run files",
    ],
  },
] as const;

export default function ChangelogPage() {
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
              border: "1px solid rgba(167,139,250,0.22)", borderRadius: 999,
              background: "rgba(167,139,250,0.06)",
              fontFamily: "var(--font-geist-mono)", fontSize: 11,
              color: "#a78bfa", letterSpacing: "0.07em", textTransform: "uppercase",
            }}
          >
            <span className="rt-violet-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", flexShrink: 0 }} />
            Changelog
          </span>

          <h1
            className="mt-5"
            style={{ fontSize: "clamp(20px, 2.4vw, 30px)", lineHeight: 1.4, letterSpacing: "-0.018em", fontWeight: 500, color: "#f4f5f7", maxWidth: 640 }}
          >
            Product updates for the RunTrim protocol, Bridge Mode, dashboard sync, and agent workflows.
          </h1>

          <p className="mt-5" style={{ fontSize: 17, lineHeight: 1.6, color: "#c9ccd2", maxWidth: 520 }}>
            RunTrim is in early access. Updates ship fast.
          </p>
        </div>
      </section>

      {/* Release timeline */}
      <div className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-5">
            {RELEASES.map(({ version, title, date, items }, idx) => (
              <div
                key={version}
                className="relative"
              >
                {/* Vertical timeline connector */}
                {idx < RELEASES.length - 1 && (
                  <div
                    className="absolute left-[13px] top-[48px] bottom-[-20px] w-px hidden sm:block"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                )}

                <div
                  className="rounded-[10px]"
                  style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Card header */}
                  <div
                    className="flex flex-wrap items-center gap-3 px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {/* Version pill */}
                    <span
                      className="rounded px-2 py-0.5"
                      style={{
                        ...MONO,
                        fontSize: 11,
                        color: "#a78bfa",
                        background: "rgba(167,139,250,0.08)",
                        border: "1px solid rgba(167,139,250,0.22)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      v{version}
                    </span>

                    <h2
                      style={{ fontSize: 15, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.01em", flex: 1 }}
                    >
                      {title}
                    </h2>

                    <span style={{ ...MONO, fontSize: 11, color: "#3a3e46", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                      {date}
                    </span>
                  </div>

                  {/* Items */}
                  <ul className="px-5 py-4 space-y-2.5">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3"
                        style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.55 }}
                      >
                        <span
                          style={{
                            marginTop: 6,
                            width: 4, height: 4,
                            borderRadius: 1,
                            background: "#5a5f68",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ ...MONO, fontSize: 12.5 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Older note */}
          <p className="mt-8 text-center" style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>
            Earlier releases were pre-public. Changelog starts at v0.1.6.
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
              runtrim · changelog
          </div>
          <div className="flex gap-[18px]">
            {[
              { href: "/",          label: "Home"    },
              { href: "/plans",     label: "Plans"   },
              { href: "/status",    label: "Status"  },
              { href: "/privacy",   label: "Privacy" },
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
