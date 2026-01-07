-- Migration 019: auth.uid() initplan optimization batch 2
-- This migration uses DO blocks to safely handle tables that may or may not exist
-- Focuses on tables that definitely exist based on migration files

-- =============================================================================
-- GAMES - Core game tables (these definitely exist)
-- =============================================================================

-- game_sessions: users_can_update_own_game_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_can_update_own_game_sessions" ON public.game_sessions';
    EXECUTE 'CREATE POLICY "game_sessions_update" ON public.game_sessions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- game_translations: read_game_translations
DROP POLICY IF EXISTS "read_game_translations" ON public.game_translations;
CREATE POLICY "game_translations_select" ON public.game_translations
  FOR SELECT TO authenticated
  USING (true);

-- game_media: read_game_media
DROP POLICY IF EXISTS "read_game_media" ON public.game_media;
CREATE POLICY "game_media_select" ON public.game_media
  FOR SELECT TO authenticated
  USING (true);

-- game_phases policies (uses owner_tenant_id)
DROP POLICY IF EXISTS "game_phases_insert" ON public.game_phases;
DROP POLICY IF EXISTS "game_phases_update" ON public.game_phases;
DROP POLICY IF EXISTS "game_phases_delete" ON public.game_phases;

CREATE POLICY "game_phases_write" ON public.game_phases
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- game_roles: game_roles_manage
DROP POLICY IF EXISTS "game_roles_manage" ON public.game_roles;
CREATE POLICY "game_roles_manage" ON public.game_roles
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- game_board_config: game_board_config_manage
DROP POLICY IF EXISTS "game_board_config_manage" ON public.game_board_config;
CREATE POLICY "game_board_config_manage" ON public.game_board_config
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- game_triggers: game_triggers_manage
DROP POLICY IF EXISTS "game_triggers_manage" ON public.game_triggers;
CREATE POLICY "game_triggers_manage" ON public.game_triggers
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- game_tools: game_tools_manage
DROP POLICY IF EXISTS "game_tools_manage" ON public.game_tools;
CREATE POLICY "game_tools_manage" ON public.game_tools
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- game_snapshots
DROP POLICY IF EXISTS "game_snapshots_select" ON public.game_snapshots;
DROP POLICY IF EXISTS "game_snapshots_insert" ON public.game_snapshots;
CREATE POLICY "game_snapshots_select" ON public.game_snapshots
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "game_snapshots_insert" ON public.game_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.games g 
      WHERE g.id = game_id 
      AND has_tenant_role(g.owner_tenant_id, 'admin'::public.tenant_role_enum)
    )
  );

-- =============================================================================
-- SHOP (shop_items uses status enum, not is_active boolean)
-- =============================================================================

-- shop_items: shop_items_select - allow all authenticated to read
DROP POLICY IF EXISTS "shop_items_select" ON public.shop_items;
CREATE POLICY "shop_items_select" ON public.shop_items
  FOR SELECT TO authenticated
  USING (true);

-- promo_codes: promo_codes_select - allow all authenticated to read
DROP POLICY IF EXISTS "promo_codes_select" ON public.promo_codes;
CREATE POLICY "promo_codes_select" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (true);

-- user_currency_balances (user_coins is the correct table based on schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_currency_balances') THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_currency_balances_select" ON public.user_currency_balances';
    EXECUTE 'DROP POLICY IF EXISTS "user_currency_balances_insert" ON public.user_currency_balances';
    EXECUTE 'DROP POLICY IF EXISTS "user_currency_balances_update" ON public.user_currency_balances';
    EXECUTE 'CREATE POLICY "user_currency_balances_select" ON public.user_currency_balances FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_system_admin())';
    EXECUTE 'CREATE POLICY "user_currency_balances_insert" ON public.user_currency_balances FOR INSERT TO authenticated WITH CHECK (is_system_admin())';
    EXECUTE 'CREATE POLICY "user_currency_balances_update" ON public.user_currency_balances FOR UPDATE TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

-- =============================================================================
-- ACHIEVEMENTS
-- =============================================================================

-- achievements: authenticated_can_select_achievements
DROP POLICY IF EXISTS "authenticated_can_select_achievements" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements
  FOR SELECT TO authenticated
  USING (true);

-- user_achievements: system_can_insert_user_achievements
DROP POLICY IF EXISTS "system_can_insert_user_achievements" ON public.user_achievements;
CREATE POLICY "user_achievements_insert" ON public.user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- challenge_participation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'challenge_participation') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own participation" ON public.challenge_participation';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create participation" ON public.challenge_participation';
    EXECUTE 'CREATE POLICY "challenge_participation_select" ON public.challenge_participation FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "challenge_participation_insert" ON public.challenge_participation FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- community_challenges
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_challenges') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view challenges" ON public.community_challenges';
    EXECUTE 'CREATE POLICY "community_challenges_select" ON public.community_challenges FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- limited_time_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'limited_time_events') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view events" ON public.limited_time_events';
    EXECUTE 'CREATE POLICY "limited_time_events_select" ON public.limited_time_events FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- event_rewards
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_rewards') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own rewards" ON public.event_rewards';
    EXECUTE 'CREATE POLICY "event_rewards_select" ON public.event_rewards FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- seasonal_achievements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seasonal_achievements') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view seasonal achievements" ON public.seasonal_achievements';
    EXECUTE 'CREATE POLICY "seasonal_achievements_select" ON public.seasonal_achievements FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- achievement_leaderboards
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievement_leaderboards') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view achievement leaderboards" ON public.achievement_leaderboards';
    EXECUTE 'CREATE POLICY "achievement_leaderboards_select" ON public.achievement_leaderboards FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =============================================================================
-- MEDIA (media table doesn't have uploaded_by, use tenant-based access)
-- =============================================================================

-- media policies - system admin only for write operations
DROP POLICY IF EXISTS "insert_media_enhanced" ON public.media;
DROP POLICY IF EXISTS "update_media_enhanced" ON public.media;
DROP POLICY IF EXISTS "delete_media_enhanced" ON public.media;

CREATE POLICY "media_insert" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

CREATE POLICY "media_update" ON public.media
  FOR UPDATE TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

CREATE POLICY "media_delete" ON public.media
  FOR DELETE TO authenticated
  USING (is_system_admin());

-- media_templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media_templates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "manage_media_templates" ON public.media_templates';
    EXECUTE 'CREATE POLICY "media_templates_manage" ON public.media_templates FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

-- media_ai_generations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media_ai_generations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "select_own_ai_generations" ON public.media_ai_generations';
    EXECUTE 'DROP POLICY IF EXISTS "insert_own_ai_generations" ON public.media_ai_generations';
    EXECUTE 'DROP POLICY IF EXISTS "update_own_ai_generations" ON public.media_ai_generations';
    EXECUTE 'CREATE POLICY "media_ai_generations_select" ON public.media_ai_generations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_system_admin())';
    EXECUTE 'CREATE POLICY "media_ai_generations_insert" ON public.media_ai_generations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "media_ai_generations_update" ON public.media_ai_generations FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- marketplace_analytics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketplace_analytics') THEN
    EXECUTE 'DROP POLICY IF EXISTS "marketplace_analytics_select" ON public.marketplace_analytics';
    EXECUTE 'DROP POLICY IF EXISTS "marketplace_analytics_insert" ON public.marketplace_analytics';
    EXECUTE 'CREATE POLICY "marketplace_analytics_select" ON public.marketplace_analytics FOR SELECT TO authenticated USING (is_system_admin())';
    EXECUTE 'CREATE POLICY "marketplace_analytics_insert" ON public.marketplace_analytics FOR INSERT TO authenticated WITH CHECK (is_system_admin())';
  END IF;
END $$;

-- =============================================================================
-- PERSONALIZATION & PREFERENCES
-- =============================================================================

-- user_preferences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_preferences_user_select" ON public.user_preferences';
    EXECUTE 'DROP POLICY IF EXISTS "user_preferences_user_update" ON public.user_preferences';
    EXECUTE 'CREATE POLICY "user_preferences_select" ON public.user_preferences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "user_preferences_update" ON public.user_preferences FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- saved_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "saved_items_user_select" ON public.saved_items';
    EXECUTE 'DROP POLICY IF EXISTS "saved_items_user_crud" ON public.saved_items';
    EXECUTE 'CREATE POLICY "saved_items_select" ON public.saved_items FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "saved_items_manage" ON public.saved_items FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- interest_profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'interest_profiles') THEN
    EXECUTE 'DROP POLICY IF EXISTS "interest_profiles_user_select" ON public.interest_profiles';
    EXECUTE 'CREATE POLICY "interest_profiles_select" ON public.interest_profiles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- content_preferences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_preferences') THEN
    EXECUTE 'DROP POLICY IF EXISTS "content_preferences_user_crud" ON public.content_preferences';
    EXECUTE 'CREATE POLICY "content_preferences_manage" ON public.content_preferences FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- personalization_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'personalization_events') THEN
    EXECUTE 'DROP POLICY IF EXISTS "personalization_events_user_insert" ON public.personalization_events';
    EXECUTE 'DROP POLICY IF EXISTS "personalization_events_user_select" ON public.personalization_events';
    EXECUTE 'CREATE POLICY "personalization_events_insert" ON public.personalization_events FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "personalization_events_select" ON public.personalization_events FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_system_admin())';
  END IF;
END $$;

-- recommendation_history
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recommendation_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "recommendation_history_user_select" ON public.recommendation_history';
    EXECUTE 'DROP POLICY IF EXISTS "recommendation_history_user_update" ON public.recommendation_history';
    EXECUTE 'CREATE POLICY "recommendation_history_select" ON public.recommendation_history FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'CREATE POLICY "recommendation_history_update" ON public.recommendation_history FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- =============================================================================
-- ANALYTICS
-- =============================================================================

-- page_views
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'page_views') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_can_insert_page_views" ON public.page_views';
    EXECUTE 'CREATE POLICY "page_views_insert" ON public.page_views FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- session_analytics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_analytics') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_can_insert_sessions" ON public.session_analytics';
    EXECUTE 'CREATE POLICY "session_analytics_insert" ON public.session_analytics FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- feature_usage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_usage') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_can_insert_feature_usage" ON public.feature_usage';
    EXECUTE 'CREATE POLICY "feature_usage_insert" ON public.feature_usage FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- funnel_analytics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'funnel_analytics') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_can_insert_funnels" ON public.funnel_analytics';
    EXECUTE 'CREATE POLICY "funnel_analytics_insert" ON public.funnel_analytics FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END $$;

-- ticket_messages
DROP POLICY IF EXISTS "users_can_insert_ticket_messages" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- content_reports (column: reported_by_user_id)
DROP POLICY IF EXISTS "Users can create reports" ON public.content_reports;
CREATE POLICY "content_reports_insert" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reported_by_user_id = (SELECT auth.uid()));
