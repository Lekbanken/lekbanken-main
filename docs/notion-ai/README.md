# Notion AI Pack

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active prompt pack for Notion AI workspace shaping. Use these files to improve Notion structure without letting Notion become a technical source of truth.

## Purpose

This folder contains a small prompt pack for Notion AI so it can build or restructure Lekbanken pages without inventing technical truth that belongs in the repo.

Use these files when you want Notion AI to:

- improve the workspace landing page
- build hub pages
- rewrite portal copy in a cleaner structure
- keep Notion aligned with repo-first documentation rules

## Files

- `PROMPT_NOTION_AI_WORKSPACE_SETUP.md` — master prompt to paste into Notion AI
- `WORKSPACE_ENTRY_PAGE_SOURCE.md` — source content for the workspace landing page
- `HUB_STRUCTURE_SOURCE.md` — source content for Engineering, Operations, and Product hubs

## How to use

1. Open Notion AI on the target page.
2. Paste the prompt from `PROMPT_NOTION_AI_WORKSPACE_SETUP.md`.
3. Attach or paste the relevant source markdown files.
4. Ask Notion AI to restructure the page, not invent new system details.
5. Review the result against `docs/NOTION.md` and `docs/NOTION_UPDATE_CHECKLIST.md`.

## Hard rules

- Repo first, Notion mirrors.
- Notion should summarize and link, not duplicate technical specs.
- If Notion AI proposes details not found in the repo, reject or rewrite them.
- Prefer hub pages, summaries, and navigation over long duplicated documentation.