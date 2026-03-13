-- =============================================================================
-- Migration 014: RLS initplan optimization - Sessions & Play Runtime
-- =============================================================================
-- Continuation of auth.uid() -> (SELECT auth.uid()) optimization.
-- Focuses on session and play-related tables that have high query frequency.
-- 
-- NOTE: The main session table is "participant_sessions" not "sessions"
-- =============================================================================

-- =============================================================================
-- PART 1: PARTICIPANT_SESSIONS TABLE POLICIES (main sessions table)
-- =============================================================================

-- Host can manage participant sessions
DROP POLICY IF EXISTS "host_can_manage_participant_sessions" ON public.participant_sessions;
CREATE POLICY "host_can_manage_participant_sessions" ON public.participant_sessions
  FOR ALL TO authenticated
  USING (host_user_id = (SELECT auth.uid()))
  WITH CHECK (host_user_id = (SELECT auth.uid()));

-- =============================================================================
-- PART 2: SESSION_ARTIFACTS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "host_can_manage_session_artifacts" ON public.session_artifacts;
CREATE POLICY "host_can_manage_session_artifacts" ON public.session_artifacts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifacts.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 3: SESSION_EVENTS POLICIES (uses participant_sessions)
-- =============================================================================

DROP POLICY IF EXISTS "host_can_select_session_events" ON public.session_events;
CREATE POLICY "host_can_select_session_events" ON public.session_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "host_can_insert_session_events" ON public.session_events;
CREATE POLICY "host_can_insert_session_events" ON public.session_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 4: SESSION_TRIGGERS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "host_can_manage_session_triggers" ON public.session_triggers;
CREATE POLICY "host_can_manage_session_triggers" ON public.session_triggers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_triggers.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 5: SESSION_TIME_BANK POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "host_can_manage_time_bank" ON public.session_time_bank;
CREATE POLICY "host_can_manage_time_bank" ON public.session_time_bank
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "host_can_view_time_bank_ledger" ON public.session_time_bank_ledger;
CREATE POLICY "host_can_view_time_bank_ledger" ON public.session_time_bank_ledger
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank_ledger.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 6: GAME_SCORES POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "users_can_select_own_game_scores" ON public.game_scores;
CREATE POLICY "users_can_select_own_game_scores" ON public.game_scores
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_can_insert_own_game_scores" ON public.game_scores;
CREATE POLICY "users_can_insert_own_game_scores" ON public.game_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- PART 7: PARTICIPANTS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "host_can_manage_participants" ON public.participants;
CREATE POLICY "host_can_manage_participants" ON public.participants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participants.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this query to check remaining unoptimized policies:
--
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
-- AND qual::text NOT LIKE '%(SELECT auth.uid())%'
-- AND tablename IN ('participant_sessions', 'session_artifacts', 
--                   'session_events', 'session_triggers', 'game_scores');
-- =============================================================================
