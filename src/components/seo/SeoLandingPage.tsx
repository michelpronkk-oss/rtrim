import Link from "next/link";
import { ArrowRight, Check, X, Shield } from "lucide-react";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { RUNTRIM_SITE_URL, SeoLandingPageData, seoPages } from "@/lib/seo-pages";

type SeoLandingPageProps = {
  page: SeoLandingPageData;
};

function breadcrumbJsonLd(page: SeoLandingPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "RunTrim",
        item: RUNTRIM_SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: page.h1,
        item: `${RUNTRIM_SITE_URL}/${page.slug}`,
      },
    ],
  };
}

function pageUrl(slug: string): string {
  return `${RUNTRIM_SITE_URL}/${slug}`;
}

const AGENTS = ["Claude Code", "Cursor", "Codex CLI", "ChatGPT"];

export function SeoLandingPage({ page }: SeoLandingPageProps) {
  const relatedPages = page.relatedSlugs
    .map((slug) => seoPages[slug])
    .filter((item): item is SeoLandingPageData => Boolean(item));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07071A] text-[#EDEEFF]">
      <FaqJsonLd faqs={page.faqs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(page)) }}
      />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090A1D]/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/how-it-works" data-rt-event="how_it_works_clicked" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">How it works</Link>
            <Link href="/app/install" data-rt-event="docs_clicked" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">Install</Link>
            <Link href="/security" className="text-sm text-[#7380A3] transition-colors hover:text-[#EDEEFF]">Security</Link>
          </nav>
          <Link
            href="/app/install"
            data-rt-event="install_cta_clicked"
            className="shrink-0 rounded-md bg-[#7C6DFA] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install CLI
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0C0D22] p-7 sm:p-10">
          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Violet glow — rises from bottom */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
            style={{
              background: "radial-gradient(ellipse 80% 100% at 50% 110%, rgba(124,109,250,0.22) 0%, transparent 65%)",
            }}
          />
          {/* Top gradient rule */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent 10%, rgba(124,109,250,0.55) 40%, rgba(153,102,255,0.55) 60%, transparent 90%)" }}
          />

          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7F8BAA]">{page.eyebrow}</p>
            <h1 className="mt-3 text-[1.9rem] font-bold leading-[1.1] tracking-[-0.035em] text-[#EDEEFF] sm:text-[2.5rem]">
              {page.h1}
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-[1.8] text-[#8A97B4]">{page.subheadline}</p>

            {/* Agent pills */}
            <div className="mt-5 flex flex-wrap gap-2">
              {AGENTS.map((agent) => (
                <span
                  key={agent}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-[10px] tracking-[0.04em] text-[#50586E]"
                >
                  {agent}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/app/install"
                data-rt-event="install_cta_clicked"
                className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ boxShadow: "0 4px 18px rgba(124,109,250,0.32)" }}
              >
                Install CLI
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/how-it-works"
                data-rt-event="how_it_works_clicked"
                className="rounded-lg border border-white/10 px-5 py-2.5 text-[13px] font-medium text-[#8A97B4] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
              >
                See how it works
              </Link>
            </div>
          </div>
        </section>

        {/* ── Problem + Why ──────────────────────────────────── */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-white/8 bg-[#0C0C20] p-5 sm:p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4D5070]">01 / The problem</p>
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">What goes wrong</h2>
            <ul className="mt-4 space-y-3">
              {page.problem.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-[#FF6B6B]/10">
                    <X className="size-2.5 text-[#FF6B6B]/80" />
                  </span>
                  <span className="text-[13px] leading-[1.65] text-[#8A97B4]">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-white/8 bg-[#0C0C20] p-5 sm:p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4D5070]">02 / Root cause</p>
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">Why this happens</h2>
            <ul className="mt-4 space-y-3">
              {page.whyThisHappens.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-[#7C6DFA]/10">
                    <span className="size-1.5 rounded-full bg-[#7C6DFA]/70" />
                  </span>
                  <span className="text-[13px] leading-[1.65] text-[#8A97B4]">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Manual vs RunTrim (side by side) ───────────────── */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Manual — warm amber tint */}
          <section className="rounded-xl border border-[#B06020]/18 bg-[#0D0B09] p-5 sm:p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6A5040]">03 / Without RunTrim</p>
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">Manual workaround</h2>
            <ol className="mt-4 space-y-3">
              {page.manualWorkflow.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border border-[#B06020]/20 bg-[#130C06] font-mono text-[10px] text-[#8C6040]">
                    {index + 1}
                  </span>
                  <span className="text-[13px] leading-[1.65] text-[#7A8498]">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* RunTrim — purple tint */}
          <section className="rounded-xl border border-[#7C6DFA]/22 bg-[#0A0920] p-5 sm:p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5090]">04 / With RunTrim</p>
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">RunTrim workflow</h2>
            {page.runtrimWorkflow.map((block) => (
              <div key={block.title} className="mt-4 overflow-hidden rounded-lg border border-white/8">
                {/* Terminal title bar */}
                <div className="flex items-center gap-2 border-b border-white/6 bg-[#07071A] px-3 py-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#FF5F57]/55" />
                    <span className="size-2.5 rounded-full bg-[#FFBD2E]/55" />
                    <span className="size-2.5 rounded-full bg-[#28CA41]/55" />
                  </div>
                  <span className="ml-1 font-mono text-[10px] text-white/18">runtrim</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#7C6DFA]" />
                    <span className="font-mono text-[9px] text-[#7C6DFA]/55">local</span>
                  </div>
                </div>
                {/* Commands with $ prefix */}
                <div className="bg-[#080816] px-4 py-3.5 font-mono text-[12px] leading-[2]">
                  {block.commands.map((cmd) => (
                    <div key={cmd} className="flex gap-2">
                      <span className="select-none text-[#7C6DFA]/45">$</span>
                      <span className="text-[#C8D4E0]">{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* ── Privacy ────────────────────────────────────────── */}
        <section className="mt-4 rounded-xl border border-white/8 bg-[#0C0C20] p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <Shield className="size-4 text-[#7C6DFA]/70" />
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">Privacy and trust</h2>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {page.privacyPoints.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#7C6DFA]" />
                <span className="text-[13px] leading-[1.65] text-[#8A97B4]">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="mt-4 rounded-xl border border-white/8 bg-[#0C0C20] p-5 sm:p-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4D5070]">05 / FAQ</p>
          <h2 className="text-[18px] font-semibold text-[#EDEEFF]">Common questions</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-white/6 bg-[#090918] p-4">
                <h3 className="text-[13px] font-semibold leading-snug text-[#C8CCF0]">{faq.question}</h3>
                <p className="mt-2 text-[12px] leading-[1.75] text-[#5E6A88]">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Related resources ──────────────────────────────── */}
        {relatedPages.length > 0 && (
          <section className="mt-4 rounded-xl border border-white/8 bg-[#0C0C20] p-5 sm:p-6">
            <h2 className="text-[18px] font-semibold text-[#EDEEFF]">Related resources</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {relatedPages.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  className="group rounded-lg border border-white/6 bg-[#090918] p-4 transition-colors hover:border-white/14 hover:bg-[#0A0A1E]"
                >
                  <p className="text-[12px] font-semibold leading-snug text-[#A7B2C6] transition-colors group-hover:text-[#EDEEFF]">
                    {item.h1}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.6] text-[#404860]">
                    {item.subheadline}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Final CTA ──────────────────────────────────────── */}
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0C0D22] p-7 sm:p-10">
          {/* Glow */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
            style={{ background: "radial-gradient(ellipse 80% 100% at 50% 110%, rgba(124,109,250,0.20) 0%, transparent 65%)" }}
          />
          {/* Top gradient rule */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent 10%, rgba(124,109,250,0.55) 40%, rgba(153,102,255,0.55) 60%, transparent 90%)" }}
          />

          <div className="relative">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-[2rem]">
              {page.finalCtaTitle}
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-[1.75] text-[#5E6A88]">{page.finalCtaBody}</p>

            {/* Install terminal */}
            <div className="mt-6 max-w-sm overflow-hidden rounded-lg border border-[#7C6DFA]/25 bg-[#090918]">
              <div className="flex items-center gap-2 border-b border-white/6 bg-[#07071A] px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-[#FF5F57]/55" />
                  <span className="size-2 rounded-full bg-[#FFBD2E]/55" />
                  <span className="size-2 rounded-full bg-[#28CA41]/55" />
                </div>
                <span className="ml-1 font-mono text-[10px] text-white/18">terminal</span>
              </div>
              <div className="px-4 py-3 font-mono text-[12.5px] leading-[2]">
                <div className="flex gap-2">
                  <span className="select-none text-[#7C6DFA]/45">$</span>
                  <span className="text-[#C8D4E0]">npm install -g runtrim</span>
                </div>
                <div className="flex gap-2">
                  <span className="select-none text-[#7C6DFA]/45">$</span>
                  <span className="text-[#C8D4E0]">runtrim start</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/app/install"
                data-rt-event="install_cta_clicked"
                className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ boxShadow: "0 4px 18px rgba(124,109,250,0.32)" }}
              >
                Install CLI
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/how-it-works"
                data-rt-event="how_it_works_clicked"
                className="rounded-lg border border-white/10 px-5 py-2.5 text-[13px] font-medium text-[#8A97B4] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] text-[#252540]">
              Free in V1 · No account required · Local-first · Agent-agnostic
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/6 bg-[#050514]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-[12px] text-[#333550] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>RunTrim Free CLI is live and local-first.</p>
          <p>Cloud sync and hosted dashboard are Pro early access.</p>
          <a href={pageUrl(page.slug)} className="text-[#404860] transition-colors hover:text-[#7C6DFA]">
            {pageUrl(page.slug)}
          </a>
        </div>
      </footer>
    </div>
  );
}
