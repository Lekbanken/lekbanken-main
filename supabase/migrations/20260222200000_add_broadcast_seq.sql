-- =============================================================================
-- Add broadcast_seq to participant_sessions
-- =============================================================================
--
-- Provides a strictly monotonic, per-session sequence counter for realtime
-- broadcast events. Every call to broadcastPlayEvent atomically increments
-- this counter and uses the returned value as the event's `seq` field.
--
-- This eliminates the Date.now()-based sequence which is NOT monotonic across
-- multiple server instances (serverless cold-starts, NTP drift, regional
-- routing can all cause clock skew between Node processes).
--
-- The client-side guard in useLiveSession rejects events with seq <= lastSeq,
-- so a strictly monotonic DB sequence is critical for correctness.
-- =============================================================================

ALTER TABLE public.participant_sessions
  ADD COLUMN IF NOT EXISTS broadcast_seq BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.participant_sessions.broadcast_seq IS
  'Monotonic counter incremented atomically on each realtime broadcast. '
  'Used as the seq field in PlayBroadcastEvent so the client can reject '
  'duplicate/stale events regardless of server instance clock skew.';

-- ---------------------------------------------------------------------------
-- RPC function: atomically increment and return next broadcast_seq
-- ---------------------------------------------------------------------------
-- Called from the Node server helper via supabase.rpc('increment_broadcast_seq').
-- Uses a single UPDATE ... RETURNING to guarantee atomicity even under
-- concurrent requests from different server instances.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_broadcast_seq(p_session_id UUID)
RETURNS BIGINT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE participant_sessions
     SET broadcast_seq = broadcast_seq + 1
   WHERE id = p_session_id
   RETURNING broadcast_seq;
$$;