-- ============================================================================
-- ROLLBACK: Consolidate Duplicate RLS Policies
-- ============================================================================
-- This rollback restores the original (duplicated) policies.
-- Run this if the consolidated policies cause access issues.
-- ============================================================================

-- ===========================================
-- 1. Drop consolidated policies
-- ===========================================

DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_select_coworkers" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_public" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin" ON public.user_profiles;

-- ===========================================
-- 2. Restore original users policies
-- ===========================================
-- NOTE: These are the policies as they existed before consolidation.
-- Some may have been from different migrations.

-- Self-read policies (multiple versions)
CREATE POLICY "users_select_own"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "users_can_read_own"
ON public.users FOR SELECT  
USING (id = auth.uid());

CREATE POLICY "users_allow_self_read"
ON public.users FOR SELECT
USING (id = auth.uid());

-- Admin read
CREATE POLICY "users_allow_admin_read"
ON public.users FOR SELECT
USING (public.is_system_admin());

-- Coworkers read
CREATE POLICY "users_allow_read_coworkers"
ON public.users FOR SELECT
USING (
  id = ANY(
    SELECT utm.user_id 
    FROM public.user_tenant_memberships utm
    WHERE utm.tenant_id = ANY(public.get_user_tenant_ids())
  )
);

-- Self-update policies
CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_allow_self_update"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin update
CREATE POLICY "users_allow_admin_update"
ON public.users FOR UPDATE
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- ===========================================
-- 3. Restore original user_profiles policies
-- ===========================================

CREATE POLICY "user_profiles_allow_all"
ON public.user_profiles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

