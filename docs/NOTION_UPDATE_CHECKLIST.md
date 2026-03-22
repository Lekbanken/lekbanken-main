# Notion Update Checklist

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-03-21

## Purpose

This document defines the practical checklist for keeping Notion up to date after meaningful repo changes without turning Notion into a second source of truth.

Core rule: repo first, Notion mirrors.

Use this together with:

- `docs/NOTION.md`
- `docs/NOTION_SYNC_PLAN.md`
- `docs/TOOLING_MATRIX.md`
- `docs/VS_CODE_WORKFLOW.md`

## When this checklist must be used

Run this checklist when a change affects at least one of these:

- architecture, domain boundaries, or route structure
- environment or deployment workflow
- operational runbooks or team workflows
- roadmap/status pages that people actually use in Notion
- onboarding pages, engineering hub pages, or handoff pages

You do not need to update Notion for:

- tiny refactors with no behavioral impact
- local-only experiments
- transient branch work
- secrets, tokens, or local environment values

## Checklist

1. Update the canonical repo docs first.
2. Confirm the repo docs are the final wording you want mirrored.
3. Identify which Notion pages are affected.
4. Update only summary, hub, roadmap, or decision pages in Notion.
5. Link back to the canonical repo docs instead of duplicating detailed implementation text.
6. Remove or rewrite stale Notion statements that now conflict with the repo.
7. Add a short "what changed" note if the update will matter to other humans later.
8. Stop when Notion is accurate enough to navigate from, not when it duplicates the repo.

## Default mapping

| Change type | Canonical source in repo | Typical Notion target |
|---|---|---|
| Workflow/tooling rules | `docs/VS_CODE_WORKFLOW.md`, `docs/TOOLING_MATRIX.md` | Engineering Hub, Workflows |
| Notion strategy changes | `docs/NOTION.md`, `docs/NOTION_SYNC_PLAN.md` | Engineering Hub, docs portal |
| Environment/deploy rules | `docs/database/environments.md`, `docs/ops/*` | Operations Hub |
| Domain architecture | relevant `*_DOMAIN.md` or architecture doc | Architecture hub, domain overview pages |
| Release/handoff status | release summary or session summary in repo | Release Notes, handoff page |
| Planning changes | roadmap/implementation plan docs in repo | Product Hub, roadmap pages |

## MCP-first update pattern

When using Notion MCP, keep the write small and explicit:

1. fetch the current target page
2. update the summary section only
3. add or refresh repo links
4. avoid broad page rewrites unless the structure is clearly outdated

Preferred update shape:

- short summary of the change
- why it matters
- links to the repo docs
- optional next action or owner

## Definition of done

This checklist is complete when:

- the repo contains the canonical truth
- the relevant Notion page no longer says anything false
- a teammate can start in Notion and reach the correct repo doc quickly

## Anti-patterns

Avoid:

- copying full technical specs into Notion
- keeping parallel architecture descriptions in two places
- writing branch-specific or local machine state into Notion
- updating Notion before the repo docs are settled