-- ============================================================================
-- SECURITY FIX: search_path on SECURITY DEFINER functions
-- ============================================================================
-- This migration fixes a critical security vulnerability where is_system_admin()
-- was defined as SECURITY DEFINER without setting search_path, allowing potential
-- privilege escalation attacks.
-- ============================================================================
-- Risk: HIGH - Direct privilege escalation vector
-- Rollback: Safe - function signature unchanged, only adds search_path
-- ============================================================================

-- ===========================================
-- 1. FIX is_system_admin() - Add search_path
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
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
-- 2. ENABLE RLS on game_steps if disabled
-- ===========================================

DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'game_steps';
  
  IF NOT COALESCE(rls_enabled, false) THEN
    ALTER TABLE public.game_steps ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'SECURITY: Enabled RLS on game_steps';
    
    -- Create default policy for tenant isolation
    DROP POLICY IF EXISTS "game_steps_select_member" ON public.game_steps;
    CREATE POLICY "game_steps_select_member"
    ON public.game_steps FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_steps.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
      )
      OR public.is_system_admin()
    );
    
    DROP POLICY IF EXISTS "game_steps_modify_leader" ON public.game_steps;
    CREATE POLICY "game_steps_modify_leader"
    ON public.game_steps FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_steps.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
        AND (
          public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
      OR public.is_system_admin()
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_steps.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
        AND (
          public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
      OR public.is_system_admin()
    );
  END IF;
END $$;

-- ===========================================
-- 3. ENABLE RLS on game_materials if disabled
-- ===========================================

DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'game_materials';
  
  IF NOT COALESCE(rls_enabled, false) THEN
    ALTER TABLE public.game_materials ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'SECURITY: Enabled RLS on game_materials';
    
    -- Create default policy for tenant isolation
    DROP POLICY IF EXISTS "game_materials_select_member" ON public.game_materials;
    CREATE POLICY "game_materials_select_member"
    ON public.game_materials FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_materials.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
      )
      OR public.is_system_admin()
    );
    
    DROP POLICY IF EXISTS "game_materials_modify_leader" ON public.game_materials;
    CREATE POLICY "game_materials_modify_leader"
    ON public.game_materials FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_materials.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
        AND (
          public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
      OR public.is_system_admin()
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_materials.game_id
        AND g.owner_tenant_id = ANY(public.get_user_tenant_ids())
        AND (
          public.has_tenant_role(g.owner_tenant_id, 'editor'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
          OR public.has_tenant_role(g.owner_tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
      OR public.is_system_admin()
    );
  END IF;
END $$;

-- ===========================================
-- 4. GRANT/REVOKE to ensure proper access
-- ===========================================

-- Ensure authenticated has access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_materials TO authenticated;

-- Revoke from public (anonymous should not have direct access)
REVOKE ALL ON public.game_steps FROM public;
REVOKE ALL ON public.game_materials FROM public;

-- ===========================================
-- 5. VERIFICATION COMMENT
-- ===========================================
-- After applying this migration, run the following to verify:
--
-- SELECT proname, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.prosecdef = true
-- AND p.proname = 'is_system_admin';
-- -- Should show: {search_path=public}
--
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('game_steps', 'game_materials');
-- -- Should show: rowsecurity = true for both
-- ===========================================
