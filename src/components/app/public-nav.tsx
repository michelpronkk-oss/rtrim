"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { RunTrimLogo } from "@/components/app/runtrim-logo";
import { needsPaymentUpdate, trialEligible } from "@/lib/billing-cta";

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

const DROPDOWN_LINKS = [
  { href: "/#protocol",   label: "How it works" },
  { href: "/plans",       label: "Pricing"      },
  { href: "/changelog",   label: "Changelog"    },
  { href: "/app/install", label: "Docs"         },
];

// ── Mobile CTA state ──────────────────────────────────────────────────────────

type MobileCtaState =
  | "checking"
  | "logged-out"
  | "payment-issue"
  | "free"
  | "free-trial-used"
  | "active-pro"
  | "active-builder"
  | "active-team";

function useMobileCtaState(): MobileCtaState {
  const [state, setState] = useState<MobileCtaState>("checking");

  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then((d: {
        loggedIn: boolean;
        plan: string;
        planStatus: string | null;
        paymentSubscriptionId: string | null;
      }) => {
        if (!d.loggedIn) { setState("logged-out"); return; }
        if (needsPaymentUpdate(d.planStatus)) { setState("payment-issue"); return; }

        const isActive =
          d.planStatus === "active" || d.planStatus === "trialing";

        if (d.plan === "team"    && isActive) { setState("active-team");    return; }
        if (d.plan === "builder" && isActive) { setState("active-builder"); return; }
        if (d.plan === "pro"     && isActive) { setState("active-pro");     return; }

        if (trialEligible({ plan: d.plan, planStatus: d.planStatus, paymentSubscriptionId: d.paymentSubscriptionId })) {
          setState("free");
        } else {
          setState("free-trial-used");
        }
      })
      .catch(() => setState("logged-out"));
  }, []);

  return state;
}

type Cta = { label: string; href: string; style: "primary" | "secondary" };

function getPrimary(state: MobileCtaState): Cta | null {
  switch (state) {
    case "checking":        return null;
    case "payment-issue":   return { label: "Update payment method", href: "/app/billing",  style: "primary" };
    case "logged-out":      return { label: "Install free CLI",      href: "/app/install",  style: "primary" };
    case "free":            return { label: "Upgrade to Pro",        href: "/app/trial",    style: "primary" };
    case "free-trial-used": return { label: "Upgrade to Pro",        href: "/app/billing",  style: "primary" };
    case "active-pro":      return { label: "Open dashboard",        href: "/app",          style: "primary" };
    case "active-builder":  return { label: "Open dashboard",        href: "/app",          style: "primary" };
    case "active-team":     return { label: "Open dashboard",        href: "/app",          style: "primary" };
  }
}

function getSecondary(state: MobileCtaState): Cta | null {
  switch (state) {
    case "logged-out":      return { label: "Sign in",            href: "/login",       style: "secondary" };
    case "free":            return { label: "Docs",               href: "/app/install", style: "secondary" };
    case "free-trial-used": return { label: "Docs",               href: "/app/install", style: "secondary" };
    case "active-pro":      return { label: "Upgrade to Builder", href: "/app/billing", style: "secondary" };
    default:                return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PublicNav() {
  const [open,   setOpen]   = useState(false);
  const [hidden, setHidden] = useState(false);
  const ctaState = useMobileCtaState();

  // Hide on scroll-down, reveal on scroll-up
  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;

    function onScroll() {
      const y = window.scrollY;
      if (y < 10) {
        setHidden(false);
      } else if (y > lastY + 5) {
        setHidden(true);
        setOpen(false);
      } else if (y < lastY - 5) {
        setHidden(false);
      }
      lastY = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const primary   = getPrimary(ctaState);
  const secondary = getSecondary(ctaState);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(8,9,11,0.88)",
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.25s ease",
        willChange: "transform",
      }}
    >
      {/* ── Main header row ──────────────────────────────────────────────── */}
      <div
        className="mx-auto flex items-center gap-7"
        style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)", height: 60 }}
      >
        {/* Logo */}
        <Link href="/" aria-label="RunTrim" className="no-underline shrink-0">
          <RunTrimLogo size={20} />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-3">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              style={{
                fontSize: 13,
                color: "#8a8f98",
                padding: "7px 10px",
                borderRadius: 5,
                transition: "color 0.15s, background 0.15s",
              }}
              className="hover:text-[#f4f5f7] hover:bg-white/6"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Status badge — desktop only (md+) */}
        <Link
          href="/status"
          className="hidden md:inline-flex items-center gap-2 transition-colors hover:border-white/18"
          style={{
            ...MONO,
            fontSize: 11,
            color: "#8a8f98",
            height: 32,
            padding: "0 12px",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 6,
            background: "#0c0e11",
          }}
        >
          <span
            className="rt-live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6ee7b7",
              display: "inline-block",
            }}
          />
          all systems operational
        </Link>

        {/* Primary CTA — desktop */}
        <Link
          href="/plans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 32,
            padding: "0 14px",
            borderRadius: 6,
            background: "#f4f5f7",
            color: "#0b0d10",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid #fff",
            transition: "background 0.15s",
          }}
          className="hidden md:inline-flex hover:bg-white"
        >
          View plans
        </Link>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.18)",
            background: open ? "#1a1d22" : "#0e1014",
            color: "#e2e4e8",
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
        </button>
      </div>

      {/* ── Mobile dropdown ───────────────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#08090b",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
            padding: "20px clamp(20px,4vw,40px) 24px",
          }}
        >
          {/* Brand header */}
          <div style={{ marginBottom: 20 }}>
            <RunTrimLogo size={18} />
            <p
              style={{
                ...MONO,
                fontSize: 11,
                color: "#5a5f68",
                marginTop: 6,
                letterSpacing: "0.01em",
              }}
            >
              Control layer for AI coding agents.
            </p>
          </div>

          {/* Nav links */}
          <nav style={{ marginBottom: 20 }}>
            {DROPDOWN_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 0",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#c9ccd2",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  transition: "color 0.15s",
                }}
                className="hover:text-[#f4f5f7]"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA area */}
          {ctaState !== "checking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {primary && (
                <Link
                  href={primary.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    borderRadius: 8,
                    background: "#f4f5f7",
                    color: "#0b0d10",
                    fontSize: 14,
                    fontWeight: 500,
                    border: "1px solid #fff",
                    transition: "background 0.15s",
                    textDecoration: "none",
                  }}
                >
                  {primary.label}
                </Link>
              )}
              {secondary && (
                <Link
                  href={secondary.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    borderRadius: 8,
                    background: "transparent",
                    color: "#c9ccd2",
                    fontSize: 14,
                    fontWeight: 500,
                    border: "1px solid rgba(255,255,255,0.12)",
                    transition: "background 0.15s, color 0.15s",
                    textDecoration: "none",
                  }}
                  className="hover:bg-white/6 hover:text-[#f4f5f7]"
                >
                  {secondary.label}
                </Link>
              )}
            </div>
          )}

          {/* Trust line */}
          <p
            style={{
              ...MONO,
              fontSize: 10,
              color: "#3a3e46",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Local-first. Source stays local.
          </p>
        </div>
      )}
    </header>
  );
}
