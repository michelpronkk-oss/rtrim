import type { Metadata } from "next";
import Link from "next/link";
import { RunTrimMark } from "@/components/app/runtrim-logo";
import { Check, ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { SmartCta } from "@/components/app/smart-cta";

export const metadata: Metadata = {
  title: "Plans | RunTrim",
  description:
    "RunTrim plans. Free CLI runs locally. Pro, Builder, and Team are request-access plans for cloud history, auto-sync, memory, reports, and team control.",
  alternates: { canonical: "https://www.runtrim.com/plans" },
};

// ── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: null,
    priceLabel: "Free",
    badge: null,
    positioning: "Try RunTrim locally.",
    microcopy: "No account required. Runs stay local.",
    ctaLabel: "Install Free CLI",
    ctaHref: "/app/install",
    ctaVariant: "secondary" as const,
    features: [
      "Local CLI",
      "runtrim init",
      "Limited Bridge Mode runs",
      "Local run history",
      "Basic local reports",
      "Basic memory and continuation",
    ],
    missing: [
      "No cloud dashboard",
      "No unlimited auto-sync",
      "No team features",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: null,
    priceLabel: "Early access",
    badge: "Recommended",
    positioning: "For solo builders using AI coding every day.",
    microcopy: null,
    ctaLabel: "Request Pro access",
    ctaHref: null,
    ctaVariant: "primary" as const,
    features: [
      "Unlimited Bridge Mode",
      "Auto-sync dashboard",
      "Synced run history",
      "Cloud reports",
      "Project memory",
      "Continuation packs",
      "Token and cost savings",
      "Faster daily AI coding workflow",
    ],
    missing: [],
  },
  {
    id: "builder",
    name: "Builder",
    price: null,
    priceLabel: "Early access",
    badge: "Serious projects",
    positioning: "For founders, freelancers, and agencies.",
    microcopy: null,
    ctaLabel: "Request Builder access",
    ctaHref: null,
    ctaVariant: "secondary" as const,
    features: [
      "Everything in Pro",
      "Multiple projects",
      "Advanced scope drift detection",
      "Advanced risk scoring",
      "Forbidden file controls",
      "Project timelines",
      "Exportable reports",
      "Stronger project memory",
      "Client/project audit trail",
    ],
    missing: [],
  },
  {
    id: "team",
    name: "Team",
    price: null,
    priceLabel: "Reviewed access",
    badge: "Reviewed access",
    positioning: "For teams running AI agents across real codebases.",
    microcopy: null,
    ctaLabel: "Request Team access",
    ctaHref: null,
    ctaVariant: "secondary" as const,
    features: [
      "Everything in Builder",
      "Shared workspace",
      "Team policies",
      "Team-level run history",
      "Governance for AI-assisted development",
      "Approval gates (planned)",
      "GitHub checks (planned)",
      "Audit logs (planned)",
    ],
    missing: [],
  },
] as const;

// ── Comparison table rows ─────────────────────────────────────────────────────

const TABLE_ROWS = [
  { label: "Local CLI",               free: true,       pro: true,       builder: true,        team: true        },
  { label: "runtrim init",            free: true,       pro: true,       builder: true,        team: true        },
  { label: "Bridge Mode runs",        free: "limited",  pro: "unlimited",builder: "unlimited", team: "unlimited" },
  { label: "Run history",             free: "local",    pro: "cloud",    builder: "cloud",     team: "cloud"     },
  { label: "Continuation packs",      free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Auto-sync dashboard",     free: false,      pro: true,       builder: true,        team: true        },
  { label: "Cloud reports",           free: false,      pro: true,       builder: true,        team: true        },
  { label: "Project memory",          free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Tracked projects",        free: "1 local",  pro: "1 synced", builder: "unlimited", team: "unlimited" },
  { label: "Scope drift detection",   free: false,      pro: false,      builder: true,        team: true        },
  { label: "Advanced risk scoring",   free: false,      pro: false,      builder: true,        team: true        },
  { label: "Forbidden file controls", free: false,      pro: false,      builder: true,        team: true        },
  { label: "Exportable reports",      free: false,      pro: false,      builder: true,        team: true        },
  { label: "Team policies",           free: false,      pro: false,      builder: false,       team: true        },
  { label: "Shared workspace",        free: false,      pro: false,      builder: false,       team: true        },
  { label: "Audit logs",              free: false,      pro: false,      builder: false,       team: "planned"   },
  { label: "GitHub checks",           free: false,      pro: false,      builder: false,       team: "planned"   },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">

      <PublicNav />

      {/* Page hero — same visual treatment as homepage hero */}
      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Line grid */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />
        {/* Violet glow */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)",
          }}
        />

        <div className="mx-auto relative z-10 text-center" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          {/* Eyebrow */}
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 10px 4px 8px",
              border: "1px solid rgba(167,139,250,0.22)",
              borderRadius: 999,
              background: "rgba(167,139,250,0.06)",
              fontFamily: "var(--font-geist-mono)", fontSize: 11,
              color: "#a78bfa", letterSpacing: "0.07em", textTransform: "uppercase",
            }}
          >
            <span
              className="rt-violet-dot"
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", flexShrink: 0 }}
            />
            Plans
          </span>

          <h1
            className="mt-5"
            style={{
              fontSize: "clamp(34px, 5.4vw, 62px)",
              lineHeight: 1.04, letterSpacing: "-0.033em",
              fontWeight: 500, color: "#f4f5f7",
            }}
          >
            Start local.{" "}
            <em style={{ fontStyle: "normal", color: "#8a8f98" }}>Scale to a team.</em>
          </h1>

          <p
            className="mx-auto mt-5"
            style={{ fontSize: 17, lineHeight: 1.6, color: "#c9ccd2", maxWidth: 520 }}
          >
            Free CLI works without an account. Pro, Builder, and Team are request-access plans for cloud history, auto-sync, memory, reports, and team control.
          </p>

          <div
            className="mx-auto mt-5 inline-flex rounded-[8px] px-4 py-2.5"
            style={{ border: "1px solid rgba(245,165,36,0.2)", background: "rgba(245,165,36,0.04)" }}
          >
            <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11.5, color: "#a8916a" }}>
              Payments are not self-serve yet. Access is reviewed manually during early access.
            </p>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* align-items: stretch (default grid) makes all cards equal row height.
            Each card uses flex-col so features (flex-1) grow and CTA sits at bottom. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            const isFree = plan.id === "free";
            return (
              <div
                key={plan.id}
                className="relative flex flex-col rounded-[10px] overflow-hidden"
                style={{
                  background: isPro
                    ? "radial-gradient(160% 80% at 0% 0%, rgba(167,139,250,0.08), transparent 60%), #0c0e11"
                    : "#0c0e11",
                  border: `1px solid ${isPro ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
                }}
              >
                {/* Card header */}
                <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono)", fontSize: 11,
                        color: isPro ? "#a78bfa" : "#5a5f68",
                        textTransform: "uppercase", letterSpacing: "0.1em",
                      }}
                    >
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span
                        className="shrink-0 rounded px-2 py-0.5"
                        style={{
                          fontFamily: "var(--font-geist-mono)", fontSize: 10,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                          ...(isPro
                            ? { border: "1px solid rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.08)", color: "#a78bfa" }
                            : { border: "1px solid rgba(255,255,255,0.09)", background: "transparent", color: "#5a5f68" })
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-2.5"
                    style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em", color: "#f4f5f7" }}
                  >
                    {plan.priceLabel}
                  </p>
                  <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.5, color: "#8a8f98" }}>{plan.positioning}</p>
                </div>

                {/* Features */}
                <div className="flex-1 px-5 py-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5" style={{ fontSize: 12.5, color: "#c9ccd2" }}>
                        <span style={{ marginTop: 5, width: 5, height: 5, borderRadius: 1, background: isPro ? "#a78bfa" : "#5a5f68", flexShrink: 0, display: "inline-block" }} />
                        {f}
                      </li>
                    ))}
                    {plan.missing && plan.missing.length > 0 && (
                      <>
                        <li className="pt-1">
                          <div className="h-px bg-white/6" />
                        </li>
                        {plan.missing.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[12px] text-[#3a3e46]">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#2E3050]" />
                            {f}
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                </div>

                {/* CTA */}
                <div className="mt-auto px-5 pb-5">
                  {isFree ? (
                    <Link
                      href="/app/install"
                      className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors hover:bg-[#16191e] hover:text-[#f4f5f7]"
                      style={{ border: "1px solid rgba(255,255,255,0.14)", color: "#8a8f98" }}
                    >
                      {plan.ctaLabel}
                      <ArrowRight className="size-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <SmartCta
                      label={plan.ctaLabel}
                      variant={plan.id === "builder" ? "builder" : "pro"}
                      className={
                        isPro
                          ? "inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white"
                          : "inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                      }
                      openAppLabel="Open dashboard"
                      openAppClassName={`inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors ${isPro ? "bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white" : "border border-[rgba(167,139,250,0.3)] bg-[rgba(167,139,250,0.07)] text-[#a78bfa] hover:bg-[rgba(167,139,250,0.12)]"}`}
                    />
                  )}
                  {plan.microcopy && (
                    <p className="mt-2 text-center font-mono text-[10px] text-[#3a3e46]">{plan.microcopy}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-[#3a3e46]">
          Payments are not self-serve yet. Request access and we will follow up.
        </p>
      </div>

      {/* Comparison table */}
      <div className="border-t border-white/6 bg-[#0e1116]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-[1.4rem] font-bold tracking-[-0.03em] text-[#f4f5f7]">Full comparison</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Column headers */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b border-white/6">
                <div className="px-4 py-3" />
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`px-4 py-3 ${plan.id === "pro" ? "bg-[#0c0e11]" : ""}`}>
                    <p className="text-[12px] font-bold text-[#f4f5f7]">{plan.name}</p>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {TABLE_ROWS.map(({ label, free, pro, builder, team }, i) => {
                const cells = [free, pro, builder, team];
                return (
                  <div
                    key={label}
                    className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] ${i < TABLE_ROWS.length - 1 ? "border-b border-white/6" : ""}`}
                    style={{ background: i % 2 === 0 ? "#08090b" : "#0c0e11" }}
                  >
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-[#8a8f98]">{label}</p>
                    </div>
                    {cells.map((val, ci) => {
                      const isPro = ci === 1;
                      return (
                        <div key={ci} className={`flex items-center px-4 py-3 ${isPro ? "bg-[#0c0e11]" : ""}`}>
                          {val === true ? (
                            <Check className="size-3.5 text-[#7C6DFA]" />
                          ) : val === false ? (
                            <span className="size-2 rounded-sm bg-white/6" />
                          ) : (
                            <span className="font-mono text-[11px] text-[#5a5f68]">{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* CTA row */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-t border-white/6 bg-[#08090b]">
                <div className="px-4 py-4">
                  <p className="text-[11px] text-[#3a3e46]">Source code stays local. Cloud sync stores metadata only.</p>
                </div>
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`flex items-center px-4 py-4 ${plan.id === "pro" ? "bg-[#0c0e11]" : ""}`}>
                    {plan.id === "free" ? (
                      <Link
                        href="/app/install"
                        className="rounded border border-white/10 px-3 py-1.5 text-[11px] text-[#8a8f98] transition-colors hover:border-white/20 hover:text-[#f4f5f7]"
                      >
                        Install
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="cursor-not-allowed rounded px-3 py-1.5 text-[11px] font-medium text-[#a78bfa] opacity-70"
                        style={{ background: "rgba(124,109,250,0.10)", border: "1px solid rgba(124,109,250,0.20)" }}
                      >
                        Request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ-style note */}
      <div className="border-t border-white/6 bg-[#08090b]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              {
                q: "When will paid plans open?",
                a: "Pro, Builder, and Team are being rolled out to early access users. Request access and we will follow up directly.",
              },
              {
                q: "Does RunTrim upload my source code?",
                a: "No. The free CLI runs entirely locally. Cloud sync in paid plans uploads run metadata only, not file contents or environment values.",
              },
              {
                q: "What is Bridge Mode?",
                a: "Bridge Mode is the core workflow: runtrim go prepares a guarded prompt and runtrim finish checks the result. It works with Claude Code, Codex, Cursor, or any agent you can paste into.",
              },
              {
                q: "Does RunTrim replace my agent?",
                a: "No. RunTrim sits between you and your agent as a control layer. Bring your own agent. Run it through RunTrim first.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-[14px] font-semibold text-[#f4f5f7]">{q}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#8a8f98]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer — matches homepage footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 0 56px", color: "#5a5f68" }}>
        <div
          className="mx-auto grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}
        >
          <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#5a5f68", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 10 }}>
            <RunTrimMark size={16} bg="#0c0e11" bgRadius={3} />
              runtrim · plans · local-first AI run control
          </div>
          <div className="flex gap-[18px]">
            {[
              { href: "/",            label: "Home"      },
              { href: "/app/install", label: "Docs"      },
              { href: "/app",         label: "Dashboard" },
              { href: "/privacy",     label: "Privacy"   },
            ].map(({ href, label }) => (
              <Link key={label} href={href} style={{ fontSize: 12.5, color: "#5a5f68", transition: "color 0.15s" }} className="hover:text-[#f4f5f7]">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
