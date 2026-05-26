@AGENTS.md
<!-- RUNTRIM_PROTOCOL_START -->
This repo uses RunTrim as the guarded AI coding protocol.
Before editing code, read RUNTRIM.md.
Start every task with: runtrim go "<task>"
Stay inside .runtrim/contracts/latest.md.
After edits, ask the user to run: runtrim finish
<!-- RUNTRIM_PROTOCOL_END -->

<!-- RUNTRIM:START -->
RunTrim project instructions
RUNTRIM_AGENT_INSTRUCTIONS_VERSION: 3
- Before editing, read RunTrim project memory and profile context.
- Before editing, create or verify an active RunTrim contract for the current user task.
- If MCP is available and no active contract exists, call runtrim_create_contract with the user's task.
- If MCP is unavailable, ask the user to run: runtrim agent "task" --copy
- Before touching risky paths (auth, billing, middleware/proxy, migrations, env/sensitive files, broad app-wide refactors), call runtrim_check_path when available.
- Use RunTrim project memory and stay inside active contract scope.
- Do not silently expand scope. Preserve existing project style and logic.
- Never read or print env file contents.
- If scope must expand, stop and request approval: runtrim approve "Allow <path/scope> for this run only"
- At the end, run runtrim finish if terminal execution is available, otherwise ask the user to run runtrim finish.
- Do not claim completion before finish verification when RunTrim is active.

RunTrim MCP:
- runtrim mcp instructions
- runtrim mcp start

RunTrim Agent Autopilot
For every coding request:
1. Contract before edits: create or verify a RunTrim contract before touching any file.
2. Scope and memory: load RunTrim project memory. Treat the contract as the only allowed scope.
3. Risky path checks: treat auth, billing, env, middleware, migrations, secrets and config as risky unless explicitly in scope. Call runtrim_check_path before editing any of these.
4. No silent expansion: if a needed path is outside scope, stop and request approval instead of editing.
5. Finish before done: after all edits, run `runtrim finish` if terminal access is available. If not, tell the user to run it.
6. Do not claim the task is complete until finish produces PASS, WARN, or BLOCKED, or the user explicitly says to skip finish.
7. If finish is BLOCKED, stop and report the safest next step. Do not continue making edits.
8. If finish is WARN, summarize the risk and ask the user whether to continue.
9. If the run broke the project, suggest: runtrim restore
<!-- RUNTRIM:END -->
