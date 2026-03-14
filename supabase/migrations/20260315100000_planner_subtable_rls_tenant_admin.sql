-- L2-PLAN-001 remediation: Align plan sub-table RLS with capability system
--
-- Product decision (2026-03-15):
--   Tenant admins (role = 'admin' or 'owner') SHALL be able to edit blocks
--   and publish tenant-visible plans they belong to.
--   This matches the existing capability system (derivePlanCapabilities) and
--   the plans_update RLS policy which already allows tenant admins.
--
-- Affected policies (all add tenant-admin write access matching plans_update):
--   1. plan_blocks_insert
--   2. plan_blocks_update
--   3. plan_blocks_delete
--   4. plan_versions_insert
--   5. plan_version_blocks_insert
--
-- plans_delete intentionally kept as owner/sysadmin only (destructive op).

-- 1. plan_blocks_insert
DROP POLICY IF EXISTS "plan_blocks_insert" ON public.plan_blocks;
CREATE POLICY "plan_blocks_insert" ON public.plan_blocks FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plans.id FROM public.plans
      WHERE plans.owner_user_id = ( SELECT auth.uid() AS uid)
         OR (plans.visibility = 'tenant'::public.plan_visibility_enum
             AND public.has_tenant_role(plans.owner_tenant_id, 'admin'::public.tenant_role_enum))
         OR public.is_system_admin()
    )
  );

-- 2. plan_blocks_update
DROP POLICY IF EXISTS "plan_blocks_update" ON public.plan_blocks;
CREATE POLICY "plan_blocks_update" ON public.plan_blocks FOR UPDATE
  USING (
    plan_id IN (
      SELECT plans.id FROM public.plans
      WHERE plans.owner_user_id = ( SELECT auth.uid() AS uid)
         OR (plans.visibility = 'tenant'::public.plan_visibility_enum
             AND public.has_tenant_role(plans.owner_tenant_id, 'admin'::public.tenant_role_enum))
         OR public.is_system_admin()
    )
  );

-- 3. plan_blocks_delete
DROP POLICY IF EXISTS "plan_blocks_delete" ON public.plan_blocks;
CREATE POLICY "plan_blocks_delete" ON public.plan_blocks FOR DELETE
  USING (
    plan_id IN (
      SELECT plans.id FROM public.plans
      WHERE plans.owner_user_id = ( SELECT auth.uid() AS uid)
         OR (plans.visibility = 'tenant'::public.plan_visibility_enum
             AND public.has_tenant_role(plans.owner_tenant_id, 'admin'::public.tenant_role_enum))
         OR public.is_system_admin()
    )
  );

-- 4. plan_versions_insert
DROP POLICY IF EXISTS "plan_versions_insert" ON public.plan_versions;
CREATE POLICY "plan_versions_insert" ON public.plan_versions FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plans.id FROM public.plans
      WHERE plans.owner_user_id = ( SELECT auth.uid() AS uid)
         OR (plans.visibility = 'tenant'::public.plan_visibility_enum
             AND public.has_tenant_role(plans.owner_tenant_id, 'admin'::public.tenant_role_enum))
         OR public.is_system_admin()
    )
  );

-- 5. plan_version_blocks_insert
DROP POLICY IF EXISTS "plan_version_blocks_insert" ON public.plan_version_blocks;
CREATE POLICY "plan_version_blocks_insert" ON public.plan_version_blocks FOR INSERT
  WITH CHECK (
    plan_version_id IN (
      SELECT pv.id
      FROM public.plan_versions pv
      JOIN public.plans p ON p.id = pv.plan_id
      WHERE p.owner_user_id = ( SELECT auth.uid() AS uid)
         OR (p.visibility = 'tenant'::public.plan_visibility_enum
             AND public.has_tenant_role(p.owner_tenant_id, 'admin'::public.tenant_role_enum))
         OR public.is_system_admin()
    )
  );
