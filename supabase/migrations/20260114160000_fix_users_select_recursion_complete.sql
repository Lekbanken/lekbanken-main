/**
 * CRITICAL FIX: Complete fix for users table RLS infinite recursion
 * 
 * Problem: The policy "users_select" from migration 20260108000021 uses 
 * is_system_admin() which queries the users table, causing infinite recursion.
 * 
 * This migration drops ALL problematic policies and recreates them using 
 * is_system_admin_jwt_only() which only checks JWT claims.
 */

-- ============================================
-- Step 1: Drop the problematic users_select policy
-- ============================================
DROP POLICY IF EXISTS "users_select" ON public.users;

-- Also drop any other policies that might use is_system_admin()
DROP POLICY IF EXISTS "users_select_coworkers" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;

-- ============================================
-- Step 2: Ensure is_system_admin_jwt_only() exists (idempotent)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_system_admin_jwt_only() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Check JWT app_metadata for admin roles (ONLY JWT, no DB lookup)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check JWT root role claim
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check global_role in user_metadata (also in JWT, no DB lookup)
  IF (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Do NOT check users table - that would cause infinite recursion
  RETURN FALSE;
END;
$$;

-- ============================================
-- Step 3: Create safe SELECT policies for users table
-- ============================================

-- Policy 1: Users can see their own record
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
ON public.users FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- Policy 2: System admins can see all users (JWT-only check)
DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON public.users;
CREATE POLICY "system_admin_can_select_all_users"
ON public.users FOR SELECT
TO authenticated
USING (public.is_system_admin_jwt_only());

-- Policy 3: Users can see coworkers in same tenant (no is_system_admin call)
DROP POLICY IF EXISTS "users_select_coworkers_safe" ON public.users;
CREATE POLICY "users_select_coworkers_safe"
ON public.users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = users.id
    AND utm.tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- ============================================
-- Step 4: Ensure UPDATE policies are safe
-- ============================================

-- Users can update their own record
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
ON public.users FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Admins can update any user (JWT-only check)
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
ON public.users FOR UPDATE
TO authenticated
USING (public.is_system_admin_jwt_only())
WITH CHECK (public.is_system_admin_jwt_only());

-- ============================================
-- Step 5: Ensure INSERT policies are safe
-- ============================================

-- Users can insert their own record (for signup)
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- Admins can insert users (JWT-only check)
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (public.is_system_admin_jwt_only());

-- ============================================
-- Step 6: Ensure DELETE policies are safe
-- ============================================

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin"
ON public.users FOR DELETE
TO authenticated
USING (public.is_system_admin_jwt_only());

-- ============================================
-- Step 7: Also fix user_profiles policies that might call is_system_admin()
-- ============================================

DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_system_admin_jwt_only()
  -- Public profiles visible to authenticated users
  OR true
);

DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_system_admin_jwt_only())
WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_system_admin_jwt_only());

-- ============================================
-- Summary of final policies on users table:
-- ============================================
-- SELECT: 
--   users_select_self (own record)
--   system_admin_can_select_all_users (JWT-only admin)
--   users_select_coworkers_safe (tenant coworkers)
-- INSERT: 
--   users_insert_self (own record)
--   users_insert_admin (JWT-only admin)
-- UPDATE: 
--   users_update_self (own record)
--   users_update_admin (JWT-only admin)
-- DELETE: 
--   users_delete_admin (JWT-only admin only)

COMMENT ON FUNCTION public.is_system_admin_jwt_only() IS 
'Checks if current user is a system admin using ONLY JWT claims. Never queries users table to avoid infinite RLS recursion.';
