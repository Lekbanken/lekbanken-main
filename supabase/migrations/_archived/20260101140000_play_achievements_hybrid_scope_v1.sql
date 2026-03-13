-- Hybrid achievements scope (global + tenant)
-- - tenant_id NULL => global achievement
-- - tenant_id NOT NULL => tenant-scoped achievement
--
-- We introduce a generated column `scope_tenant_id` to make NULL tenant_id participate
-- in a single unique constraint alongside tenant-scoped rows.

BEGIN;

-- 1) Add tenant scope columns
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Prevent accidental use of our sentinel UUID for real tenants.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'achievements_tenant_id_not_zero'
      AND c.conrelid = 'public.achievements'::regclass
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.achievements
        ADD CONSTRAINT achievements_tenant_id_not_zero
        CHECK (tenant_id IS NULL OR tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid)
    $sql$;
  END IF;
END
$$;

-- Generated stored column used for uniqueness (NULL tenant_id => sentinel UUID)
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS scope_tenant_id uuid
  GENERATED ALWAYS AS (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED;

-- 2) Replace global-only uniqueness with scope-aware uniqueness
ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_achievement_key_key;

-- Enforce uniqueness per scope for non-null keys.
CREATE UNIQUE INDEX IF NOT EXISTS achievements_scope_tenant_id_achievement_key_ux
  ON public.achievements (scope_tenant_id, achievement_key)
  WHERE achievement_key IS NOT NULL;

-- Helpful for tenant filtering
CREATE INDEX IF NOT EXISTS achievements_tenant_id_idx
  ON public.achievements (tenant_id);

-- 3) Update RLS: authenticated can see global + own-tenant achievements
DROP POLICY IF EXISTS "authenticated_can_select_achievements" ON public.achievements;

CREATE POLICY "authenticated_can_select_achievements"
ON public.achievements
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    auth.role() = 'authenticated'
    AND (
      tenant_id IS NULL
      OR tenant_id = ANY(public.get_user_tenant_ids())
    )
  )
);

COMMIT;
