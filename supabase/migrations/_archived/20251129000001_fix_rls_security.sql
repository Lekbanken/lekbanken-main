-- Fix security warnings for RLS functions
-- Add SECURITY DEFINER and locked search_path to prevent privilege escalation

-- Drop existing functions
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_ids() CASCADE;
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text) CASCADE;

-- Recreate is_tenant_member with SECURITY DEFINER
CREATE FUNCTION public.is_tenant_member(tenant_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = $1
    AND deleted_at IS NULL
  );
END;
$$;

-- Recreate get_user_tenant_ids with SECURITY DEFINER
CREATE FUNCTION public.get_user_tenant_ids()
  RETURNS uuid[]
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN ARRAY(
    SELECT tenant_id FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  );
END;
$$;

-- Recreate has_tenant_role with SECURITY DEFINER
CREATE FUNCTION public.has_tenant_role(tenant_id uuid, required_role text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = $1
    AND role = required_role::user_role_enum
    AND deleted_at IS NULL
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_tenant_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role TO authenticated;

-- Prevent public access
REVOKE EXECUTE ON FUNCTION public.is_tenant_member FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role FROM public;

