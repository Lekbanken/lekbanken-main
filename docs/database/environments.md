# Database Environments

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Canonical environment reference for local, sandbox, and production database targeting. This is the first database doc to read before any migration or environment-sensitive work.

## Overview

| Environment | Supabase Project | Ref ID | Purpose |
|-------------|-----------------|--------|---------|
| **Production** | lekbanken-main | `qohhnufxididbmzqnjwg` | Live database, CLI linked target |
| **Sandbox** | lekbanken-sandbox | `vmpdejhgpsrfulimsoqn` | Experimental. Baseline was generated from this DB |
| **Local dev** | Docker | `supabase start` | Local development, isolated |
| **Legacy** | Lekbanken Projekt | `zaufhdwajplipthjicts` | Original project, not in active use |

> **Note:** Staging was previously a Supabase Branch (`cxkfcqyasszjmxvvhkxt`). It was deleted 2026-03-17 because it referenced a non-existent `staging` git branch. Recreate when a real staging git branch exists on origin.

**See also:** [../DEVELOPER_SETUP.md](../DEVELOPER_SETUP.md) for app-level environment naming (`APP_ENV`, `DEPLOY_TARGET`).

## Git Branch → Database Target

| Git branch | Database target | Supabase ref | CLI action |
|------------|----------------|--------------|------------|
| `main` | **Production** | `qohhnufxididbmzqnjwg` | `npm run db:push` (guardrail enforces this) |
| Any other | **Local Docker only** | N/A | `supabase db reset` / `supabase start` |

## CLI Link Target

The Supabase CLI is linked to **production** (`qohhnufxididbmzqnjwg`) via `supabase/.temp/project-ref`.

**This means every `supabase db push` goes directly to production.**

The guardrail script (`scripts/db-push-guard.mjs`) blocks push from non-`main` branches to production. Always use `npm run db:push` instead of bare `supabase db push`.

## Development Environment Matrix

| Scenario | App connects to | CLI target | `.env.local` keys | When |
|----------|----------------|------------|-------------------|------|
| **Local dev** (default) | Local Supabase (Docker) | Local | Local URL + local anon/service keys | Day-to-day development |
| **Remote migration op** | — (CLI only, no app) | Production | N/A | `npm run db:push` from `main` |
| **CI / Vercel preview** | Sandbox project (`vmpdejhgpsrfulimsoqn`) | External preview config | Set by Vercel env vars | PR deploys |
| **Production** | Production DB | Production | Set by Vercel env vars | Live site |

### Core principle

> **Local development always runs against local Supabase.**
> Production is reached only through explicit, guarded CLI operations.

Current preview deployments do not rely on a per-PR Supabase branch database. They connect to the sandbox project via Vercel preview environment variables.

### What this means in practice

- `.env.local` points to `http://127.0.0.1:54321` with local keys — **never change this to production as default.**
- The Supabase CLI is linked to production (`supabase/.temp/project-ref`), but that linkage is **only used for explicit remote commands** like `db push`, `migration list`, `migration repair`, `gen types`.
- You do **not** run the app against production data during development.
- If you need production-like data locally, take a sanitized dump or create representative seed data — don't point the app at the live DB.

## Rules

### Migration workflow

1. Create migrations locally: `supabase migration new <name>`
2. Test locally: `supabase db reset` (Docker)
3. Commit migration files to git
4. Push to production: `npm run db:push` (only from `main` branch, guardrail enforced)

### What to avoid

- **Never** change `.env.local` to point the app at production as a default working setup.
- **Never** create migrations via SQL Editor in Supabase Dashboard — it creates remote-only history entries that drift from the repo.
- **Never** run bare `supabase db push` — always use `npm run db:push` which runs the guardrail.
- **Never** assume which DB the CLI targets — the guardrail shows the target before every push.
- **Never** use `supabase link` to switch the CLI to production for casual browsing — only for deliberate admin/migration operations.

## Supabase Branching

The project has Supabase Branching enabled on `lekbanken-main`.

### Rules

- **Supabase branches must only reference git branches that exist on `origin`.** A branch pointing to a non-existent git ref will fail on every clone attempt.
- **Persistent `CREATING_PROJECT` or `MIGRATIONS_FAILED` after a config fix should be resolved by recreating the branch**, not by further debugging the stuck instance.
- Supabase branches may exist for branch-based experiments, but the current app preview flow does not depend on them.

### Status (2026-03-17)

| Branch | Status | Notes |
|--------|--------|-------|
| main | `FUNCTIONS_DEPLOYED` / `ACTIVE_HEALTHY` | Default branch, healthy |
| staging | **Deleted** | Was pointing to non-existent `staging` git branch. Recreate when needed. |

### History

- **2026-03-15:** Both branches created. `staging` referenced non-existent `staging` git branch.
- **2026-03-16:** Discovered `config.toml` parse error (`db.health_timeout` invalid key) causing all branch-actions to fail. Fixed in commit `0d79e54`.
- **2026-03-17:** `staging` branch deleted (unsalvageable — broken git ref). `main` branch recovered to healthy state after config fix reached origin.

## Related

- [README.md](README.md) — Database docs index
- [migration-history.md](migration-history.md) — History normalization log
