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
npm install -g runtrim
cd your-project
runtrim start
runtrim doctor
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
RunTrim does not silently modify global MCP config files. Use `runtrim mcp instructions` and `runtrim mcp config --print` to inspect snippets, and `runtrim doctor` to check readiness.

In the VS Code/Cursor extension, use **Connect agent** for a guided setup flow (Cursor/Cursor Studio, Claude Desktop, Claude Code, Generic MCP).
`MCP config is ready` means config generation succeeded locally; it does not guarantee the external agent has loaded it yet.

## Local-first trust model

- Free CLI runs locally.
- Source code stays local by default.
- RunTrim does not read env file contents.
- Ignored `.env.local` is warned and reported, not read.
- Sensitive tracked/changed or unignored sensitive files still block finish.

## Plans and sync

- Free: local control flow and local history.
- Pro+: cloud sync and hosted dashboard history.

## Restore and rewind (local)

```bash
runtrim restore last --preview
runtrim restore last --apply
```

Restore points are local and source-safe. Apply happens locally through the CLI.

## CI merge gate (GitHub Action v1)

RunTrim can run as a CLI-based PR check:

1. Add `.github/workflows/runtrim.yml.example` to your repo as a workflow.
2. Run `runtrim ci check --strict` on pull requests.
3. Set branch protection to require the RunTrim check.

`runtrim ci check` returns `PASS`, `WARN`, or `BLOCKED`.
- `BLOCKED` exits non-zero and can prevent merge.
- `WARN` exits zero by default, or non-zero in `--strict` mode.

GitHub App and team policy sync are coming later.

## Core commands

```bash
runtrim start
runtrim doctor
runtrim agent "Your task" --copy
runtrim finish
runtrim approve "Allow <scope> for this run only"
runtrim status
runtrim mcp instructions
runtrim ci check
runtrim restore last --preview
```

Legacy bridge compatibility (still supported):

```bash
runtrim agent "Your task" --copy
```
