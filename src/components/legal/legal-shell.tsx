import Link from "next/link";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  active: "privacy" | "terms" | "security";
  sections: LegalSection[];
}

const NAV_LINKS = [
  { href: "/privacy", label: "Privacy", key: "privacy" as const },
  { href: "/terms", label: "Terms", key: "terms" as const },
  { href: "/security", label: "Security", key: "security" as const },
];

const TRUST_ROWS = [
  { label: "Source code", value: "Not uploaded in V1" },
  { label: "Local CLI", value: "Stores data in .runtrim" },
  { label: "Cloud sync", value: "Metadata only" },
  { label: "Secrets", value: "Never intentionally collected" },
  { label: "Contact", value: "hello@runtrim.com" },
];

export function LegalShell({ title, subtitle, lastUpdated, active, sections }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <header className="border-b border-white/10 bg-[#090A1D]/96 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
              <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
            </Link>
            <nav className="hidden items-center gap-4 sm:flex">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    active === item.key
                      ? "bg-[#7C6DFA]/14 text-[#CFC8FF]"
                      : "text-[#7480A0] hover:text-[#EDEEFF]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#97A3BA] transition-colors hover:border-white/20 hover:text-[#EDEEFF] sm:inline-flex"
            >
              Homepage
            </Link>
            <Link
              href="/app/install"
              className="rounded-md bg-[#7C6DFA] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-12">
        <div className="rounded-xl border border-white/10 bg-[#0C0D22] p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7682A6]">RUNTRIM LEGAL</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#EDEEFF]">{title}</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#9DABC4]">{subtitle}</p>
          <p className="mt-4 text-[12px] text-[#6C7797]">Last updated: {lastUpdated}</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-4">
            {sections.map((section) => (
              <article key={section.title} className="rounded-xl border border-white/10 bg-[#0A0C1F] p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold text-[#EDEEFF]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-[14px] leading-7 text-[#B8C3D8]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-xl border border-white/10 bg-[#0B0C1F] p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-[#EDEEFF]">RunTrim trust model</h2>
            <div className="mt-4 space-y-3">
              {TRUST_ROWS.map((row) => (
                <div key={row.label} className="rounded-lg border border-white/8 bg-[#0F1228] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[#7A85A6]">{row.label}</p>
                  <p className="mt-1 text-[13px] text-[#CFD7E8]">{row.value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#080919]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#7C87A8]">
            <Link href="/privacy" className="transition-colors hover:text-[#C8C1FF]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[#C8C1FF]">Terms</Link>
            <Link href="/security" className="transition-colors hover:text-[#C8C1FF]">Security</Link>
            <a href="https://github.com/michelpronkk-oss/rtrim" target="_blank" rel="noreferrer" className="transition-colors hover:text-[#C8C1FF]">GitHub</a>
            <a href="mailto:hello@runtrim.com" className="transition-colors hover:text-[#C8C1FF]">Contact</a>
          </nav>
          <p className="font-mono text-[11px] text-[#4E5878]">{new Date().getFullYear()} RunTrim</p>
        </div>
      </footer>
    </div>
  );
}
