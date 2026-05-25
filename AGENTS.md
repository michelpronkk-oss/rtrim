<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- RUNTRIM_PROTOCOL_START -->
This repo uses RunTrim as the guarded AI coding protocol.
Before editing code, read RUNTRIM.md.
Start every task with: runtrim go "<task>"
Stay inside .runtrim/contracts/latest.md.
After edits, ask the user to run: runtrim finish
<!-- RUNTRIM_PROTOCOL_END -->

<!-- RUNTRIM:START -->
RunTrim project instructions
RUNTRIM_AGENT_INSTRUCTIONS_VERSION: 2
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
<!-- RUNTRIM:END -->
