"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  FolderKanban,
  History,
  CreditCard,
  Link2,
  MessagesSquare,
  Menu,
  X,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/app/sign-out-button";
import { RunTrimLogo } from "@/components/app/runtrim-logo";
import { NewRunModal } from "@/components/app/new-run-modal";

const NAV_ITEMS = [
  { href: "/app",               label: "Overview",      icon: LayoutGrid    },
  { href: "/app/connect",       label: "Connect CLI",   icon: Link2         },
  { href: "/app/projects",      label: "Projects",      icon: FolderKanban  },
  { href: "/app/runs",          label: "Runs",          icon: History       },
  { href: "/app/project-agent", label: "Project Agent", icon: MessagesSquare },
  { href: "/app/billing",       label: "Billing",       icon: CreditCard    },
];

const PAGE_LABELS: Record<string, string> = {
  "/app":               "Overview",
  "/app/connect":       "Connect CLI",
  "/app/projects":      "Projects",
  "/app/runs":          "Runs",
  "/app/project-agent": "Project Agent",
  "/app/billing":       "Billing",
};

function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  for (const [prefix, label] of Object.entries(PAGE_LABELS)) {
    if (prefix !== "/app" && pathname.startsWith(prefix)) return label;
  }
  return "Dashboard";
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  plan?: string;
  planStatus?: string;
  hasConnectedCli?: boolean;
}

const PLAN_BADGE_STYLE: Record<string, React.CSSProperties> = {
  free:    { color: "#5a5f68", border: "1px solid rgba(255,255,255,0.07)" },
  pro:     { color: "#a78bfa", border: "1px solid rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.10)" },
  builder: { color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.28)", background: "rgba(110,231,183,0.08)" },
  team:    { color: "#f5a524", border: "1px solid rgba(245,165,36,0.28)",  background: "rgba(245,165,36,0.08)"  },
};

function planBadgeLabel(plan: string, planStatus: string | undefined): string {
  if (plan === "pro" && planStatus === "trialing") return "Pro Trial";
  if (plan === "pro")     return "Pro";
  if (plan === "builder") return "Builder";
  if (plan === "team")    return "Team";
  return "Free";
}

export function AppShell({ children, userEmail, plan = "free", planStatus, hasConnectedCli = false }: AppShellProps) {
  const pathname      = usePathname();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [newRunOpen,  setNewRunOpen]  = useState(false);

  const badgeStyle  = PLAN_BADGE_STYLE[plan] ?? PLAN_BADGE_STYLE.free;
  const badgeLabel  = planBadgeLabel(plan, planStatus);
  const isFree      = plan === "free";
  const visibleNav  = isFree
    ? NAV_ITEMS.filter((item) => item.href === "/app/billing")
    : NAV_ITEMS;

  const username    = userEmail ? userEmail.split("@")[0] : "dashboard";
  const pageLabel   = getPageLabel(pathname);

  function isActive(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090b" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Desktop sidebar ───────────────────────────────────────── */}
        <aside
          className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col md:flex"
          style={{
            background: "#0c0e11",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "18px 14px 16px",
            gap: 18,
          }}
        >
          {/* Brand */}
          <Link
            href="/app"
            style={{
              display: "inline-flex", alignItems: "baseline", gap: 10,
              padding: "6px 8px",
              textDecoration: "none",
            }}
          >
            <RunTrimLogo size={20} />
          </Link>

          {/* User pill */}
          <Link
            href="/app/billing"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 7,
              background: "#111317",
              textDecoration: "none",
              minWidth: 0,
            }}
          >
            {/* Green LED — account online */}
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: "#6ee7b7",
              boxShadow: "0 0 6px #6ee7b7",
            }} />
            <span
              className="min-w-0 flex-1 truncate"
              style={{ ...MONO, fontSize: 11.5, color: "#c9ccd2", letterSpacing: "-0.005em" }}
            >
              {userEmail ?? "dashboard"}
            </span>
            <span
              className="shrink-0 rounded"
              style={{ ...MONO, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, ...badgeStyle }}
            >
              {badgeLabel}
            </span>
          </Link>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {visibleNav.map((item) => {
              const Icon   = item.icon;
              const active = isActive(item.href);
              const isRuns = item.href === "/app/runs";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: active ? "7px 10px 7px 8px" : "7px 10px",
                    borderLeft: active ? "2px solid #a78bfa" : "2px solid transparent",
                    borderRadius: active ? "0 6px 6px 0" : 6,
                    background: active ? "rgba(167,139,250,0.08)" : "transparent",
                    color: active ? "#f4f5f7" : "#5a5f68",
                    fontSize: 13, fontWeight: 450,
                    letterSpacing: "-0.005em",
                    textDecoration: "none",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  className={cn(!active && "hover:bg-white/[0.03] hover:text-[#c9ccd2]")}
                >
                  <Icon
                    size={14}
                    style={{ flexShrink: 0, opacity: active ? 1 : 0.55, color: active ? "#a78bfa" : "currentColor" }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isRuns && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7",
                      flexShrink: 0,
                      animation: "rt-led-pulse 1.8s ease-in-out infinite",
                    }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <SignOutButton />
            <div style={{ display: "flex", gap: 12, padding: "6px 8px 2px" }}>
              {(["Privacy", "Terms", "Security"] as const).map((l) => (
                <Link
                  key={l}
                  href={`/${l.toLowerCase()}`}
                  style={{ ...MONO, fontSize: 10, color: "#3a3e46", letterSpacing: "0.06em", textDecoration: "none", transition: "color 0.12s" }}
                  className="hover:text-[#8a8f98]"
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 flex flex-col" style={{ background: "#08090b" }}>

          {/* Desktop topbar */}
          <header
            className="hidden md:flex sticky top-0 z-30 items-center gap-3"
            style={{
              height: 56,
              padding: "0 28px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(8,9,11,0.72)",
              backdropFilter: "saturate(140%) blur(12px)",
              WebkitBackdropFilter: "saturate(140%) blur(12px)",
            }}
          >
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5a5f68" }}>
              <span style={{ color: "#f4f5f7", fontWeight: 500 }}>{username}</span>
              <span style={{ color: "#3a3e46" }}>/</span>
              <span>{pageLabel}</span>
            </div>

            {/* Search */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 12px",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 7,
                background: "#0c0e11",
                minWidth: 260,
                cursor: "text",
              }}
            >
              <Search size={12} style={{ color: "#5a5f68", flexShrink: 0 }} />
              <span style={{ ...MONO, fontSize: 12, color: "#3a3e46", flex: 1 }}>
                Search runs, contracts, agents…
              </span>
              <span style={{
                ...MONO, fontSize: 10,
                padding: "1px 6px",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 3, color: "#3a3e46",
              }}>
                ⌘K
              </span>
            </div>

            {/* CLI status pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              ...MONO, fontSize: 11, letterSpacing: "0.06em",
              color: hasConnectedCli ? "#8a8f98" : "#f5a524",
              padding: "5px 10px",
              border: `1px solid ${hasConnectedCli ? "rgba(255,255,255,0.10)" : "rgba(245,165,36,0.28)"}`,
              borderRadius: 999,
              background: hasConnectedCli ? "#0c0e11" : "rgba(245,165,36,0.06)",
              flexShrink: 0,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: hasConnectedCli ? "#6ee7b7" : "#f5a524",
                boxShadow: `0 0 6px ${hasConnectedCli ? "#6ee7b7" : "#f5a524"}`,
                flexShrink: 0,
              }} />
              {hasConnectedCli ? "CLI connected" : "CLI not connected"}
            </div>

            {/* New run CTA */}
            <button
              type="button"
              onClick={() => setNewRunOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                height: 32, padding: "0 12px",
                borderRadius: 6,
                background: "#f4f5f7", color: "#0b0d10",
                fontSize: 13, fontWeight: 500,
                border: "1px solid #fff",
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              className="hover:bg-white"
            >
              <Plus size={11} strokeWidth={2.5} />
              New run
            </button>
          </header>

          {/* Mobile header */}
          <header
            className="relative z-40 md:hidden"
            style={{
              background: "rgba(12,14,17,0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
              <Link href="/app" onClick={() => setMobileOpen(false)}>
                <RunTrimLogo size={20} />
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setNewRunOpen(true)}
                  aria-label="New run"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 7,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "#111317", color: "#f4f5f7",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-app-nav"
                  onClick={() => setMobileOpen((o) => !o)}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 7,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "#111317", color: "#8a8f98",
                    cursor: "pointer",
                  }}
                >
                  {mobileOpen ? <X size={15} /> : <Menu size={15} />}
                </button>
              </div>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
              <div
                id="mobile-app-nav"
                style={{ padding: "12px 12px 16px", background: "#0c0e11", borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {userEmail && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 10px", marginBottom: 10,
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 7, background: "#111317",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", boxShadow: "0 0 6px #6ee7b7", flexShrink: 0 }} />
                    <span className="min-w-0 flex-1 truncate" style={{ ...MONO, fontSize: 11.5, color: "#8a8f98" }}>{userEmail}</span>
                    <span style={{ ...MONO, fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, flexShrink: 0, ...badgeStyle }}>
                      {badgeLabel}
                    </span>
                  </div>
                )}

                <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visibleNav.map((item) => {
                    const Icon   = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px",
                          borderLeft: active ? "2px solid #a78bfa" : "2px solid transparent",
                          borderRadius: active ? "0 8px 8px 0" : 8,
                          background: active ? "rgba(167,139,250,0.08)" : "transparent",
                          color: active ? "#f4f5f7" : "#5a5f68",
                          fontSize: 14, fontWeight: 500,
                          textDecoration: "none",
                        }}
                      >
                        <Icon size={15} style={{ flexShrink: 0, color: active ? "#a78bfa" : "#3a3e46" }} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <SignOutButton />
                </div>
              </div>
            )}
          </header>

          {/* Page content */}
          <main className="px-4 pb-16 pt-6 sm:px-8 sm:pt-8 xl:px-10">
            {children}
          </main>
        </div>
      </div>

      {/* New Run Modal */}
      <NewRunModal
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        hasConnectedCli={hasConnectedCli}
      />
    </div>
  );
}
