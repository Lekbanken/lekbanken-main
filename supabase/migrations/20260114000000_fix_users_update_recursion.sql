/**
 * Fix infinite recursion in users UPDATE policy
 * 
 * Problem: users_update_admin uses is_system_admin() which does a SELECT on users table
 * This causes infinite recursion when updating users table.
 * 
 * Solution: Create a JWT-only version of is_system_admin for use in users table policies
 */

-- Create a JWT-only admin check function that doesn't query users table
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

COMMENT ON FUNCTION public.is_system_admin_jwt_only() IS 
'JWT-only admin check for use in users table RLS policies. Does not query users table to avoid infinite recursion.';

-- Recreate users_update_admin policy with JWT-only check
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
ON public.users FOR UPDATE
USING (public.is_system_admin_jwt_only())
WITH CHECK (public.is_system_admin_jwt_only());

COMMENT ON POLICY "users_update_admin" ON public.users IS 
'Allows system admins to update any user profile. Uses JWT-only check to avoid infinite recursion.';

