-- =============================================================================
-- Migration: 20260125000003_keypad_rpc_v2.sql
-- Description: Artifacts V2 - Updated keypad unlock RPC
-- =============================================================================
-- Updated attempt_keypad_unlock function that:
--   1. Reads config (correctCode, maxAttempts) from game_artifacts.metadata
--   2. Reads/writes state from session_artifact_state.state.keypadState
--   3. Takes session_id + game_artifact_id instead of session_artifact_id
-- =============================================================================

-- Drop old function signature (will be replaced)
DROP FUNCTION IF EXISTS public.attempt_keypad_unlock(UUID, TEXT, UUID, TEXT);

-- =============================================================================
-- Function: attempt_keypad_unlock_v2
-- =============================================================================
-- Atomically attempts to validate a keypad code and update state.
-- Returns the result of the attempt without race conditions.
-- 
-- Parameters:
--   p_session_id: The participant session ID
--   p_game_artifact_id: The game artifact ID (keypad type)
--   p_entered_code: The code entered by the participant
--   p_participant_id: The participant attempting the unlock
--   p_participant_name: Display name for broadcast context
-- 
-- Returns: JSON with status, message, attempts_left, is_locked_out, is_unlocked

CREATE OR REPLACE FUNCTION public.attempt_keypad_unlock_v2(
  p_session_id UUID,
  p_game_artifact_id UUID,
  p_entered_code TEXT,
  p_participant_id UUID,
  p_participant_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_artifact RECORD;
  v_session RECORD;
  v_state_row RECORD;
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
  v_success_message TEXT;
  v_fail_message TEXT;
  v_locked_message TEXT;
BEGIN
  -- ==========================================================================
  -- 1. Validate session exists and get game_id
  -- ==========================================================================
  SELECT id, game_id, status
  INTO v_session
  FROM public.participant_sessions
  WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- ==========================================================================
  -- 2. Validate game artifact exists and belongs to session's game
  -- ==========================================================================
  SELECT id, game_id, artifact_type, metadata
  INTO v_game_artifact
  FROM public.game_artifacts
  WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  IF v_game_artifact.artifact_type != 'keypad' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact is not a keypad');
  END IF;

  -- ==========================================================================
  -- 3. Parse config from game_artifacts.metadata
  -- ==========================================================================
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_correct_code := COALESCE(v_config->>'correctCode', '');
  v_max_attempts := (v_config->>'maxAttempts')::INT;
  v_lock_on_fail := COALESCE((v_config->>'lockOnFail')::BOOLEAN, FALSE);
  v_success_message := COALESCE(v_config->>'successMessage', 'Koden är korrekt!');
  v_fail_message := COALESCE(v_config->>'failMessage', 'Fel kod, försök igen.');
  v_locked_message := COALESCE(v_config->>'lockedMessage', 'Keypaden är låst.');

  -- ==========================================================================
  -- 4. Get or create state record (with row lock for race protection)
  -- ==========================================================================
  -- First, try to insert if not exists
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  -- Now lock and read the state row
  SELECT id, state
  INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id
    AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- Parse current keypad state
  v_state := COALESCE(v_state_row.state->'keypadState', '{}'::jsonb);
  v_is_unlocked := COALESCE((v_state->>'isUnlocked')::BOOLEAN, FALSE);
  v_is_locked_out := COALESCE((v_state->>'isLockedOut')::BOOLEAN, FALSE);
  v_attempt_count := COALESCE((v_state->>'attemptCount')::INT, 0);

  -- ==========================================================================
  -- 5. Check current state
  -- ==========================================================================
  
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

  -- ==========================================================================
  -- 6. Validate the code
  -- ==========================================================================
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

    -- Update state table
    UPDATE public.session_artifact_state
    SET 
      state = jsonb_set(COALESCE(state, '{}'::jsonb), '{keypadState}', v_new_state),
      updated_at = now()
    WHERE id = v_state_row.id;

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
    v_should_lock := (v_max_attempts IS NOT NULL) 
                     AND (v_new_attempt_count >= v_max_attempts) 
                     AND v_lock_on_fail;
    v_attempts_left := CASE 
      WHEN v_max_attempts IS NOT NULL THEN GREATEST(0, v_max_attempts - v_new_attempt_count) 
      ELSE NULL 
    END;

    v_new_state := jsonb_build_object(
      'isUnlocked', FALSE,
      'isLockedOut', v_should_lock,
      'attemptCount', v_new_attempt_count,
      'unlockedAt', NULL,
      'unlockedByParticipantId', NULL
    );

    -- Update state table
    UPDATE public.session_artifact_state
    SET 
      state = jsonb_set(COALESCE(state, '{}'::jsonb), '{keypadState}', v_new_state),
      updated_at = now()
    WHERE id = v_state_row.id;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.attempt_keypad_unlock_v2(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_keypad_unlock_v2(UUID, UUID, TEXT, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.attempt_keypad_unlock_v2 IS 
'Artifacts V2: Atomically attempts keypad unlock. Reads config from game_artifacts, writes state to session_artifact_state.';

-- =============================================================================
-- Backward compatibility: Keep old function but redirect to V2
-- =============================================================================
-- This allows existing code to continue working during migration

CREATE OR REPLACE FUNCTION public.attempt_keypad_unlock(
  p_artifact_id UUID,
  p_entered_code TEXT,
  p_participant_id UUID,
  p_participant_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_game_artifact_id UUID;
BEGIN
  -- Look up session and source artifact from session_artifacts
  SELECT sa.session_id, sa.source_artifact_id
  INTO v_session_id, v_game_artifact_id
  FROM public.session_artifacts sa
  WHERE sa.id = p_artifact_id;

  IF v_session_id IS NULL OR v_game_artifact_id IS NULL THEN
    -- Fall back to original behavior for artifacts without source
    -- This handles edge cases during migration
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found or not linked to game artifact');
  END IF;

  -- Delegate to V2 function
  RETURN public.attempt_keypad_unlock_v2(
    v_session_id,
    v_game_artifact_id,
    p_entered_code,
    p_participant_id,
    p_participant_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attempt_keypad_unlock(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_keypad_unlock(UUID, TEXT, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.attempt_keypad_unlock IS 
'Backward-compatible wrapper for attempt_keypad_unlock_v2. Redirects old session_artifact ID calls to V2.';
