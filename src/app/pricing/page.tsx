import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | RunTrim",
  description:
    "RunTrim free CLI is live. Pro, Builder, and Team are in early access. Start local, scale when it matters.",
  alternates: { canonical: "https://www.runtrim.com/pricing" },
};

const PLANS = [
  {
    id:        "free",
    name:      "Free",
    price:     "$0",
    summary:   "Local CLI. No account required.",
    highlight: false,
    badge:     null,
    bullets: [
      "Local CLI — guard, check, report, history",
      "Bridge Mode: 5 runs per month",
      "Local project memory",
      "Token and cost estimates",
      "Basic reports",
      "Clean continuation prompts",
    ],
    cta:       "Install free CLI",
    ctaHref:   "/app/install",
    ctaStyle:  "border",
  },
  {
    id:        "pro",
    name:      "Pro",
    price:     "$12/month",
    summary:   "Unlimited Bridge Mode, cloud sync, and reports.",
    highlight: false,
    badge:     null,
    bullets: [
      "Unlimited Bridge Mode runs",
      "Cloud sync — run history and memory",
      "Continuation packs",
      "Weekly savings report",
      "Project memory across sessions",
      "Agent early access",
    ],
    cta:       "Request Pro access",
    ctaHref:   "/login",
    ctaStyle:  "border",
  },
  {
    id:        "builder",
    name:      "Builder",
    price:     "$29/month",
    summary:   "Advanced guardrails for serious builders.",
    highlight: true,
    badge:     "Recommended",
    bullets: [
      "Everything in Pro",
      "Unlimited projects",
      "Advanced scope drift detection",
      "Advanced risk scoring",
      "Custom forbidden-file rules",
      "Exportable run reports",
    ],
    cta:       "Request Builder access",
    ctaHref:   "/login",
    ctaStyle:  "fill",
  },
  {
    id:        "team",
    name:      "Team",
    price:     "from $99/month",
    summary:   "Shared workspace, policies, and audit logs.",
    highlight: false,
    badge:     null,
    bullets: [
      "Everything in Builder",
      "Shared run policies",
      "Team run history",
      "GitHub PR checks",
      "Audit logs",
      "Org-level budget rules",
    ],
    cta:       "Join waitlist",
    ctaHref:   "/login",
    ctaStyle:  "border",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#07071A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <Link href="/app/install"
                className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]">
            Install CLI
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">Pricing</p>
          <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-[#EDEEFF] sm:text-[2.6rem]">
            Start local. Scale when it matters.
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-[14px] leading-[1.75] text-[#5E6A88]">
            Free CLI works without an account. Pro, Builder, and Team are entering early access with unlimited Bridge Mode and cloud sync.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlight
                  ? "border-[#7C6DFA]/35 bg-[#0D0C22]"
                  : "border-white/8 bg-[#0C0C20]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-[#7C6DFA] via-[#9966FF] to-[#5B8BFF]" />
              )}
              {plan.badge && (
                <span className="mb-3 self-start rounded border border-[#7C6DFA]/30 bg-[#7C6DFA]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C4B8FF]">
                  {plan.badge}
                </span>
              )}

              <p className="text-[12px] font-semibold text-[#9699BE]">{plan.name}</p>
              <p className={`mt-1.5 text-[1.8rem] font-bold tabular-nums tracking-tight ${plan.highlight ? "text-[#9E91FF]" : "text-[#EDEEFF]"}`}>
                {plan.price}
              </p>
              <p className="mt-1.5 text-[11px] leading-4 text-[#4D5070]">{plan.summary}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12px] text-[#B8C0D8]">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-[#7C6DFA]" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Link
                  href={plan.ctaHref}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
                    plan.ctaStyle === "fill"
                      ? "bg-[#7C6DFA] text-white hover:opacity-85"
                      : "border border-white/10 text-[#9699BE] hover:border-white/20 hover:text-[#EDEEFF]"
                  }`}
                  style={plan.ctaStyle === "fill" ? { boxShadow: "0 4px 14px rgba(124,109,250,0.28)" } : undefined}
                >
                  {plan.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <div className="mt-10 space-y-1.5 text-center">
          <p className="text-[12px] text-[#2E3554]">
            Cloud sync stores run metadata only. Source code never leaves your machine.
          </p>
          <p className="text-[12px] text-[#2E3554]">
            Free Bridge Mode limit: 5 runs per calendar month. Unlimited on Pro and above.
          </p>
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
