# Notion Sync Plan

## Metadata

- Status: active
- Owner: -
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: -
- Scope: Notion sync strategy

## Purpose

This document defines the minimal, safe way to keep Notion updated without turning Notion into a competing source of technical truth.

## Core rule

Repo first. Notion mirrors.

If a technical statement matters to implementation, deployment, schema, auth, or operational behavior, it must exist in the repo first.

## Recommended model

### Phase 1: MCP-first, manual or agent-assisted updates

Use Notion MCP to:

- update overview pages
- refresh architecture summaries
- maintain hub pages
- add decision notes and handoff summaries

This is the default right now.

### Phase 2: Small targeted API sync if needed later

Only introduce a repo-driven sync script when a repeated update becomes annoying or error-prone.

Examples of good future sync candidates:

- docs index summary
- release notes summary
- deployment handoff summary
- roadmap status snapshots sourced from repo docs
- architecture hub links to canonical repo docs

Examples of bad sync candidates:

- raw source code
- local env values
- secrets
- transient branch state
- generated noise with low human value

## What should live in repo vs Notion

### Repo

- implementation truth
- migrations
- runbooks
- invariant documentation
- domain docs
- environment and deployment rules
- test and verification rules

### Notion

- landing pages and dashboards
- documentation portal pages
- decision history
- roadmap and planning surfaces
- human-readable summaries that link back to repo docs

## Minimal sync strategy

The safest sync strategy for Lekbanken is:

1. write or update canonical docs in repo
2. use Notion MCP to update summary pages or link hubs
3. only automate the repetitive summaries later

That gives you freshness without split-brain.

## If automation is added later

Preferred implementation shape:

- one small Node script in repo
- official Notion API client
- explicit mapping from repo sources to Notion targets
- dry-run mode before write mode
- no hidden magic

Suggested future file names if this is implemented:

- `scripts/notion-sync.mjs`
- `docs/NOTION_SYNC_MAP.md`

## Auth model for future API sync

If a script is introduced later, use this auth model:

1. create a dedicated Notion integration
2. share only the required pages/databases with that integration
3. store token in an environment variable such as `NOTION_TOKEN`
4. never hardcode tokens in repo
5. do not expose Notion write tokens to client-side code

## First sync targets to prioritize

If you later automate sync, start with these:

1. Engineering Hub summary page
2. architecture entry page linking to repo docs
3. release or handoff summary page
4. high-level domain status overview

Do not start with full bi-directional sync. That is where complexity and drift explode.

## Anti-patterns

Avoid:

- writing repo truth only in Notion
- maintaining parallel architecture specs manually in two places
- auto-syncing too much data too early
- building a two-way sync before a one-way sync proves useful

## Decision checkpoint

Before building automation, ask:

1. Which exact Notion page is painful to keep updated manually?
2. Which repo file is the canonical source?
3. What is the smallest useful one-way sync?
4. Can MCP already solve this without new code?

If MCP is enough, do not build the script yet.

## Current decision

Current locked decision for Lekbanken:

- Notion MCP is the active path
- Notion CLI is skipped
- Notion API/SDK automation is deferred until a real repeated sync need appears

## Related

- `docs/NOTION.md`
- `docs/TOOLING_MATRIX.md`
- `docs/VS_CODE_WORKFLOW.md`