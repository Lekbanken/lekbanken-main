-- =============================================================================
-- Migration 007: Critical Policy Security Fixes
-- =============================================================================
-- Purpose: Fix critical security issues in RLS policies
-- 
-- Issues addressed:
--   1. CRITICAL: Remove overly permissive tenant INSERT policy
--   2. Fix "Service can..." policies that are open to public
--   3. Remove redundant duplicate policies
-- =============================================================================

-- =============================================================================
-- PHASE 1: CRITICAL - Fix tenants table INSERT policies
-- =============================================================================
-- Problem: Two INSERT policies exist:
--   - authenticated_can_insert_tenants: WITH CHECK (true) - OPEN TO ALL!
--   - tenant_insert_authenticated: Has proper checks
-- 
-- Since PERMISSIVE policies OR together, the "true" policy bypasses all checks.
-- =============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "authenticated_can_insert_tenants" ON public.tenants;

-- Verify the remaining policy is correct (it should already exist)
-- tenant_insert_authenticated checks: is_global_admin() OR service_role OR auth.uid() IS NOT NULL

-- =============================================================================
-- PHASE 2: Fix "Service can..." policies - require service_role
-- =============================================================================
-- These policies say "Service can..." but use WITH CHECK (true) which is open
-- to everyone. They should require auth.role() = 'service_role'.
-- =============================================================================

-- 2.1 billing_history
DROP POLICY IF EXISTS "Service can insert billing history" ON public.billing_history;
CREATE POLICY "service_role_insert_billing_history" ON public.billing_history
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.2 friends
DROP POLICY IF EXISTS "Service can manage friendships" ON public.friends;
CREATE POLICY "service_role_insert_friends" ON public.friends
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.3 notification_log
DROP POLICY IF EXISTS "Service can insert notification logs" ON public.notification_log;
CREATE POLICY "service_role_insert_notification_log" ON public.notification_log
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.4 notifications
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "service_role_insert_notifications" ON public.notifications
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.5 participants (Service role can create)
DROP POLICY IF EXISTS "Service role can create participants" ON public.participants;
CREATE POLICY "service_role_insert_participants" ON public.participants
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.6 participant_activity_log
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.participant_activity_log;
CREATE POLICY "service_role_insert_activity_log" ON public.participant_activity_log
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.7 social_leaderboards (INSERT)
DROP POLICY IF EXISTS "Service can insert leaderboard entries" ON public.social_leaderboards;
CREATE POLICY "service_role_insert_leaderboards" ON public.social_leaderboards
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.8 social_leaderboards (UPDATE)
DROP POLICY IF EXISTS "Service can update leaderboard entries" ON public.social_leaderboards;
CREATE POLICY "service_role_update_leaderboards" ON public.social_leaderboards
  FOR UPDATE
  TO public
  USING (auth.role() = 'service_role');

-- 2.9 subscriptions
DROP POLICY IF EXISTS "Service can insert subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_insert_subscriptions" ON public.subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.10 trial_usage (INSERT)
DROP POLICY IF EXISTS "Service can manage trial usage" ON public.trial_usage;
CREATE POLICY "service_role_insert_trial_usage" ON public.trial_usage
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- 2.11 trial_usage (UPDATE)
DROP POLICY IF EXISTS "Service can update trial usage" ON public.trial_usage;
CREATE POLICY "service_role_update_trial_usage" ON public.trial_usage
  FOR UPDATE
  TO public
  USING (auth.role() = 'service_role');

-- =============================================================================
-- PHASE 3: Remove redundant duplicate policies on analytics tables
-- =============================================================================
-- These tables have two INSERT policies doing similar things.
-- Keep the more specific one that checks auth.uid().
-- =============================================================================

-- 3.1 error_tracking - keep users_can_insert_errors, drop error_tracking_insert
DROP POLICY IF EXISTS "error_tracking_insert" ON public.error_tracking;

-- 3.2 feature_usage - keep users_can_insert_feature_usage, drop feature_usage_insert
DROP POLICY IF EXISTS "feature_usage_insert" ON public.feature_usage;

-- 3.3 page_views - keep users_can_insert_page_views, drop page_views_insert
DROP POLICY IF EXISTS "page_views_insert" ON public.page_views;

-- 3.4 session_analytics - keep users_can_insert_sessions, drop session_analytics_insert
DROP POLICY IF EXISTS "session_analytics_insert" ON public.session_analytics;

-- =============================================================================
-- PHASE 4: Fix multiplayer_participants UPDATE policy
-- =============================================================================
-- "Service can update participant data" uses USING (true) which is too open

DROP POLICY IF EXISTS "Service can update participant data" ON public.multiplayer_participants;
CREATE POLICY "service_role_update_multiplayer_participants" ON public.multiplayer_participants
  FOR UPDATE
  TO public
  USING (auth.role() = 'service_role');

-- =============================================================================
-- Verification queries (run after migration)
-- =============================================================================
-- 
-- Check no policies with WITH CHECK (true) remain on sensitive tables:
-- SELECT tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND with_check::text = 'true'
-- AND tablename NOT IN ('analytics_timeseries') -- OK for pure analytics
-- ORDER BY tablename;
--
-- Check tenants only has one INSERT policy:
-- SELECT * FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'tenants' AND cmd = 'INSERT';
-- =============================================================================
