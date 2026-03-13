-- Fix tenant membership helper functions that referenced a non-existent deleted_at column
-- This caused queries (including games browse) to fail for authenticated users with
-- Postgres error 42703 "column \"deleted_at\" does not exist".

-- Recreate the helper functions without the deleted_at filter
-- Drop any existing overloads to avoid "function name ... is not unique"

DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_ids() CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, user_role_enum) CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text[]) CASCADE;

CREATE FUNCTION public.is_tenant_member(tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = $1
  );
END;
$$;

CREATE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ARRAY(
    SELECT tenant_id
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE FUNCTION public.has_tenant_role(tenant_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = $1
      AND role = required_role::user_role_enum
  );
END;
$$;

-- Grant/revoke on the specific signature to avoid ambiguity with other overloads
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text) FROM public;
