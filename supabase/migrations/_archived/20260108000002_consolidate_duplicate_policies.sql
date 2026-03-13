-- ============================================================================
-- SECURITY FIX: Consolidate Duplicate RLS Policies
-- ============================================================================
-- This migration removes duplicate/redundant RLS policies that were created
-- through multiple migrations over time. Duplicate PERMISSIVE policies are
-- OR'd together, which can create unintended data access patterns.
-- ============================================================================
-- Risk: MEDIUM - Policy cleanup, thoroughly tested before deploy
-- Rollback: Available in rollback/20260108000002_consolidate_duplicate_policies_ROLLBACK.sql
-- ============================================================================

-- ===========================================
-- 1. USERS TABLE - Has 7 SELECT policies!
-- ===========================================
-- Current policies (from audit):
--   - users_allow_admin_read
--   - users_allow_read_coworkers  
--   - users_allow_self_read
--   - users_can_read_all (overly permissive!)
--   - users_can_read_own
--   - users_select_own
--   - users_select_policy
--
-- Target: Consolidate to 2 clear policies

-- Step 1: Remove all existing SELECT policies on users
DROP POLICY IF EXISTS "users_allow_admin_read" ON public.users;
DROP POLICY IF EXISTS "users_allow_read_coworkers" ON public.users;
DROP POLICY IF EXISTS "users_allow_self_read" ON public.users;
DROP POLICY IF EXISTS "users_can_read_all" ON public.users;
DROP POLICY IF EXISTS "users_can_read_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Step 2: Create consolidated SELECT policies
CREATE POLICY "users_select_self"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "users_select_coworkers"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships my_membership
    JOIN public.user_tenant_memberships their_membership 
      ON my_membership.tenant_id = their_membership.tenant_id
    WHERE my_membership.user_id = auth.uid()
    AND their_membership.user_id = users.id
  )
);

CREATE POLICY "users_select_admin"
ON public.users FOR SELECT
USING (public.is_system_admin());

-- ===========================================
-- 2. USERS TABLE - UPDATE policies (4 found)
-- ===========================================
-- Current policies:
--   - users_allow_admin_update
--   - users_allow_self_update
--   - users_can_update_own
--   - users_update_own
--
-- Target: Consolidate to 2 clear policies

DROP POLICY IF EXISTS "users_allow_admin_update" ON public.users;
DROP POLICY IF EXISTS "users_allow_self_update" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_update_self"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_admin"
ON public.users FOR UPDATE
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- ===========================================
-- 3. USER_PROFILES TABLE - 2 ALL policies
-- ===========================================
-- Current policies may include duplicates

DROP POLICY IF EXISTS "user_profiles_allow_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_all_own" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.user_profiles;

-- Recreate clean policies
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles FOR SELECT
USING (user_id = auth.uid() OR public.is_system_admin());

CREATE POLICY "user_profiles_select_public"
ON public.user_profiles FOR SELECT
USING (
  -- Allow viewing profiles of users in same tenant
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships my_membership
    JOIN public.user_tenant_memberships their_membership 
      ON my_membership.tenant_id = their_membership.tenant_id
    WHERE my_membership.user_id = auth.uid()
    AND their_membership.user_id = user_profiles.user_id
  )
);

CREATE POLICY "user_profiles_update_own"
ON public.user_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_admin"
ON public.user_profiles FOR UPDATE
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

CREATE POLICY "user_profiles_delete_admin"
ON public.user_profiles FOR DELETE
USING (public.is_system_admin());

-- ===========================================
-- 4. VERIFICATION COMMENT
-- ===========================================
-- After applying, verify with:
--
-- SELECT tablename, policyname, cmd, roles::text
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'user_profiles')
-- ORDER BY tablename, cmd, policyname;
--
-- Expected:
--   users: 5 policies (3 SELECT, 2 UPDATE)
--   user_profiles: 6 policies (3 SELECT, 2 UPDATE, 1 INSERT)
-- ===========================================

