-- =============================================================================
-- Migration: 20260123130000_participant_sessions_lobby_defaults.sql
-- Description: New participant sessions should start in Lobby (not Live)
--              by default. We model this as:
--              - status stays 'active' (joinable by code)
--              - started_at is NULL until the host explicitly starts.
-- =============================================================================

-- 1) Make started_at nullable and remove default NOW()
ALTER TABLE public.participant_sessions
  ALTER COLUMN started_at DROP DEFAULT;

ALTER TABLE public.participant_sessions
  ALTER COLUMN started_at DROP NOT NULL;

-- 2) Update the original date constraint to allow started_at = NULL
ALTER TABLE public.participant_sessions
  DROP CONSTRAINT IF EXISTS valid_dates;

ALTER TABLE public.participant_sessions
  ADD CONSTRAINT valid_dates CHECK (
    started_at IS NULL OR (
      (ended_at IS NULL OR ended_at >= started_at) AND
      (paused_at IS NULL OR paused_at >= started_at) AND
      (archived_at IS NULL OR archived_at >= started_at)
    )
  );
