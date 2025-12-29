-- Session Events Table for Observability
-- Epic 6: Event System & Observability - Task 6.1
-- Created: 2025-12-28

-- Session events store all significant events during a session for
-- debugging, replay, and analytics purposes.

CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  -- Event identification
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,  -- 'trigger', 'artifact', 'lifecycle', 'signal', 'timebank', 'navigation'
  
  -- Actor (who caused the event)
  actor_type TEXT NOT NULL DEFAULT 'system',  -- 'host', 'participant', 'system', 'trigger'
  actor_id UUID,  -- user_id or trigger_id if applicable
  actor_name TEXT,  -- display name for UI
  
  -- Target (what was affected)
  target_type TEXT,  -- 'artifact', 'trigger', 'step', 'phase', 'participant', 'signal'
  target_id TEXT,
  target_name TEXT,  -- display name for UI
  
  -- Event data
  payload JSONB DEFAULT '{}'::jsonb,  -- Event-specific data
  
  -- Correlation
  correlation_id UUID,  -- Links related events together
  parent_event_id UUID REFERENCES session_events(id),  -- For event chains
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Severity/importance for filtering
  severity TEXT NOT NULL DEFAULT 'info'  -- 'debug', 'info', 'warning', 'error'
);

-- If the table already existed (older schema), ensure required columns exist.
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS event_category TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS actor_type TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS parent_event_id UUID;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS severity TEXT;

-- Backfill defaults so we can safely enforce NOT NULL expectations.
UPDATE session_events SET
  event_type = COALESCE(event_type, 'unknown'),
  event_category = COALESCE(event_category, 'unknown'),
  actor_type = COALESCE(actor_type, 'system'),
  payload = COALESCE(payload, '{}'::jsonb),
  created_at = COALESCE(created_at, now()),
  severity = COALESCE(severity, 'info')
WHERE
  event_type IS NULL
  OR event_category IS NULL
  OR actor_type IS NULL
  OR payload IS NULL
  OR created_at IS NULL
  OR severity IS NULL;

ALTER TABLE session_events ALTER COLUMN event_type SET NOT NULL;
ALTER TABLE session_events ALTER COLUMN event_type SET DEFAULT 'unknown';
ALTER TABLE session_events ALTER COLUMN event_category SET NOT NULL;
ALTER TABLE session_events ALTER COLUMN event_category SET DEFAULT 'unknown';
ALTER TABLE session_events ALTER COLUMN actor_type SET NOT NULL;
ALTER TABLE session_events ALTER COLUMN actor_type SET DEFAULT 'system';
ALTER TABLE session_events ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
ALTER TABLE session_events ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE session_events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE session_events ALTER COLUMN severity SET NOT NULL;
ALTER TABLE session_events ALTER COLUMN severity SET DEFAULT 'info';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_session_created ON session_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_event_category ON session_events(event_category);
CREATE INDEX IF NOT EXISTS idx_session_events_correlation_id ON session_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_events_severity ON session_events(severity) WHERE severity IN ('warning', 'error');
CREATE INDEX IF NOT EXISTS idx_session_events_actor ON session_events(actor_type, actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_events_target ON session_events(target_type, target_id) WHERE target_id IS NOT NULL;

-- RLS policies
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Hosts can view all events for their sessions
DROP POLICY IF EXISTS session_events_host_view ON session_events;
CREATE POLICY session_events_host_view ON session_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- System can insert events (via service role or host)
DROP POLICY IF EXISTS session_events_insert ON session_events;
CREATE POLICY session_events_insert ON session_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- Participants can view events for their session (limited)
DROP POLICY IF EXISTS session_events_participant_view ON session_events;
CREATE POLICY session_events_participant_view ON session_events
  FOR SELECT
  USING (
    -- Conservative: keep to non-debug events and session owners/admins
    severity != 'debug' AND
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_events.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- =============================================================================
-- Helper functions for event emission
-- =============================================================================

-- Function to log a session event
CREATE OR REPLACE FUNCTION log_session_event(
  p_session_id UUID,
  p_event_type TEXT,
  p_event_category TEXT,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_correlation_id UUID DEFAULT NULL,
  p_parent_event_id UUID DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO session_events (
    session_id,
    event_type,
    event_category,
    actor_type,
    actor_id,
    actor_name,
    target_type,
    target_id,
    target_name,
    payload,
    correlation_id,
    parent_event_id,
    severity
  ) VALUES (
    p_session_id,
    p_event_type,
    p_event_category,
    p_actor_type,
    p_actor_id,
    p_actor_name,
    p_target_type,
    p_target_id,
    p_target_name,
    p_payload,
    p_correlation_id,
    p_parent_event_id,
    p_severity
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent events for a session
CREATE OR REPLACE FUNCTION get_session_events(
  p_session_id UUID,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  event_type TEXT,
  event_category TEXT,
  actor_type TEXT,
  actor_id UUID,
  actor_name TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  payload JSONB,
  correlation_id UUID,
  parent_event_id UUID,
  severity TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.event_type,
    se.event_category,
    se.actor_type,
    se.actor_id,
    se.actor_name,
    se.target_type,
    se.target_id,
    se.target_name,
    se.payload,
    se.correlation_id,
    se.parent_event_id,
    se.severity,
    se.created_at
  FROM session_events se
  WHERE se.session_id = p_session_id
    AND (p_category IS NULL OR se.event_category = p_category)
    AND (p_severity IS NULL OR se.severity = p_severity)
    AND (p_since IS NULL OR se.created_at >= p_since)
  ORDER BY se.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count events by category
CREATE OR REPLACE FUNCTION get_session_event_stats(
  p_session_id UUID
) RETURNS TABLE (
  event_category TEXT,
  event_count BIGINT,
  error_count BIGINT,
  warning_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.event_category,
    COUNT(*) AS event_count,
    COUNT(*) FILTER (WHERE se.severity = 'error') AS error_count,
    COUNT(*) FILTER (WHERE se.severity = 'warning') AS warning_count
  FROM session_events se
  WHERE se.session_id = p_session_id
  GROUP BY se.event_category
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for session_events
ALTER PUBLICATION supabase_realtime ADD TABLE session_events;

COMMENT ON TABLE session_events IS 'Stores all significant events during a play session for debugging, replay, and analytics';
COMMENT ON COLUMN session_events.event_type IS 'Specific event type like trigger_fired, artifact_revealed, step_completed';
COMMENT ON COLUMN session_events.event_category IS 'High-level category for filtering: trigger, artifact, lifecycle, signal, timebank, navigation';
COMMENT ON COLUMN session_events.correlation_id IS 'Groups related events together (e.g., trigger fire and its resulting actions)';
COMMENT ON COLUMN session_events.parent_event_id IS 'Creates event chains for cause-effect relationships';
