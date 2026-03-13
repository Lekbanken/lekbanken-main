-- MS7.2: Add 'ended' status to run_sessions
--
-- Semantic distinction:
--   'completed' = run step finished normally (host advanced past it)
--   'ended'     = session force-ended from dashboard (participant_session ended,
--                 but host hasn't necessarily advanced the run step yet)
--
-- This makes the dashboard badge logic unambiguous.

ALTER TABLE run_sessions DROP CONSTRAINT IF EXISTS run_sessions_status_check;
ALTER TABLE run_sessions ADD CONSTRAINT run_sessions_status_check
  CHECK (status IN ('created', 'active', 'completed', 'ended', 'abandoned'));
