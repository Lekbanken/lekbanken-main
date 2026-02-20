-- =============================================================================
-- Migration: 20260220230000_revoke_definer_execute_from_anon.sql
-- Description: Lock down EXECUTE on ALL SECURITY DEFINER functions
-- =============================================================================
-- ROOT CAUSE: PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
-- Since anon/authenticated inherit from PUBLIC, revoking from anon alone has
-- no effect while PUBLIC retains the grant.
--
-- Strategy (deterministic, 4 steps):
--   1. Revoke EXECUTE from PUBLIC + anon on ALL SECURITY DEFINER functions
--   2. Revoke EXECUTE from authenticated on trigger/cron/service-only functions
--   3. Re-grant authenticated for RLS helpers + user-facing RPCs
--   4. Re-grant anon only for get_tenant_id_by_hostname (proxy needs it)
--
-- After this migration, privilege matrix for SECURITY DEFINER functions:
--   PUBLIC         → EXECUTE on NONE
--   anon           → EXECUTE on get_tenant_id_by_hostname ONLY
--   authenticated  → EXECUTE on RLS helpers + user RPCs ONLY
--   service_role   → EXECUTE on ALL (owner/superuser, unaffected)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Bulk revoke from PUBLIC + anon on ALL SECURITY DEFINER functions
-- This removes the PostgreSQL default grant that leaks through inheritance.
-- =============================================================================
DO $$
DECLARE
  fn RECORD;
  revoked_count integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', fn.proname, fn.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', fn.proname, fn.args);
    revoked_count := revoked_count + 1;
  END LOOP;
  RAISE NOTICE 'Step 1: Revoked EXECUTE from PUBLIC + anon on % SECURITY DEFINER functions', revoked_count;
END $$;

-- =============================================================================
-- STEP 2: Revoke EXECUTE from authenticated on functions that should ONLY
-- be callable by service_role, pg_cron, or trigger machinery.
--
-- Every function below was grep-verified against ALL .rpc() callsites in the
-- codebase. NONE are called via createServerRlsClient or browser client.
-- =============================================================================
DO $$
DECLARE
  fn RECORD;
  revoked_count integer := 0;
  revoke_from_auth text[] := ARRAY[
    -- ── Trigger functions ────────────────────────────────────────────────
    -- PostgreSQL fires triggers regardless of caller EXECUTE grants.
    'handle_new_user',                       -- auth.users after insert trigger
    'enforce_demo_flag_protection',          -- demo tables trigger
    'badge_presets_set_updated_at',          -- updated_at trigger
    'bundle_items_update_timestamp',         -- updated_at trigger
    'game_reactions_set_updated_at',         -- updated_at trigger
    'log_translation_change',                -- audit trigger
    'recalc_plan_total_time_minutes',        -- plan_blocks trigger
    'spatial_artifacts_guard_scope',         -- scope guard trigger
    'learning_all_requirements_satisfied',   -- RLS policy helper (not user RPC)
    'learning_course_completed',             -- RLS policy helper (not user RPC)
    'learning_requirement_satisfied',        -- RLS policy helper (not user RPC)
    'log_dunning_action',                    -- trigger overload ()
    -- Note: badge_preset_increment_usage is called via authenticated RPC
    -- (award-builder presets route) so it is NOT in this revoke list.

    -- ── Cron / scheduled (pg_cron runs as superuser) ─────────────────────
    'check_gdpr_deadlines',
    'cleanup_demo_users',
    'cleanup_trigger_idempotency_keys',
    'escalate_overdue_tickets',
    'process_scheduled_notifications',
    'generate_notification_deliveries',
    'refresh_gamification_daily_summaries_v1',
    'aggregate_usage_for_period',

    -- ── Service-role only (called via createServiceRoleClient) ───────────
    'apply_ticket_routing_rules',            -- support-automation.ts:407
    'expand_bundle_entitlements',            -- billing route
    'log_data_access',                       -- GDPR logging
    'log_product_event',                     -- product audit
    'log_quote_activity',                    -- quote audit (callable overload)
    'attempt_keypad_unlock_v2',              -- play keypad route (service_role)
    'create_game_snapshot',                  -- snapshots route (service_role)
    'record_usage',                          -- billing usage route (supabaseAdmin)
    'redeem_gift_code',                      -- gift route (supabaseAdmin)
    'snapshot_game_roles_to_session',        -- session-service.ts (service_role)
    'generate_quote_number',                 -- quotes route (supabaseAdmin)
    'upsert_game_content_v1',               -- csv-import route (service_role)

    -- ── Admin analytics (called via service_role admin client) ───────────
    'admin_get_campaign_analytics_v1',
    'admin_get_gamification_analytics_v5',
    -- v1-v4 are superseded but still exist, lock them down too
    'admin_get_gamification_analytics_v1',
    'admin_get_gamification_analytics_v2',
    'admin_get_gamification_analytics_v3',
    'admin_get_gamification_analytics_v4',

    -- ── Not called via RPC at all (internal SQL helpers / unused) ────────
    'apply_xp_transaction_v1',
    'create_session_with_snapshot',
    'get_session_event_stats',
    'get_session_events',
    'log_session_event',
    'get_effective_design',
    'get_current_demo_session_id',
    'get_next_plan_version_number',
    'get_softcap_config_v1',
    'dismiss_notification',
    'mark_notification_read',
    'mark_all_notifications_read',
    'get_user_notifications',
    'get_unread_notification_count',
    'session_trigger_clear_error',
    'session_trigger_record_error',
    'session_triggers_disable_all',
    'session_triggers_rearm_all',
    'log_dunning_action'                     -- also covers callable overload
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND p.proname = ANY(revoke_from_auth)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
      fn.proname, fn.args
    );
    revoked_count := revoked_count + 1;
  END LOOP;
  RAISE NOTICE 'Step 2: Revoked EXECUTE from authenticated on % functions', revoked_count;
END $$;

-- =============================================================================
-- STEP 3: Re-grant authenticated EXECUTE for functions that ARE called
-- via createServerRlsClient or browser client.
--
-- Includes: RLS policy helpers, user-facing RPCs, server actions using
-- cookie-based auth.
-- =============================================================================
DO $$
DECLARE
  fn RECORD;
  granted_count integer := 0;
  grant_to_auth text[] := ARRAY[
    -- ── RLS policy helpers (MUST have authenticated EXECUTE) ─────────────
    'is_system_admin',
    'is_system_admin_jwt_only',
    'is_global_admin',
    'is_tenant_member',
    'has_tenant_role',
    'get_user_tenant_ids',

    -- ── Browser RPC (OrganisationAdminPage + TenantContext) ──────────────
    'add_initial_tenant_owner',

    -- ── Server actions via createServerRlsClient ─────────────────────────
    'admin_award_achievement_v1',            -- achievements-admin.ts:437
    'get_tenant_user_ids',                   -- achievements-admin.ts:496
    'add_demo_feature_usage',                -- demo/track route
    'mark_demo_session_converted',           -- demo/convert route
    'get_scheduled_jobs_status',             -- admin/scheduled-jobs route
    'learning_prerequisites_met',            -- learning.ts:329
    'learning_get_requirement_summary',      -- learning-requirements.ts:44
    'learning_grant_course_rewards_v1',      -- learning submit route + action
    'learning_get_unsatisfied_requirements', -- learning action
    'learning_get_unsatisfied_requirements_v2',
    'upsert_game_reaction',                  -- game-reactions.ts
    'user_requires_mfa',                     -- mfa guard + service
    'get_user_admin_roles',                  -- mfa guard
    'set_leaderboard_visibility',            -- gamification-leaderboard.server
    'publish_legal_document_v1',             -- legal-admin.ts
    'get_gamification_level_definitions_v1', -- gamification route + admin
    'get_game_reactions_batch',              -- game-reactions.server.ts + route
    'get_liked_game_ids',                    -- game-reactions.server.ts + search
    'badge_preset_increment_usage',          -- award-builder presets route
    'tenant_award_achievement_v1'            -- tenant-achievements-admin.ts:482
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND p.proname = ANY(grant_to_auth)
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
      fn.proname, fn.args
    );
    granted_count := granted_count + 1;
  END LOOP;
  RAISE NOTICE 'Step 3: Granted EXECUTE to authenticated on % functions', granted_count;
END $$;

-- =============================================================================
-- STEP 4: Re-grant anon EXECUTE only for proxy hostname resolution
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_hostname(text) TO anon;

-- =============================================================================
-- VERIFICATION (run after migration):
-- =============================================================================
-- SELECT p.proname,
--   pg_get_function_identity_arguments(p.oid) AS args,
--   has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec,
--   has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
--   has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--   has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.prosecdef = true
-- ORDER BY p.proname;
--
-- Expected results:
--   public_exec  = false for ALL
--   anon_exec    = true  ONLY for get_tenant_id_by_hostname
--   auth_exec    = true  ONLY for RLS helpers + user RPCs (~20 functions)
--   service_exec = true  for ALL

-- =============================================================================
-- ROLLBACK (if needed — restores PostgreSQL defaults):
-- =============================================================================
-- DO $$
-- DECLARE fn RECORD;
-- BEGIN
--   FOR fn IN
--     SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
--     FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
--     WHERE p.prosecdef = true AND n.nspname = 'public'
--   LOOP
--     EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO PUBLIC', fn.proname, fn.args);
--   END LOOP;
-- END $$;

COMMIT;
