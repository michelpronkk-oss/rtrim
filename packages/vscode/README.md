# RunTrim VS Code/Cursor Extension MVP

Local-first extension surface for running RunTrim commands and reading local `.runtrim` state.

## Implemented Commands

- RunTrim: New Guarded Run
- RunTrim: Finish Check
- RunTrim: Doctor
- RunTrim: Continue Prompt
- RunTrim: Refresh Project DNA
- RunTrim: Open Dashboard
- RunTrim: Open Control Panel

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
