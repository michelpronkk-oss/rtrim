import Link from "next/link";
import { PublicNav } from "@/components/app/public-nav";
import { RunTrimMark } from "@/components/app/runtrim-logo";

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

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const NAV_LINKS = [
  { href: "/privacy",  label: "Privacy",  key: "privacy"  as const },
  { href: "/terms",    label: "Terms",    key: "terms"    as const },
  { href: "/security", label: "Security", key: "security" as const },
];

const TRUST_ROWS = [
  { label: "Source code",  value: "Not uploaded in V1"             },
  { label: "Local CLI",    value: "Stores data in .runtrim"        },
  { label: "Cloud sync",   value: "Metadata only"                  },
  { label: "Secrets",      value: "Never intentionally collected"  },
  { label: "Contact",      value: "hello@runtrim.com"             },
];

export function LegalShell({ title, subtitle, lastUpdated, active, sections }: LegalShellProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#08090b", color: "#c9ccd2" }}>
      <PublicNav />

      {/* ── Hero — same grid/glow as all public pages ── */}
      <section
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
          padding: "clamp(48px,8vw,80px) 0 clamp(40px,6vw,64px)",
        }}
      >
        {/* Line grid */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)" }} />
        {/* Violet glow */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)" }} />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          {/* Legal sub-nav tabs */}
          <div className="flex items-center gap-1 mb-6">
            {NAV_LINKS.map(({ href, label, key }) => (
              <Link
                key={key}
                href={href}
                style={{
                  ...MONO,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "4px 10px",
                  borderRadius: 5,
                  transition: "color 0.15s, background 0.15s",
                  color: active === key ? "#f4f5f7" : "#5a5f68",
                  background: active === key ? "rgba(255,255,255,0.06)" : "transparent",
                  border: active === key ? "1px solid rgba(255,255,255,0.09)" : "1px solid transparent",
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Eyebrow */}
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 10px 4px 8px",
              border: "1px solid rgba(167,139,250,0.22)", borderRadius: 999,
              background: "rgba(167,139,250,0.06)",
              ...MONO, fontSize: 11, color: "#a78bfa",
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}
          >
            <span
              className="rt-violet-dot"
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", flexShrink: 0 }}
            />
            Legal
          </span>

          <h1
            style={{
              marginTop: 18, marginBottom: 0,
              fontSize: "clamp(30px, 4.5vw, 54px)",
              lineHeight: 1.05, letterSpacing: "-0.03em",
              fontWeight: 500, color: "#f4f5f7",
            }}
          >
            {title}
          </h1>
          <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.65, color: "#8a8f98", maxWidth: 560 }}>
            {subtitle}
          </p>
          <p style={{ marginTop: 10, ...MONO, fontSize: 11, color: "#3a3e46" }}>
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <main
        className="mx-auto"
        style={{ maxWidth: 1240, padding: "clamp(32px,6vw,64px) clamp(20px,4vw,40px) 80px" }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] items-start">

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section) => (
              <article
                key={section.title}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "#0c0e11",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "linear-gradient(180deg, #111317, #0c0e11)",
                  }}
                >
                  <h2 style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>
                    {section.title}
                  </h2>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      style={{ fontSize: 13.5, lineHeight: 1.7, color: "#8a8f98", marginBottom: 10 }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Trust sidebar */}
          <aside
            className="lg:sticky lg:top-[76px]"
            style={{
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "#0c0e11",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "linear-gradient(180deg, #111317, #0c0e11)",
              }}
            >
              <p style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Trust model
              </p>
            </div>
            <div style={{ padding: "8px 0" }}>
              {TRUST_ROWS.map(({ label, value }, i) => (
                <div
                  key={label}
                  style={{
                    padding: "9px 18px",
                    borderBottom: i < TRUST_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 13, color: "#c9ccd2", marginTop: 2 }}>{value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 0 40px" }}>
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-4"
          style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}
        >
          <RunTrimMark size={18} bg="#0c0e11" bgRadius={4} />
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/privacy",  label: "Privacy"  },
              { href: "/terms",    label: "Terms"     },
              { href: "/security", label: "Security"  },
              { href: "https://github.com/michelpronkk-oss/rtrim", label: "GitHub", ext: true },
              { href: "mailto:hello@runtrim.com", label: "Contact", ext: true },
            ].map(({ href, label, ext }) =>
              ext ? (
                <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                  style={{ fontSize: 12.5, color: "#5a5f68", transition: "color 0.15s" }}
                  className="hover:text-[#f4f5f7]">{label}</a>
              ) : (
                <Link key={label} href={href}
                  style={{ fontSize: 12.5, color: "#5a5f68", transition: "color 0.15s" }}
                  className="hover:text-[#f4f5f7]">{label}</Link>
              )
            )}
          </nav>
          <p style={{ ...MONO, fontSize: 10.5, color: "#3a3e46" }}>
            &copy; {new Date().getFullYear()} RunTrim
          </p>
        </div>
      </footer>
    </div>
  );
}
