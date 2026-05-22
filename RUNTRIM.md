# RunTrim Protocol

Project: runtrim

This repo uses RunTrim as the guarded AI coding control layer.

## How to start an AI coding task

```
runtrim go "<task>"
```

RunTrim creates a scoped contract, loads project memory, and generates a guarded prompt.

## How to use your agent

Paste the guarded prompt into Claude Code, Codex, Cursor, or any other coding agent.

## After edits

```
runtrim finish
```

RunTrim checks changed files, detects drift, scores risk, and saves the run report.

## If you are an AI coding agent

1. Read `.runtrim/contracts/latest.md`.
   - If `Status: active` — a live task exists. Follow the contract strictly.
   - If `Status: none` — no active task. Ask the user to run `runtrim go "<task>"` first.
2. Do not assume any prior task is still active.
3. Stay inside the allowed scope defined in the contract.
4. Stop and ask before touching any forbidden area.
5. Do not read or write `.env` files or secrets.
6. After editing, tell the user to run: `runtrim finish`

---
Protocol: runtrim init. Updated: 2026-05-22T18:33:45.869Z