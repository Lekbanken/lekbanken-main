-- =============================================================================
-- Migration: 20251220093000_secret_instructions_flags.sql
-- Description: Runtime flags for secret instruction unlock + participant reveal tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Session-level: host-controlled secret instruction gate
-- -----------------------------------------------------------------------------

ALTER TABLE public.participant_sessions
  ADD COLUMN IF NOT EXISTS secret_instructions_unlocked_at TIMESTAMPTZ;

ALTER TABLE public.participant_sessions
  ADD COLUMN IF NOT EXISTS secret_instructions_unlocked_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.participant_sessions.secret_instructions_unlocked_at IS 'When host unlocked secret role instructions for participants';
COMMENT ON COLUMN public.participant_sessions.secret_instructions_unlocked_by IS 'Host user id who unlocked secret role instructions';

-- -----------------------------------------------------------------------------
-- 2) Participant-level: track if any participant has revealed secrets
-- -----------------------------------------------------------------------------

-- We track this on the (one-per-participant) assignment row so we can
-- enforce "re-lock only if nobody has revealed".
ALTER TABLE public.participant_role_assignments
  ADD COLUMN IF NOT EXISTS secret_instructions_revealed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_role_assignments_session_secret_revealed
  ON public.participant_role_assignments(session_id, secret_instructions_revealed_at);

COMMENT ON COLUMN public.participant_role_assignments.secret_instructions_revealed_at IS 'When the participant first revealed their secret role instructions (null = never revealed)';
