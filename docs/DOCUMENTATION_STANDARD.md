# Documentation Standard

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-03-21

## Purpose

This document defines how documentation is organized, which documents are canonical, and how agents and humans should decide what to read first.

Use this file to reduce documentation drift and avoid reading stale reports as if they were current instructions.

## Core rules

- Repo documentation is the source of truth for implementation, environments, migrations, workflows, and operational rules.
- Notion is a portal and mirror, not primary implementation truth.
- Historical reports, plans, and audits must not override current canonical docs.
- Agents should prefer the smallest correct canonical set for the task instead of reading many loosely related files.

## Recommended status vocabulary

Use these status labels consistently when practical:

- `active` — current canonical or currently maintained reference
- `draft` — incomplete or still being shaped
- `deprecated` — intentionally being phased out
- `frozen audit` — a bounded verified snapshot kept as a guardrail until a new audit replaces it
- `historical snapshot` — useful history, but not current operating guidance

## Documentation trust hierarchy

Use this order when documents disagree:

1. Task-specific canonical docs named in `.github/copilot-instructions.md`
2. `PROJECT_CONTEXT.md`
3. `launch-readiness/launch-control.md`
4. Canonical domain docs and active docs under `docs/`
5. Sub-indexes such as `docs/README.md`, `docs/ops/README.md`, `docs/auth/README.md`
6. Reports, plans, execution packs, and historical audits
7. `docs/archive/` only when explicitly asked

## Canonical entrypoints by topic

### Product and repo context

- `PROJECT_CONTEXT.md`
- `INVENTORY_RULES.md`
- `INVENTORY_DECISIONS.md`
- `launch-readiness/launch-control.md`
- `launch-readiness/audits/README.md` for navigating the underlying launch audit corpus
- `docs/README.md`

### Docs governance and navigation

- `docs/README.md`
- `docs/DOCS_INDEX.md`
- `docs/INVENTORY.md`
- `docs/DOCS_NAMING_CONVENTIONS.md`
- `docs/AI_CODING_GUIDELINES.md`

### Local workflow and environments

- `docs/VS_CODE_WORKFLOW.md`
- `docs/DEVELOPER_SETUP.md`
- `docs/database/environments.md`

### Auth, routing, and tenant access

- `docs/auth/README.md`
- `docs/auth/routes.md`
- `docs/auth/tenant.md`
- `docs/auth/roles.md`
- `docs/AUTH_DATABASE_SCHEMA.md`

### Database and migrations

- `docs/MIGRATIONS.md`
- `docs/database/environments.md`
- `docs/ops/prod-migration-workflow.md`
- `docs/ops/release-promotion-checklist.md`

### Notifications and app shell

- `docs/notifications/README.md`
- `docs/NOTIFICATIONS_DOMAIN.md`
- `app-shell-notifications-architecture.md`
- `app-shell-notifications-audit.md`
- `app-shell-notifications-implementation-plan.md`

### Games, builder, and display context

- `docs/games/README.md`
- `docs/GAMES_DOMAIN.md`
- `docs/admin/README.md`
- `docs/ADMIN_GAME_BUILDER_V1.md`
- `docs/CSV_IMPORT_FIELD_REFERENCE.md`

### Sandbox and developer harnesses

- `docs/sandbox/README.md`
- `docs/sandbox/SANDBOX_ARTIFACTS_IMPLEMENTATION.md`
- `docs/sandbox/SANDBOX_ATLAS_IMPLEMENTATION_PLAN.md`
- `app/sandbox/`

### Toolkit and import guidance

- `docs/toolkit/README.md`
- `docs/import/README.md`
- `docs/builder/README.md`
- `docs/CSV_IMPORT_FIELD_REFERENCE.md`
- `docs/import/PHASE_STEP_ARTIFACT_AUDIT_REPORT.md`
- `docs/JSON_IMPORT_FIELD_REFERENCE.md`
- `docs/CSV_IMPORT_VERIFICATION_CHECKLIST.md`
- `docs/JSON_IMPORT_VERIFICATION_CHECKLIST.md`

### Release, deploy, and operations

- `docs/ops/release-promotion-checklist.md`
- `docs/ops/cicd_pipeline.md`
- `docs/ops/first-deploy-runbook.md`
- `docs/ops/backup_dr.md`

### Documentation model and Notion

- `docs/NOTION.md`
- `docs/NOTION_SYNC_PLAN.md`
- `docs/NOTION_UPDATE_CHECKLIST.md`

### Audit and implementation lifecycle

- `docs/TRIPLET_WORKFLOW_STANDARD.md`
- `docs/TRIPLET_CREATION_CHECKLIST.md`
- `docs/DOCUMENT_DATING_STANDARD.md`

### Tooling and agent workflow

- `docs/TOOLING_MATRIX.md`
- `.github/copilot-instructions.md`
- `.github/prompts/lekbanken-session-start.prompt.md`
- `.github/prompts/lekbanken-session-end.prompt.md`

## How to choose docs for a task

### If the task is code in one domain

Read:

1. `PROJECT_CONTEXT.md`
2. `launch-readiness/launch-control.md`
3. the domain's canonical doc or triplet
4. any workflow or environment doc directly relevant to the task

### If the task is local setup, terminals, prompts, environment, or tooling

Read:

1. `docs/VS_CODE_WORKFLOW.md`
2. `docs/DEVELOPER_SETUP.md`
3. `docs/database/environments.md`
4. `docs/TOOLING_MATRIX.md`

### If the task is migrations or production data movement

Read:

1. `docs/database/environments.md`
2. `docs/MIGRATIONS.md`
3. `docs/ops/prod-migration-workflow.md`
4. `docs/ops/release-promotion-checklist.md`

### If the task is release or deploy

Read:

1. `docs/ops/release-promotion-checklist.md`
2. `docs/ops/cicd_pipeline.md`
3. `docs/ops/first-deploy-runbook.md`

### If the task touches Notion or documentation sync

Read:

1. `docs/NOTION.md`
2. `docs/NOTION_SYNC_PLAN.md`
3. `docs/NOTION_UPDATE_CHECKLIST.md`

### If the task touches an active domain triplet

Read:

1. `docs/TRIPLET_WORKFLOW_STANDARD.md`
2. the domain architecture doc
3. the latest audit
4. the latest implementation plan

## What is not canonical by default

These may still be useful, but should not be treated as primary instructions unless a canonical doc points to them:

- completion reports
- execution plans
- one-off audits
- repo restructuring reports
- historical implementation notes
- anything in `docs/archive/`

## Consumed customization files are a separate standard

Markdown files under `.github/` are not automatically part of the `docs/` metadata standard.

Treat these as tool-consumed customization files first, documentation second:

- `.github/copilot-instructions.md`
- `.github/prompts/*.prompt.md`
- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/*.md`

Rules:

- Do not inject `## Metadata` into GitHub PR templates just to make them look like normal docs.
- Do not add documentation-style metadata blocks to Copilot instruction files if that text would be injected into the agent context.
- Prompt files that already use YAML frontmatter should keep that frontmatter as their canonical metadata surface.
- If a customization file needs governance notes, put that guidance in `docs/` instead of polluting the consumed file body.

## Documentation update rules

Date handling for active canonical docs must follow `docs/DOCUMENT_DATING_STANDARD.md`.

When you work in a domain with an active triplet:

1. verify the current audit against reality before coding
2. update the implementation plan before coding if scope or status changed
3. update the implementation plan after coding
4. update the audit after coding
5. update the architecture doc if stable structure changed

When you create or materially change a canonical document:

1. update `docs/README.md` if it affects navigation
2. update `docs/DOCS_INDEX.md`
3. update `docs/INVENTORY.md`
4. update `docs/NOTION.md` if the Notion portal or mirror rules are affected
5. update `.github/copilot-instructions.md` if agents must change what they read first

## Anti-patterns

Avoid:

- writing a new “summary” that conflicts with a canonical doc
- using plans or reports as if they were current operating rules
- leaving multiple docs to describe the same exact workflow without declaring scope
- linking agents to broad doc collections when 2 to 4 specific docs would do
- adding new source-of-truth claims outside the repo

## Definition of done

The documentation system is behaving correctly when:

- a new agent can find the right docs quickly
- canonical workflow docs do not conflict with each other
- stale docs no longer masquerade as current operating guidance
- humans can tell the difference between reference, plan, report, and archive