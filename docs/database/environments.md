# Database Environments

## Overview

| Environment | Supabase Project | Ref ID | Purpose |
|-------------|-----------------|--------|---------|
| **Production** | lekbanken-main | `qohhnufxididbmzqnjwg` | Live database, CLI linked target |
| **Sandbox** | lekbanken-sandbox | `vmpdejhgpsrfulimsoqn` | Experimental. Baseline was generated from this DB |
| **Local dev** | Docker | `supabase start` | Local development, isolated |
| **Legacy** | Lekbanken Projekt | `zaufhdwajplipthjicts` | Original project, not in active use |

> **Note:** Staging was previously a Supabase Branch (`cxkfcqyasszjmxvvhkxt`). It was deleted 2026-03-17 because it referenced a non-existent `staging` git branch. Recreate when a real staging git branch exists on origin.

## Git Branch → Database Target

| Git branch | Database target | Supabase ref | CLI action |
|------------|----------------|--------------|------------|
| `main` | **Production** | `qohhnufxididbmzqnjwg` | `npm run db:push` (guardrail enforces this) |
| Any other | **Local Docker only** | N/A | `supabase db reset` / `supabase start` |

## CLI Link Target

The Supabase CLI is linked to **production** (`qohhnufxididbmzqnjwg`) via `supabase/.temp/project-ref`.

**This means every `supabase db push` goes directly to production.**

The guardrail script (`scripts/db-push-guard.mjs`) blocks push from non-`main` branches to production. Always use `npm run db:push` instead of bare `supabase db push`.

## Rules

### Migration workflow

1. Create migrations locally: `supabase migration new <name>`
2. Test locally: `supabase db reset` (Docker)
3. Push to production: `npm run db:push` (only from `main` branch, guardrail enforced)
4. Commit migration files to git

### What to avoid

- **Never** create migrations via SQL Editor in Supabase Dashboard — it creates remote-only history entries that drift from the repo.
- **Never** run bare `supabase db push` — always use `npm run db:push` which runs the guardrail.
- **Never** assume which DB the CLI targets — the guardrail shows the target before every push.

## Supabase Branching

The project has Supabase Branching enabled on `lekbanken-main`.

### Rules

- **Supabase branches must only reference git branches that exist on `origin`.** A branch pointing to a non-existent git ref will fail on every clone attempt.
- **Persistent `CREATING_PROJECT` or `MIGRATIONS_FAILED` after a config fix should be resolved by recreating the branch**, not by further debugging the stuck instance.
- Preview branches are automatically created by Supabase when a PR is opened (if the GitHub integration is active).

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

- [migration-history.md](migration-history.md) — History normalization log
