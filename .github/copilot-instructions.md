# Copilot Project Instructions

> For full repo governance rules, see `REPO_GOVERNANCE.md` in root.

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

## Documentation Routing

When starting work on any domain:

1. Read `PROJECT_CONTEXT.md` — understand the product
2. Read `launch-readiness/launch-control.md` — current system state
3. Read the domain's canonical docs (see `repo-structure-agent-risk.md` for lookup table)

Do not read `docs/archive/` unless explicitly asked.

## Scripts Rule

Never use `scripts/*` for database migrations. All migration scripts in `scripts/legacy/` are historical — none are canonical. Use `supabase db reset` (local) / `supabase db push` (remote).

Before running any script, verify it is referenced in `package.json` or `README.md`.

## Code Organization

- `components/` — reusable UI imported across multiple routes/features
- `features/` — domain-scoped modules (components + hooks + API) for one domain
- `lib/` — data layer, services, utilities (no UI)
- `hooks/` — cross-domain React hooks

Rule: if a component is only used within one `features/{domain}/`, it belongs there. If shared across domains, it goes in `components/`.

## Do Not Touch Zones

Do not reorganize these areas without a dedicated audit:

- `features/play/` ↔ `components/play/` — ✅ audited 2026-03-16, deliberate layered architecture (see `play-structure-audit.md`). Respect layer boundaries.
- `lib/services/` — catch-all but functional, decompose only when needed
- `app/sandbox/` — needs access policy decision, not deletion

## Terminal Hygiene

Reuse the same terminal session throughout your work. Do not open a new terminal for every command.

**Rules:**

- Batch related commands in the same shell when safe (e.g., `git status; git log --oneline -3`).
- Open a new terminal **only** if: (1) a separate long-running process must live in parallel, (2) the previous session is broken, or (3) the user explicitly asks.
- Use `node scripts/verify.mjs` for verification — one command, not separate runs of lint, tsc, tests.
- Close or stop background terminals that are no longer needed.

**Target layout:**

- Terminal 1: dev server (if running)
- Terminal 2: all other agent work
- No additional terminals without clear reason

## Database Environment Rules

- Local development always runs against local Supabase (`supabase start`).
- `.env.local` must point to `http://127.0.0.1:54321` — never change this to production as default.
- Production is reached only through `npm run db:push` (guardrail enforced, `main` branch only).
- Never run bare `supabase db push` — always use the npm script.
- See `docs/database/environments.md` for the full environment matrix.
