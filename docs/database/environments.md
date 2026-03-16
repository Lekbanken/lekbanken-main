# Database Environments

## Overview

| Environment | Supabase Project | Ref ID | Purpose |
|-------------|-----------------|--------|---------|
| **Production** | lekbanken-main | `qohhnufxididbmzqnjwg` | Live database, CLI linked target |
| **Staging** | Supabase Branch | `cxkfcqyasszjmxvvhkxt` | Preview branch under lekbanken-main |
| **Sandbox** | lekbanken-sandbox | `vmpdejhgpsrfulimsoqn` | Experimental. Baseline was generated from this DB |
| **Local dev** | Docker | `supabase start` | Local development, isolated |
| **Legacy** | Lekbanken Projekt | `zaufhdwajplipthjicts` | Original project, not in active use |

## CLI Link Target

The Supabase CLI is linked to **production** (`qohhnufxididbmzqnjwg`) via `supabase/.temp/project-ref`.

**This means every `supabase db push` goes directly to production.**

## Rules

### Migration workflow

1. Create migrations locally: `supabase migration new <name>`
2. Test locally: `supabase db reset` (Docker)
3. Push to production: `supabase db push` (only from `main` branch)
4. Commit migration files to git

### What to avoid

- **Never** create migrations via SQL Editor in Supabase Dashboard — it creates remote-only history entries that drift from the repo.
- **Never** run `supabase db push` from a non-`main` branch unless you explicitly re-link to a staging/preview project first.
- **Never** assume which DB the CLI targets — verify with `cat supabase/.temp/project-ref` before push.

## Supabase Branching

The project uses Supabase Branching with a `staging` preview branch. Both branches currently show `MIGRATIONS_FAILED` status (as of 2026-03-16) due to prior history drift. This should resolve after the next migration sync or branch reset.

## Related

- [migration-history.md](migration-history.md) — History normalization log
