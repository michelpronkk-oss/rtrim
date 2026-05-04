import Link from "next/link";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const NAV_LINKS = [
  { href: "/",            label: "Home"      },
  { href: "/#protocol",   label: "Protocol"  },
  { href: "/plans",       label: "Plans"     },
  { href: "/app/install", label: "Docs"      },
  { href: "/changelog",   label: "Changelog" },
];

export function PublicNav() {
  return (
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
        {/* Logo */}
        <Link href="/" aria-label="RunTrim" className="flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
          <span style={{ ...MONO, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
            runtrim
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-3">
          {NAV_LINKS.map(({ href, label }) => (
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

        {/* Status badge */}
        <Link
          href="/status"
          className="hidden sm:inline-flex items-center gap-2 transition-colors hover:border-white/18"
          style={{
            ...MONO, fontSize: 11, color: "#8a8f98",
            padding: "5px 10px",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 999,
            background: "#0c0e11",
          }}
        >
          <span
            className="rt-live-dot"
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#6ee7b7",
              display: "inline-block",
            }}
          />
          v0.7 · all systems normal
        </Link>

        {/* Primary CTA */}
        <Link
          href="/app/install"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
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
  );
}
