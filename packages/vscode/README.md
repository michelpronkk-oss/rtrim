# RunTrim VS Code / Cursor Extension

Local-first guarded agent run console for VS Code and Cursor.

RunTrim is the control layer before the coding agent. The extension lets you compose a task, prepare a guarded contract, route the handoff to your local agent, run a finish check, and handle continuations - all without sending data anywhere.

---

## How it works

1. Open the RunTrim panel (statusbar or command palette).
2. Type a task in the composer.
3. Click **Start guarded run** (or press `Ctrl+Enter`).
4. RunTrim runs `runtrim agent "<task>" --copy` locally and prepares a guarded handoff.
5. The handoff is routed to your selected agent:
   - If a command template is configured, a terminal opens and the agent is launched.
   - Otherwise the handoff is copied to clipboard with paste guidance.
6. Complete your edits in the agent.
7. Click **Run finish check** to verify scope was held.

Source stays local. No cloud execution.

---

## Agent routing

### Cursor

Cursor does not currently support direct programmatic dispatch from an extension.
RunTrim copies the handoff and shows a prompt to paste it into Cursor Agent.

### Claude Code

If `runtrim.agent.claudeCommand` is configured, RunTrim opens a terminal and runs it.
If not configured, RunTrim copies the handoff.

Example setting:

```
claude {handoffPath}
```

Or, to pass the handoff inline:

```
claude "{handoff}"
```

Adjust for your local Claude CLI version. The command runs with `cwd` set to the workspace root.

### Codex

If `runtrim.agent.codexCommand` is configured, RunTrim opens a terminal and runs it.
If not configured, RunTrim copies the handoff.

Example setting:

```
codex {handoffPath}
```

Or inline:

```
codex "{handoff}"
```

Adjust for your local Codex CLI. The command runs with `cwd` set to the workspace root.

### Custom

Requires `runtrim.agent.customCommand`. If missing, RunTrim shows a settings prompt and copies the handoff.

Example:

```
myagent --input {handoffPath} --root {projectRoot}
```

### Auto

Auto routing uses this priority order:

1. `runtrim.agent.defaultAgent` setting (if set to a specific agent with a configured template)
2. Any configured `claudeCommand` template
3. Any configured `codexCommand` template
4. Any configured `customCommand` template
5. Safe copy fallback

Auto never launches unknown commands.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `runtrim.cli.path` | `""` | Full path to the runtrim CLI. Leave blank to auto-detect. |
| `runtrim.agent.defaultAgent` | `"Auto"` | Default agent: Auto, Claude Code, Codex, Cursor, Custom. |
| `runtrim.agent.claudeCommand` | `""` | Claude Code launch template. |
| `runtrim.agent.codexCommand` | `""` | Codex launch template. |
| `runtrim.agent.customCommand` | `""` | Custom agent launch template. |
| `runtrim.agent.autoLaunchTerminal` | `true` | When false, copies the rendered command instead of opening a terminal. |

### Template variables

All command templates support:

| Variable | Value |
|---|---|
| `{task}` | The task string (shell-quoted) |
| `{handoff}` | Full handoff text, compacted to one line (shell-quoted) |
| `{handoffPath}` | Path to `.runtrim/bridge/latest-extension-handoff.md` (shell-quoted) |
| `{projectRoot}` | Workspace root path (shell-quoted) |

The handoff file is written inside `.runtrim` only. Nothing is sent externally.

---

## Terminal behavior

RunTrim reuses a terminal named **RunTrim Agent** across runs. If the terminal has exited, a new one is created. The terminal `cwd` is set to the workspace root. A `cd` command is sent first on terminal reuse to ensure the right directory.

---

## Commands

| Command | Description |
|---|---|
| `RunTrim: Open Control Panel` | Open the RunTrim side panel. |
| `RunTrim: New Guarded Run` | Prompt for task and start a guarded run. |
| `RunTrim: Finish Check` | Run `runtrim finish` and show verdict in panel. |
| `RunTrim: Doctor` | Run `runtrim doctor` diagnostics. |
| `RunTrim: Continue Prompt` | Continue from usage or context limit. |
| `RunTrim: Refresh Project DNA` | Re-run `runtrim start --refresh-dna`. |
| `RunTrim: Open Dashboard` | Open runtrim.com/app in browser. |

---

## Panel tabs

**Run** - Composer, contract prepared card, active run, finish check, continuation, and restore.

**History** - Recent runs from `.runtrim/runs/`, baseline snapshot from `.runtrim/history/baseline.json`.

**Rules** - Project DNA summary: framework, language, styling, components, risk zones, raw DNA.

---

## Windows note

On Windows, `runtrim` is installed as `runtrim.cmd`. The extension auto-detects this and calls it with `shell: true`. If auto-detection fails, set `runtrim.cli.path` to the full path, for example:

```
C:\Users\<you>\AppData\Roaming\npm\runtrim.cmd
```

---

## Notes

- All execution is local. No data leaves your machine.
- The extension reads only `.runtrim` files in the opened workspace.
- Dashboard action only opens `https://www.runtrim.com/app`.
- Handoff files are stored in `.runtrim/bridge/` inside your workspace.
