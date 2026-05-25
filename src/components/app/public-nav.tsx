"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { RunTrimLogo } from "@/components/app/runtrim-logo";
import { needsPaymentUpdate, trialEligible } from "@/lib/billing-cta";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

const HEADER_H = 60; // px — single source of truth for spacer + dropdown offset

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

        const isActive = d.planStatus === "active" || d.planStatus === "trialing";

        if (d.plan === "team"    && isActive) { setState("active-team");    return; }
        if (d.plan === "builder" && isActive) { setState("active-builder"); return; }
        if (d.plan === "pro"     && isActive) { setState("active-pro");     return; }

        if (trialEligible({
          plan: d.plan,
          planStatus: d.planStatus,
          paymentSubscriptionId: d.paymentSubscriptionId,
        })) {
          setState("free");
        } else {
          setState("free-trial-used");
        }
      })
      .catch(() => setState("logged-out"));
  }, []);

  return state;
}

type Cta = { label: string; href: string; variant: "primary" | "secondary" };

function getPrimary(state: MobileCtaState): Cta | null {
  switch (state) {
    case "checking":        return null;
    case "payment-issue":   return { label: "Update payment method", href: "/app/billing", variant: "primary" };
    case "logged-out":      return { label: "Install free CLI",      href: "/app/install", variant: "primary" };
    case "free":            return { label: "Upgrade to Pro",        href: "/app/trial",   variant: "primary" };
    case "free-trial-used": return { label: "Upgrade to Pro",        href: "/app/billing", variant: "primary" };
    case "active-pro":      return { label: "Open dashboard",        href: "/app",         variant: "primary" };
    case "active-builder":  return { label: "Open dashboard",        href: "/app",         variant: "primary" };
    case "active-team":     return { label: "Open dashboard",        href: "/app",         variant: "primary" };
  }
}

function getSecondary(state: MobileCtaState): Cta | null {
  switch (state) {
    case "logged-out":      return { label: "Sign in",            href: "/login",       variant: "secondary" };
    case "free":            return { label: "Install free CLI",   href: "/app/install", variant: "secondary" };
    case "free-trial-used": return { label: "Docs",               href: "/app/install", variant: "secondary" };
    case "active-pro":      return { label: "Upgrade to Builder", href: "/app/billing", variant: "secondary" };
    default:                return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PublicNav() {
  const [open,   setOpen]   = useState(false);
  const [hidden, setHidden] = useState(false);
  const ctaState = useMobileCtaState();

  // Scroll: hide on down, reveal on up. Close menu when hiding.
  useEffect(() => {
    let lastY = window.scrollY;

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

  // Escape closes menu
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() { setOpen(false); }

  const primary   = getPrimary(ctaState);
  const secondary = getSecondary(ctaState);

  // Shared header bar styles (solid dark, full-width)
  const headerBarStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_H,
    zIndex: 200,
    background: "#08090b",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
    transform: hidden ? "translateY(-100%)" : "translateY(0)",
    transition: "transform 0.22s ease",
    willChange: "transform",
    // Prevent horizontal overflow
    overflow: "hidden",
  };

  return (
    <>
      {/*
        Spacer: keeps page content from starting under the fixed header.
        Height matches HEADER_H exactly so there is never a layout jump.
      */}
      <div style={{ height: HEADER_H, flexShrink: 0 }} aria-hidden="true" />

      {/* ── Fixed header bar ──────────────────────────────────────────────── */}
      <header style={headerBarStyle}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            height: HEADER_H,
            padding: "0 clamp(20px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Logo — always visible */}
          <Link href="/" aria-label="RunTrim home" style={{ textDecoration: "none", flexShrink: 0, lineHeight: 0 }}>
            <RunTrimLogo size={20} />
          </Link>

          {/* Desktop nav links — hidden below md (768 px) */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{
                  fontSize: 13,
                  color: "#8a8f98",
                  padding: "7px 10px",
                  borderRadius: 5,
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                }}
                className="hover:text-[#f4f5f7] hover:bg-white/6"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Push right-side items to far right */}
          <div style={{ flex: 1 }} />

          {/* Status badge — desktop only */}
          <Link
            href="/status"
            className="hidden md:inline-flex items-center gap-2 transition-colors"
            style={{
              ...MONO,
              fontSize: 11,
              color: "#8a8f98",
              height: 32,
              padding: "0 12px",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 6,
              background: "#0c0e11",
              marginRight: 10,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#6ee7b7",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            all systems operational
          </Link>

          {/* "View plans" CTA — desktop only (md+). Never shown on mobile. */}
          <Link
            href="/plans"
            className="hidden md:inline-flex items-center"
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: "#f4f5f7",
              color: "#0b0d10",
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid #fff",
              transition: "background 0.15s",
              textDecoration: "none",
            }}
          >
            View plans
          </Link>

          {/* Hamburger — mobile only (below md). Solid dark button. */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-dropdown"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.18)",
              background: open ? "#1c1f25" : "#111316",
              color: "#dde0e5",
              boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            {open
              ? <X size={17} strokeWidth={2} aria-hidden="true" />
              : <Menu size={17} strokeWidth={2} aria-hidden="true" />
            }
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown — fixed, directly below the header bar ────────── */}
      {open && (
        <div
          id="mobile-nav-dropdown"
          className="md:hidden"
          style={{
            position: "fixed",
            top: HEADER_H,
            left: 0,
            right: 0,
            zIndex: 199,        // one below header so header border renders on top
            background: "#0a0b0e",  // solid near-black — no transparency, no blur bleed
            borderBottom: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
            padding: "22px clamp(20px, 4vw, 40px) 28px",
            // Prevent content jumping when menu opens
            overflowY: "auto",
            maxHeight: "calc(100dvh - 60px)",
          }}
        >
          {/* Nav links */}
          <nav style={{ marginBottom: 24 }}>
            {DROPDOWN_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={close}
                style={{
                  display: "block",
                  padding: "11px 0",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#c4c8d0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  textDecoration: "none",
                  transition: "color 0.12s",
                }}
                className="hover:text-[#f4f5f7]"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* State-aware CTA buttons */}
          {ctaState !== "checking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {primary && (
                <Link
                  href={primary.href}
                  onClick={close}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 46,
                    borderRadius: 8,
                    background: "#f0f1f3",
                    color: "#0b0d10",
                    fontSize: 14,
                    fontWeight: 500,
                    border: "1px solid rgba(255,255,255,0.9)",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                >
                  {primary.label}
                </Link>
              )}
              {secondary && (
                <Link
                  href={secondary.href}
                  onClick={close}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 46,
                    borderRadius: 8,
                    background: "#111417",
                    color: "#b8bcc4",
                    fontSize: 14,
                    fontWeight: 500,
                    border: "1px solid rgba(255,255,255,0.1)",
                    textDecoration: "none",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  className="hover:bg-white/8 hover:text-[#f4f5f7]"
                >
                  {secondary.label}
                </Link>
              )}
            </div>
          )}

          {/* Trust footnote */}
          <p style={{ ...MONO, fontSize: 10, color: "#2e3138", marginTop: 22, textAlign: "center" }}>
            Local-first. Source stays local.
          </p>
        </div>
      )}
    </>
  );
}
