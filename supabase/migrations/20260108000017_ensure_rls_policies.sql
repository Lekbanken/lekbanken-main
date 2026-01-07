-- Migration 017: Ensure RLS policies exist for all tables flagged by advisor
-- Uses DROP IF EXISTS + CREATE to ensure policies are in place regardless of current state
-- Tables identified in advisor report as having RLS enabled but no policies

-- =============================================================================
-- SECTION 1: BILLING TABLES - Tenant admin access
-- =============================================================================

-- 1.1 invoices - Tenant admin access
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;
DROP POLICY IF EXISTS "tenant_members_can_select_invoices" ON public.invoices;
CREATE POLICY "invoices_tenant_admin" ON public.invoices
  FOR ALL TO authenticated
  USING (
    is_system_admin() 
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  )
  WITH CHECK (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

-- 1.2 payments - Tenant admin via invoice lookup
DROP POLICY IF EXISTS "payments_manage" ON public.payments;
DROP POLICY IF EXISTS "tenant_members_can_select_payments" ON public.payments;
CREATE POLICY "payments_tenant_admin" ON public.payments
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.id = invoice_id 
      AND (
        has_tenant_role(i.tenant_id, 'admin'::public.tenant_role_enum)
        OR has_tenant_role(i.tenant_id, 'owner'::public.tenant_role_enum)
      )
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.id = invoice_id 
      AND (
        has_tenant_role(i.tenant_id, 'admin'::public.tenant_role_enum)
        OR has_tenant_role(i.tenant_id, 'owner'::public.tenant_role_enum)
      )
    )
  );

-- 1.3 subscription_items - Tenant admin via subscription lookup  
DROP POLICY IF EXISTS "subscription_items_manage" ON public.subscription_items;
CREATE POLICY "subscription_items_tenant_admin" ON public.subscription_items
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_subscriptions ts 
      WHERE ts.id = subscription_id 
      AND (
        has_tenant_role(ts.tenant_id, 'admin'::public.tenant_role_enum)
        OR has_tenant_role(ts.tenant_id, 'owner'::public.tenant_role_enum)
      )
    )
  )
  WITH CHECK (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_subscriptions ts 
      WHERE ts.id = subscription_id 
      AND (
        has_tenant_role(ts.tenant_id, 'admin'::public.tenant_role_enum)
        OR has_tenant_role(ts.tenant_id, 'owner'::public.tenant_role_enum)
      )
    )
  );

-- 1.4 tenant_subscriptions - Tenant admin access
DROP POLICY IF EXISTS "tenant_subscriptions_manage" ON public.tenant_subscriptions;
CREATE POLICY "tenant_subscriptions_admin" ON public.tenant_subscriptions
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  )
  WITH CHECK (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

-- 1.5 tenant_seat_assignments - Tenant admin access
DROP POLICY IF EXISTS "tenant_seat_assignments_manage" ON public.tenant_seat_assignments;
CREATE POLICY "tenant_seat_assignments_admin" ON public.tenant_seat_assignments
  FOR ALL TO authenticated
  USING (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  )
  WITH CHECK (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

-- =============================================================================
-- SECTION 2: AUDIT & MODERATION - Tenant admin or system admin
-- =============================================================================

-- 2.1 tenant_audit_logs - Tenant admin can view, system admin can manage
DROP POLICY IF EXISTS "tenant_audit_logs_select" ON public.tenant_audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_insert" ON public.tenant_audit_logs;
CREATE POLICY "tenant_audit_logs_select" ON public.tenant_audit_logs
  FOR SELECT TO authenticated
  USING (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

CREATE POLICY "tenant_audit_logs_insert" ON public.tenant_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

-- 2.2 moderation_actions - System admin only
DROP POLICY IF EXISTS "moderation_actions_sysadmin" ON public.moderation_actions;
CREATE POLICY "moderation_actions_admin" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- 2.3 moderation_analytics - System admin read-only
DROP POLICY IF EXISTS "moderation_analytics_sysadmin_select" ON public.moderation_analytics;
CREATE POLICY "moderation_analytics_select" ON public.moderation_analytics
  FOR SELECT TO authenticated
  USING (is_system_admin());

-- 2.4 moderation_queue - System admin access
DROP POLICY IF EXISTS "moderation_queue_sysadmin" ON public.moderation_queue;
CREATE POLICY "moderation_queue_admin" ON public.moderation_queue
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- 2.5 content_filter_rules - System admin access
DROP POLICY IF EXISTS "content_filter_rules_sysadmin" ON public.content_filter_rules;
CREATE POLICY "content_filter_rules_admin" ON public.content_filter_rules
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- =============================================================================
-- SECTION 3: LEADERBOARDS
-- =============================================================================

-- 3.1 leaderboards table (if exists) - Authenticated read, admin write
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboards') THEN
    EXECUTE 'DROP POLICY IF EXISTS "leaderboards_select" ON public.leaderboards';
    EXECUTE 'DROP POLICY IF EXISTS "leaderboards_admin_write" ON public.leaderboards';
    EXECUTE 'CREATE POLICY "leaderboards_select" ON public.leaderboards FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "leaderboards_write" ON public.leaderboards FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: SUPPORT TABLES
-- =============================================================================

-- 4.1 bug_reports - Users can view/create own, system admin full access
DROP POLICY IF EXISTS "bug_reports_select_own" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_insert_own" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_sysadmin" ON public.bug_reports;

CREATE POLICY "bug_reports_user_access" ON public.bug_reports
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid()) 
    OR is_system_admin()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- 4.2 support_tickets - Users can view/create own, system admin full access
DROP POLICY IF EXISTS "support_tickets_select_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_sysadmin" ON public.support_tickets;

CREATE POLICY "support_tickets_user_access" ON public.support_tickets
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- 4.3 support_reports - Tenant admin read access (aggregate stats table)
DROP POLICY IF EXISTS "support_reports_select_tenant" ON public.support_reports;
DROP POLICY IF EXISTS "support_reports_sysadmin_write" ON public.support_reports;

CREATE POLICY "support_reports_select" ON public.support_reports
  FOR SELECT TO authenticated
  USING (
    is_system_admin()
    OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  );

CREATE POLICY "support_reports_write" ON public.support_reports
  FOR ALL TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- =============================================================================
-- SECTION 5: EXPORT TABLES - Already have policies, ensure they exist
-- =============================================================================

-- 5.1 award_builder_exports - Already has policies from creation migration
-- Just verify/recreate if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='award_builder_exports'
  ) THEN
    EXECUTE 'CREATE POLICY "award_exports_admin" ON public.award_builder_exports FOR ALL TO authenticated USING (is_system_admin() OR has_tenant_role(tenant_id, ''admin''::public.tenant_role_enum)) WITH CHECK (is_system_admin() OR has_tenant_role(tenant_id, ''admin''::public.tenant_role_enum))';
  END IF;
END $$;

-- 5.2 coach_diagram_exports - Already has policies from creation migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coach_diagram_exports'
  ) THEN
    EXECUTE 'CREATE POLICY "diagram_exports_admin" ON public.coach_diagram_exports FOR ALL TO authenticated USING (is_system_admin() OR has_tenant_role(tenant_id, ''admin''::public.tenant_role_enum)) WITH CHECK (is_system_admin() OR has_tenant_role(tenant_id, ''admin''::public.tenant_role_enum))';
  END IF;
END $$;

-- =============================================================================
-- SECTION 6: CONVERSATION CARDS - Already have policies, verify
-- =============================================================================

-- These tables already have policies from 20260103120000_conversation_cards_v1.sql
-- Just ensure they exist by adding fallback policies if none exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_cards'
  ) THEN
    EXECUTE 'CREATE POLICY "conversation_cards_read" ON public.conversation_cards FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "conversation_cards_write" ON public.conversation_cards FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_card_collections'
  ) THEN
    EXECUTE 'CREATE POLICY "cc_collections_read" ON public.conversation_card_collections FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "cc_collections_write" ON public.conversation_card_collections FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_card_collection_secondary_purposes'
  ) THEN
    EXECUTE 'CREATE POLICY "cc_purposes_read" ON public.conversation_card_collection_secondary_purposes FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "cc_purposes_write" ON public.conversation_card_collection_secondary_purposes FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

-- =============================================================================
-- SECTION 7: GAME ARTIFACTS - Already have policies, verify
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_artifacts'
  ) THEN
    EXECUTE 'CREATE POLICY "game_artifacts_read" ON public.game_artifacts FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "game_artifacts_write" ON public.game_artifacts FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_artifact_variants'
  ) THEN
    EXECUTE 'CREATE POLICY "artifact_variants_read" ON public.game_artifact_variants FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "artifact_variants_write" ON public.game_artifact_variants FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_secondary_purposes'
  ) THEN
    EXECUTE 'CREATE POLICY "game_purposes_read" ON public.game_secondary_purposes FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "game_purposes_write" ON public.game_secondary_purposes FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin())';
  END IF;
END $$;
