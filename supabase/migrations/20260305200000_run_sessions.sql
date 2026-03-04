-- ═══════════════════════════════════════════════════════════════════════════════
-- MS6 Step 1: run_sessions table + session_game block type
-- ═══════════════════════════════════════════════════════════════════════════════
-- Links run steps to participant_sessions.
-- Decision: Q10 Option C (run_sessions table) — minimal, queryable, extensible.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) Add session_game to plan_block_type_enum ─────────────────────────────
ALTER TYPE plan_block_type_enum ADD VALUE IF NOT EXISTS 'session_game';

COMMIT;

-- enum ADD VALUE cannot run inside a multi-statement transaction with DDL,
-- so we commit first and start a new block.

BEGIN;

-- ── 2) Create run_sessions table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS run_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_index  integer     NOT NULL,
  session_id  uuid        REFERENCES participant_sessions(id) ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'active', 'completed', 'abandoned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- One session per step per run — prevents duplicates on resume/refresh
  UNIQUE (run_id, step_index)
);

-- Index for fast lookup by run
CREATE INDEX IF NOT EXISTS idx_run_sessions_run_id ON run_sessions(run_id);

-- Index for finding active sessions across runs
CREATE INDEX IF NOT EXISTS idx_run_sessions_session_id ON run_sessions(session_id)
  WHERE session_id IS NOT NULL;

-- ── 3) RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE run_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: see run_sessions for your own runs (cascade via runs ownership)
CREATE POLICY "run_sessions_select" ON run_sessions FOR SELECT TO authenticated
  USING (
    run_id IN (SELECT id FROM runs WHERE user_id = (SELECT auth.uid()))
    OR is_system_admin()
  );

-- INSERT: create run_sessions for your own runs
CREATE POLICY "run_sessions_insert" ON run_sessions FOR INSERT TO authenticated
  WITH CHECK (
    run_id IN (SELECT id FROM runs WHERE user_id = (SELECT auth.uid()))
  );

-- UPDATE: update your own run_sessions (status, session_id)
CREATE POLICY "run_sessions_update" ON run_sessions FOR UPDATE TO authenticated
  USING (
    run_id IN (SELECT id FROM runs WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    run_id IN (SELECT id FROM runs WHERE user_id = (SELECT auth.uid()))
  );

-- DELETE: cascade from runs handles this, but explicit policy for direct deletes
CREATE POLICY "run_sessions_delete" ON run_sessions FOR DELETE TO authenticated
  USING (
    run_id IN (SELECT id FROM runs WHERE user_id = (SELECT auth.uid()))
    OR is_system_admin()
  );

-- ── 4) Updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_run_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_run_sessions_updated_at
  BEFORE UPDATE ON run_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_run_sessions_updated_at();

COMMIT;
