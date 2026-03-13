-- =============================================================================
-- FIX: Notification system — RLS overhead + Realtime subscription
-- =============================================================================
--
-- 1. Replace user_preferences_admin_all (FOR ALL) with write-only policies
--    so that every SELECT no longer runs has_tenant_role() subqueries.
--
-- 2. Add notification_deliveries to the supabase_realtime publication
--    so the app bell can subscribe to live changes.
-- =============================================================================

-- =============================================================================
-- 1. SPLIT user_preferences_admin_all INTO WRITE-ONLY POLICIES
-- =============================================================================
-- The old FOR ALL policy forces Postgres to evaluate has_tenant_role() on every
-- SELECT row (it's permissive, so it runs alongside the simpler user_id check).
-- Admin never needs a separate SELECT path — the user_preferences_select policy
-- already covers that. Split into INSERT/UPDATE/DELETE only.

DROP POLICY IF EXISTS "user_preferences_admin_all" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_admin_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_admin_update" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_admin_delete" ON public.user_preferences;

CREATE POLICY "user_preferences_admin_insert"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_tenant_role(
      user_preferences.tenant_id,
      ARRAY['owner','admin']::public.tenant_role_enum[]
    )
  );

CREATE POLICY "user_preferences_admin_update"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (
    has_tenant_role(
      user_preferences.tenant_id,
      ARRAY['owner','admin']::public.tenant_role_enum[]
    )
  )
  WITH CHECK (
    has_tenant_role(
      user_preferences.tenant_id,
      ARRAY['owner','admin']::public.tenant_role_enum[]
    )
  );

CREATE POLICY "user_preferences_admin_delete"
  ON public.user_preferences
  FOR DELETE
  TO authenticated
  USING (
    has_tenant_role(
      user_preferences.tenant_id,
      ARRAY['owner','admin']::public.tenant_role_enum[]
    )
  );

-- =============================================================================
-- 2. ADD notification_deliveries TO REALTIME PUBLICATION
-- =============================================================================
-- Enables Supabase Realtime postgres_changes on the table so the app
-- NotificationBell can subscribe to INSERT/UPDATE events in real time.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'notification_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;
    RAISE NOTICE 'Added notification_deliveries to supabase_realtime publication';
  END IF;
END $$;
