-- Session Commands Table — MS11 Command Pipeline
-- Provides idempotency, audit trail, and replay for all host actions.
-- Created: 2026-03-04

CREATE TABLE IF NOT EXISTS session_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL,  -- host user_id (from auth)
  
  -- Command identification
  command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Idempotency: (client_id, client_seq) must be unique per session
  client_id TEXT NOT NULL,   -- stable per-tab identifier (e.g. crypto.randomUUID())
  client_seq BIGINT NOT NULL, -- monotonic per client_id
  
  -- Processing state
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  error TEXT,  -- null if successful
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency constraint: same client cannot issue the same seq twice per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_commands_idempotent
  ON session_commands (session_id, client_id, client_seq);

-- Query commands by session (replay, audit)
CREATE INDEX IF NOT EXISTS idx_session_commands_session_time
  ON session_commands (session_id, created_at);

-- RLS: only host can insert/read their own session commands
ALTER TABLE session_commands ENABLE ROW LEVEL SECURITY;

-- Host can insert commands for sessions they own
CREATE POLICY session_commands_insert ON session_commands
  FOR INSERT
  WITH CHECK (
    issued_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = auth.uid()
    )
  );

-- Host can read commands for sessions they own
CREATE POLICY session_commands_select ON session_commands
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participant_sessions ps
      WHERE ps.id = session_id
      AND ps.host_user_id = auth.uid()
    )
  );

-- System admins can read all commands (for debugging/audit)
CREATE POLICY session_commands_admin_select ON session_commands
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean = true
  );
