import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07071A]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Home</Link>
            <Link href="/app/install" className="text-sm text-[#4D5070] transition-colors hover:text-[#EDEEFF]">Docs</Link>
          </nav>
          <Link
            href="/app/install"
            className="rounded-md bg-[#7C6DFA] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install CLI
          </Link>
        </div>
      </header>

      {/* Page header */}
      <div className="border-b border-white/8 bg-[#07071A]">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">Plans</p>
          <h1 className="text-[2.2rem] font-bold leading-[1.08] tracking-[-0.04em] text-[#EDEEFF] sm:text-[3rem]">
            Start local. Scale when it matters.
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-[1.75] text-[#5E6A88]">
            Free CLI works without an account. Pro, Builder, and Team are request-access plans for cloud history, auto-sync, memory, reports, and team control.
          </p>
          <div className="mx-auto mt-6 max-w-fit rounded-lg border border-[#F0BF72]/20 bg-[#F0BF72]/5 px-4 py-2.5">
            <p className="text-[12px] text-[#A8916A]">
              Payments are not self-serve yet. Pro, Builder, and Team access are reviewed manually during early access.
            </p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            const isFree = plan.id === "free";
            return (
              <div
                key={plan.id}
                className="relative flex flex-col overflow-hidden rounded-xl border bg-[#0C0C20]"
                style={{
                  borderColor: isPro
                    ? "rgba(124,109,250,0.40)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: isPro
                    ? "0 0 0 1px rgba(124,109,250,0.18), 0 8px 32px rgba(124,109,250,0.10)"
                    : undefined,
                }}
              >
                {/* Gradient top line on Pro */}
                {isPro && (
                  <div className="absolute inset-x-0 top-0 h-px brand-gradient" />
                )}

                {/* Card header */}
                <div className="border-b border-white/8 px-5 py-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold text-[#EDEEFF]">{plan.name}</p>
                    {plan.badge && (
                      <span
                        className="shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                        style={
                          isPro
                            ? { borderColor: "rgba(124,109,250,0.35)", background: "rgba(124,109,250,0.10)", color: "#C4B8FF" }
                            : { borderColor: "rgba(255,255,255,0.10)", background: "transparent", color: "#6870A0" }
                        }
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-2 text-[22px] font-bold tabular-nums tracking-tight"
                    style={{ color: isPro ? "#9E91FF" : "#EDEEFF" }}
                  >
                    {plan.priceLabel}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-[#5E6A88]">{plan.positioning}</p>
                </div>

                {/* Features */}
                <div className="flex-1 px-5 py-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[12px] text-[#B8C0D8]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[#7C6DFA]" />
                        {f}
                      </li>
                    ))}
                    {plan.missing && plan.missing.length > 0 && (
                      <>
                        <li className="pt-1">
                          <div className="h-px bg-white/6" />
                        </li>
                        {plan.missing.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[12px] text-[#3A4460]">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#2E3050]" />
                            {f}
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                </div>

                {/* CTA */}
                <div className="border-t border-white/8 px-5 py-4">
                  {isFree ? (
                    <Link
                      href="/app/install"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/12 px-4 py-2.5 text-[13px] font-medium text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                    >
                      {plan.ctaLabel}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity"
                      style={{
                        background: isPro ? "#7C6DFA" : "rgba(124,109,250,0.15)",
                        color: isPro ? "#ffffff" : "#9E91FF",
                        opacity: 0.85,
                      }}
                    >
                      {plan.ctaLabel}
                    </button>
                  )}
                  {plan.microcopy && (
                    <p className="mt-2 text-center font-mono text-[10px] text-[#2E2E50]">{plan.microcopy}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-[#2E2E50]">
          Payments are not self-serve yet. Request access and we will follow up.
        </p>
      </div>

      {/* Comparison table */}
      <div className="border-t border-white/8 bg-[#08081C]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-[1.4rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">Full comparison</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Column headers */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b border-white/8">
                <div className="px-4 py-3" />
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`px-4 py-3 ${plan.id === "pro" ? "bg-[#0D0C22]" : ""}`}>
                    <p className="text-[12px] font-bold text-[#EDEEFF]">{plan.name}</p>
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
                    style={{ background: i % 2 === 0 ? "#0A0A1C" : "#0C0C20" }}
                  >
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-[#9699BE]">{label}</p>
                    </div>
                    {cells.map((val, ci) => {
                      const isPro = ci === 1;
                      return (
                        <div key={ci} className={`flex items-center px-4 py-3 ${isPro ? "bg-[#0D0C22]" : ""}`}>
                          {val === true ? (
                            <Check className="size-3.5 text-[#7C6DFA]" />
                          ) : val === false ? (
                            <span className="size-2 rounded-sm bg-white/6" />
                          ) : (
                            <span className="font-mono text-[11px] text-[#6870A0]">{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* CTA row */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-t border-white/8 bg-[#07071A]">
                <div className="px-4 py-4">
                  <p className="text-[11px] text-[#2E2E50]">Source code stays local. Cloud sync stores metadata only.</p>
                </div>
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`flex items-center px-4 py-4 ${plan.id === "pro" ? "bg-[#0D0C22]" : ""}`}>
                    {plan.id === "free" ? (
                      <Link
                        href="/app/install"
                        className="rounded border border-white/10 px-3 py-1.5 text-[11px] text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
                      >
                        Install
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="cursor-not-allowed rounded px-3 py-1.5 text-[11px] font-medium text-[#9E91FF] opacity-70"
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
      <div className="border-t border-white/8 bg-[#07071A]">
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
                <p className="text-[14px] font-semibold text-[#EDEEFF]">{q}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#5E6A88]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-5 rounded" />
            <span className="text-sm font-bold text-[#EDEEFF]">RunTrim</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/app/install" className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Docs</Link>
            <Link href="/plans"       className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Plans</Link>
            <Link href="/app"         className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9699BE]">Dashboard</Link>
          </div>
          <span className="font-mono text-[11px] text-[#2E2E50]">Local-first. Source code never uploaded.</span>
        </div>
      </footer>
    </div>
  );
}
