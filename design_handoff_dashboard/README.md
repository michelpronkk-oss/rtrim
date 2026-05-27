# RunTrim Dashboard — Handoff (5 pages)

This bundle contains the **5 remaining dashboard pages** to implement in the real RunTrim app. The Overview page (`Dashboard.html`) is already in production — this set fills in the rest of the sidebar nav.

## What's in this bundle

| File | Route | What it is |
|---|---|---|
| `Connect CLI.html` | `/app/connect-cli` | 3-stage install pipeline (Install / Authenticate / Verify), install method tabs (brew/curl/npm/Windows), workspace token with reveal/copy/rotate/revoke, MCP config snippet, `runtrim doctor` readiness checks |
| `Projects.html` | `/app/projects` | Project grid with live/review/archived states, scope + forbidden pills per project, run counts, restore points, agent per project, "Add project" dashed card, archive section |
| `Runs.html` | `/app/runs` | Stats strip (runs this month, pass rate, tokens trimmed, scope violations), filter chips (All / Live / Passed / Review / Blocked), full table with task/scope/agent/files/verdict/when, pagination |
| `Project Agent.html` | `/app/project-agent` | Project selector + 6 config panels (Allowed scope, Forbidden paths, Finish check, Memory, Token budget, Connected agents w/ MCP/copy toggles) + sticky live contract preview that recompiles from rules + test prompt area |
| `Billing.html` | `/app/billing` | Current plan hero (Pro $18/mo), 4-card usage strip, plan comparison (Free/Pro/Builder/Team with current highlighted), payment method, billing details, invoice table |
| `app-shell.css` | — | Shared stylesheet: tokens, sidebar, topbar, buttons, cards, surface, pills, badges, filter chips, responsive rules |

## How they relate to Dashboard.html

Every page reuses the **same sidebar HTML**, **same topbar pattern**, and **same active-state styling** as the existing Dashboard.html. The active sidebar item is hardcoded per page (e.g. `Connect CLI.html` has `.active` on the Connect CLI link).

All shared chrome lives in `app-shell.css`. Dashboard.html has its sidebar styles inline today; you can either keep that as-is, or extract Dashboard.html's chrome to use `app-shell.css` too for consistency. Either way, the values are identical — token-for-token.

## Fidelity

**Hi-fi.** Every color, spacing value, type size, border, and shadow is final. Match pixels.

## Implementation order (suggested)

1. **`app-shell.css` → wire to theme.** Convert the `:root` custom properties to the codebase's theme system (Tailwind config, CSS-in-JS theme, etc.). All other pages inherit from this.
2. **Sidebar component.** Extract the sidebar HTML into a reusable component. Currently duplicated across all 5 pages — should be ONE component with an `activeItem` prop. This is the single biggest refactor opportunity. Same for the topbar.
3. **Connect CLI page.** Self-contained, mostly static — easiest to port first.
4. **Projects page.** Needs a real "list projects" query. Card UI is straightforward.
5. **Runs page.** The runs table will be the most-used surface. Needs pagination + filter state.
6. **Project Agent page.** Most complex. The "live contract preview" must recompile from the rule state — make it a derived value, not a separate API call.
7. **Billing page.** Wire the plan card and invoice list to Stripe's Customer Portal / Stripe Billing API.

## Shared patterns to factor out

Build these as reusable components — they appear on multiple pages:

- **`<Pill variant="scope|forbid|mem|warn">`** — mono pill with semantic color
- **`<Badge variant="mint|amber|rose|violet">`** — pill with LED dot + uppercase mono
- **`<Card>`** with `<CardHead label title sub right>` — used everywhere
- **`<Surface>`** — the dark-bg "run-contract" card with mac dots, title, repo id
- **`<EmptyState icon h p cmd>`** — every page has one
- **`<FilterChipRow>`** — filter chip group with active states
- **`<StatusLED color="mint|amber|rose|violet" live>`** — pulsing dot
- **`<Button variant="primary|ghost|violet|rose" size="sm|md">`**

## Design tokens

All in `app-shell.css` under `:root`. The brand-critical values:

```
--violet: #a78bfa     /* PRIMARY accent — used sparingly */
--mint:   #6ee7b7     /* signal: safe, local, passed, armed */
--amber:  #f5a524     /* signal: review, in-progress, warn */
--rose:   #f87171     /* signal: forbidden, drift, blocked */
--bg-0:   #08090b     /* page bg */
--bg-1:   #0c0e11     /* card bg */
--fg-0:   #f4f5f7     /* primary text */
--fg-2:   #8a8f98     /* secondary text */
```

Inter Tight 400/500/600 for sans; JetBrains Mono 400/500/600 for mono. Load with `font-feature-settings: "ss01","ss02","cv11"` on body.

## Voice rules (re-emphasized)

- **No filler.** Every label earns its place.
- **Concrete numbers** — "42 runs", "812k tokens", "94.1% pass rate" — never "many" or "lots".
- **Mono labels are honest.** Real commands, real paths.
- **No emoji. No em-dashes.** Periods or commas.
- **Signal colors carry meaning.** Mint=safe, amber=review, rose=forbidden. Don't recolor for variety.

## Open decisions for the dev

When you wire each page, you'll need a call from the product owner:

1. **Connect CLI** — what's the real install URL? Right now I have placeholders (`brew install runtrim`).
2. **Projects** — what's the project creation flow? Today's design assumes `runtrim start` in a repo creates it. If there's a web-side "Connect repo" flow (e.g. GitHub OAuth), the empty state needs a button for it.
3. **Runs** — clicking a row should open a **run detail page**. That's not in this set. Mock that next if needed.
4. **Project Agent** — the "Compile + run" button on the test prompt area: what does it do? Likely opens a "copy command" modal or fires an MCP dispatch.
5. **Billing** — confirm the price ladder ($0 / $18 / $48 / $24-seat) is final before wiring Stripe.

## Where to look in the existing brand handoff

If you need design tokens, the R-mark SVG, voice rules, or misuse guidelines — the original brand bundle at `design_handoff_runtrim_brand/README.md` has all of it. This dashboard handoff is additive to that one.

## Reference

For any visual question, open the HTML file in this bundle and inspect the element. Every value is final. The HTML is the source of truth.
