/**
 * Fix ALL infinite recursion in users table RLS policies
 * 
 * Problem: Multiple policies use is_system_admin() which does a SELECT on users table.
 * This causes infinite recursion when any operation touches the users table.
 * 
 * Solution: Replace all users table policies that use is_system_admin() with 
 * is_system_admin_jwt_only() which only checks JWT claims.
 */

-- Ensure the JWT-only function exists (idempotent)
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
  
  -- Do NOT check users table - that would cause infinite recursion
  RETURN FALSE;
END;
$$;

-- ============================================
-- Fix SELECT policies on users table
-- ============================================

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON public.users;

-- Recreate with JWT-only check
CREATE POLICY "system_admin_can_select_all_users"
ON public.users FOR SELECT
USING (public.is_system_admin_jwt_only());

-- ============================================
-- Fix UPDATE policies on users table  
-- ============================================

-- Drop and recreate update admin policy
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
ON public.users FOR UPDATE
USING (public.is_system_admin_jwt_only())
WITH CHECK (public.is_system_admin_jwt_only());

-- Ensure users can update their own record (this one is safe, no recursion)
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- Fix INSERT policies on users table
-- ============================================

-- Drop any admin insert policies that might exist
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "system_admin_can_insert_users" ON public.users;

-- Admin can insert users (using JWT-only check)
CREATE POLICY "users_insert_admin"
ON public.users FOR INSERT
WITH CHECK (public.is_system_admin_jwt_only());

-- Users can insert their own record (for signup flow)
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self"
ON public.users FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- Fix DELETE policies on users table
-- ============================================

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "system_admin_can_delete_users" ON public.users;

-- Only admins can delete users (using JWT-only check)
CREATE POLICY "users_delete_admin"
ON public.users FOR DELETE
USING (public.is_system_admin_jwt_only());

-- ============================================
-- Also fix users_select policies that might use is_system_admin()
-- ============================================

-- Users can always see their own record
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
ON public.users FOR SELECT
USING (id = auth.uid());

-- ============================================
-- Summary of final policies on users table:
-- ============================================
-- SELECT: users_select_self (own record), system_admin_can_select_all_users (JWT-only admin)
-- INSERT: users_insert_self (own record), users_insert_admin (JWT-only admin)
-- UPDATE: users_update_self (own record), users_update_admin (JWT-only admin)
-- DELETE: users_delete_admin (JWT-only admin only)

COMMENT ON POLICY "system_admin_can_select_all_users" ON public.users IS 
'Allows system admins to view all users. Uses JWT-only check to avoid infinite recursion.';

COMMENT ON POLICY "users_update_admin" ON public.users IS 
'Allows system admins to update any user profile. Uses JWT-only check to avoid infinite recursion.';

COMMENT ON POLICY "users_delete_admin" ON public.users IS 
'Allows system admins to delete users. Uses JWT-only check to avoid infinite recursion.';

COMMENT ON POLICY "users_insert_admin" ON public.users IS 
'Allows system admins to insert users. Uses JWT-only check to avoid infinite recursion.';
