-- Finalize SELECT RLS for profile-facing tenant and membership reads.
--
-- Root cause:
-- - profile organizations/preferences failures were caused by repeated policy churn
--   on public.user_tenant_memberships/public.tenants.
-- - multiple legacy SELECT policies could coexist depending on which historical
--   migrations had run against which physical membership table name.
-- - that recreated the same expensive OR-planning path that previously caused
--   10s+ timeouts on organizations/preferences.
--
-- This migration is intentionally idempotent and aggressively drops all known
-- legacy SELECT-policy variants before recreating the final split policies.

BEGIN;

DO $$
DECLARE
  base_table text;
  select_policy text;
BEGIN
  base_table := CASE
    WHEN to_regclass('public.user_tenant_memberships') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = to_regclass('public.user_tenant_memberships')
          AND relkind IN ('r', 'p')
      )
      THEN 'public.user_tenant_memberships'
    WHEN to_regclass('public.tenant_memberships') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = to_regclass('public.tenant_memberships')
          AND relkind IN ('r', 'p')
      )
      THEN 'public.tenant_memberships'
    ELSE NULL
  END;

  IF base_table IS NULL THEN
    RAISE EXCEPTION 'No physical membership table found';
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', base_table);

  FOREACH select_policy IN ARRAY ARRAY[
    'users_can_select_own_memberships',
    'tenant_admins_can_select_memberships',
    'tenant_memberships_select',
    'memberships_select',
    'membership_select_own',
    'membership_select_tenant_admin',
    'membership_select_system_admin',
    'user_tenant_memberships_select',
    'utm_select_own',
    'utm_select_team'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', select_policy, base_table);
  END LOOP;

  EXECUTE format(
    'CREATE POLICY utm_select_own ON %s FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))',
    base_table
  );

  EXECUTE format(
    'CREATE POLICY utm_select_team ON %s FOR SELECT TO authenticated USING (public.is_system_admin() OR tenant_id = ANY(public.get_user_tenant_ids()))',
    base_table
  );
END $$;

DROP POLICY IF EXISTS tenant_members_can_select ON public.tenants;
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_select_member ON public.tenants;
DROP POLICY IF EXISTS tenants_select_sysadmin ON public.tenants;
DROP POLICY IF EXISTS system_admin_can_select_all_tenants ON public.tenants;

CREATE POLICY tenants_select_member
  ON public.tenants
  FOR SELECT TO authenticated
  USING (id = ANY(public.get_user_tenant_ids()));

CREATE POLICY tenants_select_sysadmin
  ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

COMMIT;

CREATE INDEX IF NOT EXISTS idx_utm_user_status
  ON public.user_tenant_memberships(user_id, status);