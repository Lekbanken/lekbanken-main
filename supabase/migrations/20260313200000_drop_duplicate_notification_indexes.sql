-- Drop duplicate indexes on notification_deliveries table
-- These are duplicates of idx_notification_deliveries_notification and idx_notification_deliveries_user
-- Created during table rename from notification_read_status to notification_deliveries

DROP INDEX IF EXISTS idx_notification_read_status_notification_id;
DROP INDEX IF EXISTS idx_notification_read_status_user_id;
