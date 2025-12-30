-- ============================================================================
-- MIGRATION: Planner Cleanup
-- VERSION: 20251230120000
-- DESCRIPTION: Remove legacy plan_games table and related objects
-- SPRINT: Sprint 4 - Cleanup
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop RLS Policies for plan_games
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "users_can_select_plan_games" ON plan_games;
DROP POLICY IF EXISTS "users_can_manage_own_plan_games" ON plan_games;

-- ----------------------------------------------------------------------------
-- 2. Drop Indexes for plan_games
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS plan_games_plan_idx;
DROP INDEX IF EXISTS plan_games_game_idx;
DROP INDEX IF EXISTS plan_games_position_idx;

-- ----------------------------------------------------------------------------
-- 3. Drop the plan_games table
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS plan_games;

-- ============================================================================
-- NOTE: After running this migration, regenerate TypeScript types:
-- npx supabase gen types typescript --linked > types/supabase.ts
-- ============================================================================
