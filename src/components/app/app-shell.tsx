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
    <div className="min-h-screen bg-[#07071A]">
      <div className="flex min-h-screen">

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/8 bg-[#08081E] md:flex">
          <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded-md" />
            <span className="text-[14px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </div>

          <div className="border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0E1027] px-3 py-2.5">
              <div className="size-1.5 rounded-full bg-[#7C6DFA]" />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#9699BE]">
                {userEmail ?? "Dashboard"}
              </span>
              <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7F84AE]">
                free
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3 py-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-100",
                    active
                      ? "border border-[#7C6DFA]/25 bg-[#7C6DFA]/12 text-[#D3CBFF]"
                      : "border border-transparent text-[#7F84AE] hover:border-white/8 hover:bg-white/5 hover:text-[#C3C6E8]"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#B2A7FF]" : "text-[#6A6F96]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/8 px-4 py-4">
            <SignOutButton />
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-[#626A94]">
              <Link href="/privacy" className="transition-colors hover:text-[#B9B2FF]">Privacy</Link>
              <Link href="/terms"   className="transition-colors hover:text-[#B9B2FF]">Terms</Link>
              <Link href="/security" className="transition-colors hover:text-[#B9B2FF]">Security</Link>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="min-w-0 flex-1 bg-[#0A0A1F]">

          {/* Mobile header — compact: logo + wordmark + hamburger only */}
          <header className="relative z-40 border-b border-white/8 bg-[#08081E]/95 backdrop-blur md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/app" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded-md" />
                <span className="text-[14px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
              </Link>

              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-app-nav"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-[#0E1027] text-[#AAB0D2] transition-colors hover:border-white/18 hover:text-[#EDEEFF]"
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>

            {/* Slide-down drawer */}
            {mobileMenuOpen && (
              <div
                id="mobile-app-nav"
                className="border-t border-white/8 bg-[#080919] px-3 pb-4 pt-3"
              >
                {/* Account row inside drawer — keeps header clean */}
                {userEmail && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/8 bg-[#0E1027] px-3 py-2.5">
                    <div className="size-1.5 shrink-0 rounded-full bg-[#7C6DFA]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-[#9699BE]">{userEmail}</span>
                    <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[#7F84AE]">
                      free
                    </span>
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
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium transition-colors",
                          active
                            ? "border border-[#7C6DFA]/25 bg-[#7C6DFA]/12 text-[#D3CBFF]"
                            : "border border-transparent text-[#8D92B6] hover:border-white/8 hover:bg-white/4 hover:text-[#C3C6E8]"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-[#B2A7FF]" : "text-[#6A6F96]")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-3 border-t border-white/8 pt-3">
                  <SignOutButton />
                </div>
              </div>
            )}
          </header>

          {/* Page content */}
          <main className="px-4 py-6 sm:px-8 sm:py-10 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
