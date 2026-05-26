# RunTrim FAQ Audit

## Verdict
Yes, RunTrim needs a public FAQ.

Why:
- Trust objections are predictable and high-stakes (source code privacy, local vs cloud behavior, BLOCKED runs, restore semantics).
- Plan complexity (Free, Pro, Builder, Team) creates pre-upgrade confusion that pricing cards alone do not fully resolve.
- Existing FAQ content is fragmented (notably in `/plans` and SEO landing pages), so users do not get one canonical answer surface.
- The product asks developers to install CLI tooling, change workflow, and trust guardrails. A premium devtool needs short, technical objection handling before install and before upgrade.

## Best Placement
Recommended combination:
- Dedicated `/faq` page for canonical answers, SEO capture, and clean linking.
- Compact homepage FAQ section (4-6 highest-conversion questions) above footer.
- Keep a short plan-focused FAQ block on `/plans`, but link each item to `/faq` for full context.
- Add FAQ link in global footer and mobile nav.

Why this combination:
- Homepage FAQ handles install-time objections early.
- `/faq` avoids overloading homepage/plans and gives support/sales a single URL.
- `/plans` can stay conversion-focused while still answering entitlement objections.

## Recommended FAQ Questions
### Trust and privacy
- Does RunTrim upload my source code?
- What data does RunTrim sync to the cloud?
- Can RunTrim read `.env` files or secrets?
- Is RunTrim local-first if I never log in?

### Agent workflow
- How does RunTrim work with Claude, Cursor, Codex, and ChatGPT?
- Do I need MCP to use RunTrim?
- Does RunTrim replace my coding agent?
- What is the recommended command flow?

### Restore and recovery
- Does restore use more agent tokens?
- What happens when a run is BLOCKED?
- Is restore local or remote?
- What is restore metadata?

### Plans and limits
- What is included in Free vs Pro vs Builder vs Team?
- Why is cloud history locked on Free?
- When should I upgrade to Builder?
- Is Team fully live or reviewed access?

### Teams and CI
- Does RunTrim block risky PRs in CI?
- Are GitHub checks and policies live for all plans?
- What governance features are live today for Team?

## Recommended FAQ Copy
### Trust and privacy
**Does RunTrim upload my source code?**
No. Source code stays local by default. Cloud sync stores run metadata only.

**What data does RunTrim sync to the cloud?**
Run metadata such as verdict, changed file paths, project memory summaries, and restore metadata. Not raw source file contents.

**Can RunTrim read `.env` files or secrets?**
RunTrim checks sensitive paths for safety, but does not read or upload env file contents.

**Is RunTrim local-first if I never log in?**
Yes. Free runs locally with guarded runs, finish verification, and local restore.

### Agent workflow
**How does RunTrim work with Claude, Cursor, Codex, and ChatGPT?**
RunTrim creates a guarded contract and handoff, tracks the run, then verifies with `runtrim finish`.

**Do I need MCP to use RunTrim?**
No. MCP is optional. Copy mode works with any agent UI.

**Does RunTrim replace my coding agent?**
No. It is the control, verification and recovery layer around your agent.

**What is the recommended command flow?**
1. `runtrim start`
2. `runtrim agent "your task" --copy`
3. `runtrim finish`
4. `runtrim restore` if recovery is needed

### Restore and recovery
**Does restore use more agent tokens?**
No. Restore is local recovery and does not require another agent run.

**What happens when a run is BLOCKED?**
The run is recorded as evidence but is not trusted yet. Review, approve scoped changes, or restore.

**Is restore local or remote?**
Restore apply is local through the CLI. Dashboard shows restore metadata and guidance.

**What is restore metadata?**
Restore metadata is the run-linked recovery record shown in dashboard history. File recovery still happens locally.

### Plans and limits
**What is included in Free vs Pro vs Builder vs Team?**
Free protects one project locally. Pro adds cloud sync and dashboard history for your main project. Builder adds unlimited projects and CI Gate. Team adds governance controls, with some capabilities marked reviewed access or coming soon.

**Why is cloud history locked on Free?**
Free is designed for local-first guarded runs. Pro unlocks cloud run history, memory sync, and restore metadata sync.

**When should I upgrade to Builder?**
Upgrade when you need multi-project protection, advanced recovery history, and CI merge gating.

**Is Team fully live or reviewed access?**
Team includes governance direction. Features not fully shipped should be labeled reviewed access or coming soon.

### Teams and CI
**Does RunTrim block risky PRs in CI?**
Yes, with `runtrim ci check` when configured. BLOCKED should fail the check.

**Are GitHub checks and policies live for all plans?**
No. CI and policy depth are plan-gated. Use explicit live vs coming soon labels.

**What governance features are live today for Team?**
Show only implemented controls as live. Label shared logs, approvals, and policy surfaces accurately if still rolling out.

## Footer Recommendation
Yes, footer should include FAQ.

Recommended footer links:
- Docs
- Plans
- Changelog
- Status
- FAQ
- GitHub
- Privacy
- Terms

Placement:
- Put `FAQ` in Product links, directly after `Docs` or after `Plans`.
- Use a direct route link: `/faq`.
- Do not use `#faq` as the primary footer target because users need a standalone shareable support URL.

Additional nav recommendation:
- Add `FAQ` to mobile dropdown links in `PublicNav` for faster objection handling on small screens.

## SEO Recommendation
Create `/faq`.

Why:
- High-intent queries map directly to RunTrim objections (`uploads code`, `restore`, `MCP`, `BLOCKED`, `CI gate`, `Free vs Pro`).
- One canonical page reduces inconsistent answer snippets across public pages.
- Supports structured data and internal linking from homepage, plans, install, and docs.

Recommended metadata:
- URL: `/faq`
- Title: `FAQ | RunTrim`
- Meta description: `Answers about RunTrim privacy, local-first restore, BLOCKED runs, MCP, and Free/Pro/Builder/Team limits.`
- JSON-LD: `FAQPage` schema using only claims that are live and verifiable.

Internal links to `/faq`:
- Homepage trust section
- `/plans` near comparison table and CTA strip
- `/app/install` near Quick Start and MCP section
- Footer and mobile nav

## Implementation Plan
1. Add dedicated FAQ route.
- Scope: `src/app/faq/page.tsx` with concise grouped Q/A and clear live vs coming-soon labels.
- Keep answers short and technical.

2. Add compact homepage FAQ module.
- Scope: `src/app/page.tsx` near trust/conversion area before footer.
- Include 4-6 top questions only, link to `/faq` for full list.

3. Keep `/plans` FAQ short and link out.
- Scope: existing FAQ-style section in `src/app/plans/page.tsx`.
- Keep plan and privacy objections, add `View all FAQs` link.

4. Update footer and mobile nav links.
- Scope: `src/components/app/public-footer.tsx`, `src/components/app/public-nav.tsx`.
- Add `FAQ` in stable, visible position.

5. Add FAQ metadata and schema.
- Scope: page metadata in FAQ route; optional shared schema helper if already used.
- Ensure no overclaiming in JSON-LD.

6. Cross-link install/connect pages.
- Scope: `src/app/app/install/page.tsx` and optionally `src/app/app/connect/page.tsx` for cloud/privacy clarifiers.
- Add single-line link to `/faq` near trust statements.

## Risks
- Overclaim risk: Team governance, GitHub checks, approvals/policies must be labeled reviewed access or coming soon where not fully live.
- Privacy wording drift: keep one canonical phrase for data boundaries (metadata-only sync, source code stays local by default).
- Plan drift: ensure FAQ matches actual entitlement enforcement, not aspirational copy.
- BLOCKED semantics drift: FAQ must clearly say BLOCKED is recoverable evidence, not trusted completion.
- Fragmentation risk: avoid maintaining different answers in homepage, plans, and docs without a canonical `/faq` source.
