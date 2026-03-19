-- =============================================================================
-- Hotfix: create_notification_v1 param type text→uuid + event_key uniqueness
-- =============================================================================
-- Fixes applied after 20260320000000_notifications_v2_atomic_pipeline.sql
-- was already deployed with p_related_entity_id as text instead of uuid.
--
--   1. Drop the incorrect text-signature function
--   2. Recreate with correct uuid type for p_related_entity_id
--   3. Add scope-aware event_key unique indexes for idempotency
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the text-signature version (already applied to production manually)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_notification_v1(
  text, uuid, uuid[], text, text, text, text, text, text, text, text, text, uuid, boolean
);

-- ---------------------------------------------------------------------------
-- 2. Recreate with correct uuid type for p_related_entity_id
--    (CREATE OR REPLACE is safe here since the old signature is dropped above)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification_v1(
  p_scope         text,
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

GRANT EXECUTE ON FUNCTION public.create_notification_v1 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification_v1 TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. Scope-aware event_key uniqueness for V2 notifications
--
--    The existing index is (user_id, event_key) which only fires on per-user
--    notifications. V2 scope-based notifications have user_id IS NULL on the
--    master row, so that index never fires.
--
--    We add TWO partial indexes:
--      a) Global notifications (tenant_id IS NULL): unique per event_key
--      b) Tenant-scoped notifications: unique per (tenant_id, event_key)
--
--    This allows the same event_key to be used in different tenants
--    while still preventing duplicates within one tenant or globally.
-- ---------------------------------------------------------------------------

-- Drop the overly broad single index if it exists (was applied manually)
DROP INDEX IF EXISTS public.notifications_event_key_scope_unique_idx;

-- a) Global notifications — unique event_key when no tenant and no user
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_global_unique_idx
  ON public.notifications (event_key)
  WHERE event_key IS NOT NULL AND user_id IS NULL AND tenant_id IS NULL;

-- b) Tenant-scoped notifications — unique (tenant_id, event_key) per tenant
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_tenant_unique_idx
  ON public.notifications (tenant_id, event_key)
  WHERE event_key IS NOT NULL AND user_id IS NULL AND tenant_id IS NOT NULL;
