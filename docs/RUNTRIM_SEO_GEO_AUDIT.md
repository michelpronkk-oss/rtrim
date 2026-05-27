# RunTrim SEO + GEO Audit

Date: 2026-05-27
Scope: Public website SEO/GEO metadata, crawlability, schema, social metadata, and internal linking.

## Current indexable routes
- /
- /app/install
- /plans
- /pricing
- /faq
- /how-it-works
- /changelog
- /status
- /security
- /privacy
- /terms
- Public educational pages listed in sitemap (agent-guardrail/use-case pages under `src/app/*` that are marketing content)

## Title and description audit
- Updated core metadata copy to product-accurate positioning (control, verification, recovery layer).
- Confirmed/updated required title patterns:
  - `RunTrim | AI Agent Control Layer`
  - `Plans | RunTrim`
  - `Pricing | RunTrim`
  - `FAQ | RunTrim`
  - `How RunTrim Works | RunTrim`
  - `Changelog | RunTrim`
  - `Status | RunTrim`
  - `Security | RunTrim`
  - `Privacy | RunTrim`
  - `Terms | RunTrim`
  - `Install RunTrim | RunTrim`
- Fixed title mismatches:
  - `/how-it-works` changed from "How it works" to "How RunTrim Works"
  - `/privacy` changed from "Privacy Policy" to "Privacy"
  - `/terms` changed from "Terms of Service" to "Terms"

## Canonical audit
- Canonicals are present and absolute on key public pages and homepage.
- No canonical changes needed beyond existing stable absolute URLs.

## Robots/noindex audit
- `robots.ts` now explicitly allows `/faq`.
- Added disallow rules for private/login/dashboard/account-style paths:
  - `/login`, `/account`, `/dashboard`, `/billing`
  - `/app/billing`, `/app/connect`, `/app/project-agent`, `/app/trial`
  - existing disallow for `/admin`, `/api/*`, and private `/app/*` areas retained.
- Result: public marketing/docs routes crawlable; private app/admin paths discouraged from indexing.

## Sitemap audit
- Added missing high-intent public route `/faq` to sitemap.
- Sitemap otherwise already included primary marketing and docs routes.

## OpenGraph/Twitter audit
- Updated homepage OG/Twitter text to clear, non-stale positioning:
  - `RunTrim | Control, verify and recover AI coding runs`
  - `Scope agent work, check risky changes, restore locally and continue after context limits.`
- Updated OG image alt/headline to remove stale token-heavy message and match current positioning.

## Structured data audit
Implemented/updated in root layout:
- `WebSite` schema added (RunTrim entity + description).
- `SoftwareApplication` schema improved:
  - softwareVersion aligned to `package.json` (`0.1.30`)
  - offers now reflect Free/Pro/Builder/Team (no fabricated ratings/reviews).
- `Organization` schema retained.

Implemented on FAQ page:
- Added visible-content-aligned `FAQPage` JSON-LD generated from on-page FAQ items.

## FAQ/GEO answer audit
- Added direct/citable FAQ entries for:
  - What is RunTrim?
  - Which agents does RunTrim work with?
  - Does RunTrim upload source code?
  - Does restore use more tokens?
  - What does BLOCKED mean?
  - Do I need MCP?
  - How is RunTrim different from Git?
  - How is RunTrim different from agent orchestrators?

## Internal linking audit
- Public nav now uses crawlable links for `How it works` and `Install` (replacing protocol hash/docs labels).
- Footer Product links now include:
  - Install, How it works, Plans, FAQ, Changelog, Status, Security.
- Pricing page now links to FAQ and Install in the bottom CTA row.
- Security and Privacy copy now points users to `/faq` for behavior clarifications.

## Page speed/rendering risks
- Homepage remains very large and animation-heavy; likely main risk is JS/CSS payload and rendering cost, not crawlability.
- Some files still contain encoding artifacts/comments from prior edits; low SEO impact but worth cleanup for maintainability.

## Missing high-intent pages/sections
Not implemented in this pass (kept low-risk/minimal scope):
- `/use-cases/ai-agent-drift`
- `/use-cases/ai-code-restore`
- `/compare/runtrim-vs-git`
- `/compare/runtrim-vs-agent-orchestrators`

Recommendation: implement one page first (`/use-cases/ai-agent-drift`) reusing existing marketing layout.

## Tracking sanity audit
- Found `install_command_copied` tracking via copy button.
- Found install CTA event usage in how-it-works.
- Did not safely confirm all requested events (`runtrim_start_copied`, `runtrim_agent_copied`, `pricing_viewed`, `plan_cta_clicked`, `faq_viewed`) across UI in this pass.
- Recommendation: standardize event names in one shared helper and audit all public CTA surfaces.

## Exact fixes implemented
- Metadata positioning cleanup in root + homepage.
- Required title alignment updates on how-it-works/privacy/terms.
- Added WebSite schema and improved SoftwareApplication schema.
- Added FAQPage JSON-LD aligned to visible questions/answers.
- Added `/faq` to sitemap and robots allow list.
- Expanded robots disallow list for private/login/app paths.
- Updated OG image headline/alt to current positioning.
- Improved public internal links in nav/footer/pricing/legal copy.

## Remaining recommendations
- Add dedicated `twitter-image.tsx` for explicit card parity if you want separate social visual control.
- Add one high-intent use-case page (`/use-cases/ai-agent-drift`) and optionally one comparison page with neutral, factual language.
- Normalize metadata descriptions on a few secondary pages to the same control/verify/recover phrasing style.
- Run Lighthouse + Search Console validation after deploy.
