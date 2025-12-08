-- Allow authenticated users to create tenants and align owner helper with enum

-- 1) Loosen tenant insert policy so non-admin authenticated users can create tenants
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_admins_can_insert ON public.tenants;
END $$;

CREATE POLICY tenant_insert_authenticated
  ON public.tenants FOR INSERT
  WITH CHECK (
    is_global_admin() OR auth.role() IN ('authenticated', 'service_role')
  );

-- 2) Recreate add_initial_tenant_owner using tenant_role_enum (idempotent drop)
DROP FUNCTION IF EXISTS public.add_initial_tenant_owner(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.add_initial_tenant_owner(uuid, public.tenant_role_enum) CASCADE;

CREATE FUNCTION public.add_initial_tenant_owner(
  target_tenant UUID,
  desired_role public.tenant_role_enum DEFAULT 'owner'
)
RETURNS user_tenant_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_tenant_memberships;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent re-use: only works on fresh tenants with no members
  IF EXISTS (SELECT 1 FROM user_tenant_memberships WHERE tenant_id = target_tenant) THEN
    RAISE EXCEPTION 'Tenant already has members';
  END IF;

  -- Validate role
  IF desired_role NOT IN ('owner', 'admin', 'editor', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', desired_role;
  END IF;

  INSERT INTO user_tenant_memberships (user_id, tenant_id, role, is_primary)
  VALUES (auth.uid(), target_tenant, desired_role, TRUE)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_initial_tenant_owner(UUID, public.tenant_role_enum) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_initial_tenant_owner(UUID, public.tenant_role_enum) FROM public;
