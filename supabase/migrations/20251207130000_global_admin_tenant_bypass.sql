-- Allow admin/superadmin to bypass tenant membership requirements
-- Adds helper function is_global_admin and updates tenant helper functions
-- so platform admins can read/manage data without being tied to a tenant.

-- Clean up old helper functions
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_ids() CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text[]) CASCADE;

-- Global admin helper
CREATE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_global_admin() FROM public;

-- Tenant membership check with admin bypass
CREATE FUNCTION public.is_tenant_member(tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_global_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = $1
  );
END;
$$;

-- Tenant ids for current user (admins get all tenants)
CREATE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_global_admin() THEN
    RETURN ARRAY(SELECT id FROM tenants);
  END IF;

  RETURN ARRAY(
    SELECT tenant_id
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Role check with admin bypass (array version)
CREATE FUNCTION public.has_tenant_role(tenant_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_global_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = $1
      AND role = ANY(required_roles)
  );
END;
$$;

-- Single-role overload
CREATE FUNCTION public.has_tenant_role(tenant_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_tenant_role(tenant_id, ARRAY[required_role]);
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.is_tenant_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) FROM public;
