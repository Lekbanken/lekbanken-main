-- Optimize SELECT RLS on user_tenant_memberships and tenants.
--
-- Problem: The single SELECT policy uses OR with expensive function calls
-- (is_system_admin(), get_user_tenant_ids()) that Postgres may evaluate
-- for every row — even when the cheap user_id = auth.uid() check is true.
-- Combined with join-triggered tenants RLS, this causes cascading
-- function evaluations and 10s+ timeouts on the organizations page.
--
-- Fix: Split into separate policies. Postgres OR's multiple PERMISSIVE
-- policies, allowing the planner to short-circuit on the cheap path.

BEGIN;

-- =============================================================================
-- 1) user_tenant_memberships: split SELECT into own + team/admin
-- =============================================================================

DROP POLICY IF EXISTS "user_tenant_memberships_select" ON public.user_tenant_memberships;

-- Fast path: own rows (index scan on user_id, zero function calls)
CREATE POLICY "utm_select_own"
  ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Team visibility + system admin (separate policy, OR'd by Postgres)
CREATE POLICY "utm_select_team"
  ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR tenant_id = ANY(public.get_user_tenant_ids())
  );

-- =============================================================================
-- 2) tenants: split SELECT into member + sysadmin
-- =============================================================================

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;

-- Member path: user belongs to tenant (single function call)
CREATE POLICY "tenants_select_member"
  ON public.tenants
  FOR SELECT TO authenticated
  USING (id = ANY(public.get_user_tenant_ids()));

-- System admin path (separate policy)
CREATE POLICY "tenants_select_sysadmin"
  ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

-- NOTE: The existing RESTRICTIVE policy "hide_anonymized_tenants" remains
-- unchanged — it correctly filters out anonymized tenants for non-admins.

COMMIT;

-- =============================================================================
-- 3) Composite index for the common filter pattern (user_id + status)
-- =============================================================================
-- CONCURRENTLY cannot run inside a transaction, so this is outside the block.

CREATE INDEX IF NOT EXISTS idx_utm_user_status
  ON public.user_tenant_memberships(user_id, status);
