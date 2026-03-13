-- =============================================================================
-- Migration 013: RLS initplan optimization - auth.uid() -> (SELECT auth.uid())
-- =============================================================================
-- Problem: Supabase Performance Advisor lint 0003 warns that auth.uid() and
--          auth.jwt() in USING/WITH CHECK clauses are evaluated per-row instead
--          of per-query when not wrapped in a subquery.
--
-- Solution: Wrap all auth.uid() calls in (SELECT auth.uid()) to force
--          initplan execution (once per query, not per row).
--
-- This migration covers the CORE tables with highest query frequency.
-- Additional migrations will cover remaining tables.
-- =============================================================================

-- =============================================================================
-- PART 1: USERS TABLE POLICIES
-- =============================================================================

-- users_select_self
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- users_update_self
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- users_can_read_own (if exists from another migration)
DROP POLICY IF EXISTS "users_can_read_own" ON public.users;

-- users_can_update_own (if exists from another migration)
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;

-- =============================================================================
-- PART 2: USER_PROFILES TABLE POLICIES
-- =============================================================================

-- user_profiles_select_own
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_profiles_update_own
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_profiles_insert_own
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- PART 3: USER_TENANT_MEMBERSHIPS POLICIES
-- =============================================================================

-- membership_select_own
DROP POLICY IF EXISTS "membership_select_own" ON public.user_tenant_memberships;
CREATE POLICY "membership_select_own" ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- PART 4: GAMIFICATION CORE POLICIES (high frequency)
-- =============================================================================

-- User coins
DROP POLICY IF EXISTS "users_can_select_own_user_coins" ON public.user_coins;
CREATE POLICY "users_can_select_own_user_coins" ON public.user_coins
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Coin transactions
DROP POLICY IF EXISTS "users_can_select_own_coin_transactions" ON public.coin_transactions;
CREATE POLICY "users_can_select_own_coin_transactions" ON public.coin_transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- User streaks
DROP POLICY IF EXISTS "users_can_select_own_user_streaks" ON public.user_streaks;
CREATE POLICY "users_can_select_own_user_streaks" ON public.user_streaks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- User progress
DROP POLICY IF EXISTS "users_can_select_own_user_progress" ON public.user_progress;
CREATE POLICY "users_can_select_own_user_progress" ON public.user_progress
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- User achievements
DROP POLICY IF EXISTS "users_can_select_own_achievements" ON public.user_achievements;
CREATE POLICY "users_can_select_own_achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Gamification events
DROP POLICY IF EXISTS "users_can_select_own_gamification_events" ON public.gamification_events;
CREATE POLICY "users_can_select_own_gamification_events" ON public.gamification_events
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = actor_user_id);

-- =============================================================================
-- PART 5: SHOP POLICIES
-- =============================================================================

-- User purchases
DROP POLICY IF EXISTS "user_purchases_select" ON public.user_purchases;
CREATE POLICY "user_purchases_select" ON public.user_purchases
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Player cosmetics SELECT
DROP POLICY IF EXISTS "player_cosmetics_select" ON public.player_cosmetics;
CREATE POLICY "player_cosmetics_select" ON public.player_cosmetics
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Player cosmetics UPDATE
DROP POLICY IF EXISTS "player_cosmetics_update" ON public.player_cosmetics;
CREATE POLICY "player_cosmetics_update" ON public.player_cosmetics
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- PART 6: POWERUP POLICIES
-- =============================================================================

-- User powerup inventory
DROP POLICY IF EXISTS "user_powerup_inventory_select" ON public.user_powerup_inventory;
CREATE POLICY "user_powerup_inventory_select" ON public.user_powerup_inventory
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- User powerup consumptions
DROP POLICY IF EXISTS "user_powerup_consumptions_select" ON public.user_powerup_consumptions;
CREATE POLICY "user_powerup_consumptions_select" ON public.user_powerup_consumptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- User powerup effects
DROP POLICY IF EXISTS "user_powerup_effects_select" ON public.user_powerup_effects;
CREATE POLICY "user_powerup_effects_select" ON public.user_powerup_effects
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- PART 7: MODERATION DOMAIN POLICIES (fix auth.uid())
-- =============================================================================

-- Users can view own reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.content_reports;
CREATE POLICY "Users can view own reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (reported_by_user_id = (SELECT auth.uid()));

-- Users can view own restrictions  
DROP POLICY IF EXISTS "Users can view own restrictions" ON public.user_restrictions;
CREATE POLICY "Users can view own restrictions" ON public.user_restrictions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Moderators policies with EXISTS subquery (these are already optimized by using EXISTS)
-- The auth.uid() inside EXISTS is evaluated once, not per-row, so no change needed

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After applying, run this to verify policies use (SELECT auth.uid()):
--
-- SELECT tablename, policyname, qual::text
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND qual::text LIKE '%auth.uid()%'
-- AND qual::text NOT LIKE '%(SELECT auth.uid())%'
-- AND qual::text NOT LIKE '%select%auth.uid()%';
--
-- Should return 0 rows for optimized tables
-- =============================================================================
