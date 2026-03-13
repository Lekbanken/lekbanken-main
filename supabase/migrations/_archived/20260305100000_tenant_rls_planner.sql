-- =============================================================================
-- MS5: Tenant RLS — Isolation & Organisationsplaner
-- =============================================================================
-- Replaces owner-only policies with tenant-aware, per-operation policies.
-- Fixes: plan_version_blocks SELECT policy naming, plan_schedules broader-than-parent,
-- plan_notes_tenant missing plan visibility check, runs FOR ALL policy.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) PLANS — tenant/public/admin visibility
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "plans_select" ON plans;
DROP POLICY IF EXISTS "plans_insert" ON plans;
DROP POLICY IF EXISTS "plans_update" ON plans;
DROP POLICY IF EXISTS "plans_delete" ON plans;

-- SELECT: own + tenant-visible + public + system-admin
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND is_tenant_member(owner_tenant_id)
    )
    OR visibility = 'public'::plan_visibility_enum
    OR is_system_admin()
  );

-- INSERT: own user, tenant must be yours if specified
CREATE POLICY "plans_insert" ON plans FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND (owner_tenant_id IS NULL OR is_tenant_member(owner_tenant_id))
  );

-- UPDATE: owner + tenant-admin (for org plans) + system-admin
CREATE POLICY "plans_update" ON plans FOR UPDATE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
    OR is_system_admin()
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
    OR is_system_admin()
  );

-- DELETE: owner + system-admin only
CREATE POLICY "plans_delete" ON plans FOR DELETE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) PLAN_BLOCKS — cascade via plans FK
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "plan_blocks_select" ON plan_blocks;
DROP POLICY IF EXISTS "plan_blocks_manage" ON plan_blocks;
DROP POLICY IF EXISTS "plan_blocks_insert" ON plan_blocks;
DROP POLICY IF EXISTS "plan_blocks_update" ON plan_blocks;
DROP POLICY IF EXISTS "plan_blocks_delete" ON plan_blocks;

-- SELECT: anyone who can see the parent plan
CREATE POLICY "plan_blocks_select" ON plan_blocks FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM plans)
  );

-- INSERT: owner + system-admin
CREATE POLICY "plan_blocks_insert" ON plan_blocks FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- UPDATE: owner + system-admin
CREATE POLICY "plan_blocks_update" ON plan_blocks FOR UPDATE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- DELETE: owner + system-admin
CREATE POLICY "plan_blocks_delete" ON plan_blocks FOR DELETE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) PLAN_VERSIONS — cascade via plans FK
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "plan_versions_select" ON plan_versions;
DROP POLICY IF EXISTS "plan_versions_insert" ON plan_versions;

-- SELECT: anyone who can see the parent plan
CREATE POLICY "plan_versions_select" ON plan_versions FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM plans)
  );

-- INSERT: owner + system-admin
CREATE POLICY "plan_versions_insert" ON plan_versions FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) PLAN_VERSION_BLOCKS — cascade via plan_versions → plans
--    (Fixes: standardise naming, ensure SELECT exists)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_can_select_version_blocks" ON plan_version_blocks;
DROP POLICY IF EXISTS "plan_version_blocks_insert" ON plan_version_blocks;
DROP POLICY IF EXISTS "plan_version_blocks_select" ON plan_version_blocks;

-- SELECT: cascade through plan_versions RLS
CREATE POLICY "plan_version_blocks_select" ON plan_version_blocks FOR SELECT TO authenticated
  USING (
    plan_version_id IN (SELECT id FROM plan_versions)
  );

-- INSERT: owner/admin of the parent plan
CREATE POLICY "plan_version_blocks_insert" ON plan_version_blocks FOR INSERT TO authenticated
  WITH CHECK (
    plan_version_id IN (
      SELECT pv.id FROM plan_versions pv
      JOIN plans p ON p.id = pv.plan_id
      WHERE p.owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) PLAN_SCHEDULES — sync with plans RLS (fix broader-than-parent)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Fresh-install fix: plan_schedules table may not exist yet.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plan_schedules'
  ) THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "plan_schedules_access" ON plan_schedules;
  DROP POLICY IF EXISTS "plan_schedules_select" ON plan_schedules;
  DROP POLICY IF EXISTS "plan_schedules_insert" ON plan_schedules;
  DROP POLICY IF EXISTS "plan_schedules_update" ON plan_schedules;
  DROP POLICY IF EXISTS "plan_schedules_delete" ON plan_schedules;

  EXECUTE $sql$
    CREATE POLICY "plan_schedules_select" ON plan_schedules FOR SELECT TO authenticated
      USING (
        plan_id IN (SELECT id FROM plans)
        OR created_by = (SELECT auth.uid())
      )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "plan_schedules_insert" ON plan_schedules FOR INSERT TO authenticated
      WITH CHECK (
        created_by = (SELECT auth.uid())
        AND plan_id IN (SELECT id FROM plans)
      )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "plan_schedules_update" ON plan_schedules FOR UPDATE TO authenticated
      USING (created_by = (SELECT auth.uid()) OR is_system_admin())
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "plan_schedules_delete" ON plan_schedules FOR DELETE TO authenticated
      USING (created_by = (SELECT auth.uid()) OR is_system_admin())
  $sql$;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6) PLAN_NOTES_TENANT — require plan visibility (fix data leak)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "plan_notes_tenant_manage" ON plan_notes_tenant;
DROP POLICY IF EXISTS "plan_notes_tenant_select" ON plan_notes_tenant;
DROP POLICY IF EXISTS "plan_notes_tenant_insert" ON plan_notes_tenant;
DROP POLICY IF EXISTS "plan_notes_tenant_update" ON plan_notes_tenant;
DROP POLICY IF EXISTS "plan_notes_tenant_delete" ON plan_notes_tenant;

-- SELECT: tenant member + plan must be visible
CREATE POLICY "plan_notes_tenant_select" ON plan_notes_tenant FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- INSERT: tenant member + plan must be visible
CREATE POLICY "plan_notes_tenant_insert" ON plan_notes_tenant FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- UPDATE: tenant member + plan must be visible
CREATE POLICY "plan_notes_tenant_update" ON plan_notes_tenant FOR UPDATE TO authenticated
  USING (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- DELETE: tenant admin + plan must be visible
CREATE POLICY "plan_notes_tenant_delete" ON plan_notes_tenant FOR DELETE TO authenticated
  USING (
    has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    AND plan_id IN (SELECT id FROM plans)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7) RUNS — per-operation policies (replaces FOR ALL)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "runs_manage" ON runs;
DROP POLICY IF EXISTS "runs_select" ON runs;
DROP POLICY IF EXISTS "runs_insert" ON runs;
DROP POLICY IF EXISTS "runs_update" ON runs;

-- SELECT: own runs + system-admin
CREATE POLICY "runs_select" ON runs FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- INSERT: own runs + plan must be visible (cascade via plan_versions)
CREATE POLICY "runs_insert" ON runs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND plan_version_id IN (SELECT id FROM plan_versions)
  );

-- UPDATE: own runs only
CREATE POLICY "runs_update" ON runs FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8) BACKFILL: runs.tenant_id from plans.owner_tenant_id
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE runs r
  SET tenant_id = p.owner_tenant_id
  FROM plan_versions pv
  JOIN plans p ON p.id = pv.plan_id
  WHERE r.plan_version_id = pv.id
    AND r.tenant_id IS NULL
    AND p.owner_tenant_id IS NOT NULL;

COMMIT;
