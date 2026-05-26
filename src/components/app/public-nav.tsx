"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X, Activity } from "lucide-react";
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
  { href: "/faq",         label: "FAQ"       },
  { href: "/app/install", label: "Docs"      },
  { href: "/changelog",   label: "Changelog" },
];

const DROPDOWN_LINKS = [
  { href: "/#protocol",   label: "How it works" },
  { href: "/plans",       label: "Pricing"      },
  { href: "/faq",         label: "FAQ"          },
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

  // Scroll: hide on down, reveal on up — mobile only (< 768 px).
  // Desktop header is always visible; no hide-on-scroll.
  useEffect(() => {
    let lastY = window.scrollY;

    function onScroll() {
      if (window.innerWidth >= 768) {
        setHidden(false);
        return;
      }
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

    // When resizing to desktop, always restore the header.
    function onResize() {
      if (window.innerWidth >= 768) setHidden(false);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
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
          <nav className="hidden md:flex items-center gap-0.5 ml-10">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                style={{
                  fontSize: 13,
                  color: "#8a8f98",
                  padding: "6px 11px",
                  borderRadius: 6,
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                  letterSpacing: "-0.01em",
                }}
                className="hover:text-[#f4f5f7] hover:bg-white/6"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Push right-side items to far right */}
          <div style={{ flex: 1 }} />

          {/* Right-side action group — desktop only. Flex row with consistent gap. */}
          <div className="hidden md:flex items-center gap-4">
            {/* Status indicator — square icon only */}
            <Link
              href="/status"
              aria-label="System status"
              className="inline-flex items-center transition-opacity hover:opacity-60"
              style={{ textDecoration: "none" }}
            >
              <Activity
                size={13}
                strokeWidth={2}
                style={{ color: "#6ee7b7", filter: "drop-shadow(0 0 4px rgba(110,231,183,0.55))" }}
              />
            </Link>

            {/* "View plans" primary CTA */}
            <Link
              href="/plans"
              className="inline-flex items-center hover:bg-white"
              style={{
                height: 33,
                padding: "0 17px",
                borderRadius: 7,
                background: "#f4f5f7",
                color: "#0b0d10",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                border: "1px solid #fff",
                transition: "background 0.15s",
                textDecoration: "none",
              }}
            >
              View plans
            </Link>
          </div>

          {/* Hamburger — mobile only (below md).
              Display is controlled entirely by Tailwind so md:hidden can
              override it. No inline display property here. */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-dropdown"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.18)",
              background: open ? "#1c1f25" : "#111316",
              color: "#dde0e5",
              boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  style={{ display: "flex" }}
                >
                  <X size={17} strokeWidth={2} aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  style={{ display: "flex" }}
                >
                  <Menu size={17} strokeWidth={2} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown — fixed, directly below the header bar ────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav-dropdown"
            className="md:hidden"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
            style={{
              position: "fixed",
              top: HEADER_H,
              left: 0,
              right: 0,
              zIndex: 199,
              background: "#0a0b0e",
              borderBottom: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
              padding: "22px clamp(20px, 4vw, 40px) 28px",
              overflowY: "auto",
              maxHeight: "calc(100dvh - 60px)",
            }}
          >
            {/* Nav links — staggered entrance */}
            <nav style={{ marginBottom: 24 }}>
              {DROPDOWN_LINKS.map(({ href, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.22, ease: "easeOut" }}
                >
                  <Link
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
                </motion.div>
              ))}
            </nav>

            {/* State-aware CTA buttons */}
            {ctaState !== "checking" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.24, ease: "easeOut" }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {primary && (
                  <motion.div whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 700, damping: 30 } }}>
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
                  </motion.div>
                )}
                {secondary && (
                  <motion.div whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 700, damping: 30 } }}>
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
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Trust footnote */}
            <p style={{ ...MONO, fontSize: 10, color: "#2e3138", marginTop: 22, textAlign: "center" }}>
              Local-first. Source stays local.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
