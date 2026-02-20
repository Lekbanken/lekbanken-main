-- =============================================================================
-- CONSOLIDATED NOTIFICATION SYSTEM FIX
-- =============================================================================
--
-- Root causes addressed:
--
-- 1. read_at is NOT NULL DEFAULT now() (inherited from the old
--    notification_read_status table). Every delivery is therefore born
--    "already read" → unread count is always 0, bell stays grey.
--
-- 2. RLS policies on notification_deliveries use auth.uid() without the
--    (SELECT auth.uid()) initplan pattern, forcing per-row evaluation.
--
-- 3. Duplicate permissive SELECT policies on notifications table add
--    unnecessary overhead.
--
-- 4. get_user_notifications / mark_notification_read / etc. are
--    re-created (CREATE OR REPLACE is safe) to guarantee they exist
--    and match the latest schema.
-- =============================================================================

-- =============================================================================
-- 1. FIX read_at: drop NOT NULL / DEFAULT so new deliveries start unread
-- =============================================================================

ALTER TABLE public.notification_deliveries
  ALTER COLUMN read_at DROP NOT NULL;

ALTER TABLE public.notification_deliveries
  ALTER COLUMN read_at DROP DEFAULT;

-- Reset rows that were auto-marked "read" at insert time.
-- Heuristic: if read_at is within 5 seconds of delivered_at it was the
-- DEFAULT, not a genuine user action.
UPDATE public.notification_deliveries
SET read_at = NULL
WHERE read_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (read_at - COALESCE(delivered_at, created_at)))) < 5;

-- =============================================================================
-- 2. OPTIMISE RLS — use (SELECT auth.uid()) initplan pattern
-- =============================================================================

DROP POLICY IF EXISTS "notification_deliveries_select" ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_select"
  ON public.notification_deliveries FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notification_deliveries_update" ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_update"
  ON public.notification_deliveries FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notification_deliveries_delete" ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_delete"
  ON public.notification_deliveries FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Keep insert policy for service role / auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "notification_deliveries_insert_service" ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_insert_service"
  ON public.notification_deliveries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 3. CLEAN UP duplicate SELECT policies on notifications table
-- =============================================================================

-- Drop the second (redundant) permissive SELECT policy added in
-- 20260130120000_fix_notification_tenant_nullable.sql.
-- The "notifications_select" policy from 20260126200000 already covers
-- personal + broadcast + tenant notifications.
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;

-- =============================================================================
-- 4. RE-CREATE RPC FUNCTIONS (idempotent — CREATE OR REPLACE)
-- =============================================================================

-- 4a. get_user_notifications
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  notification_id UUID,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  title TEXT,
  message TEXT,
  type TEXT,
  category TEXT,
  action_url TEXT,
  action_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nd.id,
    nd.notification_id,
    nd.delivered_at,
    nd.read_at,
    nd.dismissed_at,
    n.title,
    n.message,
    n.type,
    n.category,
    n.action_url,
    n.action_label
  FROM notification_deliveries nd
  JOIN notifications n ON n.id = nd.notification_id
  WHERE nd.user_id = auth.uid()
    AND nd.dismissed_at IS NULL
  ORDER BY nd.delivered_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;

-- 4b. get_unread_notification_count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notification_deliveries
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;

-- 4c. mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- 4d. mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

-- 4e. dismiss_notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_deliveries
  SET dismissed_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND dismissed_at IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================
-- After running this migration:
-- • New deliveries will have read_at = NULL (unread) by default
-- • Existing auto-read deliveries are reset to NULL
-- • RLS uses initplan pattern for better performance
-- • Duplicate notifications SELECT policy removed
-- • All RPC functions guaranteed to exist with correct definitions
