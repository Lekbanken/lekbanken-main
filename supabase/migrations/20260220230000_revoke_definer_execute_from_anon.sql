-- =============================================================================
-- Migration: 20260220230000_revoke_definer_execute_from_anon.sql
-- Description: Revoke unnecessary EXECUTE on SECURITY DEFINER functions
-- =============================================================================
-- CONTEXT: 75 of 95 SECURITY DEFINER functions in public schema had
-- EXECUTE granted to anon (PostgreSQL default). Most should only be
-- callable by service_role, authenticated, or triggers.
--
-- Strategy:
--   1. Revoke EXECUTE from anon on ALL public SECURITY DEFINER functions
--   2. Revoke EXECUTE from authenticated on trigger/cron/internal functions
--   3. Re-grant anon EXECUTE only for get_tenant_id_by_hostname (proxy needs it)
--   4. Keep authenticated on RLS helpers + user-facing RPCs
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Bulk revoke EXECUTE from anon on ALL SECURITY DEFINER functions
-- This is safe because anon should almost never call SECURITY DEFINER functions
-- =============================================================================
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', fn.proname, fn.args);
  END LOOP;
  RAISE NOTICE 'Revoked EXECUTE from anon on all public SECURITY DEFINER functions';
END $$;

-- =============================================================================
-- STEP 2: Re-grant anon EXECUTE for get_tenant_id_by_hostname
-- This is called from proxy.ts middleware using the anon key
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_hostname(text) TO anon;

-- =============================================================================
-- STEP 3: Revoke EXECUTE from authenticated on functions that are ONLY
-- called by service_role (cron jobs, triggers, internal billing)
-- Authenticated users never call these via RPC.
--
-- Uses dynamic loop to avoid hardcoding function signatures (handles
-- overloads and DEFAULT parameters automatically).
-- =============================================================================
DO $$
DECLARE
  fn RECORD;
  -- Functions to revoke from authenticated (never called via user RPC)
  --
  -- VERIFIED: Every function below was grep-checked against all .rpc()
  -- callsites. Functions called via createServerRlsClient (authenticated)
  -- or browser client are NOT in this list.
  --
  -- EXCLUDED (need authenticated EXECUTE):
  --   add_initial_tenant_owner     — browser RPC (OrganisationAdminPage, TenantContext)
  --   admin_award_achievement_v1   — server action via createServerRlsClient
  --   get_tenant_user_ids          — server action via createServerRlsClient
  --   get_scheduled_jobs_status    — route handler via createServerRlsClient
  --   mark_demo_session_converted  — route handler via createServerRlsClient
  --   add_demo_feature_usage       — route handler via createServerRlsClient
  --   learning_prerequisites_met   — server action via createServerRlsClient (NOT a trigger)
  --
  revoke_list text[] := ARRAY[
    -- Trigger functions (PostgreSQL fires these regardless of EXECUTE grants)
    'handle_new_user',
    'enforce_demo_flag_protection',
    'badge_preset_increment_usage',
    'badge_presets_set_updated_at',
    'bundle_items_update_timestamp',
    'game_reactions_set_updated_at',
    'log_translation_change',
    'recalc_plan_total_time_minutes',
    'spatial_artifacts_guard_scope',
    'learning_all_requirements_satisfied',
    'learning_course_completed',
    'learning_requirement_satisfied',

    -- Cron / scheduled functions (called by pg_cron as superuser)
    'check_gdpr_deadlines',
    'cleanup_demo_users',
    'cleanup_trigger_idempotency_keys',
    'escalate_overdue_tickets',
    'process_scheduled_notifications',
    'generate_notification_deliveries',
    'refresh_gamification_daily_summaries_v1',
    'aggregate_usage_for_period',

    -- Internal / billing (only called via service_role client)
    'apply_ticket_routing_rules',
    'expand_bundle_entitlements',
    'log_data_access',
    'log_dunning_action',
    'log_product_event',
    'log_quote_activity',

    -- Admin analytics (called via service_role in admin API routes)
    'admin_get_campaign_analytics_v1'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND p.proname = ANY(revoke_list)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
      fn.proname, fn.args
    );
    RAISE NOTICE 'Revoked authenticated EXECUTE on %(%)', fn.proname, fn.args;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 4: Verification query (run after migration to confirm)
-- =============================================================================
-- SELECT p.proname, 
--   CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'YES' ELSE 'no' END AS anon,
--   CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'YES' ELSE 'no' END AS auth
-- FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.prosecdef = true AND n.nspname = 'public'
-- ORDER BY p.proname;
--
-- Expected: anon=YES only for get_tenant_id_by_hostname
-- Expected: auth=YES for RLS helpers + user RPCs, auth=no for triggers/cron/internal

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- DO $$
-- DECLARE fn RECORD;
-- BEGIN
--   FOR fn IN
--     SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
--     FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
--     WHERE p.prosecdef = true AND n.nspname = 'public'
--   LOOP
--     EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated', fn.proname, fn.args);
--   END LOOP;
-- END $$;

COMMIT;
