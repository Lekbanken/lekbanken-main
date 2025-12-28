-- =============================================================================
-- Migration: 20251227120000_signal_time_bank.sql
-- Description: Legendary Play - Signal + Time Bank runtime primitives
-- Notes:
-- - Built on participant_sessions (Legendary Play runtime)
-- - Host/director writes via authenticated/service_role; participants write via API layer
-- =============================================================================

-- =============================================================================
-- 1) session_signals
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  channel TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_signals_session_created
  ON public.session_signals(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_signals_session_channel
  ON public.session_signals(session_id, channel);

COMMENT ON TABLE public.session_signals IS 'Lightweight signals for coordination/drama. Written via API; replayable via event log patterns.';
COMMENT ON COLUMN public.session_signals.channel IS 'Signal channel key (e.g. READY, SOS, FOUND)';
COMMENT ON COLUMN public.session_signals.payload IS 'Arbitrary JSON payload for the signal';


-- =============================================================================
-- 2) session_time_bank + ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_time_bank (
  session_id UUID PRIMARY KEY REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  balance_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT session_time_bank_balance_nonnegative CHECK (balance_seconds >= 0)
);

DROP TRIGGER IF EXISTS trg_session_time_bank_updated ON public.session_time_bank;
CREATE TRIGGER trg_session_time_bank_updated
  BEFORE UPDATE ON public.session_time_bank
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.session_time_bank IS 'Server-authoritative time resource for a session (earn/spend/add/remove).';
COMMENT ON COLUMN public.session_time_bank.balance_seconds IS 'Current balance in seconds';


CREATE TABLE IF NOT EXISTS public.session_time_bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,

  delta_seconds INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  event_id UUID REFERENCES public.session_events(id) ON DELETE SET NULL,

  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_bank_ledger_session_created
  ON public.session_time_bank_ledger(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_bank_ledger_session_reason
  ON public.session_time_bank_ledger(session_id, reason);

COMMENT ON TABLE public.session_time_bank_ledger IS 'Immutable ledger of time bank balance changes.';


-- =============================================================================
-- 3) Atomic function: time_bank_apply_delta
-- =============================================================================

-- Atomically applies a delta to the session time bank and writes a ledger row.
-- Ensures a time bank row exists for the session.
--
-- Returns JSON:
-- { status: 'applied'|'clamped', previous_balance, new_balance, requested_delta, applied_delta }

CREATE OR REPLACE FUNCTION public.time_bank_apply_delta(
  p_session_id UUID,
  p_delta_seconds INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_event_id UUID DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_actor_participant_id UUID DEFAULT NULL,
  p_min_balance INTEGER DEFAULT 0,
  p_max_balance INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current INTEGER;
  v_previous INTEGER;
  v_requested INTEGER;
  v_applied INTEGER;
  v_new INTEGER;
  v_status TEXT;
BEGIN
  v_requested := COALESCE(p_delta_seconds, 0);

  -- Ensure row exists
  INSERT INTO public.session_time_bank (session_id, balance_seconds)
  VALUES (p_session_id, GREATEST(COALESCE(p_min_balance, 0), 0))
  ON CONFLICT (session_id) DO NOTHING;

  -- Lock row
  SELECT balance_seconds
  INTO v_current
  FROM public.session_time_bank
  WHERE session_id = p_session_id
  FOR UPDATE;

  v_previous := COALESCE(v_current, 0);

  -- Apply delta
  v_new := v_previous + v_requested;

  -- Enforce min
  IF p_min_balance IS NOT NULL THEN
    v_new := GREATEST(v_new, p_min_balance);
  ELSE
    v_new := GREATEST(v_new, 0);
  END IF;

  -- Enforce max
  IF p_max_balance IS NOT NULL THEN
    v_new := LEAST(v_new, p_max_balance);
  END IF;

  v_applied := v_new - v_previous;
  v_status := CASE WHEN v_applied = v_requested THEN 'applied' ELSE 'clamped' END;

  UPDATE public.session_time_bank
  SET balance_seconds = v_new
  WHERE session_id = p_session_id;

  INSERT INTO public.session_time_bank_ledger (
    session_id,
    delta_seconds,
    reason,
    metadata,
    event_id,
    actor_user_id,
    actor_participant_id
  ) VALUES (
    p_session_id,
    v_applied,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb),
    p_event_id,
    p_actor_user_id,
    p_actor_participant_id
  );

  RETURN jsonb_build_object(
    'status', v_status,
    'previous_balance', v_previous,
    'new_balance', v_new,
    'requested_delta', v_requested,
    'applied_delta', v_applied
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.time_bank_apply_delta(UUID, INTEGER, TEXT, JSONB, UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.time_bank_apply_delta(UUID, INTEGER, TEXT, JSONB, UUID, UUID, UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.time_bank_apply_delta IS 'Atomically applies a time delta to a session time bank with ledger entry; clamps to min/max.';


-- =============================================================================
-- 4) RLS Policies
-- =============================================================================

ALTER TABLE public.session_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_time_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_time_bank_ledger ENABLE ROW LEVEL SECURITY;

-- -----------------------
-- session_signals
-- -----------------------

DROP POLICY IF EXISTS "session_signals_select" ON public.session_signals;
CREATE POLICY "session_signals_select" ON public.session_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_signals.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_signals_insert" ON public.session_signals;
CREATE POLICY "session_signals_insert" ON public.session_signals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_signals.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- No update/delete by default (signals are append-only)


-- -----------------------
-- session_time_bank
-- -----------------------

DROP POLICY IF EXISTS "session_time_bank_select" ON public.session_time_bank;
CREATE POLICY "session_time_bank_select" ON public.session_time_bank
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_time_bank_insert" ON public.session_time_bank;
CREATE POLICY "session_time_bank_insert" ON public.session_time_bank
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "session_time_bank_update" ON public.session_time_bank;
CREATE POLICY "session_time_bank_update" ON public.session_time_bank
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );


-- -----------------------
-- session_time_bank_ledger
-- -----------------------

DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.session_time_bank_ledger;
CREATE POLICY "time_bank_ledger_select" ON public.session_time_bank_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank_ledger.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

DROP POLICY IF EXISTS "time_bank_ledger_insert" ON public.session_time_bank_ledger;
CREATE POLICY "time_bank_ledger_insert" ON public.session_time_bank_ledger
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = session_time_bank_ledger.session_id
      AND ps.host_user_id = auth.uid()
    )
    OR public.is_global_admin()
  );

-- No update/delete for ledger (immutable)
