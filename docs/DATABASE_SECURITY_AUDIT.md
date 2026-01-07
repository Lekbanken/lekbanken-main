# Database Security & Performance Audit Report

**Date:** 2026-01-08  
**Project:** lekbanken-main (qohhnufxididbmzqnjwg)  
**Status:** ✅ **RESOLVED** - All security issues fixed

---

## Executive Summary

### Final Status (After Migrations 010-024)

| Category | Before | After | Status |
|----------|--------|-------|--------|
| SECURITY DEFINER without `search_path` | 10+ | **0** | ✅ FIXED |
| Tables with RLS disabled | ~30 | **0** | ✅ FIXED |
| Tables with RLS but no policies | ~21 | **0** | ✅ FIXED |
| auth.uid() without initplan wrapper | ~180 | **0** | ✅ FIXED |
| Multiple permissive policies (>2) | ~10 | **0** | ✅ FIXED |
| Unused indexes | 740 | 740 | ⚪ Expected |

### Supabase Advisor Status
- **Security Advisor:** ✅ 0 warnings
- **Performance Advisor:** ⚪ 740 warnings (expected - mostly unused indexes in dev)

---

## 🔴 RESOLVED: ERROR-Level Findings

### 1. ✅ `is_system_admin()` Missing `search_path` - FIXED

**Fixed in:** Migration 010  
**Solution:** Added `SET search_path = pg_catalog, public` to all SECURITY DEFINER functions

### 2. ✅ Tables With RLS Disabled - FIXED

**Fixed in:** Migration 011  
**Solution:** Enabled RLS on all 167 tables

### 3. ✅ Tables With RLS But No Policies - FIXED

**Fixed in:** Migration 017  
**Solution:** Added appropriate policies to all 21 affected tables

---

## 🟡 RESOLVED: WARN-Level Findings

### 4. ✅ Views With Default SECURITY DEFINER - FIXED

**Fixed in:** Migration 001  
**Solution:** Recreated views with `security_invoker = true`

### 5. ✅ auth.uid() Without Initplan Wrapper - FIXED

**Fixed in:** Migrations 013-014, 018-020, 023  
**Solution:** Wrapped all `auth.uid()` calls in `(SELECT auth.uid())` for better query performance

### 6. ✅ Multiple Permissive Policies Per Table - FIXED

**Fixed in:** Migrations 015, 021, 023  
**Solution:** Consolidated duplicate policies into single OR-combined policies

---

## ⚪ DOCUMENTED: INFO-Level Findings

### 7. Unused Indexes (740)

**Status:** Documented in Migration 022  
**Reason:** Expected in development environment
- Many are PRIMARY KEY indexes (cannot be dropped)
- Many are UNIQUE constraint indexes (cannot be dropped)
- Many are for features not yet in active use
- Will be reviewed after 90 days in production

### 8. Multiple Policies (19 tables with 2 policies)

**Status:** Intentional by design
**Reason:** These tables require separate policies for:
- `authenticated` + `anon` roles (public access)
- `user` + `admin` access levels
- `host` + `system_admin` for session tables

---

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Should return: 0 rows
SELECT p.proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
AND (p.proconfig IS NULL 
     OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg 
                    WHERE cfg LIKE 'search_path=%'));

-- Should return: 0 rows  
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Should return: 0 rows
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public'
AND qual::text ~ 'auth\.uid\(\)' 
AND qual::text NOT LIKE '%SELECT auth.uid()%';
```

---

## Related Documentation

- [DATABASE_SECURITY_DOMAIN.md](DATABASE_SECURITY_DOMAIN.md) - Security architecture overview
- [SECURITY_AUDIT_TODO.md](SECURITY_AUDIT_TODO.md) - Migration tracking
- [PERFORMANCE_ADVISOR_PROMPT.md](PERFORMANCE_ADVISOR_PROMPT.md) - Performance analysis queries

---

## Original Audit Details (Preserved for Reference)
ALTER VIEW public.session_artifact_state SET (security_invoker = on);
ALTER VIEW public.tenant_memberships SET (security_invoker = on);
```

**Option B: Recreate views with SECURITY INVOKER**
```sql
CREATE OR REPLACE VIEW public.session_artifact_state
WITH (security_invoker = on)
AS
SELECT ... -- current query
;
```

**Option C: Apply RLS to view directly (complex)**
Not recommended - PostgreSQL views don't support RLS directly.

---

### 4. Multiple Permissive Policies Per Table

**High-count tables (from your policy count data):**

| Table | Operation | Policy Count | Risk |
|-------|-----------|--------------|------|
| users | SELECT | 5 | Medium |
| user_tenant_memberships | SELECT | 4 | Medium |
| games | SELECT | 4 | Medium |
| tenants | SELECT | 3 | Low |
| participants | SELECT | 3 | Low |

**Problem:** Multiple PERMISSIVE policies are OR'd together. This can:
1. Create unintended data leakage (one permissive policy opens access)
2. Make policy logic hard to reason about
3. Create performance overhead (each policy is evaluated)

**Analysis Approach:**
For each table with >2 SELECT policies, we need to verify they're intentional:

```sql
SELECT policyname, roles::text, qual::text
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users' 
AND cmd = 'SELECT'
ORDER BY policyname;
```

**Common patterns that are OK:**
- `users_can_read_own` - User reads their own row
- `system_admin_can_select_all` - Admin bypass
- `tenant_members_can_read` - Tenant isolation

**Patterns that may need consolidation:**
- Multiple overlapping tenant policies
- Policies for different roles that could be merged

---

### 5. auth.uid() in RLS Policies (InitPlan Concern)

**Count:** ~208 policies use `auth.uid()`

**Problem:** In some PostgreSQL versions, calling `auth.uid()` in RLS policies can cause InitPlan overhead, where the function is evaluated multiple times.

**Mitigation (already partially applied):**
The project uses `get_user_tenant_ids()` which is a SECURITY DEFINER function that caches the result. This is the correct pattern.

**Verification:** Check if policies call `auth.uid()` directly vs via helper functions:

```sql
SELECT tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual::text LIKE '%auth.uid()%'
AND qual::text NOT LIKE '%get_user_tenant_ids()%'
AND qual::text NOT LIKE '%is_system_admin()%';
```

---

## 🔵 INFO-Level Findings (Optional Optimization)

### 6. Unused Indexes (10)

From Supabase inspect report:

| Table | Index | Scans |
|-------|-------|-------|
| games | games_popularity_score_idx | 0 |
| games | idx_games_energy_level | 0 |
| games | idx_games_location_type | 0 |
| games | idx_games_category | 0 |
| games | idx_games_time_estimate | 0 |
| games | idx_games_age_range | 0 |
| games | games_owner_tenant_idx | 13 |
| games | games_rating_idx | 16 |
| games | games_product_idx | 20 |
| user_devices | idx_user_devices_last_seen | 36 |

**Recommendation:** 
- **DO NOT DROP** in test environment - these may be used by features not yet tested
- Monitor in production for 30+ days before removing
- The "0 scans" indexes on games table appear to be for planned filtering features

---

### 7. Tables Never Vacuumed (~30)

This is normal for a development environment with test data. No action required unless:
- Table bloat exceeds 50% (check `bloat.csv`)
- Performance degrades

**Auto-vacuum will handle this** once tables have sufficient activity.

---

### 8. Unindexed Foreign Keys

From ChatGPT analysis: 112 unindexed FKs

**Impact:** Slower DELETE operations on parent tables (full table scan on child)

**Priority:** LOW - only matters with significant data volume

**Verification Query:**
```sql
-- In security-audit-queries.sql, query #11
```

---

## Migration Plan

### Phase 1: Critical Security Fixes (ERROR)

**Migration: `20260108000000_security_definer_fix.sql`**

```sql
-- Fix is_system_admin search_path
CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND global_role = 'system_admin'
  );
END;
$$;

-- Enable RLS on game_steps if disabled
DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_steps') THEN
    ALTER TABLE public.game_steps ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on game_steps';
  END IF;
END $$;

-- Enable RLS on game_materials if disabled
DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_materials') THEN
    ALTER TABLE public.game_materials ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on game_materials';
  END IF;
END $$;

-- Verify all SECURITY DEFINER functions have search_path
-- (Add more functions if found during manual verification)
```

### Phase 2: View Security (WARN)

**Migration: `20260108000001_view_security_invoker.sql`**

```sql
-- Make views respect caller's permissions
-- Requires PostgreSQL 15+ (Supabase uses 15+)

-- session_artifact_state
DROP VIEW IF EXISTS public.session_artifact_state;
CREATE VIEW public.session_artifact_state
WITH (security_invoker = on)
AS
SELECT
  sa.session_id,
  ARRAY_REMOVE(
    ARRAY_AGG(sav.id ORDER BY sav.revealed_at ASC)
      FILTER (WHERE sav.revealed_at IS NOT NULL),
    NULL
  ) AS revealed_variant_ids,
  (
    SELECT sav2.id
    FROM public.session_artifact_variants sav2
    JOIN public.session_artifacts sa2 ON sa2.id = sav2.session_artifact_id
    WHERE sa2.session_id = sa.session_id
      AND sav2.highlighted_at IS NOT NULL
    ORDER BY sav2.highlighted_at DESC
    LIMIT 1
  ) AS highlighted_variant_id,
  MAX(sav.revealed_at) AS last_revealed_at,
  MAX(sav.highlighted_at) AS last_highlighted_at
FROM public.session_artifacts sa
LEFT JOIN public.session_artifact_variants sav
  ON sav.session_artifact_id = sa.id
GROUP BY sa.session_id;

-- tenant_memberships (backward-compatibility view)
DROP VIEW IF EXISTS public.tenant_memberships;
CREATE VIEW public.tenant_memberships
WITH (security_invoker = on)
AS
SELECT * FROM public.user_tenant_memberships;

GRANT SELECT ON public.session_artifact_state TO authenticated;
GRANT SELECT ON public.tenant_memberships TO authenticated;
```

### Phase 3: Policy Consolidation (WARN)

**Migration: `20260108000002_consolidate_duplicate_policies.sql`**

Based on Query #13 analysis, the following duplicate policies were identified:

**`users` table (7 SELECT policies → consolidate to 3):**
| Current Policy | Disposition |
|----------------|-------------|
| users_allow_admin_read | → MERGE into `users_select_admin` |
| users_allow_read_coworkers | → MERGE into `users_select_coworkers` |
| users_allow_self_read | → MERGE into `users_select_self` |
| users_can_read_all | → REMOVE (overly permissive!) |
| users_can_read_own | → MERGE into `users_select_self` |
| users_select_own | → MERGE into `users_select_self` |
| users_select_policy | → REMOVE |

**`users` table (4 UPDATE policies → consolidate to 2):**
| Current Policy | Disposition |
|----------------|-------------|
| users_allow_admin_update | → MERGE into `users_update_admin` |
| users_allow_self_update | → MERGE into `users_update_self` |
| users_can_update_own | → MERGE into `users_update_self` |
| users_update_own | → MERGE into `users_update_self` |

**`user_profiles` table (2 ALL policies → separate by operation):**
| Current Policy | Disposition |
|----------------|-------------|
| user_profiles_allow_all | → SPLIT into specific policies |
| user_profiles_all_own | → SPLIT into specific policies |

---

## Verification Queries

After applying migrations, run:

```sql
-- 1. Verify all SECURITY DEFINER functions have search_path
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND (proconfig IS NULL OR NOT EXISTS (
  SELECT 1 FROM unnest(proconfig) cfg WHERE cfg LIKE 'search_path=%'
));
-- Should return 0 rows

-- 2. Verify all tables have RLS enabled
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT IN ('schema_migrations', 'supabase_migrations');
-- Should return 0 rows (or only system tables)

-- 3. Verify views have security_invoker
SELECT c.relname, reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('session_artifact_state', 'tenant_memberships');
-- Should show security_invoker=on
```

---

## Next Steps

1. **Run verification queries** in Supabase SQL Editor to confirm current state
2. **Review this report** and confirm findings
3. **Apply Phase 1 migration** (critical security fixes)
4. **Test** - run application tests to ensure nothing breaks
5. **Apply Phase 2 migration** (view security)
6. **Document** which unused indexes to keep for future features

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/db-inventory.sql` | Read-only inventory queries |
| `scripts/security-audit-queries.sql` | Security-focused queries for SQL Editor |
| `scripts/supabase-inspect-report.json` | Raw Supabase CLI output |
| `2026-01-07/*.csv` | Performance metrics from Supabase inspect |

