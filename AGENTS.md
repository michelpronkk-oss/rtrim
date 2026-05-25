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
- Use RunTrim project memory before editing.
- Stay inside the active RunTrim contract.
- If no active contract exists, ask the user to run runtrim agent "task" --copy or use MCP if configured.
- Check path scope before editing high-risk files.
- Never read or print env file contents.
- Do not touch sensitive files unless explicitly approved.
- If scope must expand, request: runtrim approve "..."
- At the end, run or ask for: runtrim finish

RunTrim MCP:
- runtrim mcp instructions
- runtrim mcp start
<!-- RUNTRIM:END -->
