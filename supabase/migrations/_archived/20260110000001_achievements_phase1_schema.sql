-- Achievements Phase 1: Schema Extensions
-- Purpose: Add status, icon_config, audit columns to achievements table
-- Date: 2026-01-10

BEGIN;

--------------------------------------------------------------------------------
-- 1) STATUS ENUM
--------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_status_enum') THEN
    CREATE TYPE public.achievement_status_enum AS ENUM ('draft', 'active', 'archived');
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 2) EXTEND ACHIEVEMENTS TABLE
--------------------------------------------------------------------------------

-- Add status column
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS status public.achievement_status_enum NOT NULL DEFAULT 'draft';

-- Add icon_config JSONB for layered badge configuration
-- Structure: { mode, themeId, size, base, symbol, backgrounds, foregrounds, customColors }
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS icon_config JSONB;

-- Add audit columns
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_achievements_status ON public.achievements(status);

-- Index for created_by for audit queries
CREATE INDEX IF NOT EXISTS idx_achievements_created_by ON public.achievements(created_by);

--------------------------------------------------------------------------------
-- 3) UNIQUE CONSTRAINT ON USER_ACHIEVEMENTS
--------------------------------------------------------------------------------

-- Ensure idempotency: a user can only unlock each achievement once
-- Check if constraint exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_achievement_unique'
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT user_achievements_user_achievement_unique 
      UNIQUE (user_id, achievement_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists, ignore
END
$$;

--------------------------------------------------------------------------------
-- 4) UPDATE TRIGGER FOR updated_at
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.achievements_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS achievements_updated_at_trigger ON public.achievements;

CREATE TRIGGER achievements_updated_at_trigger
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.achievements_set_updated_at();

--------------------------------------------------------------------------------
-- 5) COMMENTS
--------------------------------------------------------------------------------

COMMENT ON COLUMN public.achievements.status IS 'Achievement lifecycle status: draft (not visible), active (visible + awardable), archived (hidden from new awards)';
COMMENT ON COLUMN public.achievements.icon_config IS 'JSONB configuration for layered badge visual: { mode, themeId, base, symbol, backgrounds, foregrounds }';
COMMENT ON COLUMN public.achievements.created_by IS 'User who created this achievement';
COMMENT ON COLUMN public.achievements.updated_by IS 'User who last updated this achievement';
COMMENT ON COLUMN public.achievements.updated_at IS 'Timestamp of last update';

COMMIT;
