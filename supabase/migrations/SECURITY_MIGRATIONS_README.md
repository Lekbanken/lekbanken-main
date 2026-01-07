# Database Security Migrations

## Overview

This migration pack addresses critical security vulnerabilities identified in the Supabase Security Advisor report.

## Migrations

### 1. `20260108000000_security_definer_fix.sql`
**Severity: 🔴 ERROR - Apply Immediately**

Fixes:
- `is_system_admin()` function was `SECURITY DEFINER` without `SET search_path`
- `game_steps` table may have RLS disabled
- `game_materials` table may have RLS disabled

### 2. `20260108000001_view_security_invoker.sql`
**Severity: 🟡 WARN - Apply Soon**

Fixes:
- `session_artifact_state` view runs with owner privileges (bypasses RLS)
- `tenant_memberships` view runs with owner privileges (bypasses RLS)

### 3. `20260108000002_consolidate_duplicate_policies.sql`
**Severity: 🟡 WARN - Test Carefully Before Apply**

Fixes:
- `users` table has **7 SELECT policies** (should be 3)
- `users` table has **4 UPDATE policies** (should be 2)  
- `user_profiles` table has **2 ALL policies** (confusing overlap)

**What it does:**
- Removes all duplicate/redundant policies
- Creates clean, well-named policies with clear purpose
- Reduces policy evaluation overhead

**Result after applying:**
- `users`: 5 policies (3 SELECT, 2 UPDATE)
- `user_profiles`: 6 policies (3 SELECT, 2 UPDATE, 1 INSERT, 1 DELETE)

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
