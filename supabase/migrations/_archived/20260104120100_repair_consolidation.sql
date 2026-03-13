-- ============================================================================
-- REPAIR MIGRATION: Fix dropped objects from partial consolidation attempt
-- ============================================================================
-- The previous consolidation attempt may have partially executed.
-- This migration diagnoses and repairs the tenant membership structure.
-- ============================================================================

-- Diagnostic block - figure out what we have
DO $$
DECLARE
  user_tbl_exists boolean;
  tenant_tbl_exists boolean;
  user_tbl_is_table boolean;
  tenant_tbl_is_table boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_tenant_memberships' AND relnamespace = 'public'::regnamespace) INTO user_tbl_exists;
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenant_memberships' AND relnamespace = 'public'::regnamespace) INTO tenant_tbl_exists;
  
  SELECT COALESCE((SELECT relkind = 'r' FROM pg_class WHERE relname = 'user_tenant_memberships' AND relnamespace = 'public'::regnamespace), FALSE) INTO user_tbl_is_table;
  SELECT COALESCE((SELECT relkind = 'r' FROM pg_class WHERE relname = 'tenant_memberships' AND relnamespace = 'public'::regnamespace), FALSE) INTO tenant_tbl_is_table;
  
  RAISE NOTICE 'DIAGNOSTIC: user_tenant_memberships exists=%, is_table=%; tenant_memberships exists=%, is_table=%',
    user_tbl_exists, user_tbl_is_table, tenant_tbl_exists, tenant_tbl_is_table;
    
  -- CASE 1: user_tenant_memberships is already a table (expected state after partial migration)
  IF user_tbl_is_table THEN
    RAISE NOTICE 'GOOD: user_tenant_memberships is a table';
    
    -- Create tenant_memberships view if missing
    IF NOT tenant_tbl_exists THEN
      RAISE NOTICE 'Creating tenant_memberships view...';
      EXECUTE 'CREATE VIEW public.tenant_memberships AS SELECT * FROM public.user_tenant_memberships';
    ELSIF NOT tenant_tbl_is_table THEN
      RAISE NOTICE 'tenant_memberships is already a view - good!';
    ELSE
      RAISE NOTICE 'WARNING: Both are tables - this needs manual intervention';
    END IF;
    
  -- CASE 2: tenant_memberships is the table (original state, or rename succeeded)
  ELSIF tenant_tbl_is_table THEN
    RAISE NOTICE 'tenant_memberships is the table - renaming to user_tenant_memberships...';
    
    -- Drop any existing user_tenant_memberships view
    IF user_tbl_exists THEN
      EXECUTE 'DROP VIEW IF EXISTS public.user_tenant_memberships CASCADE';
    END IF;
    
    -- Rename the table
    EXECUTE 'ALTER TABLE public.tenant_memberships RENAME TO user_tenant_memberships';
    
    -- Create the view
    EXECUTE 'CREATE VIEW public.tenant_memberships AS SELECT * FROM public.user_tenant_memberships';
    
    RAISE NOTICE 'Successfully renamed tenant_memberships -> user_tenant_memberships and created view';
    
  -- CASE 3: Neither exists or are tables - something is very wrong
  ELSE
    RAISE EXCEPTION 'CRITICAL: Neither user_tenant_memberships nor tenant_memberships is a table! Manual recovery needed.';
  END IF;
END $$;

-- ============================================================================
-- RECREATE HELPER FUNCTIONS
-- ============================================================================

-- is_system_admin() - checks JWT and users table
CREATE OR REPLACE FUNCTION public.is_system_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
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

-- Drop is_tenant_member to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;

-- Recreate is_tenant_member
CREATE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_system_admin() 
    OR EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
    );
$$;

-- Recreate get_user_tenant_ids
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_system_admin() THEN ARRAY(SELECT id FROM public.tenants)
    ELSE COALESCE(
      (SELECT array_agg(tenant_id) FROM public.user_tenant_memberships WHERE user_id = auth.uid() AND status = 'active'),
      ARRAY[]::uuid[]
    )
  END;
$$;

-- Drop has_tenant_role to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, public.tenant_role_enum[]) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, public.tenant_role_enum) CASCADE;

-- Recreate has_tenant_role (array version)
CREATE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_roles public.tenant_role_enum[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_system_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = ANY(required_roles)
      AND status = 'active'
  );
END;
$$;

-- Recreate has_tenant_role (single role version)
CREATE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_role public.tenant_role_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_tenant_role(p_tenant_id, ARRAY[required_role]);
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_system_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) FROM public;

-- ============================================================================
-- RLS POLICIES ON CANONICAL TABLE
-- ============================================================================

ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_select_own" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_system_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_all_system_admin" ON public.user_tenant_memberships;

CREATE POLICY "membership_select_own"
ON public.user_tenant_memberships FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "membership_select_tenant_admin"
ON public.user_tenant_memberships FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids()) 
  AND (
    has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) 
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  )
);

CREATE POLICY "membership_select_system_admin"
ON public.user_tenant_memberships FOR SELECT
USING (is_system_admin());

CREATE POLICY "membership_all_system_admin"
ON public.user_tenant_memberships FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

-- ============================================================================
-- RLS ON TENANTS AND USERS
-- ============================================================================

DROP POLICY IF EXISTS "system_admin_can_select_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "system_admin_can_manage_all_tenants" ON public.tenants;

CREATE POLICY "system_admin_can_select_all_tenants"
ON public.tenants FOR SELECT
USING (is_system_admin());

CREATE POLICY "system_admin_can_manage_all_tenants"
ON public.tenants FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON public.users;

CREATE POLICY "system_admin_can_select_all_users"
ON public.users FOR SELECT
USING (is_system_admin());

-- ============================================================================
-- DML RULES ON VIEW
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenant_memberships' AND relkind = 'v') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'public.tenant_memberships'::regclass AND rulename = 'tenant_memberships_insert_rule') THEN
      CREATE RULE tenant_memberships_insert_rule AS
      ON INSERT TO public.tenant_memberships DO INSTEAD
        INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary, status, seat_assignment_id, created_at, updated_at)
        VALUES (NEW.user_id, NEW.tenant_id, NEW.role, NEW.is_primary, NEW.status, NEW.seat_assignment_id, COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now()))
        RETURNING *;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'public.tenant_memberships'::regclass AND rulename = 'tenant_memberships_update_rule') THEN
      CREATE RULE tenant_memberships_update_rule AS
      ON UPDATE TO public.tenant_memberships DO INSTEAD
        UPDATE public.user_tenant_memberships
        SET role = NEW.role, is_primary = NEW.is_primary, status = NEW.status, seat_assignment_id = NEW.seat_assignment_id, updated_at = now()
        WHERE id = OLD.id
        RETURNING *;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'public.tenant_memberships'::regclass AND rulename = 'tenant_memberships_delete_rule') THEN
      CREATE RULE tenant_memberships_delete_rule AS
      ON DELETE TO public.tenant_memberships DO INSTEAD
        DELETE FROM public.user_tenant_memberships WHERE id = OLD.id
        RETURNING *;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.user_tenant_memberships IS 'CANONICAL table for user-tenant membership. tenant_memberships is a VIEW pointing to this table.';
