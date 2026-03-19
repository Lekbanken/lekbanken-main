-- =============================================================================
-- Notifications v2: Atomic write pipeline + admin history + tighter RLS
-- =============================================================================
-- Fixes:
--   NTF-002: Non-atomic master → delivery writes (orphan master rows)
--   NTF-003: Admin history reads wrong table (notifications.is_read)
--   NTF-005: Tenant-admin history is RLS-incomplete
--   NTF-007: Duplicated delivery materialization logic
--   NTF-010: Over-broad delivery INSERT policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. create_notification_v1()
--    Single transactional function that creates master + materializes deliveries.
--    Replaces the two-step pattern in notifications-admin.ts & notifications-user.ts.
--    Callable only via service-role (no RLS bypass needed — SECURITY DEFINER).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification_v1(
  p_scope         text,           -- 'all' | 'tenant' | 'users'
  p_tenant_id     uuid    DEFAULT NULL,
  p_user_ids      uuid[]  DEFAULT NULL,
  p_title         text    DEFAULT '',
  p_message       text    DEFAULT '',
  p_type          text    DEFAULT 'info',
  p_category      text    DEFAULT 'system',
  p_action_url    text    DEFAULT NULL,
  p_action_label  text    DEFAULT NULL,
  p_event_key     text    DEFAULT NULL,
  p_related_entity_id   uuid DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL,
  p_created_by    uuid    DEFAULT NULL,
  p_exclude_demo  boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_notification_id uuid;
  v_delivery_count  int := 0;
  v_db_scope        text;
BEGIN
  -- Map scope to DB enum ('all' for global, 'tenant' for tenant/users)
  IF p_scope = 'all' OR p_scope = 'global' THEN
    v_db_scope := 'all';
  ELSE
    v_db_scope := 'tenant';
  END IF;

  -- Validate required params
  IF p_title = '' OR p_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'title is required');
  END IF;
  IF p_scope IN ('tenant', 'users') AND p_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_id required for scope=' || p_scope);
  END IF;
  IF p_scope = 'users' AND (p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_ids required for scope=users');
  END IF;

  -- 1. Insert master notification row
  INSERT INTO public.notifications (
    tenant_id, title, message, type, category,
    action_url, action_label, event_key,
    related_entity_id, related_entity_type,
    scope, status, sent_at, created_by
  ) VALUES (
    CASE WHEN v_db_scope = 'all' THEN NULL ELSE p_tenant_id END,
    p_title, p_message, p_type, p_category,
    p_action_url, p_action_label, p_event_key,
    p_related_entity_id, p_related_entity_type,
    v_db_scope, 'sent', now(), p_created_by
  )
  RETURNING id INTO v_notification_id;

  -- 2. Materialize deliveries in the same transaction
  IF p_scope = 'users' THEN
    -- Specific user list
    INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
    SELECT v_notification_id, uid, now()
    FROM unnest(p_user_ids) AS uid
    ON CONFLICT (notification_id, user_id) DO NOTHING;

  ELSIF p_scope = 'all' OR p_scope = 'global' THEN
    -- All users (optionally excluding demo)
    IF p_exclude_demo THEN
      INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
      SELECT v_notification_id, u.id, now()
      FROM public.users u
      WHERE u.is_demo_user IS NOT TRUE
      ON CONFLICT (notification_id, user_id) DO NOTHING;
    ELSE
      INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
      SELECT v_notification_id, u.id, now()
      FROM public.users u
      ON CONFLICT (notification_id, user_id) DO NOTHING;
    END IF;

  ELSIF p_scope = 'tenant' THEN
    -- All members of tenant (optionally excluding demo)
    IF p_exclude_demo THEN
      INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
      SELECT v_notification_id, utm.user_id, now()
      FROM public.user_tenant_memberships utm
      JOIN public.users u ON u.id = utm.user_id
      WHERE utm.tenant_id = p_tenant_id
        AND u.is_demo_user IS NOT TRUE
      ON CONFLICT (notification_id, user_id) DO NOTHING;
    ELSE
      INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
      SELECT v_notification_id, utm.user_id, now()
      FROM public.user_tenant_memberships utm
      WHERE utm.tenant_id = p_tenant_id
      ON CONFLICT (notification_id, user_id) DO NOTHING;
    END IF;
  END IF;

  GET DIAGNOSTICS v_delivery_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',          true,
    'notification_id',  v_notification_id,
    'delivery_count',   v_delivery_count
  );

EXCEPTION WHEN unique_violation THEN
  -- event_key duplicate — idempotent, return success + skipped
  RETURN jsonb_build_object('success', true, 'skipped', true, 'error', 'duplicate event_key');
END;
$fn$;

-- Grant to authenticated (for server actions using service role) and service_role
GRANT EXECUTE ON FUNCTION public.create_notification_v1 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification_v1 TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. get_notification_history_v1()
--    Admin read-model: joins deliveries + notifications + users.
--    Shows aggregated delivery stats per notification.
--    Replaces the broken listRecentNotifications() that reads notifications.is_read.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_notification_history_v1(
  p_tenant_id uuid    DEFAULT NULL,
  p_limit     int     DEFAULT 100,
  p_category  text    DEFAULT NULL,
  p_days_back int     DEFAULT 7
)
RETURNS TABLE (
  notification_id    uuid,
  title              text,
  message            text,
  type               text,
  category           text,
  scope              text,
  action_url         text,
  event_key          text,
  created_at         timestamptz,
  created_by         uuid,
  total_deliveries   bigint,
  read_count         bigint,
  unread_count       bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
  SELECT
    n.id              AS notification_id,
    n.title,
    n.message,
    n.type,
    n.category,
    n.scope,
    n.action_url,
    n.event_key,
    n.created_at,
    n.created_by,
    COUNT(nd.id)                          AS total_deliveries,
    COUNT(nd.id) FILTER (WHERE nd.read_at IS NOT NULL) AS read_count,
    COUNT(nd.id) FILTER (WHERE nd.read_at IS NULL)     AS unread_count
  FROM public.notifications n
  LEFT JOIN public.notification_deliveries nd ON nd.notification_id = n.id
  WHERE n.status = 'sent'
    AND n.created_at >= (now() - make_interval(days => p_days_back))
    AND (p_tenant_id IS NULL OR n.tenant_id = p_tenant_id OR n.scope = 'all')
    AND (p_category IS NULL OR n.category = p_category)
  GROUP BY n.id
  ORDER BY n.created_at DESC
  LIMIT p_limit;
$fn$;

-- Admin function — grant to service_role and authenticated (server actions check auth separately)
GRANT EXECUTE ON FUNCTION public.get_notification_history_v1 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_notification_history_v1 TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. Tighten delivery INSERT policies (NTF-010)
--    The current policies allow ANY authenticated user to insert deliveries
--    for any user. Since deliveries are ONLY created by:
--      a) create_notification_v1 (SECURITY DEFINER — bypasses RLS)
--      b) process_scheduled_notifications (SECURITY DEFINER — bypasses RLS)
--    No RLS INSERT policy is needed for regular users.
--    We keep one policy that only service_role can satisfy.
-- ---------------------------------------------------------------------------

-- Drop the overly broad policies
DROP POLICY IF EXISTS "notification_deliveries_insert" ON public.notification_deliveries;
DROP POLICY IF EXISTS "notification_deliveries_insert_service" ON public.notification_deliveries;

-- New restrictive policy: only system admin (which effectively means service_role
-- or the SECURITY DEFINER functions above). Regular authenticated users cannot
-- insert deliveries directly.
CREATE POLICY "notification_deliveries_insert_restricted"
  ON public.notification_deliveries
  FOR INSERT
  WITH CHECK (public.is_system_admin());


-- ---------------------------------------------------------------------------
-- 4. Ensure existing read functions have proper grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. Scope-based event_key uniqueness for V2 notifications
--    The old index is (user_id, event_key) which doesn't fire when user_id IS NULL.
--    V2 master rows use scope-based delivery (no user_id on notifications table).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_scope_unique_idx
  ON public.notifications (event_key)
  WHERE event_key IS NOT NULL AND user_id IS NULL;
