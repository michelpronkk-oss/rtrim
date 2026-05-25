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
- Before editing, read RunTrim project memory and profile context.
- Verify active contract first. If MCP is available and no contract is active, call runtrim_create_contract with the user's task.
- If MCP is unavailable, ask the user to run: runtrim agent "task" --copy
- Stay inside active contract scope.
- Before high-risk edits (auth, billing, middleware/proxy, migrations, sensitive files, broad app-wide changes), check scope first. If MCP is available, call runtrim_check_path.
- Never read or print env file contents.
- Do not continue outside scope silently. Request: runtrim approve "Allow <path/scope> for this run only"
- At the end, run or ask for runtrim finish. Do not claim completion before finish verification.

RunTrim MCP:
- runtrim mcp instructions
- runtrim mcp start
<!-- RUNTRIM:END -->
