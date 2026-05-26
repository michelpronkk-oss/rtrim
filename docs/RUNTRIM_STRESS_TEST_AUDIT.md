# RunTrim Stress Test Audit

## Final Verdict
- Ready for marketing: partial
- Ready for paid users: partial
- Ready for teams: no

## Executive Summary
Top strengths:
- Core CLI-to-dashboard flow is coherent and mostly premium: `start -> doctor -> agent --copy -> finish -> restore`.
- BLOCKED lifecycle is materially improved in core paths: finish wording is explicit, CI blocks on BLOCKED, restore list labels BLOCKED as `restore available | needs review`.
- Packaging safety is strong: publish verification enforces CLI-only tarball dependencies and blocks web-stack leakage.
- `/faq` now exists and answers high-friction trust objections with local-first, technically honest copy.
- Dashboard `/app` has clear control-room modules (latest run, recovery, autopilot, plan value, CI gate preview) and responsive hardening patterns in code.

Biggest risks:
- Legacy `runtrim go` still appears in user-facing and semi-user-facing surfaces (`--help`, AGENTS/CLAUDE protocol blocks, some public pages/components/changelog), weakening trust and command consistency.
- Visible mojibake remains on public and app surfaces (`/pricing`, `/status`, `/app/connect`, comments/labels), reducing premium quality and clarity.
- JSON-LD `softwareVersion` is stale (`0.1.27`) while `package.json` is `0.1.28`.
- Plan messaging and enforcement still have ambiguity in places (Free bridge run monthly cap shown in entitlements while product narrative centers repo + local-only model).
- Team/governance claims still risk overstatement unless every non-live capability is consistently marked reviewed access/coming soon.

## Critical Blockers
1. Legacy command inconsistency still leaks publicly and in onboarding surfaces.
- Evidence:
  - `node dist-cli/runtrim.cjs --help` still lists `go` as a first-class command without explicit legacy framing.
  - `AGENTS.md` and `CLAUDE.md` still say `Start every task with: runtrim go "<task>"`.
  - `src/components/app/project-agent-chat.tsx`, `src/components/app/mobile-hero-terminal.tsx`, `src/app/changelog/page.tsx` still contain legacy `go` guidance text.
- Why blocker: This directly conflicts with canonical flow and hurts trust at first contact.

2. Premium copy quality is still degraded by mojibake on user-visible pages.
- Evidence:
  - `/pricing` metadata: `RunTrim Pricing â€” ...`
  - `/status` incident copy and separators include encoding artifacts.
  - `/app/connect` still contains `â€”` in trust copy.
  - AGENTS/CLAUDE and large homepage comments include heavy mojibake; some are user-visible in markdown contexts.
- Why blocker: Perceived quality and trust drop for external users and buyers.

3. Metadata correctness mismatch in structured data.
- Evidence:
  - `package.json` version: `0.1.28`
  - `src/app/layout.tsx` JSON-LD `softwareVersion`: `0.1.27`
- Why blocker: SEO/credibility regression and stale machine-readable versioning.

## High-Priority Polish
- `runtrim doctor` still can show `Latest restore point ... unknown` with `Latest run verdict unknown`; improved but still potentially confusing in edge states.
- `runtrim finish` no-change path currently returns `WARN` with sensitive ignored warning; technically valid but can feel surprising without stronger explanation of why WARN is expected.
- `/pricing` looks older than `/plans` and `/` in copy/style consistency and still includes older plan framing language.
- `/app/connect` copy uses `runtrim sync` emphasis, while broader product messaging emphasizes `runtrim finish` auto-sync for Pro; the relationship is not always explicit.
- Free plan messaging is mostly local-only, but there are still mixed signals around limits and “bridge runs per month” vs repo-protection model.

## Flow Test Results
### Commands executed
- `node dist-cli/runtrim.cjs --help`
- `node dist-cli/runtrim.cjs doctor`
- `node dist-cli/runtrim.cjs restore --list`
- `node dist-cli/runtrim.cjs approve "Allow editing docs for this run only"`
- `node dist-cli/runtrim.cjs mcp instructions`
- `node dist-cli/runtrim.cjs finish`
- `node dist-cli/runtrim.cjs ci check`
- `node dist-cli/runtrim.cjs restore --help`
- `node dist-cli/runtrim.cjs login --help`
- `npm run -s verify:package`
- `npm run -s build`

### CLI flow findings
- `doctor`: strong structure and clear sections (Plan, Project, Agent rules, MCP, Agent Autopilot, Restore, Latest run, Readiness).
- `doctor`: readiness is separated from run verdict (`Readiness: ready` while latest run can be unknown/needs review), which is correct.
- `restore --list`: compact and useful; BLOCKED rows are correctly labeled `restore available | needs review`.
- `approve` outside active run: much improved and action-oriented. Current output:
  - `This guarded run is already finished.`
  - `Start a guarded run first: runtrim agent "Your task" --copy`
  - `Then approve...`
- `mcp instructions`: clear and local-first; no overclaiming.
- `finish`: BLOCKED copy in source is strong and explicit (`not trusted yet`, review/approve/restore). Observed run returned WARN due no agent changes + sensitive ignored warning.
- `ci check`: confirms WARN/PASS/BLOCKED model; source enforces non-zero exit on BLOCKED and prints `Risky AI-generated changes detected. Review or restore before merge.`
- `--help`: still exposes legacy-heavy surface with many older commands, including `go`, which dilutes canonical onboarding.

### Commands inspected but not stress-run due side effects
- `runtrim start`, `runtrim agent "..." --copy`, `runtrim login` full interactive token flow, `runtrim restore --apply`.
- Reason: these are state-mutating or account-token interactive; audit used source inspection plus safe command paths.

### Website/page-by-page
- `/`: strong positioning, but file still contains heavy encoding artifacts in comments and some legacy adjacent references in repo components.
- `/plans`: good trust and gating messaging; concise FAQ preview now links to `/faq`.
- `/pricing`: still present and currently lower quality; contains visible mojibake in metadata/title copy.
- `/how-it-works`: clear value flow and command sequence.
- `/faq`: new page is solid, compact, technically honest, and local-first.
- `/status`: useful but contains encoding artifacts in copy.
- Footer/nav: FAQ linked correctly in both.

## Mobile Findings
- `/app` dashboard code shows robust anti-overflow patterns (`min-w-0`, wrapping, stacked button groups, grid collapse).
- `/app/install` code also uses responsive command-row stacking and full-width copy buttons on small screens.
- No obvious horizontal overflow risks found in reviewed code paths for 360/390/430 breakpoints.
- Remaining risk: `/pricing` and `/status` legacy surfaces were not part of recent mobile hardening and should be manually viewport-tested for consistency.

## Plan Gating Findings
- Strong:
  - `doctor` clearly shows Free local-only posture and Pro/Builder upsell path.
  - Dashboard plan cards reflect Free/Pro/Builder/Team value hierarchy.
  - Free sync messaging in CLI correctly uses `Cloud sync skipped. Free keeps this run local.`
- Gaps:
  - Entitlement model still includes Free monthly bridge run cap (`bridgeRunsPerMonth: 5`) that is not always foregrounded in public plan narrative.
  - Some plan copy still references “early access” or older framing while other pages present plans as fully live.
  - Team feature messaging is mostly cautious, but consistency must be enforced everywhere non-live capabilities appear.

## Restore/Recovery Findings
- Strengths:
  - Restore list is compact and actionable.
  - BLOCKED rows are framed as recoverable and review-required, not restore failure.
  - Dashboard recovery card is local-first and explicitly avoids remote restore claims.
  - `recover without spending another agent run` messaging appears in dashboard recovery module.
- Gaps:
  - `doctor` unknown verdict edge state can still read as ambiguous in mixed local restore vs run metadata scenarios.
  - Need tighter consistency so every blocked-adjacent view always includes a clear next action (restore/preview/approve).

## Dashboard Findings
- `/app` aligns well with AI Run Control Room positioning:
  - Latest Run Intelligence
  - Recovery Center
  - Agent Autopilot readiness
  - Protection state
  - Plan-aware cards
  - CI Gate preview
- BLOCKED presentation in dashboard code is strong (`Latest run needs review` and explicit trust language).
- Mobile hardening patterns are present and generally sound.
- Residual quality debt is mostly copy consistency and encoding artifacts inherited from earlier surfaces.

## Public Website/FAQ Findings
- FAQ implementation is strong and conversion-oriented.
- Footer/nav placement is correct and improves discoverability.
- 5-second clarity is good on homepage and install.
- Trust objections are now addressed directly in `/faq`.
- Key residual issues remain: stale legacy command traces and encoding artifacts on selected public pages.

## NPM/Packaging Findings
- Package version: `0.1.28`.
- `verify:package` passed and confirmed CLI-only tarball deps:
  - `chalk, clipboardy, commander, execa, nanoid, ora, prompts, zod`
- No forbidden web dependencies in packed artifact.
- Publish safety scripts are strong (`safe-publish.mjs`, `verify-package.mjs`) with manifest prepare/restore safeguards.
- Packaging discipline is a product strength.

## Recommended Final Fixes
1. Remove or legacy-label all user-facing `runtrim go` guidance.
- Why it matters: primary trust and onboarding consistency issue.
- Exact suggested fix: scrub public copy/help/docs/agent protocol blocks and keep `go` only as clearly marked legacy compatibility.
- Severity: blocker

2. Complete mojibake cleanup on user-visible surfaces.
- Why it matters: premium quality and comprehension.
- Exact suggested fix: clean encoding artifacts in `/pricing`, `/status`, `/app/connect`, AGENTS/CLAUDE protocol text, and any visible metadata strings.
- Severity: blocker

3. Sync JSON-LD software version with package version.
- Why it matters: SEO/data integrity.
- Exact suggested fix: set `softwareVersion` in `src/app/layout.tsx` to `0.1.28` or derive from package version at build time.
- Severity: blocker

4. Tighten doctor unknown-verdict edge wording.
- Why it matters: blocked/unknown ambiguity can still cause user doubt.
- Exact suggested fix: when latest run verdict is unavailable but restore point exists, prefer explicit source labels and avoid plain `unknown` when richer status is available.
- Severity: high

5. Standardize Free/Pro/Builder/Team narrative across all public pages.
- Why it matters: conversion clarity and fewer support objections.
- Exact suggested fix: align `/pricing`, `/plans`, `/app/install`, and CLI doctor/login wording to one canonical entitlement matrix.
- Severity: high

6. Clarify legacy command inventory in CLI `--help`.
- Why it matters: first-run cognitive load and command-era confusion.
- Exact suggested fix: group legacy/bridge commands under a legacy section or reduce prominence in default help output.
- Severity: medium

7. Add explicit note connecting `finish` and `sync` in connect/install flows.
- Why it matters: reduces confusion about when dashboard updates occur.
- Exact suggested fix: add one-line clarification that Pro auto-syncs on finish while manual `runtrim sync` remains available.
- Severity: medium

## Go/No-Go Recommendation
- Recommendation: No-go for broad marketing until blockers are resolved.
- Rationale: The product is technically strong and close, but public trust is still undermined by legacy command leakage, visible encoding artifacts, and stale structured metadata versioning.
- If proceeding with limited launch: acceptable for controlled technical beta with close monitoring of onboarding confusion, support tickets about command flow, and trust objections around local-first claims.
