# GitHub Launch Checklist

Use this checklist before announcing RunTrim publicly.

## 1. Profile cleanup

- Set profile name to RunTrim, or keep personal name with a RunTrim-focused bio.
- Suggested bio: `Local-first control layer for AI coding agents.`
- Suggested URL: `https://www.runtrim.com`
- Replace profile avatar with the RunTrim logo or a clean professional mark.
- Pin only the RunTrim repository.
- Make unrelated product repositories private.

## 2. Repository settings

- Rename repository from `rtrim` to `runtrim` if available.
- Description: `Local-first control layer for AI coding agents.`
- Website: `https://www.runtrim.com`
- Topics:
  - `ai`
  - `cli`
  - `developer-tools`
  - `claude`
  - `codex`
  - `cursor`
  - `typescript`
  - `local-first`
  - `ai-agents`

## 3. Visibility

- Keep RunTrim public.
- Set unrelated private product repositories to private manually.
- Rotate secrets if any private product repository was public at any point.

## 4. Repository hygiene

- Confirm `.env` files are not tracked.
- Confirm `.runtrim/` is ignored.
- Confirm package tarballs (`*.tgz`) are ignored.
- Confirm `npm pack --dry-run` is clean.

## 5. Launch checks

- README is clear and launch-ready.
- Legal pages are live: `/privacy`, `/terms`, `/security`.
- Install page is live: `/app/install`.
- npm package release plan is clear.
- GitHub topics are set.
- Profile pinned repositories are cleaned up.
