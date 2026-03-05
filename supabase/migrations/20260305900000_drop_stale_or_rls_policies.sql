-- ============================================================================
-- Migration: Drop stale OR-based RLS policies (dead weight)
-- Date: 2026-03-05
-- Why: These policies were created in domain migrations (20251129*) with
--      expensive OR clauses calling get_user_tenant_ids(). Later migrations
--      replaced them with leaner policies, but the originals were never
--      dropped. With PERMISSIVE policies, Postgres evaluates ALL policies
--      on every row — keeping these wastes CPU on dead OR branches.
-- ============================================================================

-- ============================================================================
-- 1. game_sessions: Split OR into two lean PERMISSIVE policies
--    Old: user_id = auth.uid() OR tenant_id = ANY(get_user_tenant_ids())
--    New: fast "own rows" path + separate "tenant member" path
-- ============================================================================
DROP POLICY IF EXISTS "users_can_select_own_game_sessions" ON public.game_sessions;

CREATE POLICY "game_sessions_select_own"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "game_sessions_select_tenant"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()));

-- ============================================================================
-- 2. leaderboards: Drop dead-weight OR policy
--    New policy "leaderboards_select USING (true)" already exists
--    (from 20260108000017), making the old 3-way OR a no-op.
-- ============================================================================
DROP POLICY IF EXISTS "users_can_select_leaderboards" ON public.leaderboards;

-- ============================================================================
-- 3. feedback: Split OR into two lean PERMISSIVE policies
--    Old: user_id = auth.uid() OR tenant_id = ANY(get_user_tenant_ids())
-- ============================================================================
DROP POLICY IF EXISTS "users_can_select_own_feedback" ON public.feedback;

CREATE POLICY "feedback_select_own"
  ON public.feedback FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "feedback_select_tenant"
  ON public.feedback FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()));

-- ============================================================================
-- 4. support_tickets: Drop old 3-way OR (replaced by support_tickets_user_access)
--    Old: user_id = auth.uid() OR assigned_to_user_id = auth.uid()
--         OR tenant_id = ANY(get_user_tenant_ids())
--    Already replaced by: support_tickets_user_access
--      USING (user_id = auth.uid() OR is_system_admin())
-- ============================================================================
DROP POLICY IF EXISTS "users_can_select_own_tickets" ON public.support_tickets;

-- ============================================================================
-- 5. bug_reports: Drop old OR (replaced by bug_reports_user_access)
--    Old: user_id = auth.uid() OR tenant_id = ANY(get_user_tenant_ids())
--    Already replaced by: bug_reports_user_access
--      USING (user_id = auth.uid() OR is_system_admin())
-- ============================================================================
DROP POLICY IF EXISTS "users_can_select_own_bug_reports" ON public.bug_reports;
