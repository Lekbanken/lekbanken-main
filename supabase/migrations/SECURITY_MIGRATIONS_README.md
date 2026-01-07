# Database Security Migrations

## Overview

This migration pack addresses critical security vulnerabilities identified in the Supabase Security Advisor report, plus DBA-recommended hardening.

## Migrations

### 1. `20260108000000_security_definer_fix.sql`
**Severity: 🔴 ERROR - Apply Immediately** ✅ APPLIED

Fixes:
- `is_system_admin()` function was `SECURITY DEFINER` without `SET search_path`
- `game_steps` table may have RLS disabled
- `game_materials` table may have RLS disabled

### 2. `20260108000001_view_security_invoker.sql`
**Severity: 🟡 WARN - Apply Soon** ✅ APPLIED

Fixes:
- `session_artifact_state` view runs with owner privileges (bypasses RLS)
- `tenant_memberships` view runs with owner privileges (bypasses RLS)

**Note:** Uses DROP VIEW + CREATE VIEW because `security_invoker` cannot be added via ALTER VIEW.

### 3. `20260108000002_consolidate_duplicate_policies.sql`
**Severity: 🟡 WARN - Test Carefully Before Apply** ✅ APPLIED

Fixes:
- `users` table had 7 SELECT policies (reduced to 3)
- `users` table had 4 UPDATE policies (reduced to 2)

### 4. `20260108000003_cleanup_duplicate_policies.sql`
**Policy Cleanup** ✅ APPLIED

Removes remaining duplicate policies with incorrect names.
Result: `users` table now has exactly 6 policies (1 INSERT, 3 SELECT, 2 UPDATE).

### 5. `20260108000004_search_path_hardening.sql`
**DBA Hardening** ✅ APPLIED

Upgrades `is_system_admin()` search_path from `public` to `pg_catalog, public`.
Per DBA best practice: pg_catalog ensures built-in types/functions resolve correctly.

### 6. `20260108000005_security_definer_batch_hardening.sql`
**DBA Hardening** ✅ APPLIED

Upgrades all core auth functions to use `pg_catalog, public` search_path:
- `is_tenant_member(p_tenant_id uuid)`
- `get_user_tenant_ids()`
- `has_tenant_role(p_tenant_id uuid, required_roles ...)`
- `has_tenant_role(p_tenant_id uuid, required_role ...)`

## Functions Needing Future Review

The following SECURITY DEFINER functions have NO search_path set.
These are lower risk but should be reviewed:

**Session/Trigger Functions:**
- `session_trigger_record_error`, `session_trigger_clear_error`
- `session_triggers_disable_all`, `session_triggers_rearm_all`
- `log_session_event`, `get_session_events`, `get_session_event_stats`
- `snapshot_game_roles_to_session`, `create_game_snapshot`, `create_session_with_snapshot`

**Learning Functions:**
- `learning_course_completed`, `learning_prerequisites_met`
- `learning_requirement_satisfied`, `learning_get_unsatisfied_requirements`

**Plan/Trigger Functions:**
- `get_next_plan_version_number`, `trg_plan_blocks_update_plan_status`, `trg_plans_update_status`

**Auth Trigger (CRITICAL):**
- `handle_new_user`

**Other:**
- `get_effective_design`

## How to Apply

### Option 1: Via Supabase CLI (Recommended)

```bash
cd lekbanken-main
npx supabase db push --linked
```

### Option 2: Via Supabase Dashboard

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `20260108000000_security_definer_fix.sql`
3. Paste and execute
4. Copy contents of `20260108000001_view_security_invoker.sql`
5. Paste and execute

## Verification

After applying, run these queries in SQL Editor:

```sql
-- 1. Verify is_system_admin has search_path
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'is_system_admin';
-- Expected: proconfig = {search_path=public}

-- 2. Verify RLS on game tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('game_steps', 'game_materials');
-- Expected: rowsecurity = true for both

-- 3. Verify views have security_invoker
SELECT c.relname, reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('session_artifact_state', 'tenant_memberships');
-- Expected: reloptions contains {security_invoker=on}
```

## Rollback

If issues occur after applying, use the rollback scripts in `migrations/rollback/`:

```bash
# In SQL Editor, run:
# - 20260108000001_view_security_invoker_ROLLBACK.sql (first)
# - 20260108000000_security_definer_fix_ROLLBACK.sql (second)
```

⚠️ **Warning:** Rollback restores the LESS secure state. Only use if migrations cause application failures.

## Related Files

| File | Purpose |
|------|---------|
| `docs/DATABASE_SECURITY_AUDIT.md` | Full audit report |
| `scripts/security-audit-queries.sql` | Queries for manual verification |
| `scripts/db-inventory.sql` | Full database inventory queries |
| `2026-01-07/*.csv` | Performance metrics from Supabase inspect |
