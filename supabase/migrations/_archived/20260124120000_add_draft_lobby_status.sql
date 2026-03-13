-- ============================================================================
-- Add 'draft' and 'lobby' to participant_session_status enum
-- ============================================================================
-- This migration adds support for offline/online lobby workflow:
-- - draft: Session is being prepared (offline mode, no participants can join)
-- - lobby: Session is open for participants to join (online mode)
-- ============================================================================

-- Add 'draft' value to the enum (before 'active')
ALTER TYPE participant_session_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'active';

-- Add 'lobby' value to the enum (after 'draft', before 'active')
ALTER TYPE participant_session_status ADD VALUE IF NOT EXISTS 'lobby' BEFORE 'active';

-- Note: Existing sessions will remain in their current status.

COMMENT ON TYPE participant_session_status IS 
  'Status lifecycle: draft → lobby → active → paused/locked → ended → archived/cancelled';
