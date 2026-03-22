# Tooling Matrix

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

## Purpose

This document locks which tools are primary for Lekbanken and which tools are optional, redundant, or intentionally skipped.

The rule is simple:

- prefer the smallest tool surface that solves the real problem
- do not keep both CLI and MCP unless they serve meaningfully different jobs
- avoid duplicate systems that create drift

## Current recommendation

| System | CLI | MCP | Recommendation | Why |
|--------|-----|-----|----------------|-----|
| GitHub | Yes | Yes | Keep both | CLI is strong for shell workflows, git-adjacent inspection, and manual PR work. MCP is strong for agent-led repo, PR, and docs context. |
| Supabase | Yes | Yes | Keep both | CLI is required for local DB lifecycle and migrations. MCP is strong for advisors, logs, branches, and safe DB inspection in chat. |
| Vercel | Yes | Yes | Keep both | CLI is useful for project linking, env inspection, and deployment commands. MCP is strong for deployment inspection and project-aware agent workflows. |
| Notion | No | Yes | Use MCP only for now | Notion is primarily a documentation and knowledge surface in this workflow. MCP already covers read/write agent tasks. A CLI adds little unless dedicated automation appears. |
| Context7 | No | Yes | MCP only | This is purely a documentation retrieval layer. |
| Copilot | Yes | N/A | Keep CLI plus VS Code agent | CLI is useful for terminal-driven agent work. VS Code agent is the main interactive environment. |
| Docker | Yes | No | CLI only | Local runtime dependency for Supabase. |

## Locked decisions

### Keep both: GitHub

Use GitHub CLI for:

- shell-based PR work
- auth checks
- quick workflow inspection
- manual issue and branch tasks

Use GitHub MCP for:

- agent-driven repo analysis
- PR and issue context in chat
- remote repo information without leaving the workflow

### Keep both: Supabase

Use Supabase CLI for:

- `supabase start`
- `supabase db reset`
- migrations
- local project lifecycle

Use Supabase MCP for:

- advisors
- logs
- branch management
- safe DB inspection in the agent flow

### Keep both: Vercel

Use Vercel CLI for:

- `vercel login`
- `vercel link`
- `vercel env pull <safe-target-file>`
- direct manual inspection commands

Use Vercel MCP for:

- project inspection
- deployment inspection
- logs and deployment status in chat

### Use MCP only: Notion

Use Notion MCP for:

- page fetch/update in chat
- workspace and team inspection
- agent-assisted documentation work

Skip Notion CLI unless one of these becomes real:

- repeatable shell automation against Notion
- CI job that pushes structured Notion updates
- a local script pipeline where CLI is materially simpler than API/SDK

## Decision test for any new tool

Before adding a new tool, ask:

1. Does it solve a real repeated problem?
2. Is that problem already covered by an existing MCP server or CLI?
3. Does it reduce work, or just add a second path to the same job?
4. Will it create a second source of truth?

If the answer to 2 or 4 is "yes", default to not adding it.

## Current environment status

Verified in this workspace session:

- GitHub CLI: working
- GitHub MCP: working
- Supabase CLI: working
- Supabase MCP: working
- Vercel CLI: working
- Vercel MCP: working
- Notion MCP: working
- Notion CLI: intentionally skipped
- Context7 MCP: working
- Docker: working
- Copilot CLI: working

## Related

- `docs/VS_CODE_WORKFLOW.md`
- `docs/NOTION.md`
- `docs/NOTION_SYNC_PLAN.md`