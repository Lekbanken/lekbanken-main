-- Migration 020: auth.uid() initplan optimization batch 3
-- Wraps auth.uid() in (SELECT ...) for better query planning performance
-- This batch covers: user_*, participant_*, session_*, learning_*, runs, gamification_events, leader_profile, tenants

-- =============================================================================
-- USER TABLES
-- =============================================================================

-- user_profiles: user_profiles_admin_or_self
DROP POLICY IF EXISTS "user_profiles_admin_or_self" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_public" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
    OR true  -- Public profiles are visible to all authenticated users
  );

-- user_devices: user_devices_owner
DROP POLICY IF EXISTS "user_devices_owner" ON public.user_devices;
CREATE POLICY "user_devices_owner" ON public.user_devices
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_sessions: user_sessions_owner
DROP POLICY IF EXISTS "user_sessions_owner" ON public.user_sessions;
CREATE POLICY "user_sessions_owner" ON public.user_sessions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_mfa: user_mfa_owner
DROP POLICY IF EXISTS "user_mfa_owner" ON public.user_mfa;
CREATE POLICY "user_mfa_owner" ON public.user_mfa
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_audit_logs: user_audit_logs_owner
DROP POLICY IF EXISTS "user_audit_logs_owner" ON public.user_audit_logs;
CREATE POLICY "user_audit_logs_owner" ON public.user_audit_logs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_system_admin());

-- user_tenant_memberships: tenant_memberships_select
DROP POLICY IF EXISTS "tenant_memberships_select" ON public.user_tenant_memberships;
CREATE POLICY "tenant_memberships_select" ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR tenant_id = ANY(get_user_tenant_ids())
    OR is_system_admin()
  );

-- users: users_insert_self
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- users: users_select_coworkers (tenant members can see each other)
DROP POLICY IF EXISTS "users_select_coworkers" ON public.users;
CREATE POLICY "users_select_coworkers" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = users.id
      AND utm.tenant_id = ANY(get_user_tenant_ids())
    )
    OR is_system_admin()
  );

-- user_purchases: user_purchases_insert
DROP POLICY IF EXISTS "user_purchases_insert" ON public.user_purchases;
CREATE POLICY "user_purchases_insert" ON public.user_purchases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR is_system_admin());

-- player_cosmetics: player_cosmetics_insert
DROP POLICY IF EXISTS "player_cosmetics_insert" ON public.player_cosmetics;
CREATE POLICY "player_cosmetics_insert" ON public.player_cosmetics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR is_system_admin());

-- =============================================================================
-- PARTICIPANT & SESSION TABLES
-- =============================================================================

-- participant_sessions: Hosts can create sessions
DROP POLICY IF EXISTS "Hosts can create sessions" ON public.participant_sessions;
CREATE POLICY "participant_sessions_insert" ON public.participant_sessions
  FOR INSERT TO authenticated
  WITH CHECK (host_user_id = (SELECT auth.uid()));

-- participant_sessions: Hosts can update their own sessions
DROP POLICY IF EXISTS "Hosts can update their own sessions" ON public.participant_sessions;
CREATE POLICY "participant_sessions_update" ON public.participant_sessions
  FOR UPDATE TO authenticated
  USING (host_user_id = (SELECT auth.uid()))
  WITH CHECK (host_user_id = (SELECT auth.uid()));

-- participant_sessions: Hosts can delete their own sessions
DROP POLICY IF EXISTS "Hosts can delete their own sessions" ON public.participant_sessions;
CREATE POLICY "participant_sessions_delete" ON public.participant_sessions
  FOR DELETE TO authenticated
  USING (host_user_id = (SELECT auth.uid()));

-- participants: Hosts can view participants in their sessions
DROP POLICY IF EXISTS "Hosts can view participants in their sessions" ON public.participants;
CREATE POLICY "participants_select" ON public.participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- participants: Hosts can update participants in their sessions
DROP POLICY IF EXISTS "Hosts can update participants in their sessions" ON public.participants;
CREATE POLICY "participants_update" ON public.participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- participants: service_role_insert_participants
DROP POLICY IF EXISTS "service_role_insert_participants" ON public.participants;
CREATE POLICY "participants_service_insert" ON public.participants
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- participant_activity_log
DROP POLICY IF EXISTS "Hosts can view activity for their sessions" ON public.participant_activity_log;
DROP POLICY IF EXISTS "service_role_insert_activity_log" ON public.participant_activity_log;
CREATE POLICY "participant_activity_log_select" ON public.participant_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

CREATE POLICY "participant_activity_log_insert" ON public.participant_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- participant_game_progress: hosts_can_read_session_progress
DROP POLICY IF EXISTS "hosts_can_read_session_progress" ON public.participant_game_progress;
CREATE POLICY "participant_game_progress_select" ON public.participant_game_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- participant_achievement_unlocks: hosts_can_read_session_unlocks
DROP POLICY IF EXISTS "hosts_can_read_session_unlocks" ON public.participant_achievement_unlocks;
CREATE POLICY "participant_achievement_unlocks_select" ON public.participant_achievement_unlocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- session_statistics: hosts_can_read_session_stats
DROP POLICY IF EXISTS "hosts_can_read_session_stats" ON public.session_statistics;
CREATE POLICY "session_statistics_select" ON public.session_statistics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- participant_role_assignments
DROP POLICY IF EXISTS "role_assignments_select" ON public.participant_role_assignments;
DROP POLICY IF EXISTS "role_assignments_insert" ON public.participant_role_assignments;
DROP POLICY IF EXISTS "role_assignments_update" ON public.participant_role_assignments;
DROP POLICY IF EXISTS "role_assignments_delete" ON public.participant_role_assignments;
DROP POLICY IF EXISTS "role_assignments_select_own" ON public.participant_role_assignments;

CREATE POLICY "participant_role_assignments_manage" ON public.participant_role_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- =============================================================================
-- SESSION ARTIFACTS AND EVENTS
-- =============================================================================

-- session_artifacts
DROP POLICY IF EXISTS "session_artifacts_select" ON public.session_artifacts;
DROP POLICY IF EXISTS "session_artifacts_insert" ON public.session_artifacts;
DROP POLICY IF EXISTS "session_artifacts_update" ON public.session_artifacts;
DROP POLICY IF EXISTS "session_artifacts_delete" ON public.session_artifacts;
CREATE POLICY "session_artifacts_manage" ON public.session_artifacts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- session_artifact_variants
DROP POLICY IF EXISTS "session_artifact_variants_select" ON public.session_artifact_variants;
DROP POLICY IF EXISTS "session_artifact_variants_insert" ON public.session_artifact_variants;
DROP POLICY IF EXISTS "session_artifact_variants_update" ON public.session_artifact_variants;
DROP POLICY IF EXISTS "session_artifact_variants_delete" ON public.session_artifact_variants;
CREATE POLICY "session_artifact_variants_manage" ON public.session_artifact_variants
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_artifact_assignments
DROP POLICY IF EXISTS "session_artifact_assignments_select" ON public.session_artifact_assignments;
DROP POLICY IF EXISTS "session_artifact_assignments_insert" ON public.session_artifact_assignments;
DROP POLICY IF EXISTS "session_artifact_assignments_update" ON public.session_artifact_assignments;
DROP POLICY IF EXISTS "session_artifact_assignments_delete" ON public.session_artifact_assignments;
CREATE POLICY "session_artifact_assignments_manage" ON public.session_artifact_assignments
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_decisions
DROP POLICY IF EXISTS "session_decisions_select" ON public.session_decisions;
DROP POLICY IF EXISTS "session_decisions_insert" ON public.session_decisions;
DROP POLICY IF EXISTS "session_decisions_update" ON public.session_decisions;
DROP POLICY IF EXISTS "session_decisions_delete" ON public.session_decisions;
CREATE POLICY "session_decisions_manage" ON public.session_decisions
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_votes
DROP POLICY IF EXISTS "session_votes_select" ON public.session_votes;
DROP POLICY IF EXISTS "session_votes_insert" ON public.session_votes;
DROP POLICY IF EXISTS "session_votes_update" ON public.session_votes;
DROP POLICY IF EXISTS "session_votes_delete" ON public.session_votes;
CREATE POLICY "session_votes_manage" ON public.session_votes
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_outcomes
DROP POLICY IF EXISTS "session_outcomes_select" ON public.session_outcomes;
DROP POLICY IF EXISTS "session_outcomes_insert" ON public.session_outcomes;
DROP POLICY IF EXISTS "session_outcomes_update" ON public.session_outcomes;
DROP POLICY IF EXISTS "session_outcomes_delete" ON public.session_outcomes;
CREATE POLICY "session_outcomes_manage" ON public.session_outcomes
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_signals
DROP POLICY IF EXISTS "session_signals_select" ON public.session_signals;
DROP POLICY IF EXISTS "session_signals_insert" ON public.session_signals;
CREATE POLICY "session_signals_manage" ON public.session_signals
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_time_bank
DROP POLICY IF EXISTS "session_time_bank_select" ON public.session_time_bank;
DROP POLICY IF EXISTS "session_time_bank_insert" ON public.session_time_bank;
DROP POLICY IF EXISTS "session_time_bank_update" ON public.session_time_bank;
CREATE POLICY "session_time_bank_manage" ON public.session_time_bank
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_time_bank_ledger
DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.session_time_bank_ledger;
DROP POLICY IF EXISTS "time_bank_ledger_insert" ON public.session_time_bank_ledger;
CREATE POLICY "session_time_bank_ledger_manage" ON public.session_time_bank_ledger
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_triggers
DROP POLICY IF EXISTS "session_triggers_select" ON public.session_triggers;
DROP POLICY IF EXISTS "session_triggers_insert" ON public.session_triggers;
DROP POLICY IF EXISTS "session_triggers_update" ON public.session_triggers;
DROP POLICY IF EXISTS "session_triggers_delete" ON public.session_triggers;
CREATE POLICY "session_triggers_manage" ON public.session_triggers
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- session_events
DROP POLICY IF EXISTS "session_events_insert" ON public.session_events;
CREATE POLICY "session_events_insert" ON public.session_events
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- session_roles
DROP POLICY IF EXISTS "session_roles_insert" ON public.session_roles;
DROP POLICY IF EXISTS "session_roles_update" ON public.session_roles;
DROP POLICY IF EXISTS "session_roles_delete" ON public.session_roles;
CREATE POLICY "session_roles_manage" ON public.session_roles
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- play_chat_messages
DROP POLICY IF EXISTS "play_chat_messages_select_host" ON public.play_chat_messages;
DROP POLICY IF EXISTS "play_chat_messages_insert_host" ON public.play_chat_messages;
CREATE POLICY "play_chat_messages_manage" ON public.play_chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- =============================================================================
-- LEARNING
-- =============================================================================

-- learning_user_progress: users_manage_own_progress
DROP POLICY IF EXISTS "users_manage_own_progress" ON public.learning_user_progress;
CREATE POLICY "learning_user_progress_manage" ON public.learning_user_progress
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- learning_course_attempts: users_manage_own_attempts
DROP POLICY IF EXISTS "users_manage_own_attempts" ON public.learning_course_attempts;
CREATE POLICY "learning_course_attempts_manage" ON public.learning_course_attempts
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- RUNS & GAMIFICATION
-- =============================================================================

-- runs: users_can_manage_own_runs
DROP POLICY IF EXISTS "users_can_manage_own_runs" ON public.runs;
CREATE POLICY "runs_manage" ON public.runs
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- gamification_events
DROP POLICY IF EXISTS "service_can_insert_gamification_events" ON public.gamification_events;
DROP POLICY IF EXISTS "service_can_modify_gamification_events" ON public.gamification_events;
CREATE POLICY "gamification_events_insert" ON public.gamification_events
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

CREATE POLICY "gamification_events_update" ON public.gamification_events
  FOR UPDATE TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- leader_profile
DROP POLICY IF EXISTS "leader_profile_select_own" ON public.leader_profile;
DROP POLICY IF EXISTS "leader_profile_insert_own" ON public.leader_profile;
DROP POLICY IF EXISTS "leader_profile_update_own" ON public.leader_profile;
CREATE POLICY "leader_profile_manage" ON public.leader_profile
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- TENANTS
-- =============================================================================

-- tenants: tenant_insert_admin_only
DROP POLICY IF EXISTS "tenant_insert_admin_only" ON public.tenants;
CREATE POLICY "tenants_insert_admin" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());
