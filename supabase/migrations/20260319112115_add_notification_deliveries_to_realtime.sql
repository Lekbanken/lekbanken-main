-- Add notification_deliveries to supabase_realtime publication.
--
-- Root cause: The archived migration 20260220100000 added this, but the
-- consolidation into the baseline (00000000000000_baseline.sql) omitted
-- publication statements entirely.  As a result, Realtime subscriptions
-- on notification_deliveries never fire — the hook falls back to 30 s
-- polling in every environment.
--
-- See: docs/database/environment-database-audit.md §1.14, §4.1

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notification_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;
  END IF;
END $$;
