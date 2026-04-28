# RunTrim

RunTrim scopes AI coding runs before they waste tokens.

RunTrim is a local CLI guard layer for Claude, Codex, Cursor, and other AI coding agents. It audits a raw task, blocks unsafe mega-runs, creates a scoped run contract, checks the diff after the agent runs, and remembers where you left off.

## Why RunTrim exists

Agent runs fail in predictable ways:
- prompts are too broad
- agents scan too much of the repo
- sensitive systems get touched by accident
- follow-up prompts restart from scratch

RunTrim adds pre-run scope control and post-run continuity.

## What it does

- Audits task quality and risk before execution
- Blocks unsafe mega-runs and recommends split audits
- Generates guarded run contracts with explicit scope and stop rules
- Checks git diff and output proof after an agent run
- Generates next safe prompts for continuation
- Stores local run memory in `.runtrim/`

## Install

### Local preview (available now)

```bash
git clone https://github.com/michelpronkk-oss/rtrim
cd rtrim
npm install
npm run runtrim -- init
npm run runtrim -- run "fix checkout redirect"
```

### Local global test (npm link)

```bash
npm run build:cli
npm link
runtrim init
runtrim run "fix checkout redirect"
runtrim memory
```

### Global npm install (after publish)

```bash
npm install -g runtrim
runtrim init
runtrim run "fix checkout redirect"
```

## Quick start

```bash
npm run runtrim -- init
npm run runtrim -- prepare "fix checkout redirect"
npm run runtrim -- run "fix checkout redirect"
npm run runtrim -- check
npm run runtrim -- memory
npm run runtrim -- report
```

## Core commands

```bash
runtrim init
runtrim guard "<task>"
runtrim prepare "<task>"
runtrim run "<task>"
runtrim check
runtrim memory
runtrim memory --prompt
runtrim report
runtrim agent
runtrim agent set copy
runtrim agent set claude
runtrim agent set codex
runtrim agent set custom "<command>"
```

## Copy mode vs command mode

- Copy mode: RunTrim generates and copies a guarded contract. You paste it into your agent.
- Command mode: RunTrim wraps your configured local agent command and keeps guard rails.

## Prepare mode

`runtrim prepare "<task>"` audits and prepares a guarded prompt but never executes an agent.

Examples:

```bash
runtrim prepare "fix checkout redirect"
runtrim prepare "fix checkout redirect" --open
runtrim prepare "fix checkout redirect" --agent cursor --editor cursor
runtrim prepare "rewrite auth, middleware, database and billing"
```

## Example: blocked mega-run

Input:

```bash
runtrim run "rewrite auth flow, fix middleware, update database schema, make billing work"
```

Result:
- Split required
- High-risk systems detected
- Recommended split audit tasks
- Next safe prompt copied

## Example: guarded run

Input:

```bash
runtrim run "fix checkout redirect"
```

Result:
- Task audited
- Scope and stop rules generated
- Guarded contract copied or passed to configured command

## Project memory

`runtrim memory` prints compact project state from local runs:
- current state
- previous task
- latest status
- changed files
- missing proof items
- protected areas
- next safe action and next safe prompt

`runtrim memory --prompt` prints only the latest next safe prompt.

## Privacy

RunTrim runs locally.
V1 does not upload code.
`.runtrim/` stores local run metadata and memory.
Cloud sync is not enabled.

## Current status

Early V1.
Savings are estimated.
RunTrim is not a replacement for Claude, Codex, or Cursor.
It wraps and controls the agents developers already use.

## Roadmap

- npm publish
- stronger local policy presets
- richer post-run analysis
- optional hosted dashboard features

## Packaging dry run

```bash
npm run build:cli
npm pack --dry-run
npm publish --dry-run
```
