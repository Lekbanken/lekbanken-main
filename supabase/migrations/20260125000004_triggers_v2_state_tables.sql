-- =============================================================================
-- Migration: 20260125000004_triggers_v2_state_tables.sql
-- Description: Triggers V2 - New state-only table for runtime trigger state
-- =============================================================================
-- This migration creates a new table that separates runtime state from game config.
-- Instead of snapshotting entire triggers, we now:
--   1. Read config from game_triggers
--   2. Store only runtime state in session_trigger_state
-- =============================================================================

-- =============================================================================
-- 1. Session Trigger State (runtime state per trigger)
-- =============================================================================
-- Stores runtime state like status, fired_count, fired_at per session/trigger combo.
-- Config (condition, actions, execute_once, etc.) stays in game_triggers.

CREATE TABLE IF NOT EXISTS public.session_trigger_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID NOT NULL 
    REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  game_trigger_id UUID NOT NULL 
    REFERENCES public.game_triggers(id) ON DELETE CASCADE,
  
  -- Runtime state only
  status TEXT NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'fired', 'disabled', 'error')),
  fired_count INTEGER NOT NULL DEFAULT 0,
  fired_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Enabled can be toggled per-session (defaults to game_trigger.enabled)
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each trigger can only have one state record per session
  CONSTRAINT session_trigger_state_unique 
    UNIQUE (session_id, game_trigger_id)
);

-- Index for efficient lookups by session
CREATE INDEX IF NOT EXISTS idx_session_trigger_state_session
  ON public.session_trigger_state(session_id);

-- Index for efficient lookups by game trigger
CREATE INDEX IF NOT EXISTS idx_session_trigger_state_trigger
  ON public.session_trigger_state(game_trigger_id);

-- Index for armed triggers (for trigger evaluation)
CREATE INDEX IF NOT EXISTS idx_session_trigger_state_armed
  ON public.session_trigger_state(session_id, status) 
  WHERE status = 'armed';

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_session_trigger_state_updated ON public.session_trigger_state;
CREATE TRIGGER trg_session_trigger_state_updated
  BEFORE UPDATE ON public.session_trigger_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 2. RLS Policies
-- =============================================================================

ALTER TABLE public.session_trigger_state ENABLE ROW LEVEL SECURITY;

-- Host can manage trigger state for their sessions
CREATE POLICY session_trigger_state_host_policy
  ON public.session_trigger_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
        AND ps.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_id
        AND ps.host_user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY session_trigger_state_service_policy
  ON public.session_trigger_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 3. Convenience Functions
-- =============================================================================

-- Fire a trigger (atomic update)
CREATE OR REPLACE FUNCTION public.fire_trigger_v2(
  p_session_id UUID,
  p_game_trigger_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  new_status TEXT,
  fired_count INTEGER,
  fired_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state session_trigger_state%ROWTYPE;
BEGIN
  -- Upsert and update atomically
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, fired_count, fired_at)
  VALUES (p_session_id, p_game_trigger_id, 'fired', 1, now())
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'fired',
    fired_count = session_trigger_state.fired_count + 1,
    fired_at = now(),
    updated_at = now()
  RETURNING * INTO v_state;
  
  RETURN QUERY SELECT 
    TRUE,
    v_state.status,
    v_state.fired_count,
    v_state.fired_at;
END;
$$;

-- Disable a trigger
CREATE OR REPLACE FUNCTION public.disable_trigger_v2(
  p_session_id UUID,
  p_game_trigger_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, enabled)
  VALUES (p_session_id, p_game_trigger_id, 'disabled', FALSE)
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'disabled',
    enabled = FALSE,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Re-arm a trigger
CREATE OR REPLACE FUNCTION public.rearm_trigger_v2(
  p_session_id UUID,
  p_game_trigger_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO session_trigger_state (session_id, game_trigger_id, status, enabled)
  VALUES (p_session_id, p_game_trigger_id, 'armed', TRUE)
  ON CONFLICT (session_id, game_trigger_id)
  DO UPDATE SET
    status = 'armed',
    enabled = TRUE,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Disable all triggers for a session
CREATE OR REPLACE FUNCTION public.disable_all_triggers_v2(
  p_session_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE session_trigger_state
  SET status = 'disabled', enabled = FALSE, updated_at = now()
  WHERE session_id = p_session_id AND status = 'armed';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================================
-- 4. Grant permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_trigger_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_trigger_state TO service_role;
GRANT EXECUTE ON FUNCTION public.fire_trigger_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.fire_trigger_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_trigger_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_trigger_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.rearm_trigger_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.rearm_trigger_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_all_triggers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_all_triggers_v2 TO service_role;
