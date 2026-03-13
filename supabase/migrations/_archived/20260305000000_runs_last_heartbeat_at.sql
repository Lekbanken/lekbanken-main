-- MS4.8 Run Safety: Add last_heartbeat_at to runs for stale-run detection
-- Allows active-runs endpoint to filter out abandoned browser tabs.

ALTER TABLE runs ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz NULL;

-- Partial index: only index rows that are still active (in_progress)
CREATE INDEX IF NOT EXISTS idx_runs_heartbeat_active
  ON runs (last_heartbeat_at)
  WHERE status IN ('not_started', 'in_progress');

-- Backfill existing in-progress runs with started_at so they're not
-- treated as stale immediately after deployment.
UPDATE runs
  SET last_heartbeat_at = COALESCE(started_at, created_at, now())
  WHERE status IN ('not_started', 'in_progress')
    AND last_heartbeat_at IS NULL;
