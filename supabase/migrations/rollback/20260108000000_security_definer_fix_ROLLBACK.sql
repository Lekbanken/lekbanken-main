-- ============================================================================
-- ROLLBACK: Security Definer Fix
-- ============================================================================
-- Run this to undo 20260108000000_security_definer_fix.sql
-- ============================================================================

-- NOTE: This removes the search_path protection from is_system_admin
-- Only use if the migration causes issues - the original state is LESS secure

-- Rollback is_system_admin (remove search_path - NOT RECOMMENDED)
CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
-- NO search_path = original vulnerable state
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

-- NOTE: We do NOT disable RLS on game_steps/game_materials in rollback
-- because that would make them LESS secure. If the new policies cause issues,
-- drop them individually:
--
-- DROP POLICY IF EXISTS "game_steps_select_member" ON public.game_steps;
-- DROP POLICY IF EXISTS "game_steps_modify_leader" ON public.game_steps;
-- DROP POLICY IF EXISTS "game_materials_select_member" ON public.game_materials;
-- DROP POLICY IF EXISTS "game_materials_modify_leader" ON public.game_materials;
