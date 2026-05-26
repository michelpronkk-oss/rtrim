import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";
import { BuilderCtaButton } from "@/components/app/builder-cta-button";
import { MotionCard, MotionFade, MotionButton, CountUpPrice } from "@/components/app/motion-section";

export const metadata: Metadata = {
  title: "Plans",
  description:
    "Compare RunTrim plans for AI coding agent control. Free CLI for local-only runs. Pro for cloud sync and run history. Builder for founders shipping production code daily with AI agents. Team for shared policies and audit logs.",
  alternates: { canonical: "https://www.runtrim.com/plans" },
  openGraph: {
    title: "RunTrim Plans - Free, Pro, Builder, Team",
    description:
      "Free CLI for local agent control. Pro for cloud sync and run history. Builder for production founders. Team for shared governance and audit logs.",
    url: "https://www.runtrim.com/plans",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RunTrim Plans" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim Plans - Free, Pro, Builder, Team",
    description:
      "Free CLI for local agent control. Pro for cloud sync. Builder for founders. Team for governance.",
    images: ["/opengraph-image"],
  },
};

// Plan definitions

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: null,
    priceLabel: "Free",
    countTo: undefined as number | undefined,
    pricePrefix: "",
    priceSuffix: "",
    badge: null,
    positioning: "Local control for individual AI coding runs.",
    microcopy: "No account required. Runs stay local.",
    ctaLabel: "Install free CLI",
    ctaHref: "/app/install",
    ctaVariant: "secondary" as const,
    features: [
      "Unlimited local runs",
      "Memory, scope and finish checks",
      "All supported agents",
      "Local run history",
      "Local restore for latest 5 restore-capable points",
    ],
    missing: [
      "No cloud sync",
      "No dashboard history",
      "No team features",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: null,
    priceLabel: "$29 / month",
    countTo: 29,
    pricePrefix: "$",
    priceSuffix: " / month",
    badge: "Recommended",
    positioning: "Personal agent control with synced memory, cloud history and recovery metadata.",
    microcopy: "3-day trial. Cancel anytime.",
    ctaLabel: "Start 3-day Pro trial",
    ctaHref: null,
    ctaVariant: "primary" as const,
    features: [
      "Everything in Free",
      "Auto-sync dashboard",
      "Cloud run history",
      "Memory sync",
      "Synced restore metadata",
      "Savings and history reports",
    ],
    missing: [],
  },
  {
    id: "builder",
    name: "Builder",
    price: null,
    priceLabel: "$49 / month",
    countTo: 49,
    pricePrefix: "$",
    priceSuffix: " / month",
    badge: "Serious projects",
    positioning: "Advanced guardrails for founders shipping production code with AI agents daily.",
    microcopy: null,
    ctaLabel: "Get Builder",
    ctaHref: null,
    ctaVariant: "secondary" as const,
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Proof and drift reports",
      "Priority guardrails",
      "Multi-project memory",
      "Advanced recovery history",
    ],
    missing: [],
  },
  {
    id: "team",
    name: "Team",
    price: null,
    priceLabel: "From $24 / seat",
    countTo: 24,
    pricePrefix: "From $",
    priceSuffix: " / seat",
    badge: "Reviewed access",
    positioning: "Shared control for teams using AI coding agents.",
    microcopy: "Team access is reviewed.",
    ctaLabel: "Contact for Team",
    ctaHref: null,
    ctaVariant: "secondary" as const,
    features: [
      "Everything in Builder",
      "Shared team state",
      "Approvals and audit logs",
      "Shared recovery logs",
      "GitHub checks and policies, coming soon",
    ],
    missing: [],
  },
] as const;

// Comparison table rows

const TABLE_ROWS = [
  { label: "Local CLI",               free: true,       pro: true,       builder: true,        team: true        },
  { label: "Project setup (runtrim start)", free: true,  pro: true,       builder: true,        team: true        },
  { label: "Guarded agent runs",      free: "limited",  pro: "unlimited",builder: "unlimited", team: "unlimited" },
  { label: "Run history",             free: "local",    pro: "cloud",    builder: "cloud",     team: "cloud"     },
  { label: "Continuation packs",      free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Auto-sync dashboard",     free: false,      pro: true,       builder: true,        team: true        },
  { label: "Cloud reports",           free: false,      pro: true,       builder: true,        team: true        },
  { label: "Restore apply",           free: "local cli",pro: "local cli",builder: "local cli", team: "local cli" },
  { label: "Restore metadata",        free: "local",    pro: "synced",   builder: "multi-project", team: "shared logs" },
  { label: "Project memory",          free: "local",    pro: "synced",   builder: "synced",    team: "synced"    },
  { label: "Tracked projects",        free: "1 local",  pro: "1 synced", builder: "unlimited", team: "unlimited" },
  { label: "Scope drift detection",   free: false,      pro: false,      builder: true,        team: true        },
  { label: "Advanced risk scoring",   free: false,      pro: false,      builder: true,        team: true        },
  { label: "Forbidden file controls", free: false,      pro: false,      builder: true,        team: true        },
  { label: "Exportable reports",      free: false,      pro: false,      builder: true,        team: true        },
  { label: "Team policies",           free: false,      pro: false,      builder: false,       team: "planned"   },
  { label: "Shared workspace",        free: false,      pro: false,      builder: false,       team: true        },
  { label: "Audit logs",              free: false,      pro: false,      builder: false,       team: "planned"   },
  { label: "GitHub checks",           free: false,      pro: false,      builder: false,       team: "planned"   },
];

// Page

export default function PlansPage() {
  return (
    <div className="rt-page-in min-h-screen bg-[#08090b] text-[#f4f5f7]">

      <PublicNav />

      {/* Page hero - same visual treatment as homepage hero */}
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
          <MotionFade delay={0}>
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
          </MotionFade>

          <MotionFade delay={0.06}>
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
          </MotionFade>

          <MotionFade delay={0.12}>
            <p
              className="mx-auto mt-5"
              style={{ fontSize: 17, lineHeight: 1.6, color: "#c9ccd2", maxWidth: 520 }}
            >
              Free CLI works without an account. Pro starts with a 3-day trial. Builder is for high-volume founder workflows. Team adds shared controls with next-stage policies and checks.
            </p>
          </MotionFade>

          <MotionFade delay={0.18}>
            <div
              className="mx-auto mt-5 inline-flex rounded-[8px] px-4 py-2.5"
              style={{ border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}
            >
              <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11.5, color: "#a78bfa" }}>
                Pro includes a free 3-day trial. Builder and Team are available on-demand.
              </p>
            </div>
          </MotionFade>
        </div>
      </section>

      {/* Plan cards */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* align-items: stretch (default grid) makes all cards equal row height.
            Each card uses flex-col so features (flex-1) grow and CTA sits at bottom. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
          {PLANS.map((plan, i) => {
            const isPro = plan.id === "pro";
            const isFree = plan.id === "free";
            return (
              <MotionCard
                key={plan.id}
                delay={i * 0.07}
                className="relative flex h-full flex-col rounded-[10px] overflow-hidden"
                style={{
                  background: isPro
                    ? "radial-gradient(160% 80% at 0% 0%, rgba(167,139,250,0.08), transparent 60%), #0c0e11"
                    : "#0c0e11",
                  border: `1px solid ${isPro ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
                }}
              >
                {/* Card header */}
                <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: 176 }}>
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
                    <CountUpPrice
                      to={plan.countTo}
                      prefix={plan.pricePrefix}
                      suffix={plan.priceSuffix}
                      label={plan.countTo === undefined ? plan.priceLabel : undefined}
                      delay={i * 0.07 + 0.1}
                    />
                  </p>
                  <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.5, color: "#8a8f98", minHeight: 78 }}>{plan.positioning}</p>
                </div>

                {/* Features */}
                <div className="flex-1 px-5 py-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5" style={{ fontSize: 12.5, color: "#c9ccd2" }}>
                        <span style={{ marginTop: 5, width: 5, height: 5, borderRadius: 1, background: isPro ? "#a78bfa" : "#6b7280", flexShrink: 0, display: "inline-block" }} />
                        {f}
                      </li>
                    ))}
                    {plan.missing && plan.missing.length > 0 && (
                      <>
                        <li className="pt-1">
                          <div className="h-px bg-white/10" />
                        </li>
                        {plan.missing.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[12px] text-[#3a3e46]">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#3a3e46]" />
                            {f}
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                </div>

                {/* CTA */}
                <div className="mt-auto px-5 pb-5 min-h-[74px] flex flex-col justify-end">
                  {isFree ? (
                    <Link
                      href="/app/install"
                      className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f4f5f7]"
                    >
                      Install free CLI
                    </Link>
                  ) : isPro ? (
                    <ProCheckoutButton
                      label="Start 3-day Pro trial"
                      className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white disabled:opacity-60"
                    />
                  ) : (
                    plan.id === "builder" ? (
                      <BuilderCtaButton className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]" />
                    ) : (
                      <a
                        href="mailto:hello@runtrim.com?subject=RunTrim%20Team%20plan"
                        className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors border border-white/14 text-[#f4f5f7] hover:bg-[#16191e]"
                      >
                        Contact for Team
                      </a>
                    )
                  )}
                  <p
                    className={`mt-2 text-center font-mono text-[10px] ${plan.microcopy ? "text-[#3a3e46]" : "text-transparent"}`}
                    aria-hidden={!plan.microcopy}
                  >
                    {plan.microcopy ?? "placeholder"}
                  </p>
                </div>
              </MotionCard>
            );
          })}
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-[#3a3e46]">
          Pro is self-serve with a 3-day trial. Builder requires active Pro. Team is reviewed access.
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
                        className="inline-flex h-8 items-center justify-center rounded border border-white/10 px-3 text-[11px] text-[#8a8f98] transition-colors hover:border-white/20 hover:text-[#f4f5f7]"
                      >
                        Install free CLI
                      </Link>
                    ) : plan.id === "pro" ? (
                      <ProCheckoutButton
                        label="Start 3-day Pro trial"
                        className="inline-flex h-8 items-center justify-center rounded px-3 text-[11px] font-medium transition-colors bg-[#f4f5f7] text-[#0b0d10] border border-white hover:bg-white disabled:opacity-60"
                      />
                    ) : plan.id === "builder" ? (
                      <BuilderCtaButton className="inline-flex h-8 items-center justify-center rounded border border-white/14 px-3 text-[11px] font-medium text-[#f4f5f7] transition-colors hover:bg-[#16191e]" />
                    ) : (
                      <a
                        href="mailto:hello@runtrim.com?subject=RunTrim%20Team%20plan"
                        className="inline-flex h-8 items-center justify-center rounded border border-white/14 px-3 text-[11px] font-medium text-[#f4f5f7] transition-colors hover:bg-[#16191e]"
                      >
                        Contact for Team
                      </a>
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
                a: "Pro, Builder, and Team plans are live and available now.",
              },
              {
                q: "Does RunTrim upload my source code?",
                a: "No. The free CLI runs entirely locally. Cloud sync in paid plans uploads run metadata only, not file contents or environment values.",
              },
              {
                q: "What is the primary RunTrim flow?",
                a: "Use runtrim start, runtrim doctor, runtrim agent \"task\" --copy, then runtrim finish.",
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

      <PublicFooter />
    </div>
  );
}
