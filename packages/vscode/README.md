# RunTrim VS Code/Cursor Extension

Local-first guarded run launcher for VS Code and Cursor.

Flow in the control panel:

1. Compose task
2. Build Contract
3. Run with Agent
4. Finish Check

## Implemented Commands

- RunTrim: New Guarded Run
- RunTrim: Finish Check
- RunTrim: Doctor
- RunTrim: Continue Prompt
- RunTrim: Refresh Project DNA
- RunTrim: Open Dashboard
- RunTrim: Open Control Panel

## Agent Launcher Behavior

- Task composer with placeholder `Describe the guarded run...`
- Agent picker: `Auto`, `Claude Code`, `Codex`, `Cursor`, `Custom`
- Mode picker: `Auto`, `Strict`, `UI only`, `Docs only`
- Actions:
  - `Build Contract`: local preview only, no file edits
  - `Run with Agent`: runs `runtrim agent "<task>" --copy` first
  - `Copy Handoff`: copies `.runtrim/agent/latest.md`

Routing is honest and local:

- `Codex` and `Claude Code`: launch only when CLI detection is positive and a command template is configured
- `Cursor`: handoff copy only with explicit paste guidance
- `Custom`: requires `runtrim.agent.customCommand`
- `Auto`: prefers configured command template, then detected CLI with configured template, otherwise safe handoff copy

No cloud execution is implied. Source stays local.

## Settings

- `runtrim.agent.defaultAgent`
- `runtrim.agent.customCommand`
- `runtrim.agent.claudeCommand`
- `runtrim.agent.codexCommand`
- `runtrim.agent.autoLaunchTerminal`

Command templates support:

- `{task}`
- `{handoff}`
- `{projectRoot}`

## Local Test Steps (VS Code)

1. Build extension TypeScript:
   - `npm run -s build:vscode`
2. Open `packages/vscode` in VS Code.
3. Press `F5` to launch Extension Development Host.
4. In the host window, open a RunTrim project.
5. Verify statusbar state changes:
   - no `runtrim` in PATH => `RunTrim: not installed`
   - no `.runtrim/project-dna.md` => `RunTrim: no project`
   - baseline + dna + no latest contract => `RunTrim: ready`
   - latest contract active => `RunTrim: active`
   - latest contract blocked or finish output blocked => `RunTrim: blocked`
6. Run commands from command palette and verify output in `RunTrim` output channel.

## Local Test Steps (Cursor)

1. Build extension TypeScript:
   - `npm run -s build:vscode`
2. Open the repository in Cursor.
3. Use Cursor command palette to run RunTrim commands.
4. Open `RunTrim: Open Control Panel` and validate sections + quick commands.
5. Confirm statusbar label and panel both reflect local `.runtrim` state.

## Notes

- This extension executes local `runtrim` CLI only.
- It reads only local `.runtrim` files in the opened workspace.
- Dashboard action only opens `https://www.runtrim.com/app`.
