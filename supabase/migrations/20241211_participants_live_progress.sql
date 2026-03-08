-- Compatibility placeholder.
--
-- The live-progress participant tables depend on participant_sessions,
-- participants, tenants, games, and achievements. In the current repo the
-- prerequisite tables are created after this historical timestamp, so this
-- migration must no-op during fresh resets.
--
-- The actual schema now lives in:
--   20251129000016_participants_live_progress.sql

DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy participant live-progress migration 20241211; schema is recreated later in 20251129000016_participants_live_progress.sql';
END $$;