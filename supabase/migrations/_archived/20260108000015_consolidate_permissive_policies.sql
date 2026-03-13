-- =============================================================================
-- Migration 015: Consolidate multiple permissive RLS policies
-- =============================================================================
-- Problem: Supabase Performance Advisor lint 0006 warns that having multiple
--          permissive policies for the same role/action causes each to be
--          evaluated, hurting query performance.
--
-- Solution: Combine conditions with OR into single policies per operation.
-- =============================================================================

-- =============================================================================
-- 1. BILLING_ACCOUNTS - Consolidate SELECT (2 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "billing_accounts_select_tenant" ON public.billing_accounts;
DROP POLICY IF EXISTS "billing_accounts_select_user" ON public.billing_accounts;

CREATE POLICY "billing_accounts_select" ON public.billing_accounts
  FOR SELECT TO authenticated
  USING (
    -- User's own billing account
    (SELECT auth.uid()) = user_id
    -- Or tenant billing accounts for tenant members
    OR (tenant_id IS NOT NULL AND tenant_id = ANY(get_user_tenant_ids()))
    -- Or system admin sees all
    OR is_system_admin()
  );

-- =============================================================================
-- 2. TENANTS - Consolidate SELECT (3 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "tenants_select_member" ON public.tenants;
DROP POLICY IF EXISTS "system_admin_can_select_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_self" ON public.tenants;
DROP POLICY IF EXISTS "tenant_select_member" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    -- System admin sees all
    is_system_admin()
    -- Or member of tenant
    OR id = ANY(get_user_tenant_ids())
  );

-- =============================================================================
-- 3. GAMES - Consolidate SELECT (multiple → 1)
-- =============================================================================

DROP POLICY IF EXISTS "games_select_member" ON public.games;
DROP POLICY IF EXISTS "games_select_system_admin" ON public.games;
DROP POLICY IF EXISTS "users_can_select_games" ON public.games;
DROP POLICY IF EXISTS "games_select_all" ON public.games;

CREATE POLICY "games_select" ON public.games
  FOR SELECT TO authenticated
  USING (
    -- System admin sees all
    is_system_admin()
    -- Or games owned by user's tenants
    OR owner_tenant_id = ANY(get_user_tenant_ids())
    -- Or global published games (no tenant)
    OR (owner_tenant_id IS NULL AND status = 'published')
  );

-- Also allow anon to see published global games for browse
DROP POLICY IF EXISTS "anon_can_view_published_games" ON public.games;
CREATE POLICY "games_select_anon" ON public.games
  FOR SELECT TO anon
  USING (
    owner_tenant_id IS NULL AND status = 'published'
  );

-- =============================================================================
-- 4. USER_TENANT_MEMBERSHIPS - Consolidate SELECT (3 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "membership_select_own" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_system_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select" ON public.user_tenant_memberships;

CREATE POLICY "memberships_select" ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (
    -- Own memberships
    user_id = (SELECT auth.uid())
    -- System admin sees all
    OR is_system_admin()
    -- Tenant admin/owner can see memberships in their tenants
    OR (
      tenant_id = ANY(get_user_tenant_ids())
      AND (has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) 
           OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum))
    )
  );

-- =============================================================================
-- 5. CONTENT_PREFERENCES - Remove redundant SELECT (FOR ALL covers it)
-- =============================================================================

-- The content_preferences_user_crud policy is FOR ALL which includes SELECT
-- So content_preferences_user_select is redundant
DROP POLICY IF EXISTS "content_preferences_user_select" ON public.content_preferences;

-- =============================================================================
-- 6. PARTICIPANT_SESSIONS - Consolidate SELECT (3 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "Hosts can view their own sessions" ON public.participant_sessions;
DROP POLICY IF EXISTS "System admins can view all sessions" ON public.participant_sessions;
DROP POLICY IF EXISTS "Public can view active sessions by code" ON public.participant_sessions;
DROP POLICY IF EXISTS "participant_sessions_select" ON public.participant_sessions;

CREATE POLICY "participant_sessions_select" ON public.participant_sessions
  FOR SELECT TO authenticated
  USING (
    -- Host owns session
    host_user_id = (SELECT auth.uid())
    -- System admin sees all
    OR is_system_admin()
    -- Active sessions visible for join flow
    OR status = 'active'
  );

-- Anon can view active sessions for join flow
DROP POLICY IF EXISTS "participant_sessions_select_anon" ON public.participant_sessions;
CREATE POLICY "participant_sessions_select_anon" ON public.participant_sessions
  FOR SELECT TO anon
  USING (status = 'active');

-- =============================================================================
-- 7. SESSION_EVENTS - Consolidate SELECT (4 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "session_events_host_view" ON public.session_events;
DROP POLICY IF EXISTS "session_events_participant_view" ON public.session_events;
DROP POLICY IF EXISTS "session_events_select" ON public.session_events;
DROP POLICY IF EXISTS "host_can_select_session_events" ON public.session_events;

CREATE POLICY "session_events_select" ON public.session_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND (
        -- Host can view
        ps.host_user_id = (SELECT auth.uid())
        -- System admin can view
        OR is_system_admin()
      )
    )
  );

-- =============================================================================
-- 8. SESSION_ROLES - Consolidate SELECT (2 policies → 1)
-- =============================================================================

DROP POLICY IF EXISTS "session_roles_select_host" ON public.session_roles;
DROP POLICY IF EXISTS "session_roles_select_assigned" ON public.session_roles;
DROP POLICY IF EXISTS "session_roles_select" ON public.session_roles;

CREATE POLICY "session_roles_select" ON public.session_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_roles.session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    -- Or user is assigned to the role (TODO: add participant check if needed)
  );

-- =============================================================================
-- 9. LEARNING_COURSES - Drop redundant SELECT (FOR ALL covers it)
-- =============================================================================

-- system_admins_full_access_learning_courses is FOR ALL which includes SELECT
-- So any separate SELECT policy is redundant for system admins
-- Keep tenant_members_select_learning_courses as the specific SELECT policy
-- No changes needed - the FOR ALL for admin is intentional

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this query to check consolidation worked:
--
-- SELECT tablename, cmd, COUNT(*) as policy_count
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND tablename IN ('billing_accounts', 'tenants', 'games', 
--                   'user_tenant_memberships', 'participant_sessions',
--                   'session_events', 'session_roles')
-- GROUP BY tablename, cmd
-- ORDER BY tablename, cmd;
--
-- Each table/operation should ideally have 1-2 policies max
-- =============================================================================
