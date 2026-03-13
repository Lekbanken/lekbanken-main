-- Migration 023: Final auth.uid() initplan fixes and policy consolidation
-- =============================================================================
-- Fixes remaining policies using auth.uid() without (SELECT ...) wrapper
-- Consolidates remaining tables with multiple permissive policies
-- =============================================================================

-- =============================================================================
-- PART 1: Fix auth.uid() without initplan wrapper
-- =============================================================================

-- collection_items_select
DROP POLICY IF EXISTS "collection_items_select" ON public.collection_items;
CREATE POLICY "collection_items_select" ON public.collection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.content_collections cc
      WHERE cc.id = collection_id
      AND (
        cc.is_published = true
        OR cc.created_by_user_id = (SELECT auth.uid())
        OR is_system_admin()
      )
    )
  );

-- content_analytics (SELECT, UPDATE, INSERT)
DROP POLICY IF EXISTS "content_analytics_select" ON public.content_analytics;
DROP POLICY IF EXISTS "content_analytics_update" ON public.content_analytics;
DROP POLICY IF EXISTS "content_analytics_insert" ON public.content_analytics;

CREATE POLICY "content_analytics_select" ON public.content_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
      AND utm.tenant_id = content_analytics.tenant_id
    )
    OR is_system_admin()
  );

CREATE POLICY "content_analytics_update" ON public.content_analytics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
      AND utm.tenant_id = content_analytics.tenant_id
    )
    OR is_system_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
      AND utm.tenant_id = content_analytics.tenant_id
    )
    OR is_system_admin()
  );

CREATE POLICY "content_analytics_insert" ON public.content_analytics
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_system_admin()
  );

-- content_collections_select
DROP POLICY IF EXISTS "content_collections_select" ON public.content_collections;
CREATE POLICY "content_collections_select" ON public.content_collections
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR created_by_user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- content_items_published_select
DROP POLICY IF EXISTS "content_items_published_select" ON public.content_items;
CREATE POLICY "content_items_select" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR created_by_user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- content_schedules_select
DROP POLICY IF EXISTS "content_schedules_select" ON public.content_schedules;
CREATE POLICY "content_schedules_select" ON public.content_schedules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
      AND utm.tenant_id = content_schedules.tenant_id
    )
    OR is_system_admin()
  );

-- seasonal_events_select
DROP POLICY IF EXISTS "seasonal_events_select" ON public.seasonal_events;
CREATE POLICY "seasonal_events_select" ON public.seasonal_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = (SELECT auth.uid())
      AND utm.tenant_id = seasonal_events.tenant_id
    )
    OR is_system_admin()
    OR tenant_id IS NULL  -- Global events visible to all
  );

-- =============================================================================
-- PART 2: Consolidate multiple permissive policies
-- =============================================================================

-- GAMES: 4 SELECT policies → 1
-- Current: admins_can_read_all_games, anyone_can_read_published_global_games, games_select, games_select_anon
DROP POLICY IF EXISTS "admins_can_read_all_games" ON public.games;
DROP POLICY IF EXISTS "anyone_can_read_published_global_games" ON public.games;
DROP POLICY IF EXISTS "games_select" ON public.games;
DROP POLICY IF EXISTS "games_select_anon" ON public.games;

CREATE POLICY "games_select" ON public.games
  FOR SELECT TO authenticated
  USING (
    -- System admin sees all
    is_system_admin()
    -- Games owned by user's tenants
    OR owner_tenant_id = ANY(get_user_tenant_ids())
    -- Published global games (no tenant restriction)
    OR (owner_tenant_id IS NULL AND status = 'published')
    -- Published tenant games visible to tenant members
    OR (status = 'published' AND owner_tenant_id = ANY(get_user_tenant_ids()))
  );

CREATE POLICY "games_select_anon" ON public.games
  FOR SELECT TO anon
  USING (
    owner_tenant_id IS NULL AND status = 'published'
  );

-- PARTICIPANTS: 3 SELECT policies → 1
-- Current: Participants can view themselves, participants_select, participants_select_anon
DROP POLICY IF EXISTS "Participants can view themselves" ON public.participants;
DROP POLICY IF EXISTS "participants_select" ON public.participants;
DROP POLICY IF EXISTS "participants_select_anon" ON public.participants;

CREATE POLICY "participants_select" ON public.participants
  FOR SELECT TO authenticated
  USING (
    -- Session host can view all participants
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    -- System admin
    OR is_system_admin()
  );

CREATE POLICY "participants_select_anon" ON public.participants
  FOR SELECT TO anon
  USING (
    -- Allow view for active sessions (join flow)
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.status = 'active'
    )
  );

-- TENANT_DOMAINS: 3 SELECT policies → 1
-- Current: authenticated_read_active_domains, tenant_admin_view_domains, tenant_domains_select
DROP POLICY IF EXISTS "authenticated_read_active_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "tenant_admin_view_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "tenant_domains_select" ON public.tenant_domains;

CREATE POLICY "tenant_domains_select" ON public.tenant_domains
  FOR SELECT TO authenticated
  USING (
    -- Active domains visible to all authenticated (for SSO discovery)
    status = 'active'
    -- Tenant admins can see all their domains
    OR (
      tenant_id = ANY(get_user_tenant_ids())
      AND (has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
           OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum))
    )
    -- System admin sees all
    OR is_system_admin()
  );

-- USER_PROFILES: 3 UPDATE policies → 1
-- Current: user_profiles_update, user_profiles_update_admin, user_profiles_update_own
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- =============================================================================
-- PART 3: Fix duplicate INSERT policies
-- =============================================================================

-- user_profiles has duplicate INSERT policies
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- session_events has duplicate INSERT policies
DROP POLICY IF EXISTS "host_can_insert_session_events" ON public.session_events;
DROP POLICY IF EXISTS "session_events_insert" ON public.session_events;

CREATE POLICY "session_events_insert" ON public.session_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );
