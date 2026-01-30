-- Fix: Make is_system_admin() more robust
-- Problem: The function checks JWT claims that may not be set, and the fallback
-- to users table may fail due to recursion in RLS policies.

-- Create a non-RLS version for internal use
CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean := false;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check 1: JWT app_metadata.role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 2: JWT app_metadata.global_role
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 3: JWT user_metadata.global_role
  IF COALESCE(auth.jwt() -> 'user_metadata' ->> 'global_role', '') = 'system_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check 4: JWT root role claim
  IF COALESCE(auth.jwt() ->> 'role', '') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check 5: Direct lookup in users table (bypassing RLS with SECURITY DEFINER)
  -- This is safe because we're only checking admin status, not exposing data
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid 
    AND (
      global_role = 'system_admin' 
      OR role IN ('system_admin', 'superadmin', 'admin')
    )
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;

COMMENT ON FUNCTION public.is_system_admin() IS 
'Check if current user is a system admin. Uses SECURITY DEFINER to bypass RLS for the users table lookup.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;
