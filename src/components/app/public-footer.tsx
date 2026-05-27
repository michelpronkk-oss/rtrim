import Link from "next/link";
import { RunTrimLogo } from "@/components/app/runtrim-logo";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const PRODUCT_LINKS = [
  { href: "/app/install", label: "Install" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/plans", label: "Plans" },
  { href: "/faq", label: "FAQ" },
  { href: "/changelog", label: "Changelog" },
  { href: "/status", label: "Status" },
  { href: "/security", label: "Security" },
];

const COMPANY_LINKS = [
  { href: "https://github.com/michelpronkk-oss/rtrim", label: "GitHub", ext: true },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mx-auto" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
        <div className="py-10 sm:py-12 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 items-start">
          <div>
            <RunTrimLogo size={20} />
            <p className="mt-2.5" style={{ ...MONO, fontSize: 11.5, color: "#727888", lineHeight: 1.6 }}>
              The protocol layer for AI coding agents.
            </p>

            <div className="mt-4 flex flex-col items-start gap-2" style={{ minWidth: 0 }}>
              <div
                className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 w-full sm:w-auto"
                style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.10)", minWidth: 0, overflow: "hidden" }}
              >
                <span style={{ ...MONO, fontSize: 11, color: "#a78bfa", flexShrink: 0 }}>$</span>
                <code style={{ ...MONO, fontSize: 11, color: "#c9ccd2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>npm install -g runtrim</code>
              </div>

              <Link
                href="/status"
                className="inline-flex items-center gap-2 transition-colors hover:border-[rgba(110,231,183,0.35)] hover:bg-[rgba(110,231,183,0.06)]"
                style={{
                  ...MONO,
                  fontSize: 11,
                  color: "#8fa39b",
                  letterSpacing: "0.04em",
                  height: 32,
                  padding: "0 12px",
                  border: "1px solid rgba(110,231,183,0.2)",
                  borderRadius: 6,
                  background: "#0c0e11",
                  flexShrink: 0,
                }}
              >
                <span className="rt-live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", display: "inline-block", flexShrink: 0 }} />
                Status: Operational
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:justify-items-end">
            <div>
              <p style={{ ...MONO, fontSize: 10.5, color: "#7b8190", letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</p>
              <div className="mt-3 space-y-2.5">
                {PRODUCT_LINKS.map(({ href, label }) => (
                  <Link key={label} href={href} style={{ fontSize: 13.5, color: "#9ca3b2", transition: "color 0.15s" }} className="block hover:text-[#f4f5f7]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p style={{ ...MONO, fontSize: 10.5, color: "#7b8190", letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</p>
              <div className="mt-3 space-y-2.5">
                {COMPANY_LINKS.map(({ href, label, ext }) =>
                  ext ? (
                    <a key={label} href={href} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: "#9ca3b2", transition: "color 0.15s" }} className="block hover:text-[#f4f5f7]">
                      {label}
                    </a>
                  ) : (
                    <Link key={label} href={href} style={{ fontSize: 13.5, color: "#9ca3b2", transition: "color 0.15s" }} className="block hover:text-[#f4f5f7]">
                      {label}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="py-5 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ ...MONO, fontSize: 10.5, color: "#5f6674" }}>
            © {new Date().getFullYear()} RunTrim. Bring your own agent. Run it with memory, scope, and control.
          </p>
          <p style={{ ...MONO, fontSize: 10.5, color: "#5f6674" }}>Free CLI. Source code never uploaded.</p>
        </div>
      </div>
    </footer>
  );
}
