-- BUG-016: Atomic participant join guard
-- Locks the session row, checks participant_count vs max_participants,
-- and returns whether the join is allowed — all in one transaction.
-- The actual INSERT into participants happens in app code after this check,
-- but the FOR UPDATE lock holds until the transaction commits, preventing
-- concurrent requests from all passing the check.
CREATE OR REPLACE FUNCTION public.check_session_join_allowed(
  p_session_id UUID
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, max_allowed INT) AS $$
DECLARE
  v_session RECORD;
  v_max INT;
BEGIN
  -- Lock the session row for the duration of this transaction
  SELECT ps.participant_count, ps.settings
  INTO v_session
  FROM public.participant_sessions ps
  WHERE ps.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  -- Extract max_participants from JSONB settings (supports both key formats)
  v_max := COALESCE(
    (v_session.settings->>'max_participants')::INT,
    (v_session.settings->>'maxParticipants')::INT
  );

  IF v_max IS NOT NULL AND v_session.participant_count >= v_max THEN
    RETURN QUERY SELECT FALSE, v_session.participant_count, v_max;
  ELSE
    RETURN QUERY SELECT TRUE, v_session.participant_count, v_max;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- BUG-017: Atomic no-expiry quota check-and-increment
-- Checks quota and increments in a single transaction with row locking.
-- Returns TRUE if the usage was allowed and incremented, FALSE if quota exceeded.
CREATE OR REPLACE FUNCTION public.check_and_increment_no_expiry_quota(
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
BEGIN
  -- Try to lock the quota row
  SELECT no_expiry_tokens_used, no_expiry_tokens_limit
  INTO v_quota
  FROM public.participant_token_quotas
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create default quota with 1 usage (first use is always allowed)
    INSERT INTO public.participant_token_quotas (tenant_id, no_expiry_tokens_limit, no_expiry_tokens_used)
    VALUES (p_tenant_id, 2, 1)
    ON CONFLICT (tenant_id) DO UPDATE
      SET no_expiry_tokens_used = participant_token_quotas.no_expiry_tokens_used + 1
      WHERE participant_token_quotas.no_expiry_tokens_used < participant_token_quotas.no_expiry_tokens_limit;

    RETURN TRUE;
  END IF;

  -- Check if quota allows usage
  IF v_quota.no_expiry_tokens_used >= v_quota.no_expiry_tokens_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment
  UPDATE public.participant_token_quotas
  SET no_expiry_tokens_used = no_expiry_tokens_used + 1,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- BUG-038: Ensure only one primary tenant per user
-- Partial unique index: at most one row with is_primary=true per user_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenant_memberships_one_primary
  ON public.user_tenant_memberships (user_id)
  WHERE is_primary = TRUE;
