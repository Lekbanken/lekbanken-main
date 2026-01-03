-- Fix is_system_admin() to check BOTH:
-- 1. users.global_role = 'system_admin' (legacy/persistent)
-- 2. JWT app_metadata.role = 'system_admin' (auth session)
--
-- This fixes the mismatch where TypeScript isSystemAdmin() checks JWT
-- but RLS policies use SQL is_system_admin() which only checked users table.

CREATE OR REPLACE FUNCTION public.is_system_admin() RETURNS boolean AS $$
BEGIN
  -- Check JWT app_metadata first (current session)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Also check top-level role claim (some auth flows use this)
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: check users table for persisted global_role
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND global_role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_system_admin() IS 'Returns true if current user is system admin via JWT claim OR users.global_role';
