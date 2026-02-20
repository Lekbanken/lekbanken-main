-- Migration: Fix RLS policy initplan pattern + SECURITY DEFINER search_path
-- Date: 2026-02-20
-- Scope: Performance + Security hardening (no functional changes)
--
-- BATCH 1 (already applied):
--   19 RLS policies + 6 SECURITY DEFINER functions
--
-- BATCH 2:
--   15 remaining bare auth.uid() policies found via post-migration verification
--   + 1 SECURITY DEFINER function (spatial_artifacts_guard_scope)
--
-- BATCH 3:
--   16 remaining bare auth.uid() policies found after fixing verification
--   query regex (PostgreSQL decompiles (SELECT auth.uid()) as
--   "( SELECT auth.uid() AS uid)" — the AS alias broke the regex).
--
-- Each policy below was manually reviewed against its source migration.
-- All ALTER POLICY statements are idempotent (safe to re-run).

BEGIN;

-- ============================================================================
-- BATCH 1: Original 19 policies + 6 functions (already applied 2026-02-20)
-- ============================================================================

-- cookie_consent_audit -------------------------------------------------------
ALTER POLICY "cookie_consent_audit_admin_read" ON cookie_consent_audit
  USING (is_system_admin() OR (user_id = (SELECT auth.uid())));

-- cookie_consents ------------------------------------------------------------
ALTER POLICY "cookie_consents_insert" ON cookie_consents
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "cookie_consents_select" ON cookie_consents
  USING ((user_id = (SELECT auth.uid())) OR is_system_admin());

ALTER POLICY "cookie_consents_update" ON cookie_consents
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- demo_sessions --------------------------------------------------------------
ALTER POLICY "users_view_own_demo_sessions" ON demo_sessions
  USING (user_id = (SELECT auth.uid()));

-- dunning_actions ------------------------------------------------------------
ALTER POLICY "dunning_actions_select_own" ON dunning_actions
  USING (
    payment_failure_id IN (
      SELECT pf.id
      FROM payment_failures pf
      WHERE pf.tenant_id IN (
        SELECT utm.tenant_id
        FROM user_tenant_memberships utm
        WHERE utm.user_id = (SELECT auth.uid())
          AND utm.role = ANY(ARRAY['owner'::tenant_role_enum, 'admin'::tenant_role_enum])
          AND utm.status = 'active'::text
      )
    )
  );

-- game_reactions (4 policies) ------------------------------------------------
ALTER POLICY "game_reactions_select_own" ON game_reactions
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "game_reactions_update_own" ON game_reactions
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "game_reactions_delete_own" ON game_reactions
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "game_reactions_insert_own" ON game_reactions
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- game_sessions --------------------------------------------------------------
ALTER POLICY "demo_session_ownership" ON game_sessions
  USING (
    (user_id = (SELECT auth.uid()))
    OR (
      (NOT (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid())
          AND (users.is_demo_user = true OR users.is_ephemeral = true)
      )))
      AND (tenant_id IN (
        SELECT m.tenant_id
        FROM user_tenant_memberships m
        WHERE m.user_id = (SELECT auth.uid())
      ))
    )
  );

-- games ----------------------------------------------------------------------
ALTER POLICY "demo_content_access" ON games
  USING (
    CASE
      WHEN (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid())
          AND (users.is_demo_user = true OR users.is_ephemeral = true)
      )) THEN (is_demo_content = true OR created_by = (SELECT auth.uid()))
      ELSE (
        (owner_tenant_id IN (
          SELECT m.tenant_id
          FROM user_tenant_memberships m
          WHERE m.user_id = (SELECT auth.uid())
        ))
        OR owner_tenant_id IS NULL
        OR created_by = (SELECT auth.uid())
      )
    END
  );

-- gamification_burn_log ------------------------------------------------------
ALTER POLICY "gamification_burn_log_select" ON gamification_burn_log
  USING ((SELECT auth.uid()) = user_id);

-- gamification_cooldowns -----------------------------------------------------
ALTER POLICY "gamification_cooldowns_select" ON gamification_cooldowns
  USING ((SELECT auth.uid()) = user_id);

-- gamification_daily_earnings ------------------------------------------------
ALTER POLICY "gamification_daily_earnings_select" ON gamification_daily_earnings
  USING ((SELECT auth.uid()) = user_id);

-- gift_purchases -------------------------------------------------------------
ALTER POLICY "gift_purchases_select_own_purchased" ON gift_purchases
  USING (purchaser_user_id = (SELECT auth.uid()));

ALTER POLICY "gift_purchases_select_own_redeemed" ON gift_purchases
  USING (redeemed_by_user_id = (SELECT auth.uid()));

-- payment_failures -----------------------------------------------------------
ALTER POLICY "payment_failures_select_own" ON payment_failures
  USING (
    tenant_id IN (
      SELECT utm.tenant_id
      FROM user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
        AND utm.role = ANY(ARRAY['owner'::tenant_role_enum, 'admin'::tenant_role_enum])
        AND utm.status = 'active'::text
    )
  );

-- plan_schedules -------------------------------------------------------------
ALTER POLICY "plan_schedules_access" ON plan_schedules
  USING (
    plan_id IN (
      SELECT p.id FROM plans p
      WHERE p.owner_user_id = (SELECT auth.uid())
        OR (
          p.visibility = 'tenant'::plan_visibility_enum
          AND p.owner_tenant_id = ANY(get_user_tenant_ids())
        )
    )
  );


-- ============================================================================
-- BATCH 1: SECURITY DEFINER search_path (already applied)
-- ============================================================================

ALTER FUNCTION public.aggregate_usage_for_period(date, date)
  SET search_path = public;

ALTER FUNCTION public.cleanup_trigger_idempotency_keys(integer)
  SET search_path = public;

ALTER FUNCTION public.log_dunning_action(uuid, text, text, jsonb, text)
  SET search_path = public;

ALTER FUNCTION public.log_quote_activity(uuid, text, jsonb, uuid)
  SET search_path = public;

ALTER FUNCTION public.record_usage(uuid, text, numeric, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.redeem_gift_code(text, uuid, uuid)
  SET search_path = public;


-- ============================================================================
-- BATCH 2: Remaining bare auth.uid() policies (15 policies, 7 tables)
-- ============================================================================
-- Found by post-migration verification query (case-insensitive).
-- Each reviewed against its source migration file.

-- session_trigger_state (HOT — play path) ------------------------------------
-- Source: 20260125154500_fix_artifact_state_view_conflict.sql
ALTER POLICY "session_trigger_state_host_all" ON session_trigger_state
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_trigger_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_trigger_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- user_gamification_preferences -----------------------------------------------
-- Source: 20260108200000_gamification_v2_core_extensions.sql
ALTER POLICY "user_gamification_prefs_select" ON user_gamification_preferences
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "user_gamification_prefs_update" ON user_gamification_preferences
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- user_legal_acceptances ------------------------------------------------------
-- Source: 20260112000000_legal_phase1.sql
ALTER POLICY "user_legal_acceptances_select" ON user_legal_acceptances
  USING (user_id = (SELECT auth.uid()) OR public.is_system_admin());

ALTER POLICY "user_legal_acceptances_insert" ON user_legal_acceptances
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_audit_logs -------------------------------------------------------------
-- Source: 20260131100000_fix_user_audit_logs_insert.sql
ALTER POLICY "user_audit_logs_select" ON user_audit_logs
  USING (
    user_id = (SELECT auth.uid())
    OR actor_user_id = (SELECT auth.uid())
    OR public.is_system_admin()
  );

ALTER POLICY "user_audit_logs_insert" ON user_audit_logs
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR actor_user_id = (SELECT auth.uid())
    OR public.is_system_admin()
  );

-- purchase_intents ------------------------------------------------------------
-- Source: 20260120120000_licensing_purchase_intents_and_entitlements.sql
ALTER POLICY "purchase_intents_select" ON purchase_intents
  USING (
    auth.role() = 'service_role'
    OR ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
  );

-- purchase_intents_insert is FOR INSERT → only WITH CHECK allowed
DO $$
BEGIN
  BEGIN
    ALTER POLICY "purchase_intents_insert" ON purchase_intents
      WITH CHECK (
        auth.role() = 'service_role'
        OR ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
      );
  EXCEPTION WHEN undefined_object THEN
    -- Policy name might be purchase_intents_manage (FOR ALL) instead
    ALTER POLICY "purchase_intents_manage" ON purchase_intents
      USING (
        auth.role() = 'service_role'
        OR ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
      );
  END;
END;
$$;

-- storage.objects (avatars) ---------------------------------------------------
-- Source: 20260216110000_avatars_bucket_policies.sql
ALTER POLICY "avatars_custom_insert" ON storage.objects
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND (storage.filename(name)) = ((SELECT auth.uid())::text || '.png')
  );

ALTER POLICY "avatars_custom_update" ON storage.objects
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND (storage.filename(name)) = ((SELECT auth.uid())::text || '.png')
  );

-- spatial_artifacts (4 policies) ----------------------------------------------
-- Source: 20260217120000 (select, insert) + 20260218100000 (update, delete)
ALTER POLICY "select_artifact" ON spatial_artifacts
  USING (
    (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    OR (tenant_id IS NULL AND visibility = 'public')
    OR (tenant_id IS NULL AND visibility = 'private' AND created_by = (SELECT auth.uid()))
  );

ALTER POLICY "insert_artifact" ON spatial_artifacts
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    OR (tenant_id IS NULL AND visibility = 'private' AND created_by = (SELECT auth.uid()))
    OR (tenant_id IS NULL AND visibility = 'public')
  );

ALTER POLICY "update_artifact" ON spatial_artifacts
  USING (
    (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    OR (tenant_id IS NULL AND visibility = 'private' AND created_by = (SELECT auth.uid()))
  )
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    OR (tenant_id IS NULL AND visibility = 'private' AND created_by = (SELECT auth.uid()))
  );

ALTER POLICY "delete_artifact" ON spatial_artifacts
  USING (
    (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    OR (tenant_id IS NULL AND visibility = 'private' AND created_by = (SELECT auth.uid()))
  );


-- ============================================================================
-- BATCH 2: SECURITY DEFINER search_path — spatial_artifacts_guard_scope
-- ============================================================================
-- Source: 20260218100000_spatial_artifacts_scope_hardening.sql
-- Trigger function (no params, RETURNS TRIGGER)

ALTER FUNCTION public.spatial_artifacts_guard_scope()
  SET search_path = public;


-- ============================================================================
-- BATCH 3: Final 16 bare auth.uid() policies (9 tables)
-- ============================================================================
-- Found after correcting verification query regex to account for
-- PostgreSQL decompiling (SELECT auth.uid()) as ( SELECT auth.uid() AS uid).

-- quotes (billing) ------------------------------------------------------------
-- Source: 20260127400000_enterprise_quotes.sql
ALTER POLICY "quotes_tenant_select" ON quotes
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- usage_records (billing) -----------------------------------------------------
-- Source: 20260127500000_usage_based_billing.sql
ALTER POLICY "usage_records_select_own" ON usage_records
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

-- usage_summaries (billing) ---------------------------------------------------
-- Source: 20260127500000_usage_based_billing.sql
ALTER POLICY "usage_summaries_select_own" ON usage_summaries
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- tenant_entitlement_seat_assignments -----------------------------------------
-- Source: 20260121182000_seat_assignments_select_members.sql
ALTER POLICY "tenant_entitlement_seat_assignments_select" ON tenant_entitlement_seat_assignments
  USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    OR (
      (SELECT auth.uid()) = user_id
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin','member']::public.tenant_role_enum[])
    )
  );

-- tenants (demo protection) ---------------------------------------------------
-- Source: 20260114100001_demo_rls_policies.sql
ALTER POLICY "demo_tenant_write_protection" ON tenants
  USING (
    demo_flag = false
    OR (
      SELECT global_role
      FROM users
      WHERE id = (SELECT auth.uid())
    ) = 'system_admin'
  );

ALTER POLICY "demo_tenant_delete_protection" ON tenants
  USING (
    demo_flag = false
    OR (
      SELECT global_role
      FROM users
      WHERE id = (SELECT auth.uid())
    ) = 'system_admin'
  );

-- session_artifact_state (HOT — play path) ------------------------------------
-- Source: 20260125154500_fix_artifact_state_view_conflict.sql
ALTER POLICY "session_artifact_state_host_all" ON session_artifact_state
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- session_artifact_variant_state (HOT — play path) ----------------------------
-- Source: 20260125154500_fix_artifact_state_view_conflict.sql
ALTER POLICY "session_artifact_variant_state_host_all" ON session_artifact_variant_state
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_state.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- session_artifact_variant_assignments_v2 (HOT — play path) -------------------
-- Source: 20260125154500_fix_artifact_state_view_conflict.sql
ALTER POLICY "session_artifact_variant_assignments_v2_host" ON session_artifact_variant_assignments_v2
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_assignments_v2.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_artifact_variant_assignments_v2.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );

-- user_journey_preferences ----------------------------------------------------
-- Source: 20260213000000_user_journey_preferences.sql
ALTER POLICY "Users can read own journey preferences" ON user_journey_preferences
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can upsert own journey preferences" ON user_journey_preferences
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update own journey preferences" ON user_journey_preferences
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- storage.objects (spatial-previews bucket) -----------------------------------
-- Source: 20260218110000_spatial_previews_bucket.sql
ALTER POLICY "spatial_previews_auth_insert" ON storage.objects
  WITH CHECK (
    bucket_id = 'spatial-previews'
    AND EXISTS (
      SELECT 1 FROM public.spatial_artifacts sa
      WHERE sa.id::text = (storage.foldername(name))[1]
        AND (
          sa.created_by = (SELECT auth.uid())
          OR sa.tenant_id = ANY(get_user_tenant_ids())
        )
    )
  );

ALTER POLICY "spatial_previews_auth_update" ON storage.objects
  USING (
    bucket_id = 'spatial-previews'
    AND EXISTS (
      SELECT 1 FROM public.spatial_artifacts sa
      WHERE sa.id::text = (storage.foldername(name))[1]
        AND (
          sa.created_by = (SELECT auth.uid())
          OR sa.tenant_id = ANY(get_user_tenant_ids())
        )
    )
  )
  WITH CHECK (
    bucket_id = 'spatial-previews'
  );

ALTER POLICY "spatial_previews_auth_delete" ON storage.objects
  USING (
    bucket_id = 'spatial-previews'
    AND EXISTS (
      SELECT 1 FROM public.spatial_artifacts sa
      WHERE sa.id::text = (storage.foldername(name))[1]
        AND (
          sa.created_by = (SELECT auth.uid())
          OR sa.tenant_id = ANY(get_user_tenant_ids())
        )
    )
  );

-- notification_deliveries -----------------------------------------------------
-- Source: 20260220200000_fix_notification_system_consolidated.sql
ALTER POLICY "notification_deliveries_insert_service" ON notification_deliveries
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

COMMIT;


-- ============================================================================
-- ROLLBACK: HOT play-path policies (copy-paste if RLS denies appear)
-- ============================================================================
-- These restore the ORIGINAL bare auth.uid() expressions.
-- Source: 20260125154500_fix_artifact_state_view_conflict.sql
-- DO NOT RUN unless you observe "permission denied" on artifact/variant tables.
--
-- BEGIN;
--
-- ALTER POLICY "session_trigger_state_host_all" ON session_trigger_state
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_trigger_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_trigger_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   );
--
-- ALTER POLICY "session_artifact_state_host_all" ON session_artifact_state
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   );
--
-- ALTER POLICY "session_artifact_variant_state_host_all" ON session_artifact_variant_state
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_variant_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_variant_state.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   );
--
-- ALTER POLICY "session_artifact_variant_assignments_v2_host" ON session_artifact_variant_assignments_v2
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_variant_assignments_v2.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.participant_sessions ps
--       WHERE ps.id = session_artifact_variant_assignments_v2.session_id
--         AND ps.host_user_id = auth.uid()
--     )
--   );
--
-- COMMIT;
