-- Migration 018: auth.uid() initplan optimization batch 1
-- Wraps auth.uid() in (SELECT ...) for better query planning performance
-- This batch covers: gamification, feedback, friends, error_tracking, multiplayer, browse, plans, billing, notifications

-- =============================================================================
-- GAMIFICATION TABLES
-- =============================================================================

-- gamification_campaigns: gamification_campaigns_service_all
DROP POLICY IF EXISTS "gamification_campaigns_service_all" ON public.gamification_campaigns;
CREATE POLICY "gamification_campaigns_service_all" ON public.gamification_campaigns
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_admin_award_requests
DROP POLICY IF EXISTS "gamification_admin_award_requests_service_all" ON public.gamification_admin_award_requests;
CREATE POLICY "gamification_admin_award_requests_service_all" ON public.gamification_admin_award_requests
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_admin_award_request_recipients
DROP POLICY IF EXISTS "gamification_admin_award_request_recipients_service_all" ON public.gamification_admin_award_request_recipients;
CREATE POLICY "gamification_admin_award_request_recipients_service_all" ON public.gamification_admin_award_request_recipients
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_automation_rules
DROP POLICY IF EXISTS "gamification_automation_rules_service_all" ON public.gamification_automation_rules;
CREATE POLICY "gamification_automation_rules_service_all" ON public.gamification_automation_rules
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_daily_summaries
DROP POLICY IF EXISTS "gamification_daily_summaries_service_all" ON public.gamification_daily_summaries;
CREATE POLICY "gamification_daily_summaries_service_all" ON public.gamification_daily_summaries
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_campaign_templates
DROP POLICY IF EXISTS "gamification_campaign_templates_service_all" ON public.gamification_campaign_templates;
CREATE POLICY "gamification_campaign_templates_service_all" ON public.gamification_campaign_templates
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- gamification_level_definitions
DROP POLICY IF EXISTS "service_can_modify_level_definitions" ON public.gamification_level_definitions;
CREATE POLICY "gamification_level_definitions_admin" ON public.gamification_level_definitions
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- =============================================================================
-- FEEDBACK & FRIENDS
-- =============================================================================

-- feedback: users_can_update_own_feedback
DROP POLICY IF EXISTS "users_can_update_own_feedback" ON public.feedback;
CREATE POLICY "users_can_update_own_feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- friends: Users can view their own friendships (columns are user_id_1, user_id_2)
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
CREATE POLICY "friends_select_own" ON public.friends
  FOR SELECT TO authenticated
  USING (
    user_id_1 = (SELECT auth.uid()) 
    OR user_id_2 = (SELECT auth.uid())
  );

-- friends: Users can remove friendships  
DROP POLICY IF EXISTS "Users can remove friendships" ON public.friends;
CREATE POLICY "friends_delete_own" ON public.friends
  FOR DELETE TO authenticated
  USING (
    user_id_1 = (SELECT auth.uid()) 
    OR user_id_2 = (SELECT auth.uid())
  );

-- friends: service_role_insert_friends
DROP POLICY IF EXISTS "service_role_insert_friends" ON public.friends;
CREATE POLICY "friends_service_insert" ON public.friends
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- friend_requests: Users can view their friend requests (columns are requester_id, recipient_id)
DROP POLICY IF EXISTS "Users can view their friend requests" ON public.friend_requests;
CREATE POLICY "friend_requests_select" ON public.friend_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = (SELECT auth.uid()) 
    OR recipient_id = (SELECT auth.uid())
  );

-- friend_requests: Users can create friend requests
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "friend_requests_insert" ON public.friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()));

-- friend_requests: Users can update their received requests
DROP POLICY IF EXISTS "Users can update their received requests" ON public.friend_requests;
CREATE POLICY "friend_requests_update" ON public.friend_requests
  FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

-- =============================================================================
-- ERROR TRACKING & BROWSE
-- =============================================================================

-- error_tracking: users_can_insert_errors
DROP POLICY IF EXISTS "users_can_insert_errors" ON public.error_tracking;
CREATE POLICY "error_tracking_insert" ON public.error_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- browse_search_logs: users_can_insert_search_logs
DROP POLICY IF EXISTS "users_can_insert_search_logs" ON public.browse_search_logs;
CREATE POLICY "browse_search_logs_insert" ON public.browse_search_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- MULTIPLAYER
-- =============================================================================

-- social_leaderboards: Users can view leaderboards for their tenant
DROP POLICY IF EXISTS "Users can view leaderboards for their tenant" ON public.social_leaderboards;
CREATE POLICY "social_leaderboards_select" ON public.social_leaderboards
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()));

-- multiplayer_sessions: Users can create multiplayer sessions (column: created_by_user_id)
DROP POLICY IF EXISTS "Users can create multiplayer sessions" ON public.multiplayer_sessions;
CREATE POLICY "multiplayer_sessions_insert" ON public.multiplayer_sessions
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = (SELECT auth.uid()));

-- multiplayer_sessions: Users can update their own sessions
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.multiplayer_sessions;
CREATE POLICY "multiplayer_sessions_update" ON public.multiplayer_sessions
  FOR UPDATE TO authenticated
  USING (created_by_user_id = (SELECT auth.uid()))
  WITH CHECK (created_by_user_id = (SELECT auth.uid()));

-- multiplayer_participants: Users can join sessions
DROP POLICY IF EXISTS "Users can join sessions" ON public.multiplayer_participants;
CREATE POLICY "multiplayer_participants_insert" ON public.multiplayer_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- multiplayer_participants: service_role_update_multiplayer_participants
DROP POLICY IF EXISTS "service_role_update_multiplayer_participants" ON public.multiplayer_participants;
CREATE POLICY "multiplayer_participants_service_update" ON public.multiplayer_participants
  FOR UPDATE TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- =============================================================================
-- PLANS (column: owner_user_id)
-- =============================================================================

-- plans: users_can_select_plans
DROP POLICY IF EXISTS "users_can_select_plans" ON public.plans;
CREATE POLICY "plans_select" ON public.plans
  FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- plans: users_can_insert_plans
DROP POLICY IF EXISTS "users_can_insert_plans" ON public.plans;
CREATE POLICY "plans_insert" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- plans: users_can_update_own_plans
DROP POLICY IF EXISTS "users_can_update_own_plans" ON public.plans;
CREATE POLICY "plans_update" ON public.plans
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- plans: users_can_delete_own_plans
DROP POLICY IF EXISTS "users_can_delete_own_plans" ON public.plans;
CREATE POLICY "plans_delete" ON public.plans
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- plan_blocks: manage_plan_blocks
DROP POLICY IF EXISTS "manage_plan_blocks" ON public.plan_blocks;
CREATE POLICY "plan_blocks_manage" ON public.plan_blocks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

-- plan_blocks: users_can_select_plan_blocks
DROP POLICY IF EXISTS "users_can_select_plan_blocks" ON public.plan_blocks;
CREATE POLICY "plan_blocks_select" ON public.plan_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- plan_notes_private: manage_private_plan_notes (join to plans for owner check)
DROP POLICY IF EXISTS "manage_private_plan_notes" ON public.plan_notes_private;
CREATE POLICY "plan_notes_private_manage" ON public.plan_notes_private
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

-- plan_notes_tenant: manage_tenant_plan_notes
DROP POLICY IF EXISTS "manage_tenant_plan_notes" ON public.plan_notes_tenant;
CREATE POLICY "plan_notes_tenant_manage" ON public.plan_notes_tenant
  FOR ALL TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

-- plan_play_progress: manage_plan_play_progress (has user_id column)
DROP POLICY IF EXISTS "manage_plan_play_progress" ON public.plan_play_progress;
CREATE POLICY "plan_play_progress_manage" ON public.plan_play_progress
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- plan_versions: users_can_select_plan_versions
DROP POLICY IF EXISTS "users_can_select_plan_versions" ON public.plan_versions;
CREATE POLICY "plan_versions_select" ON public.plan_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

-- plan_versions: plan_owner_can_insert_versions
DROP POLICY IF EXISTS "plan_owner_can_insert_versions" ON public.plan_versions;
CREATE POLICY "plan_versions_insert" ON public.plan_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p 
      WHERE p.id = plan_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

-- plan_version_blocks: plan_owner_can_insert_version_blocks (column: plan_version_id)
DROP POLICY IF EXISTS "plan_owner_can_insert_version_blocks" ON public.plan_version_blocks;
CREATE POLICY "plan_version_blocks_insert" ON public.plan_version_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_versions pv
      JOIN public.plans p ON p.id = pv.plan_id
      WHERE pv.id = plan_version_id 
      AND p.owner_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- BILLING
-- =============================================================================

-- product_purposes: authenticated_can_select_product_purposes
DROP POLICY IF EXISTS "authenticated_can_select_product_purposes" ON public.product_purposes;
CREATE POLICY "product_purposes_select" ON public.product_purposes
  FOR SELECT TO authenticated
  USING (true);

-- billing_products: authenticated_can_select_active_billing_products
DROP POLICY IF EXISTS "authenticated_can_select_active_billing_products" ON public.billing_products;
CREATE POLICY "billing_products_select" ON public.billing_products
  FOR SELECT TO authenticated
  USING (is_active = true);

-- billing_product_features: billing_product_features_select
DROP POLICY IF EXISTS "billing_product_features_select" ON public.billing_product_features;
CREATE POLICY "billing_product_features_select" ON public.billing_product_features
  FOR SELECT TO authenticated
  USING (true);

-- private_subscriptions: users_can_select_own_private_subscriptions
DROP POLICY IF EXISTS "users_can_select_own_private_subscriptions" ON public.private_subscriptions;
DROP POLICY IF EXISTS "private_subscriptions_manage" ON public.private_subscriptions;
CREATE POLICY "private_subscriptions_select" ON public.private_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_system_admin());

CREATE POLICY "private_subscriptions_manage" ON public.private_subscriptions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_system_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR is_system_admin());

-- subscriptions: Users can view their tenant subscriptions
DROP POLICY IF EXISTS "Users can view their tenant subscriptions" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()) OR is_system_admin());

-- subscriptions: service_role_insert_subscriptions
DROP POLICY IF EXISTS "service_role_insert_subscriptions" ON public.subscriptions;
CREATE POLICY "subscriptions_service_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- billing_history: Users can view their billing history
DROP POLICY IF EXISTS "Users can view their billing history" ON public.billing_history;
CREATE POLICY "billing_history_select" ON public.billing_history
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()) OR is_system_admin());

-- billing_history: service_role_insert_billing_history
DROP POLICY IF EXISTS "service_role_insert_billing_history" ON public.billing_history;
CREATE POLICY "billing_history_service_insert" ON public.billing_history
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- trial_usage: Users can view their trial usage
DROP POLICY IF EXISTS "Users can view their trial usage" ON public.trial_usage;
CREATE POLICY "trial_usage_select" ON public.trial_usage
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()) OR is_system_admin());

-- trial_usage: service_role_insert_trial_usage
DROP POLICY IF EXISTS "service_role_insert_trial_usage" ON public.trial_usage;
CREATE POLICY "trial_usage_service_insert" ON public.trial_usage
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- trial_usage: service_role_update_trial_usage
DROP POLICY IF EXISTS "service_role_update_trial_usage" ON public.trial_usage;
CREATE POLICY "trial_usage_service_update" ON public.trial_usage
  FOR UPDATE TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- payment_methods: Users can view their tenant payment methods
DROP POLICY IF EXISTS "Users can view their tenant payment methods" ON public.payment_methods;
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(get_user_tenant_ids()) OR is_system_admin());

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

-- notifications: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- notifications: Users can update their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notifications: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- notifications: service_role_insert_notifications
DROP POLICY IF EXISTS "service_role_insert_notifications" ON public.notifications;
CREATE POLICY "notifications_service_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());

-- notification_preferences: Users can view their own preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- notification_preferences: Users can create their own preferences
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.notification_preferences;
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notification_preferences: Users can update their own preferences
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "notification_preferences_update" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notification_log: service_role_insert_notification_log
DROP POLICY IF EXISTS "service_role_insert_notification_log" ON public.notification_log;
CREATE POLICY "notification_log_service_insert" ON public.notification_log
  FOR INSERT TO authenticated
  WITH CHECK (is_system_admin());
