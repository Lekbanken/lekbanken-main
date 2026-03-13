# Production Migration Workflow

> **Status:** active  
> **Owner:** Engineering  
> **Created:** 2026-03-14  
> **Related:** `docs/MIGRATIONS.md` (execution methods), `launch-readiness/incident-playbook.md` §3b (DB rollback)

---

## 1. Decision Tree

Before writing or applying a migration, classify the change:

| Change type | Risk | Zero-downtime? | Approach |
|-------------|------|----------------|----------|
| Add table/column (nullable) | 🟢 Low | ✅ Yes | Apply directly |
| Add index (non-unique) | 🟢 Low | ✅ Yes | Use `CREATE INDEX CONCURRENTLY` for large tables |
| Add function / RLS policy | 🟢 Low | ✅ Yes | Apply directly (`CREATE OR REPLACE` is idempotent) |
| Add column (NOT NULL, no default) | 🟡 Medium | ⚠️ Maybe | Requires backfill plan — add nullable first, backfill, then add constraint |
| Alter column type | 🟡 Medium | ⚠️ Depends | Check for view/index dependencies. May require `DROP`/recreate cycle. |
| Drop column/table | 🔴 High | ❌ No | Verify zero consumers in codebase first. Code deploy removes consumers → migration drops column in next cycle. |
| Rename column/table | 🔴 High | ❌ No | Two-phase: add new + backfill → code migration → drop old. Never rename in-place. |
| Alter enum (add value) | 🟡 Medium | ✅ Yes | `ALTER TYPE ... ADD VALUE` is not transactional in PG < 12. In PG 17 (current): safe inside transactions. |

---

## 2. Promotion Flow

```
Local dev → Sandbox → Production
```

| Step | Environment | Method | Verify |
|------|-------------|--------|--------|
| 1. Write migration | Local | Create file in `supabase/migrations/` | `tsc --noEmit` |
| 2. Test locally | Local Supabase (if Docker) or sandbox | `supabase db reset` or `supabase db push` | Schema count, types regenerated |
| 3. Push to sandbox | Sandbox (`vmpdejhgpsrfulimsoqn`) | `supabase link --project-ref vmpdejhgpsrfulimsoqn` → `supabase db push` | `supabase migration list` (Local=Remote) |
| 4. Preview deploy | Vercel preview | Open PR or push branch | App loads, affected features work |
| 5. Commit + PR | GitHub | `git add` migration + `types/supabase.ts` | CI passes (`baseline-check.yml`, `typecheck.yml`) |
| 6. Apply to production | Production (`qohhnufxididbmzqnjwg`) | `supabase link --project-ref qohhnufxididbmzqnjwg` → `supabase db push` | Query verification (see §5) |
| 7. Deploy to production | Vercel | Merge PR → auto-deploy | App loads, `/api/health` returns 200 |

**⚠️ Deploy order matters.** If the app code depends on the migration (new table, new RLS policy), the migration must be applied to production **before** the code deploys. If the code removes usage of a column/table, the code deploys **first**, then the migration drops the column in a subsequent cycle.

---

## 3. Pre-Flight Checklist

Run this before applying any migration to production:

- [ ] **Backup verified** — Confirm PITR is enabled in Supabase Dashboard → Settings → Database → Backups. Note the current recovery window.
- [ ] **Migration tested in sandbox** — Applied via `supabase db push`, verified via preview deploy.
- [ ] **Types regenerated** — `npm run db:types:remote` produces clean diff.
- [ ] **No type errors** — `tsc --noEmit` passes (0 errors).
- [ ] **Rollback path identified** — Can this migration be reversed? If destructive (DROP/ALTER), document how to restore.
- [ ] **Deploy order documented** — Does the code deploy depend on this migration? Or vice versa?
- [ ] **Team notified** — If SEV-impacting, other engineers know the migration is going in.

---

## 4. Execution

### Apply to production

```bash
# 1. Link to production
supabase link --project-ref qohhnufxididbmzqnjwg

# 2. Verify pending migrations
supabase db push --dry-run

# 3. Apply
supabase db push

# 4. Verify
supabase migration list
# Expected: all migrations show Local = Remote
```

### Types regeneration (always do this)

```bash
# Generate types from remote schema
npm run db:types:remote

# Verify no type errors
npm run type-check

# Commit migration + types together
git add supabase/migrations/<timestamp>_*.sql types/supabase.ts
git commit -m "feat: <description> + type regeneration"
```

---

## 5. Post-Migration Validation

After applying to production, verify:

| Check | How | Expected |
|-------|-----|----------|
| Schema count | Supabase Dashboard → Table Editor | Count matches pre-migration estimate |
| Migration list | `supabase migration list` | All Local = Remote |
| App health | `curl https://app.lekbanken.no/api/health` | `{ "status": "ok" }` |
| Affected feature | Manual test on production | Feature works as expected |
| Type check | `tsc --noEmit` | 0 errors |

For schema-changing migrations, also run:

```sql
-- Verify table count
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Verify function count
SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- Verify RLS policy count
SELECT count(*) FROM pg_policies;
```

---

## 6. Rollback Playbook

### If migration fails mid-execution

Supabase migrations run inside transactions. A failed migration rolls back automatically. The `supabase_migrations` table will not record it. Fix the SQL and retry.

### If migration succeeds but breaks the app

**Option A — PITR restore (preferred for destructive changes)**
1. Supabase Dashboard → Settings → Database → Backups
2. Select restore point before the migration
3. Restore (creates new project or in-place depending on plan)
4. Update env vars if restored to new project

**Option B — Manual SQL reversal (for additive changes)**
```sql
-- Example: undo an added column
ALTER TABLE public.some_table DROP COLUMN IF EXISTS new_column;

-- Example: undo an added function
DROP FUNCTION IF EXISTS public.new_function();

-- Example: undo an added RLS policy
DROP POLICY IF EXISTS "policy_name" ON public.some_table;
```

After manual reversal:
1. Remove the migration file locally
2. `supabase migration repair <timestamp> --status reverted`
3. Regenerate types: `npm run db:types:remote`
4. Commit the reversal

### If migration applied to wrong environment

This is why `supabase link` state matters. Always verify:

```bash
# Check current linked project
supabase projects list
# Or check .supabase/ directory
```

If accidentally applied to production when intended for sandbox: assess impact. If the migration is safe (additive, idempotent), it may be acceptable. If destructive, use PITR.

---

## 7. Drift Prevention

### Between sandbox and production

Sandbox was initialized from the reconsolidated canonical baseline. New migrations must be applied to **both** environments:

```
1. Apply to sandbox first (test)
2. Verify on preview deploy
3. Apply to production
4. Verify on production
```

### Detection

```sql
-- Run on both environments, compare results
SELECT count(*) as tables FROM information_schema.tables WHERE table_schema = 'public';
SELECT count(*) as functions FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
SELECT count(*) as policies FROM pg_policies;
```

CI also catches drift: `baseline-check.yml` verifies fresh install schema counts. If a migration breaks fresh install, CI fails.

### Sandbox reset (if diverged beyond repair)

```bash
# Nuclear option: reset sandbox to baseline
supabase link --project-ref vmpdejhgpsrfulimsoqn
supabase db reset --linked
# Then re-apply all incremental migrations
supabase db push
# Then migration repair if needed (see sandbox-phase-1b.md §9.1)
```

---

## 8. Known Constraints

| Constraint | Detail |
|------------|--------|
| Sandbox migration repair | Sandbox initialized from reconsolidated baseline. 6 incremental migrations required `migration repair --status applied`. This is needed after any sandbox reset. See `sandbox-phase-1b.md` §9.1. |
| Deploy order (APC-003/011) | Migration `20260314000000` must be applied before deploying session route change. Session admin list breaks without RLS policy. |
| Only 3/307 migrations have rollback scripts | For destructive changes, prefer PITR over manual reversal. |
| `gen types` drift check in CI | CI compares generated types to committed `types/supabase.ts`. Keep them in sync. |
