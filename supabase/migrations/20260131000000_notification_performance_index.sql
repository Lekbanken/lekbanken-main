-- =============================================================================
-- NOTIFICATION PERFORMANCE INDEX
-- =============================================================================
-- 
-- Optimizes get_user_notifications RPC which queries:
--   WHERE user_id = auth.uid() AND dismissed_at IS NULL
--   ORDER BY delivered_at DESC
--   LIMIT 20
--
-- The existing idx_notification_deliveries_unread covers read_at IS NULL,
-- but get_user_notifications filters on dismissed_at IS NULL.
-- =============================================================================

-- Covering partial index for active (not-dismissed) notifications
-- This exactly matches the RPC query pattern for optimal performance
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_active
  ON public.notification_deliveries (user_id, delivered_at DESC)
  WHERE dismissed_at IS NULL;

COMMENT ON INDEX public.idx_notification_deliveries_user_active IS 
  'Optimizes get_user_notifications: filter by user + not-dismissed, sort by delivered_at DESC';

-- =============================================================================
-- user_preferences lookup index (if not already covered)
-- =============================================================================
-- Query pattern: WHERE user_id = $1 AND tenant_id = $2

DO $$
BEGIN
  -- Check if unique constraint or existing index covers this
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_preferences'
      AND (indexname = 'user_preferences_user_id_tenant_id_key'
        OR indexname = 'idx_user_preferences_user_tenant')
  ) THEN
    CREATE INDEX idx_user_preferences_user_tenant
      ON public.user_preferences (user_id, tenant_id);
    
    COMMENT ON INDEX public.idx_user_preferences_user_tenant IS 
      'Lookup index for user preferences by user + tenant';
  END IF;
END $$;
