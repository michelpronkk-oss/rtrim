# RunTrim

RunTrim is the control layer for AI coding agents.

It gives Claude, Codex, Cursor, ChatGPT, and other agents project memory, scoped contracts, MCP guidance, approval flow, and finish verification before changes are accepted.

Website: https://www.runtrim.com

## Install

```bash
npm install -g runtrim
```

## Quickstart

```bash
cd your-project
runtrim start
runtrim agent "Fix the homepage copy" --copy
runtrim finish
```

## Primary flow

1. `runtrim start` analyzes the project and prepares local RunTrim memory and instructions.
2. `runtrim agent "task" --copy` creates a guarded run and handoff prompt for your coding agent.
3. Agent completes the task inside contract scope.
4. `runtrim finish` verifies scope and sensitive-file safety with a clear verdict: `PASS`, `WARN`, or `BLOCKED`.

If scope needs to expand safely:

```bash
runtrim approve "Allow <path or scope> for this run only"
```

## MCP (optional)

```bash
runtrim mcp instructions
runtrim mcp config --print
runtrim mcp start
```

MCP lets compatible agents use RunTrim tools like contract creation, path checks, approval suggestions, and finish guidance.

## Local-first trust model

- Free CLI runs locally.
- Source code stays local by default.
- RunTrim does not read env file contents.
- Ignored `.env.local` is warned and reported, not read.
- Sensitive tracked/changed or unignored sensitive files still block finish.

## Plans and sync

- Free: local control flow and local history.
- Pro+: cloud sync and hosted dashboard history.

## Core commands

```bash
runtrim start
runtrim agent "Your task" --copy
runtrim finish
runtrim approve "Allow <scope> for this run only"
runtrim status
runtrim mcp instructions
runtrim bridge status
```

Advanced/lower-level command (still supported):

```bash
runtrim go "Your task"
```
