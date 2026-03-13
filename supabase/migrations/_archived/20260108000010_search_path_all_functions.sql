-- =============================================================================
-- Migration 010: Add search_path to ALL remaining public functions
-- =============================================================================
-- Purpose: Supabase Security Advisor lint 0011 warns about ALL functions
--          (not just SECURITY DEFINER) that lack explicit search_path.
--          This prevents potential schema confusion/injection.
--
-- Also fixes:
--   - analytics_timeseries INSERT policy (lint 0024)
-- =============================================================================

-- =============================================================================
-- PART A: Fix analytics_timeseries permissive INSERT policy
-- =============================================================================
-- Problem: system_can_insert_timeseries has WITH CHECK (true) - too open
-- Solution: Restrict to service_role only (analytics comes from server/edge functions)

DROP POLICY IF EXISTS "system_can_insert_timeseries" ON public.analytics_timeseries;

CREATE POLICY "service_role_can_insert_timeseries"
ON public.analytics_timeseries FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================================================
-- PART B: Add search_path to trigger/helper functions
-- =============================================================================
-- These are NOT SECURITY DEFINER but should still have explicit search_path
-- for lint compliance and defense in depth.

-- -----------------------------------------------------------------------------
-- 1. trigger_set_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. update_learning_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_learning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. touch_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. update_participant_count
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE participant_sessions
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE participant_sessions
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. update_updated_at_column
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. update_tenant_domains_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_tenant_domains_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. to_text_array_safe (IMMUTABLE SQL function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.to_text_array_safe(input text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN input ~ '^\s*\[.*\]\s*$' THEN ARRAY(SELECT jsonb_array_elements_text(input::jsonb))
    ELSE regexp_split_to_array(input, '\s*,\s*')
  END;
$$;

-- -----------------------------------------------------------------------------
-- 8. get_latest_game_snapshot (STABLE SQL function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_latest_game_snapshot(p_game_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.game_snapshots
  WHERE game_id = p_game_id
  ORDER BY version DESC
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 9. attempt_keypad_unlock
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attempt_keypad_unlock(
  p_artifact_id UUID,
  p_entered_code TEXT,
  p_participant_id UUID,
  p_participant_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_artifact RECORD;
  v_metadata JSONB;
  v_config JSONB;
  v_state JSONB;
  v_correct_code TEXT;
  v_max_attempts INT;
  v_lock_on_fail BOOLEAN;
  v_is_unlocked BOOLEAN;
  v_is_locked_out BOOLEAN;
  v_attempt_count INT;
  v_new_attempt_count INT;
  v_is_correct BOOLEAN;
  v_should_lock BOOLEAN;
  v_attempts_left INT;
  v_new_state JSONB;
  v_result JSONB;
  v_success_message TEXT;
  v_fail_message TEXT;
  v_locked_message TEXT;
BEGIN
  -- Lock the artifact row for update (prevents concurrent modification)
  SELECT id, metadata, artifact_type
  INTO v_artifact
  FROM session_artifacts
  WHERE id = p_artifact_id
  FOR UPDATE;

  IF v_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_artifact.artifact_type != 'keypad' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact is not a keypad');
  END IF;

  v_metadata := COALESCE(v_artifact.metadata, '{}'::jsonb);
  
  -- Parse config
  v_correct_code := COALESCE(v_metadata->>'correctCode', '');
  v_max_attempts := (v_metadata->>'maxAttempts')::INT;
  v_lock_on_fail := COALESCE((v_metadata->>'lockOnFail')::BOOLEAN, FALSE);
  v_success_message := COALESCE(v_metadata->>'successMessage', 'Koden är korrekt!');
  v_fail_message := COALESCE(v_metadata->>'failMessage', 'Fel kod, försök igen.');
  v_locked_message := COALESCE(v_metadata->>'lockedMessage', 'Keypaden är låst.');

  -- Parse current state
  v_state := COALESCE(v_metadata->'keypadState', '{}'::jsonb);
  v_is_unlocked := COALESCE((v_state->>'isUnlocked')::BOOLEAN, FALSE);
  v_is_locked_out := COALESCE((v_state->>'isLockedOut')::BOOLEAN, FALSE);
  v_attempt_count := COALESCE((v_state->>'attemptCount')::INT, 0);

  -- Already unlocked? Return idempotent success
  IF v_is_unlocked THEN
    RETURN jsonb_build_object(
      'status', 'already_unlocked',
      'message', v_success_message,
      'is_unlocked', TRUE,
      'is_locked_out', FALSE,
      'attempt_count', v_attempt_count
    );
  END IF;

  -- Already locked out? Return idempotent locked
  IF v_is_locked_out THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'is_unlocked', FALSE,
      'is_locked_out', TRUE,
      'attempt_count', v_attempt_count
    );
  END IF;

  -- Validate the code
  v_is_correct := (p_entered_code = v_correct_code);
  v_new_attempt_count := v_attempt_count + 1;

  IF v_is_correct THEN
    -- SUCCESS: Update state to unlocked
    v_new_state := jsonb_build_object(
      'isUnlocked', TRUE,
      'isLockedOut', FALSE,
      'attemptCount', v_new_attempt_count,
      'unlockedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'unlockedByParticipantId', p_participant_id
    );

    -- Update metadata
    UPDATE session_artifacts
    SET metadata = jsonb_set(v_metadata, '{keypadState}', v_new_state)
    WHERE id = p_artifact_id;

    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'is_unlocked', TRUE,
      'is_locked_out', FALSE,
      'attempt_count', v_new_attempt_count,
      'unlocked_by', p_participant_name
    );

  ELSE
    -- FAIL: Check if should lock
    v_should_lock := (v_max_attempts IS NOT NULL) AND (v_new_attempt_count >= v_max_attempts) AND v_lock_on_fail;
    v_attempts_left := CASE WHEN v_max_attempts IS NOT NULL THEN GREATEST(0, v_max_attempts - v_new_attempt_count) ELSE NULL END;

    v_new_state := jsonb_build_object(
      'isUnlocked', FALSE,
      'isLockedOut', v_should_lock,
      'attemptCount', v_new_attempt_count,
      'unlockedAt', NULL,
      'unlockedByParticipantId', NULL
    );

    -- Update metadata
    UPDATE session_artifacts
    SET metadata = jsonb_set(v_metadata, '{keypadState}', v_new_state)
    WHERE id = p_artifact_id;

    IF v_should_lock THEN
      RETURN jsonb_build_object(
        'status', 'locked',
        'message', v_locked_message,
        'is_unlocked', FALSE,
        'is_locked_out', TRUE,
        'attempt_count', v_new_attempt_count,
        'attempts_left', 0
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'fail',
        'message', v_fail_message,
        'is_unlocked', FALSE,
        'is_locked_out', FALSE,
        'attempt_count', v_new_attempt_count,
        'attempts_left', v_attempts_left
      );
    END IF;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. time_bank_apply_delta
-- -----------------------------------------------------------------------------
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
SET search_path = public
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

-- =============================================================================
-- COMMENTS (with explicit parameter types for overloaded functions)
-- =============================================================================
COMMENT ON FUNCTION public.trigger_set_updated_at() IS 'Generic trigger to set updated_at on row update. Has explicit search_path.';
COMMENT ON FUNCTION public.update_learning_updated_at() IS 'Trigger for learning domain updated_at. Has explicit search_path.';
COMMENT ON FUNCTION public.touch_updated_at() IS 'Trigger to touch updated_at on update. Has explicit search_path.';
COMMENT ON FUNCTION public.update_participant_count() IS 'Trigger to update participant count on insert/delete. Has explicit search_path.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic trigger for updated_at column. Has explicit search_path.';
COMMENT ON FUNCTION public.update_tenant_domains_updated_at() IS 'Trigger for tenant_domains updated_at. Has explicit search_path.';
COMMENT ON FUNCTION public.to_text_array_safe(text) IS 'Safely converts text to text array. Has explicit search_path.';
COMMENT ON FUNCTION public.get_latest_game_snapshot(uuid) IS 'Returns latest snapshot ID for a game. Has explicit search_path.';
COMMENT ON FUNCTION public.attempt_keypad_unlock(uuid, text, uuid, text) IS 'Atomically attempts keypad unlock with race protection. Has explicit search_path.';
COMMENT ON FUNCTION public.time_bank_apply_delta(uuid, integer, text, jsonb, uuid, uuid, uuid, integer, integer) IS 'Atomically applies time delta to session time bank. Has explicit search_path.';
