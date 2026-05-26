# RunTrim Full Audit

## Executive Summary
- Current product state:
RunTrim is materially strong on core architecture (contracted runs, finish verdicts, local recovery, sync pipeline, CI gate), but it is not yet marketing-clean for broad GTM because command/copy consistency, entitlement messaging consistency, and UX polish still leak internal evolution.
- Biggest strengths:
1. Real safety primitives exist end-to-end: contract + scope + finish verdict + restore.
2. BLOCKED semantics now mostly align with “recoverable evidence, not trusted completion.”
3. Local-first trust language is present in website, plans, install, connect, and dashboard.
4. CLI has meaningful operational depth (doctor, finish, restore, ci check, mcp).
5. Packaging pipeline has serious safeguards (prepare/verify/restore manifest and tarball dependency checks).
- Biggest risks:
1. Command-era drift (`start/agent` vs legacy `go`) is still visible in high-friction CLI paths.
2. Entitlement source-of-truth is inconsistent across product copy and server/CLI enforcement paths.
3. Dashboard metadata/title and in-app naming lag the new “AI Run Control Room” positioning.
4. Public-facing copy quality is degraded in multiple places by encoding artifacts and long-form density.
5. Some premium value claims (Team governance/policies) are directionally accurate but still partly aspirational.
- Top 5 fixes before major marketing:
1. Eliminate all stale legacy command guidance from user-facing critical paths (`approve`, `finish no active run`, `sync no runs`, `check no runs`).
2. Unify entitlement truth (Free cloud behavior, run limits, dashboard access) and mirror it consistently in CLI, API, billing, plans, and dashboard cards.
3. Clean copy/encoding artifacts and tighten homepage/CLI prose to a premium, high-confidence voice.
4. Align browser metadata/title system for `/app` and app subpages with Control Room positioning.
5. Harden Connect CLI + upgrade moments with explicit plan-aware outcome states and fewer ambiguous CTAs.

## Current Product Map
- Website:
`/` positions RunTrim as control/verification/recovery layer; `/pricing` and `/plans` provide plan narrative and CTAs.
- CLI:
Install, start, doctor, agent, finish, restore, sync, login, mcp, ci check, approve all present with substantial operational logic.
- Agent Autopilot:
Rules propagated via `AGENTS.md`, `CLAUDE.md`, `.runtrim/agent/instructions.md`, cursor rule generation, and MCP tool contracts.
- MCP:
Project snippets generated locally; tools exposed (`runtrim_create_contract`, `runtrim_check_path`, `runtrim_suggest_approval`, `runtrim_finish_guidance`); readiness surfaced in doctor.
- Restore:
Interactive picker + list/default filtering + targeted restore modes + explicit local apply + sensitive path-only handling.
- Dashboard:
`/app` shows control room modules: latest run intelligence, recovery, autopilot readiness, protection label, plan-aware cards, CI gate preview, empty states.
- Plans:
Free/Pro/Builder/Team documented across homepage, `/plans`, `/pricing`, and billing CTAs, but with non-trivial consistency gaps.
- Packaging:
Root package supports web build; publish pipeline strips to CLI-only dependency surface and verifies tarball contents.

## What Works Well
- Finish pipeline computes PASS/WARN/BLOCKED from real scope/sensitive/forbidden/out-of-contract states.
- BLOCKED now carries explicit “not trusted yet” guidance and restore-first recovery messaging.
- Restore UX defaults to restore-capable runs and surfaces blocked runs as “needs review.”
- CI check exits non-zero on BLOCKED and now prints merge-block rationale.
- Doctor separates readiness from run verdict and gives actionable MCP/autopilot steps.
- Sync pipeline stores metadata-rich run records without code content.
- Public install path clearly offers no-account local-first start.
- Billing CTA components are state-aware (logged out, trial, past due, active plan).
- Package publish safety is robust: backup/restore + dependency allowlist + forbidden dependency detection.

## Critical Issues
1. Command consistency trust break (high):
`runtrim approve` still says “Contract is not active. Start a new run first. Run: runtrim go "<task>"” after modern `runtrim start` + `runtrim agent --copy` guidance. This is the exact inconsistency reported by the user and is a real confidence leak.
2. Legacy `go` appears in multiple fallback/next-step outputs (high):
`finish` (no active run), `sync` (no runs), `check` (no runs), and other guidance still pushes `runtrim go`, conflicting with primary onboarding.
3. Entitlement inconsistency across code and copy (high):
`src/lib/entitlements.ts` sets Free `cloudSync: true` + sync run limits, while product copy repeatedly says Free is local-only/no cloud sync. This mismatch can create perceived bait-and-switch.
4. Plan gating inconsistency in app architecture (high):
`/app` layout gates Free users to billing/trial-only app routes, while product copy often implies broader Free dashboard visibility. Needs a single explicit policy.
5. Premium polish damage from encoding artifacts (high):
Multiple public/CLI files contain broken glyph sequences (`â€”`, corrupted separators/comments). This materially reduces trust and perceived quality.
6. Team feature over-claim risk (high):
Team copy includes governance/audit/policies narratives while some surfaces still mark these as “coming soon” or “direction enabled.” Positioning needs strict capability labeling.

## High-Priority Polish
- `/app` metadata title still `Dashboard` while page H1 is `AI Run Control Room`; tab/title mismatch weakens positioning.
- Homepage and plans pages are copy-heavy and sometimes repetitive; “5-second understanding” objective is only partially met.
- Connect CLI flow says “runs, memory, savings” sync, but does not clearly explain plan-locked outcomes during that flow.
- Restore UX is functionally strong but still text-dense; needs “recovery cockpit” hierarchy in CLI output and dashboard links.
- Builder CTA gating is good conceptually, but uses mixed copy (`Get Builder` / `Upgrade to Builder` / contact routes) across surfaces.

## 1B Product Opportunities
1. Autonomous Run Safety Layer:
Move from command toolkit to continuous “run safety substrate” where agents auto-negotiate scope and approvals in-session (with transparent user checkpoints).
2. Recovery Confidence Index:
Add a standardized score proving “recoverability quality” per run (restore point completeness, sensitive-file handling, drift scope), creating a marketable moat beyond generic guardrails.
3. Policy-as-Code for teams:
Builder/Team should expose human-readable policy bundles and auditable policy diffs, bridging compliance and engineering leadership.
4. Evidence-grade CI artifacts:
Generate compact, reviewer-ready “AI run evidence cards” attached to PRs: scope, blocked reasons, restore safety, proof gaps.
5. Plan-native growth loops:
Turn lock moments into objective capability unlock paths (not generic upgrade asks): second repo, sync limit, restore depth, CI gate.

## Plan/Entitlement Consistency
| Plan | Promised | Actually Enforced | Gaps |
|---|---|---|---|
| Free | 1 repo, local-first, no cloud sync, limited restore/history | CLI repo limit enforced; local restore cap enforced in list/picker; API allows limited sync behavior under some conditions; app layout gates dashboard behind paid routes | Major messaging mismatch around cloud sync/local-only; Free visibility policy across app routes is unclear |
| Pro | Cloud sync, dashboard history, memory sync, restore metadata, 1 main project | Login + registry plan updates; billing/pro checkout flows present; sync and dashboard behavior mostly aligned | “one main project” logic needs clearer explicit enforcement narrative across surfaces (needs verification) |
| Builder | Unlimited projects, advanced recovery, CI gate | CLI plan state unlock messaging and ci gate cues present; builder checkout path implemented | Some claims still mostly copy-level; proof/drift exports need clearer “live vs roadmap” labeling |
| Team | Shared governance, approvals/audit direction, checks/policies coming soon | Team states and contact paths exist; some “coming soon” markers present | Risk of overclaim unless every surface consistently labels directional features |

## CLI Flow Audit
- `npm install -g runtrim`:
Strong and prominent across website/install/connect. Good.
- `runtrim start`:
Very comprehensive setup and trust notes. Risk: output verbosity is high and may overwhelm first-run users.
- `runtrim doctor`:
Excellent diagnostics and plan/autopilot split. Good blocked-run handling now. Could be shorter by default with `--verbose` mode.
- `runtrim agent "task" --copy`:
Core flow works and messaging is strong. Legacy `go` remains too visible in adjacent commands.
- `runtrim finish`:
Verdict and scope reporting are robust. BLOCKED guidance materially improved. Fast Run Report path still references legacy starts and may confuse onboarding.
- `runtrim restore`:
Powerful and safe; explicit apply confirmation; sensitive files path-only; blocked runs marked needs review. Strong.
- `runtrim mcp instructions`:
Clear enough for technical users, but still tool-name heavy for non-MCP-native users.
- `runtrim login` + `runtrim sync`:
Flow works, plan hints present. Needs sharper plan-aware copy when sync is unavailable/limited.
- `runtrim approve`:
Critical inconsistency bug in user guidance (stale `go` command + contract-active confusion).

## Dashboard Audit
What works:
- `/app` now behaves as control-room style surface with latest run intelligence, recovery center, autopilot readiness, protection label, plan cards, and CI preview.
- BLOCKED latest-run now shows needs-review and recovery/approve actions.
- Clear local-first recovery language avoids overclaiming remote rollback.

What is missing / weak:
- Metadata/tab naming still generic (`Dashboard`) while page positions as Control Room.
- Protection score uses labels only (acceptable), but lacks transparent “why this label” decomposition in UI.
- Free user value path relies heavily on redirect-to-billing gating, reducing perceived in-product utility.
- Pro value is visible but can be made more concrete with historical insights/trend deltas.

## Restore/Recovery Audit
- Lifecycle quality:
Restore point capture at run creation and post-finish metadata updates are present.
- List behavior:
Default list shows restore-capable runs; Free limit applied; `--all` includes non-restore archive.
- Picker behavior:
Supports full/out-of-scope/forbidden preview/apply with explicit confirm.
- Safety:
Sensitive/env-like files are listed by path and skipped by default; apply requires git + commit + confirmation; unrelated changes block unless forced.
- BLOCKED recovery:
Blocked rows correctly shown as “restore available | needs review.”
- Copy gap:
The strongest line “Recover without spending another agent run.” is present in dashboard, but should be more central in CLI restore/doctor output hierarchy.

## Agent Autopilot/MCP Audit
Strengths:
- Instructions cover contract-before-edits, memory use, risky path checks, scope expansion approvals, finish-before-done, and restore fallback.
- MCP tools align with the critical control loop.
- Doctor reports MCP connected/not connected clearly.

Weaknesses:
- Over-automation risk in copy: some surfaces imply near-seamless autopilot while MCP may be unconfigured.
- `.runtrim/bridge/agent-instructions.md` is thinner than `.runtrim/agent/instructions.md`; capability language is uneven.
- MCP instructions expose internal tool names prominently; this is good for technical setup, but product UX should lead with outcomes first.

## Copy Audit
Strongest current copy:
- “See what your agents changed, what RunTrim caught, and how to recover.”
- “Recover without spending another agent run.”
- “RunTrim recorded this run, but it should not be treated as trusted work until reviewed or restored.”
- “Source code stays local by default.”

Weak/stale copy:
- Legacy `runtrim go` guidance in core fallback/next-step paths.
- `runtrim approve` contract-not-active message conflicts with current recommended flow.
- Encoding-corrupted copy in public pages and CLI comments/logs degrades brand quality.
- Mixed builder CTA language across pages (`Get Builder`, `Upgrade to Builder`, email/contact fallback).

Recommended replacement copy (examples):
- Replace legacy fallback:
Current: “Run: runtrim go \"<task>\"”
Recommended: “Run: runtrim start, then runtrim agent \"<task>\" --copy”
- Replace ambiguous contract message:
Current: “Contract is not active. Start a new run first.”
Recommended: “No active guarded contract found. Start a guarded run with runtrim agent \"<task>\" --copy.”
- Replace generic sync success for blocked run:
Current (fixed in finish/sync paths): ensure all surfaces use “Blocked report synced for review.”

## Packaging/SEO Audit
NPM packaging findings:
- Good: root repo manifest supports Next.js/Vercel build.
- Good: publish pipeline strips to CLI-only dependencies and restores manifest safely.
- Good: verify-package checks tarball dependencies and forbidden web deps.
- Risk: `prepare-cli-package-manifest` recovery hint suggests destructive git checkout command text; not fatal, but can be safer.

SEO/metadata findings:
- Public metadata is generally strong with OG/Twitter coverage.
- App/private pages correctly noindex.
- Gap: app tab naming not fully aligned with new Control Room product language.
- Gap: software JSON-LD version appears stale (`0.1.18`) vs package version (`0.1.27`).

## Recommended Next 10 Tasks
1. Remove legacy command drift from all user-facing CLI outputs.
- Why: fixes trust break and onboarding confusion immediately.
- Exact scope: `cli/runtrim.ts` fallback/next/help lines for `approve`, `finish`, `sync`, `check`, memory/continue/status surfaces.
- Risk: low.
- Expected impact: high conversion lift in activation and fewer support tickets.

2. Unify entitlement truth across server, CLI, dashboard copy, pricing copy.
- Why: prevents promise/enforcement mismatch.
- Exact scope: `src/lib/entitlements.ts`, plan copy sources, billing plan API output semantics, dashboard gate copy.
- Risk: medium.
- Expected impact: high trust + lower churn from expectation mismatch.

3. Standardize BLOCKED language dictionary globally.
- Why: avoid “project blocked” confusion and completion ambiguity.
- Exact scope: CLI, dashboard, runs list/details, sync responses, CI outputs.
- Risk: low.
- Expected impact: medium-high trust and operational clarity.

4. Clean all encoding/artifact text in public pages and CLI outputs.
- Why: current corrupted glyphs make product look unreliable.
- Exact scope: homepage/comments/strings, pricing/plans metadata punctuation, CLI output strings.
- Risk: low.
- Expected impact: medium conversion + perceived product quality.

5. Tighten first-run CLI verbosity with progressive detail levels.
- Why: reduce cognitive load during onboarding.
- Exact scope: `runtrim start`, `doctor`; add concise default + `--verbose` detail mode.
- Risk: medium.
- Expected impact: medium activation completion.

6. Align `/app` metadata and tab semantics to Control Room positioning.
- Why: reinforce product narrative consistency.
- Exact scope: app metadata titles/descriptions for overview and key subpages.
- Risk: low.
- Expected impact: low-medium polish and brand coherence.

7. Make upgrade moments capability-specific instead of generic.
- Why: improves conversion quality without pushiness.
- Exact scope: repo-limit, sync-limit, restore-depth, CI gate, dashboard-history lock copy.
- Risk: low.
- Expected impact: medium MRR lift.

8. Clarify Connect CLI outcomes by plan.
- Why: currently users can connect but not fully predict sync/history behavior.
- Exact scope: connect page step copy and post-login confirmations.
- Risk: low.
- Expected impact: medium trust + lower confusion.

9. Add explicit “live vs coming soon” badges to Team/Builder governance features.
- Why: avoid overclaiming and enterprise trust damage.
- Exact scope: plans, pricing, dashboard plan cards, billing cards.
- Risk: low.
- Expected impact: medium enterprise readiness perception.

10. Publish a single “RunTrim Promise” safety page linked from install/plans/dashboard.
- Why: crystallizes moat around control, verification, recovery.
- Exact scope: new public page + consistent links.
- Risk: low.
- Expected impact: medium marketing conversion + buyer confidence.

## Friction Audit
1. Current behavior:
Users still encounter legacy `runtrim go` in fallback paths.
Ideal 1B behavior:
One canonical command flow everywhere.
Suggested fix:
Replace all stale fallback strings and help text with `start -> agent --copy -> finish`.

2. Current behavior:
`runtrim start` and `doctor` output volume is high for first-time users.
Ideal 1B behavior:
Short “state + next action” first, expandable detail second.
Suggested fix:
Concise default, verbose flag.

3. Current behavior:
`runtrim approve` can fail with “Contract is not active” after recent handoff actions.
Ideal 1B behavior:
Approval command always indicates exact missing precondition and recovery command.
Suggested fix:
Context-aware precondition messaging tied to active run status.

4. Current behavior:
Builder upgrade path copy differs across homepage/plans/billing/components.
Ideal 1B behavior:
Single consistent intent and CTA logic.
Suggested fix:
Central CTA copy matrix.

5. Current behavior:
Users must manually remember many command variants/flags.
Ideal 1B behavior:
CLI suggests exact next command by state and allows one-click/one-copy continuation.
Suggested fix:
State-aware command recommendation bundle in start/doctor/finish outputs.

## Trust/Safety Audit
- Env files not read by design and explicitly stated in agent instructions: pass.
- Source not uploaded by default and repeatedly communicated: pass.
- Sensitive paths path-only in restore preview and warnings: pass.
- Restore apply requires explicit confirmation and git guard checks: pass.
- No automatic remote restore claims in dashboard: pass.
- False failure risk remains in command-era mismatch and some ambiguous guidance: partial.
- Local-first language present across major surfaces: pass.

## Conversion Audit
1. Second repo attempt:
- Current copy: CLI indicates Free includes 1 tracked repo and suggests Builder.
- Recommended copy: “You’ve protected 1/1 repos on Free. Builder unlocks unlimited repos and CI gate.”
- Plan target: Builder.
- Tone: natural if framed as usage milestone.

2. Cloud sync locked:
- Current copy: appears in doctor/finish/login, but inconsistent with entitlement implementation semantics.
- Recommended copy: make lock explicit only if actually enforced; otherwise call it “limited beta sync on Free.”
- Plan target: Pro.
- Tone: currently potentially confusing.

3. Restore history limit:
- Current copy: Free latest 5 points shown in doctor/list behavior.
- Recommended copy: include “recover deeper history with Pro/Builder.”
- Plan target: Pro/Builder.
- Tone: natural.

4. Dashboard history locked:
- Current copy: present in plan cards.
- Recommended copy: show concrete value (“compare last 20 runs, trends, recurring risk areas”).
- Plan target: Pro.
- Tone: natural.

5. CI gate locked:
- Current copy: “Builder unlocks CI Gate for AI-generated PRs.”
- Recommended copy: add direct risk outcome (“block risky merges before main”).
- Plan target: Builder.
- Tone: natural.

6. Team governance controls:
- Current copy: mixed live/coming-soon language.
- Recommended copy: split into “live now” and “roadmap” bullets.
- Plan target: Team.
- Tone: must remain conservative.

## Final Verdict
- Launch-ready?
Partial. Product works, but command/copy consistency issues still create trust drag.
- Marketing-ready?
Not yet for broad campaigns. Needs command consistency cleanup, entitlement consistency, and copy/encoding polish first.
- Team-ready?
Mostly yes for technical early adopters; still needs stricter feature-state labeling.
- Enterprise-ready?
Not yet. Governance/policy/audit claims need tighter live-vs-roadmap clarity and evidence packaging.
- What must be fixed first?
1. Legacy command inconsistency (`runtrim go` leaks + `approve` mismatch).
2. Entitlement/copy enforcement mismatches (especially Free cloud sync semantics).
3. Encoding/copy polish across public and CLI surfaces.
4. Unified plan-value messaging and CTA consistency.
5. Metadata/title consistency for Control Room positioning.
