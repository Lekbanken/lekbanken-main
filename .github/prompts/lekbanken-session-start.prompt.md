---
name: "Lekbanken Session Start"
description: "Initialize a Lekbanken session, verify the workspace state, and start only the services needed for the current goal"
argument-hint: "Describe today's goal, for example: fix planner bug, review PR, DB migration, or docs-only"
agent: "agent"
---

Initialize a new Lekbanken session.

Follow the rules and context from:

- the project context document
- the launch control document
- the database environments guide
- the developer setup guide
- the VS Code workflow guide
- the Atlas workspace README
- the workspace Copilot instructions

Use the chat argument as today's session goal.

Do this in order:

1. Inspect the current branch, git status, changed files, and active terminals.
2. Determine today's ISO date for the session if active documentation may be updated.
   - Use the date already provided by the environment if available.
   - Otherwise verify the local system date before editing document metadata.
3. Confirm whether local Supabase is already running.
4. Start only the services needed for the stated goal, and do not start duplicate long-running processes.
   - Normal code work: local Supabase plus the Next.js dev server.
   - Database-only work: local Supabase is usually enough.
   - Docs or review work: do not start unnecessary services.
5. Treat Sandbox and Atlas as local-only tools, not online product surfaces.
6. If something in Vercel, Supabase, GitHub, Notion, CLI tooling, or MCP setup appears misconfigured, identify the exact gap instead of guessing.
7. Finish with a concise startup summary:
   - current state
   - today's confirmed ISO date if documentation work is in scope
   - what you started
   - what you intentionally did not start
   - risks or mismatches
   - the recommended next actions for this session