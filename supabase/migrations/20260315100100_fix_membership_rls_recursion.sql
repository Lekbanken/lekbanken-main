-- Fix infinite recursion in tenant_memberships_manage policy.
--
-- Root cause: the policy on user_tenant_memberships did
--   SELECT 1 FROM tenant_memberships tm ...
-- where tenant_memberships is a SECURITY INVOKER view that reads from
-- user_tenant_memberships, triggering RLS -> policy -> view -> RLS -> ∞
--
-- Even referencing the table directly doesn't help because the subquery
-- on user_tenant_memberships still triggers the same RLS policy.
--
-- Fix: extract the admin check into a SECURITY DEFINER function that
-- bypasses RLS, breaking the recursion chain.

CREATE OR REPLACE FUNCTION public.is_tenant_admin(check_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = check_tenant_id
      AND role IN ('owner','admin')
  );
$$;

DROP POLICY IF EXISTS tenant_memberships_manage ON public.user_tenant_memberships;
CREATE POLICY tenant_memberships_manage ON public.user_tenant_memberships
FOR ALL USING (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND is_tenant_admin(tenant_id)
  )
) WITH CHECK (
  is_system_admin() OR (
    tenant_id = ANY(get_user_tenant_ids()) AND is_tenant_admin(tenant_id)
  )
);
