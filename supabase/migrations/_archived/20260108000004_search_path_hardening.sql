-- ============================================================================
-- SECURITY HARDENING: Stricter search_path on SECURITY DEFINER functions
-- ============================================================================
-- Based on DBA review feedback:
-- - pg_catalog should be included to ensure built-in functions resolve correctly
-- - This is a defense-in-depth improvement over just 'public'
-- ============================================================================
-- Risk: NONE - No functional change, only hardening
-- ============================================================================

-- ===========================================
-- 1. Update is_system_admin() with stricter search_path
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Check JWT app_metadata for admin roles
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check JWT root role claim
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check users table global_role
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND global_role = 'system_admin'
  );
END;
$$;

-- ===========================================
-- 2. Update other SECURITY DEFINER functions
-- ===========================================
-- Check for any other SECURITY DEFINER functions that need hardening

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Log all SECURITY DEFINER functions with their current search_path status
  FOR func_record IN
    SELECT p.proname, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
  LOOP
    RAISE NOTICE 'SECURITY DEFINER function: % - config: %', func_record.proname, func_record.proconfig;
  END LOOP;
END $$;

-- ===========================================
-- 3. VERIFICATION
-- ===========================================
-- After applying, verify with:
--
-- SELECT proname, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.prosecdef = true
-- AND p.proname = 'is_system_admin';
--
-- Expected: proconfig = {search_path=pg_catalog, public}
-- ===========================================
