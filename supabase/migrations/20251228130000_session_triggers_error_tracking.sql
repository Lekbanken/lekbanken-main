-- =============================================================================
-- Migration: 20251228130000_session_triggers_error_tracking.sql
-- Description: Add error status and error tracking to session_triggers
-- Epic 5.1 - Session Cockpit Architecture
-- =============================================================================

-- =============================================================================
-- 1) Add 'error' to status check constraint
-- =============================================================================

-- Drop existing constraint
ALTER TABLE public.session_triggers 
  DROP CONSTRAINT IF EXISTS session_triggers_status_check;

-- Add new constraint with 'error' status
ALTER TABLE public.session_triggers
  ADD CONSTRAINT session_triggers_status_check 
  CHECK (status IN ('armed', 'fired', 'disabled', 'error'));

-- =============================================================================
-- 2) Add error tracking columns
-- =============================================================================

-- Last error message (if any)
ALTER TABLE public.session_triggers 
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Timestamp of last error
ALTER TABLE public.session_triggers 
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Error count (for tracking recurring errors)
ALTER TABLE public.session_triggers 
  ADD COLUMN IF NOT EXISTS error_count INT NOT NULL DEFAULT 0;

-- =============================================================================
-- 3) Add index for error status (for monitoring/debugging)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_session_triggers_error 
  ON public.session_triggers(session_id, status) 
  WHERE status = 'error';

-- =============================================================================
-- 4) Add comments
-- =============================================================================

COMMENT ON COLUMN public.session_triggers.status IS 
  'Trigger status: armed = ready to fire, fired = has executed (for execute_once), disabled = manually disabled, error = execution failed';

COMMENT ON COLUMN public.session_triggers.last_error IS 
  'Error message from the last failed execution attempt';

COMMENT ON COLUMN public.session_triggers.last_error_at IS 
  'Timestamp of the last error';

COMMENT ON COLUMN public.session_triggers.error_count IS 
  'Number of times this trigger has encountered errors';

-- =============================================================================
-- 5) Helper function to record trigger error
-- =============================================================================

CREATE OR REPLACE FUNCTION public.session_trigger_record_error(
  p_trigger_id UUID,
  p_error_message TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'error',
    last_error = p_error_message,
    last_error_at = NOW(),
    error_count = error_count + 1,
    updated_at = NOW()
  WHERE id = p_trigger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.session_trigger_record_error IS 
  'Records an error for a session trigger and sets its status to error';

-- =============================================================================
-- 6) Helper function to clear trigger error and re-arm
-- =============================================================================

CREATE OR REPLACE FUNCTION public.session_trigger_clear_error(
  p_trigger_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE id = p_trigger_id
  AND status = 'error';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.session_trigger_clear_error IS 
  'Clears error state and re-arms a trigger';

-- =============================================================================
-- 7) Helper function to disable all triggers (kill switch)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.session_triggers_disable_all(
  p_session_id UUID
) RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'disabled',
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('armed', 'error');
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.session_triggers_disable_all IS 
  'Disables all armed/error triggers for a session (kill switch)';

-- =============================================================================
-- 8) Helper function to re-arm all triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.session_triggers_rearm_all(
  p_session_id UUID
) RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('disabled', 'error')
  AND enabled = TRUE;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.session_triggers_rearm_all IS 
  'Re-arms all disabled/error triggers for a session';
