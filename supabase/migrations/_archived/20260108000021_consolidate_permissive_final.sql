-- Migration 021: Final consolidation of permissive policies
-- =============================================================================
-- Consolidates remaining tables with multiple PERMISSIVE policies per operation
-- into single policies with OR'd conditions for better query performance.
-- =============================================================================

-- =============================================================================
-- 1. USERS TABLE - Consolidate 3 SELECT policies → 1
-- =============================================================================
-- Current: users_select_self, users_select_coworkers, users_select_admin
-- Target: users_select (combined)

DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_select_coworkers" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;

CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    -- User's own record
    id = (SELECT auth.uid())
    -- System admin sees all
    OR is_system_admin()
    -- Tenant coworkers (simplified: users in same tenant)
    OR EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = users.id
      AND utm.tenant_id = ANY(get_user_tenant_ids())
    )
  );

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- =============================================================================
-- 2. USER_PROFILES - Consolidate SELECT if multiple
-- =============================================================================

DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_or_self" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_public" ON public.user_profiles;

CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    -- Own profile
    user_id = (SELECT auth.uid())
    -- System admin
    OR is_system_admin()
    -- Public profiles visible to authenticated users
    OR true
  );

DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR is_system_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR is_system_admin());

DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- 3. PARTICIPANTS - Consolidate if multiple SELECT exist
-- =============================================================================

DROP POLICY IF EXISTS "participants_select" ON public.participants;
DROP POLICY IF EXISTS "participants_select_own" ON public.participants;
DROP POLICY IF EXISTS "Participants can read own data" ON public.participants;
DROP POLICY IF EXISTS "Hosts can view participants in their sessions" ON public.participants;

CREATE POLICY "participants_select" ON public.participants
  FOR SELECT TO authenticated
  USING (
    -- Session host can view
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    -- System admin can view
    OR is_system_admin()
  );

-- Also allow anon to view for public session join flow
DROP POLICY IF EXISTS "participants_select_anon" ON public.participants;
CREATE POLICY "participants_select_anon" ON public.participants
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.status = 'active'
    )
  );

-- =============================================================================
-- 4. USER_TENANT_MEMBERSHIPS - Ensure single consolidated policy
-- =============================================================================

DROP POLICY IF EXISTS "memberships_select" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_select" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_own" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_system_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "user_tenant_memberships_select" ON public.user_tenant_memberships;

CREATE POLICY "user_tenant_memberships_select" ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (
    -- Own memberships
    user_id = (SELECT auth.uid())
    -- System admin sees all
    OR is_system_admin()
    -- Tenant members can see each other (for team features)
    OR tenant_id = ANY(get_user_tenant_ids())
  );

-- =============================================================================
-- 5. SESSION_EVENTS - Ensure consolidated
-- =============================================================================

DROP POLICY IF EXISTS "session_events_select" ON public.session_events;
DROP POLICY IF EXISTS "session_events_host_view" ON public.session_events;
DROP POLICY IF EXISTS "session_events_participant_view" ON public.session_events;
DROP POLICY IF EXISTS "host_can_select_session_events" ON public.session_events;

CREATE POLICY "session_events_select" ON public.session_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND (
        ps.host_user_id = (SELECT auth.uid())
        OR is_system_admin()
      )
    )
  );

-- =============================================================================
-- 6. BILLING_PRODUCTS - Ensure single SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "billing_products_select" ON public.billing_products;
DROP POLICY IF EXISTS "authenticated_can_select_active_billing_products" ON public.billing_products;
DROP POLICY IF EXISTS "anon_can_view_active_billing_products" ON public.billing_products;

CREATE POLICY "billing_products_select" ON public.billing_products
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR is_system_admin()
  );

CREATE POLICY "billing_products_select_anon" ON public.billing_products
  FOR SELECT TO anon
  USING (is_active = true);

-- =============================================================================
-- 7. GAMES - Already consolidated in migration 015, just verify
-- =============================================================================

-- Drop any duplicate policies that might have been recreated
DROP POLICY IF EXISTS "games_select_member" ON public.games;
DROP POLICY IF EXISTS "games_select_system_admin" ON public.games;
DROP POLICY IF EXISTS "users_can_select_games" ON public.games;
DROP POLICY IF EXISTS "games_select_all" ON public.games;

-- games_select and games_select_anon should already exist from migration 015

-- =============================================================================
-- VERIFICATION QUERY (run after migration):
-- =============================================================================
-- SELECT tablename, cmd, COUNT(*) as policy_count
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'user_profiles', 'participants', 
--                   'user_tenant_memberships', 'session_events', 
--                   'billing_products', 'games')
-- GROUP BY tablename, cmd
-- HAVING COUNT(*) > 2
-- ORDER BY policy_count DESC;
-- =============================================================================
