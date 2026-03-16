# Database Environments

## Overview

| Environment | Supabase Project | Ref ID | Purpose |
|-------------|-----------------|--------|---------|
| **Production** | lekbanken-main | `qohhnufxididbmzqnjwg` | Live database, CLI linked target |
| **Staging** | Supabase Branch | `cxkfcqyasszjmxvvhkxt` | Preview branch under lekbanken-main |
| **Sandbox** | lekbanken-sandbox | `vmpdejhgpsrfulimsoqn` | Experimental. Baseline was generated from this DB |
| **Local dev** | Docker | `supabase start` | Local development, isolated |
| **Legacy** | Lekbanken Projekt | `zaufhdwajplipthjicts` | Original project, not in active use |

## Git Branch → Database Target

| Git branch | Database target | Supabase ref | CLI action |
|------------|----------------|--------------|------------|
| `main` | **Production** | `qohhnufxididbmzqnjwg` | `npm run db:push` (guardrail enforces this) |
| `staging` | **Staging branch** | `cxkfcqyasszjmxvvhkxt` | Must explicitly `supabase link --project-ref cxkfcqyasszjmxvvhkxt` first |
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

The project uses Supabase Branching with a persistent `staging` preview branch under the `lekbanken-main` project.

### Branch status (2026-03-16)

Both `main` and `staging` branches show `MIGRATIONS_FAILED`. This is a residual state from migration history drift that existed before the 2026-03-16 normalization (see [migration-history.md](migration-history.md)). The branches were created while migration history was inconsistent, so they inherited the broken state.

**Recommended fix:** Recreate the branches from the now-normalized main migration history rather than attempting to patch them. Do not blindly reset — first verify what state the branches hold.

## Related

- [migration-history.md](migration-history.md) — History normalization log
