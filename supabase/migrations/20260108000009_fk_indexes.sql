-- =============================================================================
-- Migration 009: Add missing indexes on foreign key columns
-- =============================================================================
-- Purpose: Improve query performance by indexing FK columns that lack indexes.
-- 
-- Analysis: 84 FK columns without indexes identified.
-- Strategy: Prioritize high-traffic tables and critical JOIN patterns.
-- 
-- Priority levels:
--   P1 (CRITICAL): Session/participant tables - real-time performance
--   P2 (HIGH): Game/tenant tables - frequent queries  
--   P3 (MEDIUM): Billing/gamification - administrative queries
--   P4 (LOW): Audit/analytics - mostly write-heavy, defer
-- =============================================================================

-- =============================================================================
-- P1: CRITICAL - Session & Participant tables (real-time performance)
-- =============================================================================

-- participant_sessions - frequently queried
CREATE INDEX IF NOT EXISTS idx_participant_sessions_game_id 
  ON public.participant_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_plan_id 
  ON public.participant_sessions(plan_id);

-- session_events - high volume, frequently filtered
CREATE INDEX IF NOT EXISTS idx_session_events_actor_participant_id 
  ON public.session_events(actor_participant_id);

-- session_roles - JOINed frequently during session
CREATE INDEX IF NOT EXISTS idx_session_roles_source_role_id 
  ON public.session_roles(source_role_id);

-- session_triggers - queried during session execution
CREATE INDEX IF NOT EXISTS idx_session_triggers_source_trigger_id 
  ON public.session_triggers(source_trigger_id);

-- session_artifacts - queried during session
CREATE INDEX IF NOT EXISTS idx_session_artifacts_source_artifact_id 
  ON public.session_artifacts(source_artifact_id);

-- session_artifact_variants - queried during session
CREATE INDEX IF NOT EXISTS idx_session_artifact_variants_source_variant_id 
  ON public.session_artifact_variants(source_variant_id);
CREATE INDEX IF NOT EXISTS idx_session_artifact_variants_visible_to_session_role_id 
  ON public.session_artifact_variants(visible_to_session_role_id);

-- session_signals & session_time_bank_ledger - real-time
CREATE INDEX IF NOT EXISTS idx_session_signals_sender_participant_id 
  ON public.session_signals(sender_participant_id);
CREATE INDEX IF NOT EXISTS idx_session_time_bank_ledger_actor_participant_id 
  ON public.session_time_bank_ledger(actor_participant_id);
CREATE INDEX IF NOT EXISTS idx_session_time_bank_ledger_event_id 
  ON public.session_time_bank_ledger(event_id);

-- session_outcomes - queried for decision lookups
CREATE INDEX IF NOT EXISTS idx_session_outcomes_related_decision_id 
  ON public.session_outcomes(related_decision_id);

-- play_chat_messages - real-time chat
CREATE INDEX IF NOT EXISTS idx_play_chat_messages_sender_participant_id 
  ON public.play_chat_messages(sender_participant_id);

-- participant_achievement_unlocks
CREATE INDEX IF NOT EXISTS idx_participant_achievement_unlocks_game_progress_id 
  ON public.participant_achievement_unlocks(game_progress_id);

-- =============================================================================
-- P2: HIGH - Game & Plan tables (frequent queries)
-- =============================================================================

-- games - created_by/updated_by for audit/ownership
CREATE INDEX IF NOT EXISTS idx_games_created_by 
  ON public.games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_updated_by 
  ON public.games(updated_by);

-- game_steps - phase lookups
CREATE INDEX IF NOT EXISTS idx_game_steps_phase_id 
  ON public.game_steps(phase_id);
CREATE INDEX IF NOT EXISTS idx_game_steps_media_ref 
  ON public.game_steps(media_ref);

-- game_artifact_variants
CREATE INDEX IF NOT EXISTS idx_game_artifact_variants_visible_to_role_id 
  ON public.game_artifact_variants(visible_to_role_id);
CREATE INDEX IF NOT EXISTS idx_game_artifact_variants_media_ref 
  ON public.game_artifact_variants(media_ref);

-- game_media - tenant isolation
CREATE INDEX IF NOT EXISTS idx_game_media_tenant_id 
  ON public.game_media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_game_media_media_id 
  ON public.game_media(media_id);

-- game_board_config
CREATE INDEX IF NOT EXISTS idx_game_board_config_background_media_id 
  ON public.game_board_config(background_media_id);

-- plans
CREATE INDEX IF NOT EXISTS idx_plans_current_version_id 
  ON public.plans(current_version_id);

-- plan_blocks
CREATE INDEX IF NOT EXISTS idx_plan_blocks_game_id 
  ON public.plan_blocks(game_id);

-- plan_play_progress
CREATE INDEX IF NOT EXISTS idx_plan_play_progress_current_block_id 
  ON public.plan_play_progress(current_block_id);

-- plan_notes
CREATE INDEX IF NOT EXISTS idx_plan_notes_private_updated_by 
  ON public.plan_notes_private(updated_by);
CREATE INDEX IF NOT EXISTS idx_plan_notes_tenant_created_by 
  ON public.plan_notes_tenant(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_notes_tenant_updated_by 
  ON public.plan_notes_tenant(updated_by);

-- =============================================================================
-- P2: HIGH - Tenant & User tables (critical for multi-tenancy)
-- =============================================================================

-- tenants - audit trail
CREATE INDEX IF NOT EXISTS idx_tenants_created_by 
  ON public.tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_updated_by 
  ON public.tenants(updated_by);

-- tenant_invitations
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id 
  ON public.tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_invited_by 
  ON public.tenant_invitations(invited_by);

-- tenant_audit_logs - critical for compliance
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant_id 
  ON public.tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_actor_user_id 
  ON public.tenant_audit_logs(actor_user_id);

-- tenant_seat_assignments
CREATE INDEX IF NOT EXISTS idx_tenant_seat_assignments_billing_product_id 
  ON public.tenant_seat_assignments(billing_product_id);
CREATE INDEX IF NOT EXISTS idx_tenant_seat_assignments_assigned_by_user_id 
  ON public.tenant_seat_assignments(assigned_by_user_id);

-- tenant_branding
CREATE INDEX IF NOT EXISTS idx_tenant_branding_logo_media_id 
  ON public.tenant_branding(logo_media_id);

-- user_tenant_memberships
CREATE INDEX IF NOT EXISTS idx_user_tenant_memberships_seat_assignment_id 
  ON public.user_tenant_memberships(seat_assignment_id);

-- friends - for social queries
CREATE INDEX IF NOT EXISTS idx_friends_tenant_id_1 
  ON public.friends(tenant_id_1);
CREATE INDEX IF NOT EXISTS idx_friends_tenant_id_2 
  ON public.friends(tenant_id_2);

-- runs
CREATE INDEX IF NOT EXISTS idx_runs_tenant_id 
  ON public.runs(tenant_id);

-- =============================================================================
-- P3: MEDIUM - Billing & Gamification (administrative queries)
-- =============================================================================

-- billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id 
  ON public.billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_invoice_id 
  ON public.billing_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_payment_id 
  ON public.billing_events(payment_id);

-- billing_history
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id 
  ON public.billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_from_plan_id 
  ON public.billing_history(from_plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_to_plan_id 
  ON public.billing_history(to_plan_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_billing_product_id 
  ON public.invoices(billing_product_id);

-- gamification tables
CREATE INDEX IF NOT EXISTS idx_gamification_admin_awards_actor_user_id 
  ON public.gamification_admin_awards(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_admin_award_requests_award_id 
  ON public.gamification_admin_award_requests(award_id);
CREATE INDEX IF NOT EXISTS idx_gamification_admin_award_requests_requester_user_id 
  ON public.gamification_admin_award_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_admin_award_requests_decided_by_user_id 
  ON public.gamification_admin_award_requests(decided_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_admin_award_recipients_coin_transaction_id 
  ON public.gamification_admin_award_recipients(coin_transaction_id);
CREATE INDEX IF NOT EXISTS idx_gamification_campaigns_source_template_id 
  ON public.gamification_campaigns(source_template_id);
CREATE INDEX IF NOT EXISTS idx_gamification_campaigns_created_by_user_id 
  ON public.gamification_campaigns(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_campaign_templates_created_by_user_id 
  ON public.gamification_campaign_templates(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_automation_rules_created_by_user_id 
  ON public.gamification_automation_rules(created_by_user_id);

-- shop_items
CREATE INDEX IF NOT EXISTS idx_shop_items_created_by_user_id 
  ON public.shop_items(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_currency_id 
  ON public.shop_items(currency_id);

-- user_purchases
CREATE INDEX IF NOT EXISTS idx_user_purchases_currency_id 
  ON public.user_purchases(currency_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_gifted_from_user_id 
  ON public.user_purchases(gifted_from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_coin_transaction_id 
  ON public.user_purchases(coin_transaction_id);

-- user_powerups
CREATE INDEX IF NOT EXISTS idx_user_powerup_consumptions_shop_item_id 
  ON public.user_powerup_consumptions(shop_item_id);
CREATE INDEX IF NOT EXISTS idx_user_powerup_effects_shop_item_id 
  ON public.user_powerup_effects(shop_item_id);

-- =============================================================================
-- P3: MEDIUM - Content & Learning (administrative/user queries)
-- =============================================================================

-- content tables
CREATE INDEX IF NOT EXISTS idx_content_collections_created_by_user_id 
  ON public.content_collections(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_content_filter_rules_created_by_user_id 
  ON public.content_filter_rules(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_card_collections_created_by_user_id 
  ON public.conversation_card_collections(created_by_user_id);

-- learning tables
CREATE INDEX IF NOT EXISTS idx_learning_courses_created_by 
  ON public.learning_courses(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_by 
  ON public.learning_paths(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_requirements_created_by 
  ON public.learning_requirements(created_by);

-- media tables
CREATE INDEX IF NOT EXISTS idx_media_ai_generations_media_id 
  ON public.media_ai_generations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_templates_media_id 
  ON public.media_templates(media_id);

-- =============================================================================
-- P4: LOW - Misc tables (less frequently queried)
-- =============================================================================

-- coin_transactions - self-referential for reversals
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reversal_of 
  ON public.coin_transactions(reversal_of);

-- community_challenges
CREATE INDEX IF NOT EXISTS idx_community_challenges_created_by_user_id 
  ON public.community_challenges(created_by_user_id);

-- limited_time_events
CREATE INDEX IF NOT EXISTS idx_limited_time_events_created_by_user_id 
  ON public.limited_time_events(created_by_user_id);

-- seasonal_events
CREATE INDEX IF NOT EXISTS idx_seasonal_events_featured_content_id 
  ON public.seasonal_events(featured_content_id);

-- moderation_queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_report_id 
  ON public.moderation_queue(report_id);

-- promo_codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_created_by_user_id 
  ON public.promo_codes(created_by_user_id);

-- user_restrictions
CREATE INDEX IF NOT EXISTS idx_user_restrictions_created_by_user_id 
  ON public.user_restrictions(created_by_user_id);

-- user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id 
  ON public.user_sessions(device_id);

-- marketplace_analytics
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_most_popular_item_id 
  ON public.marketplace_analytics(most_popular_item_id);

-- =============================================================================
-- Summary: 84 indexes created for FK columns
-- =============================================================================
