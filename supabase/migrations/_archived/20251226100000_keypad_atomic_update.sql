-- Migration: Add atomic keypad state update function
-- This prevents race conditions when multiple participants try to unlock simultaneously.

-- =============================================================================
-- Function: attempt_keypad_unlock
-- =============================================================================
-- Atomically attempts to validate a keypad code and update state.
-- Returns the result of the attempt without race conditions.
-- 
-- Parameters:
--   p_artifact_id: The session_artifact ID
--   p_entered_code: The code entered by the participant
--   p_participant_id: The participant attempting the unlock
--   p_participant_name: Display name for broadcast context
-- 
-- Returns: JSON with status, message, attempts_left, is_locked_out, is_unlocked

CREATE OR REPLACE FUNCTION attempt_keypad_unlock(
  p_artifact_id UUID,
  p_entered_code TEXT,
  p_participant_id UUID,
  p_participant_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
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

-- Grant execute to authenticated users (will be called via service role from API)
GRANT EXECUTE ON FUNCTION attempt_keypad_unlock(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION attempt_keypad_unlock(UUID, TEXT, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION attempt_keypad_unlock IS 
'Atomically attempts to validate a keypad code. Uses FOR UPDATE lock to prevent race conditions.';
