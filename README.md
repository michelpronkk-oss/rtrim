# RunTrim

Scope the run before the agent touches your repo.

RunTrim is a local-first control layer for AI coding agents. It prepares guarded prompts, monitors execution scope, checks outcomes, and keeps project memory so the next run starts with context.

## What RunTrim is

RunTrim is a CLI for developers using tools like Claude Code, Codex, Cursor, and ChatGPT. It sits in front of your coding run and helps you avoid risky, oversized, or context-wasting prompts.

## Why RunTrim exists

AI coding runs often fail for operational reasons, not model quality:
- tasks are too broad
- sensitive surfaces are touched by accident
- context is lost between sessions
- teams repeat failed attempts without a reliable run log

RunTrim adds structure before the run and continuity after the run.

## Daily loop

Recommended daily flow:

```bash
runtrim go "your task"
```

RunTrim prepares a guarded prompt, copies it for your agent, records the run locally, and prints the next steps.
Paste the guarded prompt into your agent.
Keep the local panel open:

```bash
runtrim panel --monitor
```

After edits:

```bash
runtrim check
```

If context or usage runs out:

```bash
runtrim continue --reason usage_limit
```

Guided menu when unsure:

```bash
runtrim start
```

`runtrim start` checks repo state and tells you the next safe command.
Free includes 1 tracked local repo.

Direct operator flow:

```bash
runtrim go "fix checkout redirect"
runtrim panel --monitor
runtrim check
runtrim continue --reason usage_limit
runtrim memory
```

## Install

Global install for end users:

```bash
npm install -g runtrim
runtrim go "your task"
```

Local preview for repository development:

```bash
git clone https://github.com/michelpronkk-oss/rtrim
cd rtrim
npm install
npm run runtrim -- init
npm run runtrim -- start
```

## CLI release checklist

Before publishing to npm:

1. `npm run build`
2. `npm run verify:cli`
3. `npm run verify:package`
4. `npm link`
5. `runtrim agent --help`
6. `runtrim go "test task" --no-sync`
7. `npm version patch`
8. `npm publish`

## What RunTrim does

- audits task scope before execution
- blocks unsafe mega-runs and suggests split-safe follow-ups
- generates guarded prompts with explicit stop rules
- monitors changed files during execution
- reviews changed files, risk flags, verification debt, and next safe action after edits
- shows current project memory, latest run state, and continuation guidance in `.runtrim/`

## Core commands

```bash
runtrim init
runtrim go "<task>"
runtrim start
runtrim prepare "<task>"
runtrim panel
runtrim panel --monitor
runtrim check
runtrim continue --reason usage_limit
runtrim memory
runtrim sync
```

Advanced commands:

```bash
runtrim prepare "<task>"
runtrim start
runtrim panel
runtrim panel --monitor
runtrim check
runtrim continue --reason usage_limit
```

## Examples

Guarded prepare flow:

```bash
runtrim prepare "fix checkout redirect"
```

High-risk split-required flow:

```bash
runtrim prepare "rewrite auth flow, middleware, database schema and billing"
```

## Monitor and panel

Use `runtrim panel` to open a local browser panel on localhost.
Use `runtrim panel --monitor` to open the same local panel with live git change monitoring.

It keeps local run state visible and warns when scope drifts into risky or forbidden areas.
Quick keys in panel:
- `p` prepare
- `g` guard
- `c` check
- `m` memory
- `r` report
- `s` sync
- `q` quit

## Check

Run `runtrim check` after the agent edits files.

It validates changed files, summarizes risk posture, and reports missing proof items before you continue.

## Continuation recovery

When a run stops due to usage or context limits:

```bash
runtrim continue --reason usage_limit
```

RunTrim prepares a continuation prompt and stores continuation metadata in local memory.

## Project memory

`runtrim memory` shows where the project currently stands:
- latest task and run status
- changed files
- missing proof
- protected areas
- next safe action

## Sync V0 private beta

Cloud sync is private beta and metadata-only.

Sync can upload:
- project name and status
- run status and risk metadata
- RunTrim-generated prompts
- changed file paths
- project memory summaries
- timestamps and estimated savings

Sync does not intentionally upload:
- source code
- `.env` values
- secret file contents

```bash
runtrim auth set "<token>"
runtrim config set dashboard-url https://www.runtrim.com/app
runtrim sync
```

## Privacy model

RunTrim Free runs locally and stores state in `.runtrim`.
Free includes 1 tracked local repo. Builder early access supports unlimited tracked repos.
A tracked repo is one codebase with its own `.runtrim` workspace.

V1 is designed so source code is not uploaded. Cloud sync stores metadata only when enabled.

See:
- https://www.runtrim.com/privacy
- https://www.runtrim.com/security

## Status

RunTrim is in early V1.

Free local CLI is available. Cloud sync and hosted dashboard access are private beta.

## Roadmap

- npm package launch hardening
- stronger local policy presets
- richer post-run verification workflows
- expanded cloud memory rollout

## Packaging

```bash
npm run build
npm run build:cli
npm pack --dry-run
```
