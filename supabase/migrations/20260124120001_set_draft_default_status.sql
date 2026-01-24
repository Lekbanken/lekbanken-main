-- ============================================================================
-- Update default session status to 'draft'
-- ============================================================================
-- This must be a separate migration because PostgreSQL requires
-- enum values to be committed before they can be used as defaults.
-- ============================================================================

-- Update default status for new sessions to 'draft'
-- New sessions should start in offline mode
ALTER TABLE participant_sessions 
  ALTER COLUMN status SET DEFAULT 'draft'::participant_session_status;
