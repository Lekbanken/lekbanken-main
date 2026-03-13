# Migration Safety Audit — Lekbanken

> **Auditor:** Claude (AI)  
> **Date:** 2026-03-12  
> **Scope:** 304 Supabase SQL migrations, rollback strategy, destructive DDL, enum handling, data backfills, deploy safety  
> **Status:** ✅ AUDIT COMPLETE — GPT-calibrated (2026-03-12)  
> **Finding count:** 14 findings (0 P0, 1 P1, 9 P2, 4 P3) — GPT-calibrated

---

## 1. Executive Summary

The Lekbanken migration set (304 files, Dec 2024 → Mar 2026) is **well-structured and defensively coded**. The codebase shows strong progressive hardening: bulk privilege revocation, `search_path` sweep of all `SECURITY DEFINER` functions, `IF EXISTS` guards on almost all DROP operations, and `ON CONFLICT` on most seed data. No `TRUNCATE` or `DROP TYPE` found in any migration.

**Key risks:**
- One enum `ADD VALUE` inside a `BEGIN/COMMIT` block references the new value before commit — bootstrap risk on fresh deployments (P1, downgraded from P0 per GPT: PG 17 generally permits this, migration already applied to production)
- Bulk `DELETE FROM public.users` with no safety net — historical pattern risk (P2)
- No formal rollback framework — only 3 of 304 migrations have rollback scripts (P2)
- Forward-only with no deployment verification checklist (P2)

**Strengths:**
- All `SECURITY DEFINER` functions hardened via dynamic sweep (20260220233000)
- All `DROP TABLE` statements use `IF EXISTS`
- No `TRUNCATE` anywhere
- Most seed data uses `ON CONFLICT`
- PostgreSQL 17.6.1 on Supabase — modern, well-supported

---

## 2. Environment

| Property | Value |
|----------|-------|
| Database | PostgreSQL 17.6.1.054 |
| Supabase CLI | v2.75.0 |
| Project ref | `qohhnufxididbmzqnjwg` |
| Region | `aws-1-eu-west-3` |
| Migration count | 304 SQL files |
| Date range | 2024-12-10 → 2026-03-14 (15 months) |
| Naming convention | `YYYYMMDDHHMMSS_description.sql` |
| Rollback scripts | 3 (security hardening batch only) |
| Seed files | 3 (demo tenant data) |
| Edge functions | 2 (cleanup-demo-data, purge-anonymized-tenants) |
| RLS test | 1 (cross-tenant isolation) |
| Deploy method | `supabase db push --linked` or manual SQL Editor |

---

## 3. Severity Guide

| Level | Meaning |
|-------|---------|
| **P0** | Deploy blocker — will cause failure on fresh deployment or migration re-run |
| **P1** | Significant risk — could cause data loss, downtime, or partial state |
| **P2** | Minor — style issue, missing guard, or mild concern |
| **P3** | Informational — documented for completeness |

---

## 4. Findings

### MIG-001 — Enum ADD VALUE inside transaction references new value before COMMIT (P1)

**Category:** DDL Transaction Safety  
**Location:** `supabase/migrations/20260302300000_tenant_anonymization.sql`

**Description:** The migration wraps everything in explicit `BEGIN;`...`COMMIT;`. Inside that transaction:
- Line 14: `ALTER TYPE tenant_status_enum ADD VALUE IF NOT EXISTS 'anonymized';`
- Line 73: RLS policy references `status != 'anonymized'` — PostgreSQL must resolve `'anonymized'` as a `tenant_status_enum` literal

In PostgreSQL 12+, `ADD VALUE` can run inside a transaction, but usage of the new value within the **same transaction** has version-dependent behavior. On PG 17, enum values added via `ADD VALUE` inside a transaction may be visible to subsequent DDL within the same transaction — but this is not guaranteed by the spec and violates the documented behavior from PG 12–15.

**Risk:** On a fresh deployment (new database, `supabase db reset`), this migration may fail with `invalid input value for enum tenant_status_enum: "anonymized"` when creating the RLS policy. It may have worked on incremental push due to migration runner behavior or PG 17 relaxations, but is not portable.

**Recommended fix:** Split into two migrations — one for `ADD VALUE`, one for the remainder. Or move the `ADD VALUE` before the explicit `BEGIN;` block (Supabase CLI will commit it separately).

> **GPT calibration (2026-03-12):** Downgraded P0→P1. PostgreSQL 17 generally permits using new enum values within the same transaction. Since the migration has already been applied to production, this is a bootstrap risk (fresh `db reset`) only — not a production or deploy blocker. Recommended: split enum alteration and policy creation into separate transactions in future migrations.

---

### MIG-002 — Bulk DELETE FROM public.users with no safety net (P2)

**Category:** Destructive Data Migration  
**Location:** `supabase/migrations/20260103160000_fix_orphaned_user_profiles.sql` (line 52)

**Description:**
```sql
DELETE FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = pu.id
);
```
Deletes all `public.users` rows where no matching `auth.users` exists. No limit, no dry-run count, no backup table, no `RETURNING` for audit, no check that `auth.users` is non-empty.

**Risk:** If `auth.users` is temporarily empty (GoTrue restart, restore issue, migration ordering), this deletes **all** user profiles. Cascade through FK `ON DELETE CASCADE` would silently wipe memberships, achievements, etc.

**Status:** Already applied — the damage window has passed. But remains a **pattern risk** for future migrations.

**Recommendation:** For future destructive migrations, mandate: (1) dry-run count with `RAISE NOTICE`, (2) empty-source guard (`SELECT count(*) FROM auth.users HAVING count(*) < 1`), (3) backup to staging table before DELETE.

---

### MIG-003 — No formal rollback framework (P2)

**Category:** Deployment Strategy  
**Location:** `supabase/migrations/rollback/` — 3 scripts of 304 migrations

**Description:** Only the 2026-01-08 security hardening batch has rollback scripts. The remaining 301 migrations are forward-only with no undo mechanism. Supabase CLI does not support `supabase db revert` or down migrations.

**Risk:** If a migration breaks production, the only recovery path is:
1. Manual SQL to undo changes
2. Point-in-time restore (Supabase PITR — available on Pro plan)
3. Re-deploy from backup

**Recommendation:** Accept forward-only as deliberate strategy (common for SaaS), but document:
- PITR is the primary rollback mechanism
- Each migration that modifies critical tables should include a commented-out undo section
- Pre-deployment backup checkpoint is mandatory for any migration touching data

---

### MIG-004 — No deployment verification checklist (P2)

**Category:** Deployment Strategy  
**Location:** Project-wide (no `DEPLOY_CHECKLIST.md` or CI gate)

**Description:** There is no documented process for verifying migrations before deployment:
- No pre-deploy dry-run mechanism
- No CI step to test migrations against a fresh database
- No post-deploy verification queries
- `supabase/tests/` has only 1 test (RLS isolation)

**Recommendation:** Create a deployment checklist including:
1. `supabase db reset` on staging to verify full migration chain
2. `supabase db push --dry-run` before production push
3. Post-deploy: run `supabase/verify_rls_coverage.sql` (already exists)
4. Post-deploy: verify enum values exist (`SELECT * FROM pg_enum`)

---

### MIG-005 — Data mutations coupled with schema changes (P2)

**Category:** Migration Structure  
**Location:** Multiple files

**Description:** Several migrations mix DDL (ALTER TABLE, CREATE INDEX) with DML (DELETE, UPDATE, INSERT) in the same file:

| Migration | DDL | DML |
|-----------|-----|-----|
| `20260103160000_fix_orphaned_user_profiles.sql` | CREATE TRIGGER | DELETE + UPDATE + INSERT on users |
| `20260208000000_game_media_unique_cover.sql` | CREATE UNIQUE INDEX | DELETE duplicates from game_media |
| `20251228140000_session_events.sql` | ALTER TABLE SET NOT NULL | UPDATE existing rows to set defaults |
| `20251216000000_consolidate_roles.sql` | CREATE FUNCTION | UPDATE users SET global_role |

**Risk:** If the migration fails mid-way (e.g., index creation fails after data cleanup), the database is left in a partially-modified state. Supabase wraps migrations in transactions, which mitigates this — but explicit `BEGIN/COMMIT` blocks override the implicit transaction.

**Recommendation:** Accept as low risk given transaction wrapping. Document the pattern in a migration style guide for future contributors.

---

### MIG-006 — Non-idempotent seed data (P2)

**Category:** Idempotency  
**Location:** `supabase/migrations/20251129000006_seed_billing_plans.sql`

**Description:** `INSERT INTO billing_plans` without `ON CONFLICT`. Would fail with duplicate key violation if re-run.

**Mitigated by:** Supabase migration runner tracks applied migrations in `supabase_migrations.schema_migrations` — re-runs are prevented at the runner level. Only a risk during `supabase db reset` if the initial schema already seeds this data.

---

### MIG-007 — TIMESTAMP → TIMESTAMPTZ column type change locks table (P2)

**Category:** Lock Contention  
**Location:** `supabase/migrations/20260220210000_fix_timestamp_timezone.sql` (line 22)

**Description:** Four columns on `notifications` table are changed from TIMESTAMP to TIMESTAMPTZ in a single ALTER TABLE. `ALTER COLUMN TYPE` acquires an ACCESS EXCLUSIVE lock, blocking all reads and writes for the duration of the rewrite.

**Risk:** If `notifications` table is large, this causes downtime during deployment. Four columns in one statement extend the lock window.

**Status:** Already applied. For future migrations of this type, consider maintenance window or batched approach.

---

### MIG-008 — DROP FUNCTION CASCADE removes dependent RLS policies (P2)

**Category:** Cascading Side Effects  
**Location:** Multiple files (`20251129000001`, `20251207130000`, `20260104120100`)

**Description:** `DROP FUNCTION ... CASCADE` silently drops RLS policies that depend on the function. The migrations re-create both function and policies, but if interrupted mid-migration, tables lose RLS protection temporarily.

**Mitigated by:** Transaction wrapping — if the migration fails, the DROP is rolled back. The pattern is correct (drop + recreate), but any manual interruption during migration application could leave tables exposed.

---

### MIG-009 — GRANT INSERT to anon on audit tables (P2)

**Category:** Privilege Surface  
**Location:** `supabase/migrations/20260115000000_cookie_consent_v2.sql` (line 241)

**Description:** `GRANT SELECT, INSERT ON cookie_consent_audit TO anon` and `GRANT INSERT, UPDATE ON anonymous_cookie_consents TO anon`. This is intentional for pre-auth cookie consent flows, but anon INSERT on audit tables should have RLS validation to prevent abuse (spam inserts, storage exhaustion).

**Mitigated by:** RLS is enabled on both tables. The INSERT policies restrict what anon can write. Verified in `20260220230000_revoke_definer_execute_from_anon.sql` — the bulk revocation swept EXECUTE but preserved these intentional data grants.

---

### MIG-010 — Missing IF NOT EXISTS on initial schema tables (P2)

**Category:** Idempotency  
**Location:** `supabase/migrations/20251129000000_initial_schema.sql` — ~15 CREATE TABLE statements

**Description:** The initial schema and early domain files use `CREATE TABLE` without `IF NOT EXISTS`. This is standard for migration files (they run once), but means `supabase db reset` must run from scratch.

**Mitigated by:** Supabase migration runner prevents re-execution. Only relevant for manual re-runs, which are not expected.

---

### MIG-011 — Function redefined across 7+ migrations (P3)

**Category:** Migration Hygiene  
**Location:** `has_tenant_role()` redefined in files: `20251129000000`, `20251129000001`, `20251203020000`, `20251207105000`, `20260108000004`, `20260108000006`, `20260220233000`

**Description:** The function is progressively refined across 7 migrations. Each uses `CREATE OR REPLACE FUNCTION`, so the final version wins. Not a bug, but makes it hard to understand the "current" definition without reading all migrations. A developer checking the initial schema sees a different signature than what's deployed.

**Recommendation:** Document current function definitions in a schema reference file, or use `supabase gen types` to maintain a generated reference.

---

### MIG-012 — Legacy placeholder migrations with wrong timestamp format (P3)

**Category:** Migration Hygiene  
**Location:** `20241210_create_participants_domain.sql`, `20241211_participants_live_progress.sql`

**Description:** Two migrations use `YYYYMMDD` format instead of `YYYYMMDDHHMMSS`. They are no-op placeholders (`RAISE NOTICE 'skipping'`) that redirect to later migrations. Not harmful but inconsistent.

---

### MIG-013 — No config.toml for local development (P3)

**Category:** Development Environment  
**Location:** `supabase/config.toml` — does not exist

**Description:** The project uses linked remote mode exclusively. No local Supabase development container is configured. This means developers cannot test migrations locally before pushing to the shared database.

**Recommendation:** Consider adding `config.toml` for local development, especially for testing destructive migrations before production.

---

### MIG-014 — Only 1 database test (P3)

**Category:** Test Coverage  
**Location:** `supabase/tests/test_tenant_rls_isolation.sql`

**Description:** Only one test exists for the entire database layer. It tests cross-tenant RLS isolation, which is valuable, but there are no tests for:
- Function correctness (`is_system_admin`, `has_tenant_role`, RPC functions)
- Migration chain integrity (fresh `db reset` works end-to-end)
- Enum completeness
- FK cascade behavior

**Recommendation:** Add critical path tests: `is_system_admin()` returns correct values, `has_tenant_role()` with various role combinations, RPC functions handle edge cases.

---

## 5. Positive Findings

The migration set demonstrates **strong security discipline**:

1. **✅ Comprehensive SECURITY DEFINER hardening** — Dynamic sweep in `20260220233000` catches all functions with missing `search_path`. Two-layer approach (explicit + sweep) provides defense in depth.
2. **✅ Bulk privilege revocation** — `20260220230000` revokes `EXECUTE` from `anon` on all non-whitelisted functions. `20260220232000` sets restrictive `DEFAULT PRIVILEGES`.
3. **✅ All DROP TABLE uses IF EXISTS** — No unguarded table drops found across 304 files.
4. **✅ No TRUNCATE anywhere** — Zero instances in the entire migration set.
5. **✅ No DROP TYPE** — Enum modifications use `ADD VALUE IF NOT EXISTS` exclusively.
6. **✅ Most seed data uses ON CONFLICT** — Products, purposes, achievements, cosmetics all use `DO NOTHING` or `DO UPDATE`.
7. **✅ Correct enum transaction handling in later migrations** — `20260305200000_run_sessions.sql` correctly separates `ADD VALUE` into its own transaction before the main DDL block.
8. **✅ RLS verification tooling exists** — `supabase/verify_rls_coverage.sql` can check all public tables have RLS enabled.
9. **✅ 2 legacy no-op placeholders** — Old-format migrations are harmless skip scripts.
10. **✅ auth.uid() initplan optimization** — Batch migrations (`20260108000013-000019`) correctly optimize `auth.uid()` calls in RLS policies for performance.

---

## 6. Remediation Milestones

### M1 — Deploy Safety (MIG-001) — **Before next fresh deployment**

- [ ] **MIG-001** — Split `20260302300000_tenant_anonymization.sql` enum `ADD VALUE` into separate pre-transaction statement. Or verify via `SELECT 'anonymized'::tenant_status_enum` that the value exists in production and the migration already applied successfully.

### M2 — Deployment Process (MIG-003, MIG-004) — **Before launch**

- [ ] **MIG-003** — Document forward-only strategy as intentional. Verify PITR is enabled on Supabase Pro plan. Add commented undo sections to any new critical migrations.
- [ ] **MIG-004** — Create deployment checklist: pre-deploy dry-run, staging `db reset`, post-deploy RLS verification.

### M3 — Pattern Guidance (MIG-002, MIG-005) — **Post-launch**

- [ ] **MIG-002** — Add migration style guide: destructive DML requires dry-run count, empty-source guard, and backup table.
- [ ] **MIG-005** — Document DDL+DML coupling risks in style guide.

### M4 — Test Coverage (MIG-014) — **Post-launch**

- [ ] **MIG-014** — Add database function tests for `is_system_admin()`, `has_tenant_role()`, and critical RPCs.

### M5 — Low Priority Cleanup (MIG-006–013) — **Post-launch**

- [ ] Remaining P2/P3 items — address as part of ongoing maintenance.

---

## 7. Priority Summary

| Milestone | Findings | Priority | Est. effort |
|-----------|----------|----------|-------------|
| M1 — Deploy Safety | MIG-001 | **P1 — Before fresh deploy** | Low (split 1 migration or verify) |
| M2 — Deployment Process | MIG-003, MIG-004 | **P2 — Before launch** | Low (documentation + checklist) |
| M3 — Pattern Guidance | MIG-002, MIG-005 | P2 — Post-launch | Low (style guide) |
| M4 — Test Coverage | MIG-014 | P3 — Post-launch | Medium |
| M5 — Cleanup | MIG-006–013 | P2/P3 — Post-launch | Low |

---

## 8. Verification Commands

Run these to confirm current database state:

```bash
# Check which migrations have been applied
supabase migration list --project-ref qohhnufxididbmzqnjwg

# Verify enum value exists (MIG-001)
supabase db execute --project-ref qohhnufxididbmzqnjwg \
  "SELECT 'anonymized'::tenant_status_enum"

# Verify RLS coverage
supabase db execute --project-ref qohhnufxididbmzqnjwg \
  "$(cat supabase/verify_rls_coverage.sql)"

# Verify SECURITY DEFINER functions all have search_path
supabase db execute --project-ref qohhnufxididbmzqnjwg \
  "SELECT p.proname, p.proconfig FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path%'))"
```
