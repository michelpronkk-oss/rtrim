# RunTrim MCP Activation Plan — v1

Internal doc. Not user-facing.

---

## What v1 supports

- **Activation pipeline**: 5-step flow on the dashboard (Install CLI → Connect CLI → Init project → Connect MCP → Guarded run + finish).
- **MCP setup step**: Surfaces `runtrim mcp instructions` as a first-class step in the pipeline. User copies the command, runs it locally, follows printed agent-specific instructions.
- **New guarded run modal**: Task input, agent target selection (Claude Code / Cursor / Codex / Generic), copyable CLI command, copyable agent handoff text, CLI/MCP/execution status strip, contract preview, MCP setup note.
- **Agent target selection**: Changes handoff copy labels. Does not dispatch to any agent. Four targets: Claude Code, Cursor, Codex, Generic agent.
- **Status strip**: CLI connected/not connected (sourced from `cli_token_created_at`). MCP shown as "not tracked yet" with instructions to run `runtrim doctor` locally. Execution always shown as "local".
- **Connect page**: 5-step guide including MCP step and agent compatibility grid.

---

## What is not yet implemented

- **MCP connection telemetry**: Dashboard has no way to detect whether MCP is configured for a given agent. `runtrim mcp instructions` runs locally and writes config locally. No API endpoint receives this signal today. MCP status is shown honestly as "not tracked yet".
- **Direct agent dispatch**: The dashboard does not send tasks to Claude Code, Cursor, Codex, or any other agent. No `run_requests` backend exists. No bridge polling exists. The user copies commands and pastes them manually.
- **MCP poll/bridge**: No background worker polls for MCP events. No daemon runs on the server side.
- **Per-agent MCP config detection**: Dashboard cannot distinguish whether MCP is configured for Claude Code vs Cursor vs Codex.
- **Handoff delivery**: Handoff text is copy-paste only. No direct send mechanism.

---

## Future dispatch architecture (not yet built)

When direct dispatch is implemented, the expected flow is:

```
1. User submits task + agent target in New guarded run modal
2. Dashboard creates a run_request row (Supabase: runtrim_run_requests)
3. Local bridge process (installed via runtrim mcp install or similar) polls for pending run_requests
4. Bridge generates contract locally: runtrim agent "<task>" --copy (non-interactive mode)
5. Bridge hands contract to the configured agent via MCP tool call
6. Agent runs locally, stays inside contract scope
7. Agent (or user) runs runtrim finish
8. Finish syncs verdict, diff, token usage back to dashboard
```

Key invariants to preserve:
- Source code never leaves the machine.
- Contract is always generated locally by the CLI.
- Dashboard only receives: run metadata, verdict, token estimates, scope fields — no code diffs.
- The bridge/polling process is opt-in and local. No persistent cloud worker.

---

## Why cloud execution is intentionally not used

RunTrim's core guarantee is that code stays local. Running agent execution in the cloud would require:
1. Uploading the entire repo to Anthropic/cloud infra — violates local-first.
2. Running arbitrary shell commands in a cloud sandbox — significant security surface.
3. Storing credentials for the user's services in the cloud — violates the trust model.

The dashboard is a **proof surface**: it shows what happened, not a control plane that causes things to happen. The CLI is the execution layer.

---

## MCP tracking — how to add it when ready

When MCP telemetry is implemented, the signal should come from the CLI:

```
runtrim mcp verify  →  POST /api/cli/mcp-status { agent: "claude-code", configured: true }
```

This would set a `mcp_configured_at` or `mcp_agents` field on `runtrim_profiles`.

Dashboard can then:
- Show MCP stage as "done" in the pipeline
- Show "MCP configured" in the status strip
- Unlock the "MCP-ready handoff" copy in the modal

Until that signal exists, MCP status is shown as "not tracked yet — run runtrim doctor locally".
