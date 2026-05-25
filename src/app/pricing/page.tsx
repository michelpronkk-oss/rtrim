import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { ProCheckoutButton } from "@/components/app/pro-checkout-button";

export const metadata: Metadata = {
  title: "Pricing | RunTrim — Free CLI, Pro, Builder, Team",
  description:
    "RunTrim pricing: Free local CLI forever, Pro at $29/month for cloud sync and run history, Builder at $49/month for founders shipping daily with AI agents, Team from $24/seat. No account required to start.",
  alternates: { canonical: "https://www.runtrim.com/pricing" },
  openGraph: {
    title: "RunTrim Pricing — Free CLI, Pro, Builder, Team",
    description:
      "Start free with the local CLI. Upgrade to Pro for cloud sync and dashboard run history. Builder for founders. Team for shared governance and audit logs.",
    url: "https://www.runtrim.com/pricing",
    type: "website",
    siteName: "RunTrim",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RunTrim Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim Pricing — Free CLI, Pro, Builder, Team",
    description:
      "Start free with the local CLI. Upgrade to Pro for cloud sync and run history.",
    images: ["/opengraph-image"],
  },
};

const PLANS = [
  {
    id:        "free",
    name:      "Free",
    price:     "$0",
    summary:   "Local control for individual AI coding runs.",
    highlight: false,
    badge:     null,
    bullets: [
      "Local guarded runs",
      "Project setup",
      "Scope, memory and finish checks",
      "Local restore for latest guarded run (CLI preview/apply)",
      "Local run history",
      "Sensitive file warnings",
      "No account required",
    ],
    cta:       "Install free CLI",
    ctaHref:   "/app/install",
    ctaStyle:  "border",
  },
  {
    id:        "pro",
    name:      "Pro",
    price:     "$29/month",
    summary:   "Personal agent control with synced memory and cloud history.",
    highlight: true,
    badge:     "Recommended",
    bullets: [
      "Everything in Free",
      "Cloud sync dashboard",
      "Synced restore metadata and recovery visibility",
      "Memory sync",
      "Synced reports",
      "Restore metadata history",
      "Savings/history reports",
      "3-day trial",
    ],
    cta:       "Start 3-day Pro trial",
    ctaHref:   "/app/trial",
    ctaStyle:  "fill",
  },
  {
    id:        "builder",
    name:      "Builder",
    price:     "$49/month",
    summary:   "For founders shipping production code with AI agents daily.",
    highlight: false,
    badge:     null,
    bullets: [
      "Everything in Pro",
      "Unlimited projects",
      "Multi-project restore history and recovery direction",
      "Pro reports",
      "Priority Run Compiler and advanced guardrails",
      "Higher run and history limits",
      "Early access to advanced integrations",
    ],
    cta:       "Upgrade to Builder",
    ctaHref:   "mailto:hello@runtrim.com?subject=RunTrim%20Team%20plan",
    ctaStyle:  "border",
  },
  {
    id:        "team",
    name:      "Team",
    price:     "from $24/seat",
    summary:   "Shared control for teams using AI coding agents.",
    highlight: false,
    badge:     null,
    bullets: [
      "Everything in Builder",
      "Shared team state",
      "Shared memory",
      "Approvals",
      "Shared restore logs and audit-ready recovery direction",
      "Audit logs",
      "Team policies and GitHub checks (coming soon)",
    ],
    cta:       "Contact for Team",
    ctaHref:   "/login",
    ctaStyle:  "border",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <header className="border-b border-white/8 bg-[#07071A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
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
        <div className="mb-14 text-center">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">Pricing</p>
          <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-[#EDEEFF] sm:text-[2.6rem]">
            The control plans for AI coding agents.
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[14px] leading-[1.75] text-[#5E6A88]">
            Start local with Free, move to Pro for synced personal workflows, then scale to Builder and Team controls.
          </p>
        </div>

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
                {plan.id === "pro" ? (
                  <ProCheckoutButton
                    planId="pro"
                    label="Start 3-day Pro trial"
                    className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all bg-[#7C6DFA] text-white hover:opacity-85 disabled:opacity-60"
                  />
                ) : plan.id === "team" ? (
                  <a
                    href={plan.ctaHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all border border-white/10 text-[#9699BE] hover:border-white/20 hover:text-[#EDEEFF]"
                  >
                    {plan.cta}
                    <ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all border border-white/10 text-[#9699BE] hover:border-white/20 hover:text-[#EDEEFF]"
                  >
                    {plan.cta}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-1.5 text-center">
          <p className="text-[12px] text-[#2E3554]">
            Cloud sync stores run metadata only. Source code never leaves your machine.
          </p>
          <p className="text-[12px] text-[#2E3554]">
            Restore apply happens locally through the CLI. Dashboard shows restore metadata and recovery guidance.
          </p>
          <p className="text-[12px] text-[#2E3554]">
            Team policies, GitHub checks, and approval workflows are next-stage team controls.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-[13px] text-[#4D5070] transition-colors hover:text-[#9E91FF]">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
