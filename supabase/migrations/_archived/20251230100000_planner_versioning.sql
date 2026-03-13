-- =============================================================================
-- PLANNER VERSIONING SCHEMA
-- =============================================================================
-- This migration introduces:
-- 1. plan_versions - immutable snapshots of published plans
-- 2. plan_version_blocks - frozen blocks at publish time
-- 3. runs - Play domain table for runtime sessions
-- 4. status column on plans (draft/published/modified/archived)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add status column to plans
-- -----------------------------------------------------------------------------
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'published', 'modified', 'archived'));

COMMENT ON COLUMN plans.status IS 'Plan lifecycle status: draft (never published), published (up-to-date), modified (has unpublished changes), archived (soft-deleted)';

-- -----------------------------------------------------------------------------
-- 2. Create plan_versions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  name            text NOT NULL,
  description     text,
  total_time_minutes integer NOT NULL DEFAULT 0,
  metadata        jsonb DEFAULT '{}',
  published_at    timestamptz NOT NULL DEFAULT now(),
  published_by    uuid NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(plan_id, version_number)
);

COMMENT ON TABLE plan_versions IS 'Immutable snapshots of published plans. Each publish creates a new version.';

-- Add current_version_id reference to plans (after plan_versions exists)
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS current_version_id uuid REFERENCES plan_versions(id);

COMMENT ON COLUMN plans.current_version_id IS 'Reference to the most recent published version. NULL if never published.';

-- -----------------------------------------------------------------------------
-- 3. Create plan_version_blocks table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_version_blocks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id     uuid NOT NULL REFERENCES plan_versions(id) ON DELETE CASCADE,
  position            integer NOT NULL,
  block_type          plan_block_type_enum NOT NULL,
  duration_minutes    integer NOT NULL DEFAULT 0,
  title               text,
  notes               text,
  is_optional         boolean DEFAULT false,
  
  -- Denormalized game data (frozen at publish time)
  game_id             uuid,  -- Reference for audit, but data is copied
  game_snapshot       jsonb, -- { name, title, instructions, min_players, max_players, ... }
  
  metadata            jsonb DEFAULT '{}'
);

COMMENT ON TABLE plan_version_blocks IS 'Frozen blocks at publish time. Game data is snapshot to prevent drift.';

CREATE INDEX IF NOT EXISTS idx_plan_version_blocks_version ON plan_version_blocks(plan_version_id);

-- -----------------------------------------------------------------------------
-- 4. Create runs table (Play domain)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  plan_version_id     uuid NOT NULL REFERENCES plan_versions(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants(id) ON DELETE SET NULL,
  status              plan_run_status_enum NOT NULL DEFAULT 'not_started',
  started_at          timestamptz DEFAULT now(),
  completed_at        timestamptz,
  current_step_index  integer DEFAULT 0,
  elapsed_seconds     integer DEFAULT 0,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE runs IS 'Play session instances. Each user playing a published plan version creates a run.';

CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'runs'
      AND column_name = 'plan_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_runs_plan ON runs(plan_id)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'runs'
      AND column_name = 'plan_version_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_runs_version ON runs(plan_version_id)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'runs'
      AND column_name = 'status'
  ) THEN
    EXECUTE $sql$CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status) WHERE status IN ('not_started', 'in_progress')$sql$;
  END IF;
END
$$;

-- Unique constraint: one active run per user per version
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_active_per_user_version 
  ON runs(plan_version_id, user_id) 
  WHERE status IN ('not_started', 'in_progress');

-- -----------------------------------------------------------------------------
-- 5. RLS Policies
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_version_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- plan_versions: same read rules as plans, no UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_versions'
      AND policyname = 'users_can_select_plan_versions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_can_select_plan_versions" ON plan_versions
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM plans p
            WHERE p.id = plan_versions.plan_id
              AND (
                p.visibility = 'public'
                OR p.owner_user_id = auth.uid()
                OR (p.visibility = 'tenant' AND p.owner_tenant_id = ANY(get_user_tenant_ids()))
              )
          )
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_versions'
      AND policyname = 'plan_owner_can_insert_versions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "plan_owner_can_insert_versions" ON plan_versions
        FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM plans p
            WHERE p.id = plan_versions.plan_id
              AND p.owner_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END
$$;

-- plan_version_blocks: read-only based on version access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_version_blocks'
      AND policyname = 'users_can_select_version_blocks'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_can_select_version_blocks" ON plan_version_blocks
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM plan_versions pv
            WHERE pv.id = plan_version_blocks.plan_version_id
          )
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_version_blocks'
      AND policyname = 'plan_owner_can_insert_version_blocks'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "plan_owner_can_insert_version_blocks" ON plan_version_blocks
        FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM plan_versions pv
            JOIN plans p ON p.id = pv.plan_id
            WHERE pv.id = plan_version_blocks.plan_version_id
              AND p.owner_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END
$$;

-- runs: users can only manage their own runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'runs'
      AND policyname = 'users_can_manage_own_runs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_can_manage_own_runs" ON runs
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    $policy$;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 6. Helper functions
-- -----------------------------------------------------------------------------

-- Get next version number for a plan
CREATE OR REPLACE FUNCTION get_next_plan_version_number(p_plan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM plan_versions WHERE plan_id = p_plan_id),
    1
  );
END;
$$;

-- Update plan status when blocks are modified (after publish)
CREATE OR REPLACE FUNCTION trg_plan_blocks_update_plan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Get plan_id from NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    v_plan_id := OLD.plan_id;
  ELSE
    v_plan_id := NEW.plan_id;
  END IF;
  
  -- If plan was published and blocks change, mark as modified
  UPDATE plans 
  SET status = 'modified', updated_at = now()
  WHERE id = v_plan_id
  AND status = 'published'
  AND current_version_id IS NOT NULL;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger for plan_blocks modifications
DROP TRIGGER IF EXISTS plan_blocks_update_status_ins ON plan_blocks;
DROP TRIGGER IF EXISTS plan_blocks_update_status_upd ON plan_blocks;
DROP TRIGGER IF EXISTS plan_blocks_update_status_del ON plan_blocks;

CREATE TRIGGER plan_blocks_update_status_ins
  AFTER INSERT ON plan_blocks
  FOR EACH ROW
  EXECUTE FUNCTION trg_plan_blocks_update_plan_status();

CREATE TRIGGER plan_blocks_update_status_upd
  AFTER UPDATE ON plan_blocks
  FOR EACH ROW
  EXECUTE FUNCTION trg_plan_blocks_update_plan_status();

CREATE TRIGGER plan_blocks_update_status_del
  AFTER DELETE ON plan_blocks
  FOR EACH ROW
  EXECUTE FUNCTION trg_plan_blocks_update_plan_status();

-- Also update status when plan metadata changes
CREATE OR REPLACE FUNCTION trg_plans_update_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If plan was published and name/description/metadata changes, mark as modified
  IF OLD.status = 'published' AND OLD.current_version_id IS NOT NULL THEN
    IF OLD.name IS DISTINCT FROM NEW.name 
       OR OLD.description IS DISTINCT FROM NEW.description 
       OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
      NEW.status := 'modified';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_update_status ON plans;
CREATE TRIGGER plans_update_status
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION trg_plans_update_status();
