-- Fix has_tenant_role to support array of roles
-- Also fixes cast issues where role is stored as text, not enum

-- Drop existing functions that have the wrong signature or cast
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text[]) CASCADE;

-- Recreate has_tenant_role with TEXT ARRAY support (used by proxy.ts)
CREATE FUNCTION public.has_tenant_role(tenant_uuid uuid, required_roles text[])
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_uuid
      AND role = ANY(required_roles)
  );
END;
$$;

-- Also provide single-role overload for backwards compatibility with RLS policies
CREATE FUNCTION public.has_tenant_role(tenant_uuid uuid, required_role text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN public.has_tenant_role(tenant_uuid, ARRAY[required_role]);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) TO authenticated;

-- Prevent public access
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) FROM public;

-- Fix add_initial_tenant_owner to use text instead of tenant_role enum
DROP FUNCTION IF EXISTS public.add_initial_tenant_owner(uuid, tenant_role) CASCADE;
DROP FUNCTION IF EXISTS public.add_initial_tenant_owner(uuid, text) CASCADE;

CREATE FUNCTION public.add_initial_tenant_owner(
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
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent re-use: only works on fresh tenants with no members
  IF EXISTS (SELECT 1 FROM user_tenant_memberships WHERE tenant_id = target_tenant) THEN
    RAISE EXCEPTION 'Tenant already has members';
  END IF;

  -- Validate role
  IF desired_role NOT IN ('owner', 'admin', 'teacher', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', desired_role;
  END IF;

  INSERT INTO user_tenant_memberships (user_id, tenant_id, role, is_primary)
  VALUES (auth.uid(), target_tenant, desired_role, TRUE)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_initial_tenant_owner(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_initial_tenant_owner(UUID, TEXT) FROM public;
