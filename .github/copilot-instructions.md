# Copilot Project Instructions

## Documentation Sync Rule

When making architectural changes to the **Planner** domain (`features/planner/`, `lib/planner/`, `app/app/planner/`), you **MUST** update these documents:

| Document | Purpose | Update when |
|----------|---------|-------------|
| `planner-audit.md` | Current code status, risks, priorities | Any structural change (files added/removed, risks resolved) |
| `planner-implementation-plan.md` | Roadmap with milestone checklists | Milestone items completed or added |
| `planner-architecture.md` | Stable system design reference | Component map, data flow, or route structure changes |

### Why

These three files are the **Single Source of Truth** for AI agents working on the Planner. Outdated documentation causes AI drift — agents will attempt to use deleted components, re-implement completed features, or miss architectural decisions.

### Format

- Mark completed items with `[x]` and add date: `✅ KLAR (YYYY-MM-DD)`
- Mark resolved risks with `~~strikethrough~~` and `✅ **LÖST**`
- Add `**Noteringar:**` section after completed milestones with implementation details

## Planner Onboarding

When starting work on the Planner domain:

1. Read `PROJECT_CONTEXT.md` — Understand the product
2. Read `planner-architecture.md` — Understand system design
3. Read `planner-audit.md` — Understand current status & risks
4. Read `planner-implementation-plan.md` — Understand roadmap & milestones

Do not assume architecture. Always verify against documentation.

## General Conventions

- **Language**: File names and code in English, UI text in Swedish (via i18n)
- **i18n**: All UI strings in `messages/{sv,en,no}.json` under domain-specific keys (e.g., `planner.*`)
- **Types**: Strict TypeScript — `npx tsc --noEmit` must pass with 0 errors
- **Components**: Feature-scoped under `features/{domain}/` — not in global `components/`
