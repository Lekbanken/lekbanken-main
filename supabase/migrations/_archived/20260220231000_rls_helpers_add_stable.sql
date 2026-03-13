-- =============================================================================
-- Migration: 20260220231000_rls_helpers_add_stable.sql
-- Description: Add STABLE volatility to RLS helper functions + fix search_path
-- =============================================================================
-- CONTEXT: 4 of 5 RLS helper functions (is_tenant_member, get_user_tenant_ids,
-- has_tenant_role x2) defaulted to VOLATILE, causing PostgreSQL to re-execute
-- them for every row during RLS policy evaluation. Adding STABLE allows the
-- planner to cache results within a single statement.
--
-- Also fixes inconsistent search_path on is_global_admin (was 'public',
-- should be 'pg_catalog, public' like the rest) and get_tenant_id_by_hostname.
--
-- Note: SECURITY DEFINER is intentional on all of these — they query tables
-- with RLS policies that reference these same functions, so INVOKER would
-- cause infinite recursion.
-- =============================================================================

BEGIN;

-- ─── is_tenant_member(uuid): add STABLE ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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

-- ─── get_user_tenant_ids(): add STABLE ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN public.is_system_admin() THEN ARRAY(SELECT id FROM public.tenants)
    ELSE COALESCE(
      (SELECT array_agg(tenant_id) FROM public.user_tenant_memberships WHERE user_id = auth.uid() AND status = 'active'),
      ARRAY[]::uuid[]
    )
  END;
$$;

-- ─── has_tenant_role(uuid, enum[]): add STABLE ──────────────────────────────
CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_roles public.tenant_role_enum[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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

-- ─── has_tenant_role(uuid, enum): add STABLE ────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, required_role public.tenant_role_enum)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN public.has_tenant_role(p_tenant_id, ARRAY[required_role]);
END;
$$;

-- ─── is_global_admin(): fix search_path (pg_catalog, public) ────────────────
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.is_system_admin();
$$;

-- ─── get_tenant_id_by_hostname(text): fix search_path ───────────────────────
CREATE OR REPLACE FUNCTION public.get_tenant_id_by_hostname(p_hostname text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT tenant_id
  FROM public.tenant_domains
  WHERE hostname = lower(trim(p_hostname))
    AND status = 'active'
  LIMIT 1;
$$;

COMMIT;
