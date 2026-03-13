-- MS6 hardening: Ensure a participant_session is never linked to multiple run_steps.
-- Recommended by architect review — prevents cross-run session reuse bugs.

-- Drop the existing non-unique partial index
DROP INDEX IF EXISTS idx_run_sessions_session_id;

-- Replace with a UNIQUE partial index (same WHERE clause)
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_sessions_session_id
  ON run_sessions(session_id)
  WHERE session_id IS NOT NULL;
