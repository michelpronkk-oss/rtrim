"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  FolderKanban,
  History,
  Download,
  Zap,
  Link2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/app/sign-out-button";

const NAV_ITEMS = [
  { href: "/app",              label: "Overview",     icon: LayoutGrid   },
  { href: "/app/connect",      label: "Connect CLI",  icon: Link2        },
  { href: "/app/projects",     label: "Projects",     icon: FolderKanban },
  { href: "/app/runs",         label: "Runs",         icon: History      },
  { href: "/app/early-access", label: "Early Access", icon: Zap          },
  { href: "/app/install",      label: "Install",      icon: Download     },
];

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090b" }}>
      <div className="flex min-h-screen">

        {/* ── Desktop sidebar ── */}
        <aside
          className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col md:flex"
          style={{ background: "#0c0e11", borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
            <span style={{ ...MONO, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#f4f5f7" }}>
              runtrim
            </span>
          </div>

          {/* User row */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#111317" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 0 2px rgba(167,139,250,0.15)", display: "inline-block", flexShrink: 0 }} />
              <span className="min-w-0 flex-1 truncate" style={{ ...MONO, fontSize: 11.5, color: "#8a8f98" }}>
                {userEmail ?? "Dashboard"}
              </span>
              <span className="shrink-0 rounded px-1.5 py-0.5" style={{ ...MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5a5f68", border: "1px solid rgba(255,255,255,0.07)" }}>
                free
              </span>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-0.5 px-3 py-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100", !active && "hover:bg-white/[0.04]")}
                  style={active ? {
                    border: "1px solid rgba(167,139,250,0.22)",
                    background: "rgba(167,139,250,0.08)",
                    color: "#c9ccd2", fontSize: 13, fontWeight: 500,
                  } : {
                    border: "1px solid transparent",
                    color: "#5a5f68", fontSize: 13, fontWeight: 500,
                  }}
                >
                  <Icon className="size-4 shrink-0" style={{ color: active ? "#a78bfa" : "#3a3e46" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <SignOutButton />
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-2" style={{ ...MONO, fontSize: 11, color: "#3a3e46" }}>
              <Link href="/privacy"  className="transition-colors hover:text-[#8a8f98]">Privacy</Link>
              <Link href="/terms"    className="transition-colors hover:text-[#8a8f98]">Terms</Link>
              <Link href="/security" className="transition-colors hover:text-[#8a8f98]">Security</Link>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1" style={{ background: "#08090b" }}>

          {/* Mobile header */}
          <header
            className="relative z-40 md:hidden"
            style={{ background: "rgba(12,14,17,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/app" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" aria-hidden className="size-[22px] rounded" />
                <span style={{ ...MONO, fontSize: 13, fontWeight: 600, color: "#f4f5f7" }}>runtrim</span>
              </Link>

              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-app-nav"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="inline-flex size-9 items-center justify-center rounded-lg transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.09)", background: "#111317", color: "#8a8f98" }}
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>

            {/* Mobile drawer */}
            {mobileMenuOpen && (
              <div
                id="mobile-app-nav"
                className="px-3 pb-4 pt-3"
                style={{ background: "#0c0e11", borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {userEmail && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#111317" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block", flexShrink: 0 }} />
                    <span className="min-w-0 flex-1 truncate" style={{ ...MONO, fontSize: 11.5, color: "#8a8f98" }}>{userEmail}</span>
                    <span style={{ ...MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a5f68", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, padding: "1px 5px" }}>free</span>
                  </div>
                )}

                <nav className="space-y-0.5">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-3 transition-colors", !active && "hover:bg-white/[0.04]")}
                        style={active ? {
                          border: "1px solid rgba(167,139,250,0.22)",
                          background: "rgba(167,139,250,0.08)",
                          color: "#c9ccd2", fontSize: 14, fontWeight: 500,
                        } : {
                          border: "1px solid transparent",
                          color: "#5a5f68", fontSize: 14, fontWeight: 500,
                        }}
                      >
                        <Icon className="size-4 shrink-0" style={{ color: active ? "#a78bfa" : "#3a3e46" }} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <SignOutButton />
                </div>
              </div>
            )}
          </header>

          <main className="px-4 py-6 sm:px-8 sm:py-10 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
