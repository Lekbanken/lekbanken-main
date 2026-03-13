-- Fix RLS policies for membership table (dynamically detects which is the actual table)
-- The system has user_tenant_memberships/tenant_memberships where one is TABLE and one is VIEW
-- We need to apply RLS policies to the actual TABLE, not the VIEW

DO $$
DECLARE
  membership_table_name text;
  user_tbl_is_table boolean;
  tenant_tbl_is_table boolean;
BEGIN
  -- Detect which is the actual table
  SELECT relkind = 'r' INTO user_tbl_is_table
  FROM pg_class WHERE relname = 'user_tenant_memberships' AND relnamespace = 'public'::regnamespace;
  
  SELECT relkind = 'r' INTO tenant_tbl_is_table
  FROM pg_class WHERE relname = 'tenant_memberships' AND relnamespace = 'public'::regnamespace;
  
  -- Determine the actual table name
  IF user_tbl_is_table THEN
    membership_table_name := 'user_tenant_memberships';
    RAISE NOTICE 'Detected user_tenant_memberships as the actual table';
  ELSIF tenant_tbl_is_table THEN
    membership_table_name := 'tenant_memberships';
    RAISE NOTICE 'Detected tenant_memberships as the actual table';
  ELSE
    RAISE EXCEPTION 'Neither user_tenant_memberships nor tenant_memberships is a table!';
  END IF;

  -- ============================================
  -- MEMBERSHIP TABLE RLS POLICIES
  -- ============================================
  
  -- Enable RLS if not already enabled
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', membership_table_name);
  
  -- Drop existing policies
  EXECUTE format('DROP POLICY IF EXISTS "users_can_select_own_memberships" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "tenant_admins_can_select_memberships" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "system_admin_can_select_all_memberships" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "system_admin_can_manage_all_memberships" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "membership_select_own" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "membership_select_tenant_admin" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "membership_select_system_admin" ON %I', membership_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "membership_all_system_admin" ON %I', membership_table_name);

  -- Create new policies
  -- Users can see their own memberships
  EXECUTE format('
    CREATE POLICY "membership_select_own"
    ON %I FOR SELECT
    USING (user_id = auth.uid())
  ', membership_table_name);
  
  -- Tenant admins can see all memberships in their tenant
  EXECUTE format('
    CREATE POLICY "membership_select_tenant_admin"
    ON %I FOR SELECT
    USING (
      tenant_id = ANY(get_user_tenant_ids()) AND (
        has_tenant_role(tenant_id, ''admin''::public.tenant_role_enum) OR 
        has_tenant_role(tenant_id, ''owner''::public.tenant_role_enum)
      )
    )
  ', membership_table_name);
  
  -- System admin can see ALL memberships
  EXECUTE format('
    CREATE POLICY "membership_select_system_admin"
    ON %I FOR SELECT
    USING (is_system_admin())
  ', membership_table_name);
  
  -- System admin can manage all memberships (INSERT, UPDATE, DELETE)
  EXECUTE format('
    CREATE POLICY "membership_all_system_admin"
    ON %I FOR ALL
    USING (is_system_admin())
    WITH CHECK (is_system_admin())
  ', membership_table_name);
  
  RAISE NOTICE 'Successfully applied RLS policies to %', membership_table_name;
END $$;

-- ============================================
-- TENANTS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "system_admin_can_select_all_tenants" ON tenants;
CREATE POLICY "system_admin_can_select_all_tenants"
ON tenants FOR SELECT
USING (is_system_admin());

DROP POLICY IF EXISTS "system_admin_can_manage_all_tenants" ON tenants;
CREATE POLICY "system_admin_can_manage_all_tenants"
ON tenants FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

-- ============================================
-- USERS TABLE RLS POLICIES  
-- ============================================

DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON users;
CREATE POLICY "system_admin_can_select_all_users"
ON users FOR SELECT
USING (is_system_admin());

-- ============================================
-- Ensure is_system_admin() function checks JWT properly
-- (Repeat from earlier migration in case it wasn't run)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_system_admin() RETURNS boolean AS $$
BEGIN
  -- Check JWT app_metadata first (current session)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Also check top-level role claim
  IF (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: check users table
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND global_role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_system_admin() IS 'Returns true if current user is system admin via JWT claim OR users.global_role';
