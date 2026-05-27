# Handoff: RunTrim Brand System

## Overview

This bundle is the full visual system for **RunTrim** — homepage, logo, and X/social posts — designed as the foundation for the production app + marketing site.

Hand this to Claude Code (or any dev agent) inside the RunTrim project. The goal is to **recreate these designs inside the real RunTrim codebase**, not ship the HTML directly.

## About the design files

The files in this bundle are **design references created in HTML**. They are prototypes showing the intended look, structure, and component patterns — not production code.

The task is to **rebuild these designs in the target codebase's environment** (e.g. Next.js + Tailwind, Astro, SvelteKit, etc.) using its established patterns:

- Convert the inline styles into the codebase's styling system (Tailwind classes, CSS modules, vanilla-extract, styled-components — whatever is established).
- Convert one-off HTML structures into reusable React/Vue/Svelte components.
- Wire up real fonts (Inter Tight + JetBrains Mono via `next/font` or equivalent).
- Replace placeholder copy with real product copy where appropriate.

If RunTrim doesn't have a frontend codebase yet, **use Next.js (App Router) + Tailwind + TypeScript** — it matches the design system's restraint and gives clean Server/Client component boundaries for the run-contract surfaces.

## Fidelity

**High-fidelity (hifi)** — every color, spacing value, type size, border treatment, and shadow is final. Match pixels.

## Files in this bundle

| File | What it is |
|---|---|
| `Homepage.html` | The full marketing landing page. 8 sections: nav, hero, problem (drift), protocol (5-stage pipeline), benefits, agent compatibility, plans, final CTA, footer. Fully responsive. |
| `Logo System.html` | Brand identity canvas — final R mark, construction grid, wordmark spec, 12 lockup variants, color system, usage previews (navbar/sidebar/terminal/social/favicon/docs), clear-space & misuse rules. |
| `logo-system.jsx` | React source for the logo system canvas. Contains the `RMark` component, `Wordmark`, `HLockup`, `VLockup`, and design tokens object `T`. Copy these directly into the codebase. |
| `design-canvas.jsx` | The canvas framework used to present the logo system. **Do not port this** — it's a presentation tool, not a product feature. |
| `X Posts.html` | 7 final X/social posts + 1 brand variant, all 1600×900, export-ready. Use as launch creative; recreate the visual language in any future social asset. |

---

# Design Tokens

These are the canonical token values used everywhere. Wire them into the codebase's theme/tailwind config.

## Color

```ts
export const colors = {
  // Surfaces (dark)
  bg0:    "#08090b", // primary surface
  bg1:    "#0c0e11", // raised surface, cards
  bg2:    "#111317", // raised+1
  bg3:    "#16191e", // chips, inputs
  bg4:    "#1c2026", // hover

  // Surfaces (light — for docs)
  paper:  "#f6f6f4",
  paper2: "#eeeeea",

  // Lines
  line1: "rgba(255,255,255,0.06)",  // hairlines
  line2: "rgba(255,255,255,0.10)",  // standard borders
  line3: "rgba(255,255,255,0.16)",  // emphasized

  // Text
  fg0: "#f4f5f7",  // primary
  fg1: "#c9ccd2",  // secondary
  fg2: "#8a8f98",  // tertiary
  fg3: "#5a5f68",  // quaternary / mono labels
  fg4: "#3a3e46",  // disabled

  // Brand
  violet:     "#a78bfa",  // PRIMARY ACCENT — used sparingly
  violetDeep: "#7c5cff",  // pressed / hover on light bg
  mint:       "#6ee7b7",  // signal: safe, local, recovered, passed
  mintDeep:   "#10b981",
  amber:      "#f5a524",  // signal: review, BLOCKED, warn
  rose:       "#f87171",  // signal: forbidden, drift, failure
};
```

**Usage rules:**
- Backgrounds are graphite by default. Light mode is for docs only.
- **Violet is the brand accent.** Only ONE accent per surface — don't combine violet + mint as decoration. Mint/amber/rose only appear when they carry semantic meaning (state, signal, verdict).
- Never invent new colors. Never use gradients on the logo. The hero gets a subtle violet radial; nothing else gets a gradient background.

## Typography

**Sans:** `Inter Tight`, weights 400 / 500 / 600
**Mono:** `JetBrains Mono`, weights 400 / 500 / 600

Load via Google Fonts or `next/font`:
```ts
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
const sans = Inter_Tight({ subsets: ["latin"], weight: ["400","500","600"] });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500","600"] });
```

Apply `font-feature-settings: "ss01", "ss02", "cv11";` on body for the stylistic alternates the designs use.

### Type scale

| Token | Size | Line-height | Letter-spacing | Use |
|---|---|---|---|---|
| `display-xl` | clamp(40px, 5.6vw, 68px) | 1.02 | -0.035em | Hero H1 |
| `display-lg` | clamp(34px, 5vw, 56px) | 1.05 | -0.03em | Final CTA H2 |
| `display-md` | clamp(28px, 3.6vw, 44px) | 1.08 | -0.025em | Section titles |
| `body-lg` | 17px | 1.55 | normal | Hero sub, lead paragraphs |
| `body` | 15px | 1.55 | normal | Default body |
| `body-sm` | 13.5px | 1.55 | normal | Card copy, drift descriptions |
| `mono-sm` | 11-13px | 1 | 0.06em / uppercase | Mono labels, eyebrows |
| `mono-xs` | 10.5px | 1 | 0.08em / uppercase | Stage numbers, kicker |

All headlines use `font-weight: 500` (NOT 700). Restraint is the brand.

## Spacing

8px base grid. Common values: 4, 6, 8, 10, 12, 14, 16, 18, 22, 26, 28, 32, 40, 48, 56, 72, 96, 120.

Containers: `max-width: 1240px`, gutter `clamp(20px, 4vw, 40px)`.

## Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4-5px | Pills, small chips |
| `radius-md` | 6-7px | Buttons, inputs |
| `radius-lg` | 8-10px | Cards, surfaces |
| `radius-xl` | 14-16px | Run-contract surface, hero cards |
| `radius-pill` | 999px | Eyebrows, status pills |

## Shadows

The design avoids heavy shadows. Two used:
- **Surface lift:** `0 1px 0 rgba(255,255,255,0.03) inset, 0 40px 100px -40px rgba(0,0,0,0.95)`
- **LED glow:** `0 0 8px <color>` on status dots only

No drop shadows on cards. Borders do the work.

---

# The Logo (R-mark)

The mark is a rectilinear capital R with a structural diagonal leg as the accent. The diagonal is the brand metaphor — a routed path through scope.

## SVG — copy verbatim

```html
<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
  <!-- Accent leg (violet) -->
  <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill="#a78bfa"/>
  <!-- Letter body (ink) -->
  <path
    d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z"
    fill="#f4f5f7"
    fill-rule="evenodd"
  />
</svg>
```

- Letter sits in `y: 10 → 90` (cap height 80u of 100u box).
- Right edge `x = 80` (letter bounds 70u wide); leg foot extends to `x = 84` for the descender.
- **Mono fallback** (single-color contexts): set both paths to the same fill — letter remains structurally legible.

## "Tight" lockup variant

For inline lockups where the mark must baseline-align with text, use a tighter viewBox so the SVG's bottom edge = the letter baseline:

```html
<svg viewBox="10 10 74 80" fill="none" aria-hidden="true">
  <path d="M 26 54 L 52 54 L 84 90 L 58 90 Z" fill="#a78bfa"/>
  <path d="M 10 10 L 80 10 L 80 54 L 26 54 L 26 90 L 10 90 Z M 26 26 L 64 26 L 64 38 L 26 38 Z" fill="#f4f5f7" fill-rule="evenodd"/>
</svg>
```

Render it inside a flex container with `align-items: baseline` and the SVG's bottom will sit on the wordmark baseline.

## Wordmark

`RunTrim` in Inter Tight **500** (single weight, no bold), `letter-spacing: -0.035em`. The second word "Trim" renders at `opacity: 0.6` for a quiet two-tone read.

```jsx
<span className="font-sans font-medium tracking-[-0.035em] leading-none flex items-baseline">
  <span>Run</span><span className="opacity-60">Trim</span>
</span>
```

## Lockups

| Lockup | When |
|---|---|
| Mark only | Favicons, social avatars, app tiles, anywhere the brand is already established |
| Wordmark only | Long-form documents, footers where the mark is redundant |
| Horizontal | Default — navbars, dashboard sidebars, marketing |
| Stacked | App tiles 128px+, splash screens |

For the horizontal lockup: mark height ≈ wordmark cap height (use the tight variant + `align-items: baseline`). Wordmark font-size ≈ mark height × 1.05.

## Clear space

Minimum clear space around the mark = **½ × cap height** on all sides.

## Misuse — do not

- Recolor the leg (it's always violet, or the same color as the letter body in mono)
- Add gradient fills to either path
- Outline the mark (it's always solid)
- Rotate or tilt
- Add drop shadows
- Squish (preserve aspect ratio)

## Minimum size

- Mark: **16px** (favicon-safe — the 16u-wide stem is wide enough to hold)
- Wordmark: **11px** font-size digital, 9pt print

## Favicon recipe

Render the mark at 16/24/32/48/64 with rounded background tile:
```
rect rx={size * 0.22} fill="#0e1116"
```

---

# Component Patterns

The homepage uses a small set of repeatable patterns. Build these as components.

## 1. Eyebrow

Mono uppercase pill at the top of every section:

```jsx
<span className="eyebrow">
  <span className="tag">v0.7</span>
  <span>Protocol layer for AI coding agents</span>
</span>
```

```css
.eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--mono); font-size: 11px;
  color: var(--fg-2); text-transform: uppercase; letter-spacing: 0.08em;
  padding: 5px 10px 5px 8px;
  border: 1px solid var(--line-2); border-radius: 999px;
  background: var(--bg-1);
}
.eyebrow .tag {
  color: var(--violet); background: rgba(167,139,250,0.12);
  padding: 1px 7px; border-radius: 4px;
  border: 1px solid rgba(167,139,250,0.25);
  letter-spacing: 0.04em;
}
```

Variants: `tag.mint`, `tag.amber`, `tag.rose` for different signal types.

## 2. Run-contract surface (hero visual)

The most distinctive RunTrim component. Build it as a reusable card with:
- Mac-style 3-dot chrome bar
- Title (mono, uppercase, tracking 0.08em)
- Repo ID right-aligned
- Body rows: `grid-template-columns: 130px 1fr` with dashed bottom borders
- Pills inline in the `.v` column (scope/forbid/mem variants)
- Meter bars for token budget + risk
- Footer with LED status dot, agent name, step counter, sync state

See `Homepage.html` lines `~430-540` for full structure. Match exactly.

## 3. Pipeline (5-stage strip)

Used in the Protocol section. 5 columns side-by-side, each with:
- Mono stage number (`01 / install`)
- Command (`$ runtrim init`, prompt char in violet)
- One-line description
- Tiny progress dots (4 segments, mint when "active")
- Right-arrow connector between stages

Stacks vertically below 980px viewport.

## 4. Drift card

For the problem section. Six cards in a 3-column grid (responsive to 2/1):
- Mono red tag at top (`SCOPE CREEP`, `CONTEXT RESET`, etc) with a small rose square LED
- H3 statement
- Body paragraph
- Mono "glyph" line at bottom with code chip — e.g. `VIOLATION · writes: .env.production`

## 5. Plan card

Pricing card. Four columns. The "Pro" variant gets `border: 1px solid rgba(167,139,250,0.3)` and a subtle violet radial top-left.

## 6. Status pill

```jsx
<span className="pill scope">api/webhooks/**</span>
<span className="pill forbid">.env*</span>
<span className="pill mem">runs/last-3</span>
<span className="pill warn">! proof gap</span>
```

Base + variant classes carry color: `scope` = mint, `forbid` = rose, `mem` = violet, `warn` = amber.

## 7. LED dot

```html
<span class="led"></span>
```

```css
.led {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 8px var(--mint);
}
.led.amber { background: var(--amber); box-shadow: 0 0 8px var(--amber); }
.led.rose  { background: var(--rose);  box-shadow: 0 0 8px var(--rose); }
```

Add `@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.55; transform:scale(0.85); } }` and apply `animation: pulse 1.8s ease-in-out infinite` for live runs.

## 8. Button

```jsx
<button className="btn btn-primary">
  Install free CLI
  <ArrowRight className="arrow" />
</button>
```

- Primary: `background: #f4f5f7; color: #0b0d10; border: 1px solid #fff;` Hover → `#fff`.
- Ghost: `border: 1px solid var(--line-3); background: transparent; color: var(--fg-1);` Hover → border `rgba(255,255,255,0.28)`, bg `var(--bg-2)`.
- Height 40px, padding 0 18px, radius 7px, font-size 14px / weight 500.
- Arrow icon translates `2px` right on hover (`transition: 0.2s ease`).

## 9. Sticky nav

```css
position: sticky; top: 0; z-index: 50;
background: rgba(8,9,11,0.72);
backdrop-filter: saturate(140%) blur(12px);
border-bottom: 1px solid var(--line-1);
```

Logo + nav links (small-mono on hover bg) + status pill + primary CTA. Burger appears below 720px.

---

# Voice & Copy Rules

- **Verbs, not features.** "Stop drift." not "Drift prevention features."
- **Concrete numbers.** "14 files," "38k tokens," "94.1% pass rate" — not "many" or "high."
- **Mono labels are honest.** Use real commands (`runtrim init`, `runtrim go "task"`) — don't fake CLI output.
- **No em-dashes in marketing copy.** Use periods or commas.
- **No emoji.** Ever.
- **Signal colors carry meaning.** Mint = safe. Amber = review. Rose = forbidden/drift. Don't recolor for variety.

---

# Responsive Behavior

Breakpoints used:
- `≤ 980px`: hero collapses to single column, drift grid 3→2 col, pipeline stacks vertically
- `≤ 720px`: drift to 1 col, nav links hide → burger appears, plans to 1 col, agents grid to 2 col
- `≤ 480px`: agents grid to 1 col, footer stacks

Headlines use `clamp()` so they scale fluidly — no JS resize needed.

---

# Implementation order (suggested)

1. **Tokens first.** Wire colors + fonts + spacing into Tailwind config (or CSS variables). Verify Inter Tight + JetBrains Mono load with the `ss01/ss02/cv11` features on.
2. **Logo component.** Build `<RunTrimLogo variant="mark | wordmark | horizontal | stacked" size={...} mono={?}>`. Use the exact SVG paths above. Make sure baseline alignment works in lockups.
3. **Eyebrow + button + pill + LED.** Build these as primitive components — they appear on every page.
4. **Run-contract surface.** This is the hero visual and it appears in 4+ contexts (homepage, X posts, eventual dashboard). Build it once, reuse.
5. **Homepage sections.** Port section-by-section. Reuse drift card / pipeline stage / plan card as components.
6. **Page chrome.** Sticky nav + footer.

---

# Don'ts (the brand kills these)

- Gradient backgrounds (except the single subtle violet radial on the hero)
- Gradient logos
- Drop shadows on cards (border-only)
- More than one accent color per surface
- Emoji
- 3D effects, glow auras (except the LED 8px glow)
- "Glassmorphism" beyond the nav's `backdrop-filter`
- Inter / Roboto / system fonts — always Inter Tight
- Generic "AI SaaS" lavender purple — use exactly `#a78bfa`, not similar values

---

# Questions for the dev

When you start porting, decisions that need a human:

1. **Framework** — Next.js? Astro? Existing? (Default to Next.js App Router if greenfield.)
2. **Real CLI install command** — replace placeholder `curl -fsSL runtrim.sh | sh` in the final CTA.
3. **Real stats** — the "↓ 41%", "94.1%" numbers are illustrative. Confirm before launch.
4. **Auth / dashboard target** — the "Request access" CTA needs a real destination.
5. **Plan pricing** — confirm $0 / $18 / $48 / $24-seat tiers and feature lists.

---

# Reference

For any visual question, open the HTML files in this bundle and inspect the element. Every value is final. If something feels ambiguous, the HTML is the source of truth.
