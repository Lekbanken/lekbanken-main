-- Auth/RLS hardening for tenant bootstrap
-- Allows the authenticated creator to attach themselves as the first tenant member without exposing the service role.

CREATE OR REPLACE FUNCTION add_initial_tenant_owner(
  target_tenant UUID,
  desired_role TEXT DEFAULT 'owner'
)
RETURNS user_tenant_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_tenant_memberships;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_tenant_memberships WHERE tenant_id = target_tenant) THEN
    RAISE EXCEPTION 'Tenant already initialised';
  END IF;

  -- Validate role
  IF desired_role NOT IN ('owner', 'admin', 'teacher', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', desired_role;
  END IF;

  INSERT INTO user_tenant_memberships (user_id, tenant_id, role, is_primary)
  VALUES (auth.uid(), target_tenant, COALESCE(desired_role, 'owner'), TRUE)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION add_initial_tenant_owner(UUID, TEXT) TO authenticated;
