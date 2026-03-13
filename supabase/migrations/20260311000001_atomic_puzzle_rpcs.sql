-- =============================================================================
-- Migration: 20260311000001_atomic_puzzle_rpcs.sql
-- Description: Atomic puzzle RPCs — fixes PLAY-002 P0 (JSONB race conditions)
-- =============================================================================
-- Replaces read-modify-write pattern in puzzle/route.ts with atomic Postgres
-- functions that use SELECT ... FOR UPDATE row locking.
--
-- Pattern (same as attempt_keypad_unlock_v2):
--   1. Insert state row if not exists
--   2. Lock row with FOR UPDATE
--   3. Read + modify state atomically
--   4. Write back in same transaction
--   5. Return result as JSONB
--
-- Functions created:
--   - attempt_puzzle_riddle_v2
--   - attempt_puzzle_counter_v2
--   - attempt_puzzle_multi_answer_v2
--   - attempt_puzzle_qr_gate_v2
-- =============================================================================


-- =============================================================================
-- 1. RIDDLE PUZZLE — Atomic answer attempt
-- =============================================================================
-- Atomically appends an attempt to the riddle state, checks solve/lockout.
-- Answer validation (normalization, fuzzy matching) stays in TypeScript.
-- The RPC receives the pre-validated is_correct flag from the server-side route.
--
-- Parameters:
--   p_session_id: participant session ID
--   p_game_artifact_id: game artifact ID (riddle type)
--   p_normalized_answer: the answer text (already normalized by TypeScript)
--   p_is_correct: whether the answer matched (validated by TypeScript)
--   p_participant_id: the participant submitting
--
-- Returns JSONB: {status, message, solved, locked, attempts_left, state}

CREATE OR REPLACE FUNCTION public.attempt_puzzle_riddle_v2(
  p_session_id UUID,
  p_game_artifact_id UUID,
  p_normalized_answer TEXT,
  p_is_correct BOOLEAN,
  p_participant_id UUID
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
  v_puzzle_state JSONB;
  v_max_attempts INT;
  v_attempts JSONB;
  v_attempt_count INT;
  v_new_attempt JSONB;
  v_is_solved BOOLEAN;
  v_is_locked BOOLEAN;
  v_attempts_left INT;
  v_new_puzzle_state JSONB;
  v_success_message TEXT;
  v_fail_message TEXT;
  v_locked_message TEXT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_max_attempts := (v_config->>'maxAttempts')::INT;  -- NULL = unlimited
  v_success_message := COALESCE(v_config->>'successMessage', '✅ Rätt svar!');
  v_fail_message := COALESCE(v_config->>'failMessage', '❌ Fel svar. Försök igen!');
  v_locked_message := COALESCE(v_config->>'lockedMessage', '🚫 Låst - för många försök');

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_is_solved := COALESCE((v_puzzle_state->>'solved')::boolean, false);
  v_is_locked := COALESCE((v_puzzle_state->>'locked')::boolean, false);
  v_attempts := COALESCE(v_puzzle_state->'attempts', '[]'::jsonb);
  v_attempt_count := jsonb_array_length(v_attempts);

  -- 6. Check current state (idempotent returns)
  IF v_is_solved THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan löst!',
      'solved', true,
      'locked', false,
      'attempts_left', null,
      'state', v_puzzle_state
    );
  END IF;

  IF v_is_locked THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'solved', false,
      'locked', true,
      'attempts_left', 0,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Build new attempt
  v_new_attempt := jsonb_build_object(
    'answer', p_normalized_answer,
    'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'participantId', p_participant_id
  );
  v_attempts := v_attempts || v_new_attempt;
  v_attempt_count := v_attempt_count + 1;

  -- 8. Determine outcome
  IF p_is_correct THEN
    v_is_solved := true;
    v_is_locked := false;
  ELSE
    IF v_max_attempts IS NOT NULL AND v_attempt_count >= v_max_attempts THEN
      v_is_locked := true;
    END IF;
  END IF;

  v_attempts_left := CASE
    WHEN v_max_attempts IS NOT NULL THEN GREATEST(0, v_max_attempts - v_attempt_count)
    ELSE NULL
  END;

  -- 9. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'solved', v_is_solved,
    'locked', v_is_locked,
    'attempts', v_attempts
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 10. Return result
  IF v_is_solved THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'solved', true,
      'locked', false,
      'attempts_left', v_attempts_left,
      'state', v_new_puzzle_state
    );
  ELSIF v_is_locked THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', v_locked_message,
      'solved', false,
      'locked', true,
      'attempts_left', 0,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_fail_message,
      'solved', false,
      'locked', false,
      'attempts_left', v_attempts_left,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attempt_puzzle_riddle_v2(UUID, UUID, TEXT, BOOLEAN, UUID) TO service_role;

COMMENT ON FUNCTION public.attempt_puzzle_riddle_v2 IS
'Atomic riddle puzzle attempt. Appends attempt, checks solve/lockout with FOR UPDATE row lock. Fixes PLAY-002 race condition.';


-- =============================================================================
-- 2. COUNTER PUZZLE — Atomic increment/decrement
-- =============================================================================
-- Atomically increments or decrements a counter and checks target completion.
-- All logic is in SQL — no app-layer trust needed.
--
-- Parameters:
--   p_session_id: participant session ID
--   p_game_artifact_id: game artifact ID (counter type)
--   p_action: 'increment' or 'decrement'
--   p_participant_id: the participant acting
--
-- Returns JSONB: {status, message, solved, state}

CREATE OR REPLACE FUNCTION public.attempt_puzzle_counter_v2(
  p_session_id UUID,
  p_game_artifact_id UUID,
  p_action TEXT,
  p_participant_id UUID
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
  v_puzzle_state JSONB;
  v_target INT;
  v_step INT;
  v_initial_value INT;
  v_current_value INT;
  v_is_completed BOOLEAN;
  v_history JSONB;
  v_new_entry JSONB;
  v_new_puzzle_state JSONB;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_target := (v_config->>'target')::INT;  -- NULL = no target
  v_step := COALESCE((v_config->>'step')::INT, 1);
  v_initial_value := COALESCE((v_config->>'initialValue')::INT, 0);

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_current_value := COALESCE((v_puzzle_state->>'currentValue')::INT, v_initial_value);
  v_is_completed := COALESCE((v_puzzle_state->>'completed')::BOOLEAN, false);
  v_history := COALESCE(v_puzzle_state->'history', '[]'::jsonb);

  -- 6. Already completed?
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Räknaren är redan klar!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Apply action
  IF p_action = 'increment' THEN
    v_current_value := v_current_value + v_step;
  ELSIF p_action = 'decrement' THEN
    v_current_value := GREATEST(0, v_current_value - v_step);
  ELSE
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid action: must be increment or decrement');
  END IF;

  -- 8. Append history
  v_new_entry := jsonb_build_object(
    'action', p_action,
    'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'participantId', p_participant_id
  );
  v_history := v_history || v_new_entry;

  -- 9. Check target
  IF v_target IS NOT NULL AND v_current_value >= v_target THEN
    v_is_completed := true;
  END IF;

  -- 10. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'currentValue', v_current_value,
    'completed', v_is_completed,
    'history', v_history
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 11. Return result
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', '🎉 Klart! ' || v_current_value || '/' || v_target,
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_current_value || COALESCE('/' || v_target, ''),
      'solved', false,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attempt_puzzle_counter_v2(UUID, UUID, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.attempt_puzzle_counter_v2 IS
'Atomic counter puzzle action. Increments/decrements with FOR UPDATE row lock. Fixes PLAY-002 race condition.';


-- =============================================================================
-- 3. MULTI-ANSWER PUZZLE — Atomic item toggle
-- =============================================================================
-- Atomically toggles an item in the checked array and checks completion.
-- All logic is in SQL.
--
-- Parameters:
--   p_session_id: participant session ID
--   p_game_artifact_id: game artifact ID (multi_answer type)
--   p_item_id: the item to toggle
--   p_participant_id: the participant acting
--
-- Returns JSONB: {status, message, solved, state}

CREATE OR REPLACE FUNCTION public.attempt_puzzle_multi_answer_v2(
  p_session_id UUID,
  p_game_artifact_id UUID,
  p_item_id TEXT,
  p_participant_id UUID
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
  v_puzzle_state JSONB;
  v_items JSONB;
  v_required_count INT;
  v_checked JSONB;
  v_is_completed BOOLEAN;
  v_item_index INT;
  v_new_checked JSONB;
  v_new_puzzle_state JSONB;
  v_checked_count INT;
  i INT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_items := COALESCE(v_config->'items', '[]'::jsonb);
  v_required_count := COALESCE((v_config->>'requiredCount')::INT, jsonb_array_length(v_items));

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_checked := COALESCE(v_puzzle_state->'checked', '[]'::jsonb);
  v_is_completed := COALESCE((v_puzzle_state->>'completed')::BOOLEAN, false);

  -- 6. Already completed?
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan klart!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Toggle item in checked array
  v_item_index := -1;
  FOR i IN 0..jsonb_array_length(v_checked) - 1 LOOP
    IF v_checked->>i = p_item_id THEN
      v_item_index := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_item_index >= 0 THEN
    -- Remove: rebuild array without the item
    v_new_checked := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(v_checked) - 1 LOOP
      IF i != v_item_index THEN
        v_new_checked := v_new_checked || jsonb_build_array(v_checked->i);
      END IF;
    END LOOP;
  ELSE
    -- Add item
    v_new_checked := v_checked || to_jsonb(p_item_id);
  END IF;

  v_checked_count := jsonb_array_length(v_new_checked);

  -- 8. Check completion
  IF v_checked_count >= v_required_count THEN
    v_is_completed := true;
  END IF;

  -- 9. Build and write new state
  v_new_puzzle_state := jsonb_build_object(
    'checked', v_new_checked,
    'completed', v_is_completed
  );

  UPDATE public.session_artifact_state
  SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
      updated_at = now()
  WHERE id = v_state_row.id;

  -- 10. Return result
  IF v_is_completed THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', '✅ Alla klara!',
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', v_checked_count || '/' || v_required_count || ' klara',
      'solved', false,
      'state', v_new_puzzle_state
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attempt_puzzle_multi_answer_v2(UUID, UUID, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.attempt_puzzle_multi_answer_v2 IS
'Atomic multi-answer puzzle toggle. Toggles item in checked array with FOR UPDATE row lock. Fixes PLAY-002 race condition.';


-- =============================================================================
-- 4. QR GATE PUZZLE — Atomic scan verification
-- =============================================================================
-- Atomically verifies a QR code scan.
-- All logic is in SQL.
--
-- Parameters:
--   p_session_id: participant session ID
--   p_game_artifact_id: game artifact ID (qr_gate type)
--   p_scanned_value: the value scanned from QR code
--   p_participant_id: the participant scanning
--
-- Returns JSONB: {status, message, solved, state}

CREATE OR REPLACE FUNCTION public.attempt_puzzle_qr_gate_v2(
  p_session_id UUID,
  p_game_artifact_id UUID,
  p_scanned_value TEXT,
  p_participant_id UUID
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
  v_puzzle_state JSONB;
  v_expected_value TEXT;
  v_is_verified BOOLEAN;
  v_is_match BOOLEAN;
  v_new_puzzle_state JSONB;
  v_success_message TEXT;
BEGIN
  -- 1. Validate session
  SELECT id, game_id, status INTO v_session
  FROM public.participant_sessions WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found');
  END IF;

  IF v_session.status NOT IN ('active', 'paused') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session is not active');
  END IF;

  -- 2. Validate artifact
  SELECT id, game_id, artifact_type, metadata INTO v_game_artifact
  FROM public.game_artifacts WHERE id = p_game_artifact_id;

  IF v_game_artifact IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact not found');
  END IF;

  IF v_game_artifact.game_id != v_session.game_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Artifact does not belong to session game');
  END IF;

  -- 3. Parse config
  v_config := COALESCE(v_game_artifact.metadata, '{}'::jsonb);
  v_expected_value := COALESCE(v_config->>'expectedValue', '');
  v_success_message := COALESCE(v_config->>'successMessage', '✅ Verifierad!');

  -- 4. Get or create state row with row lock
  INSERT INTO public.session_artifact_state (session_id, game_artifact_id, state)
  VALUES (p_session_id, p_game_artifact_id, '{}'::jsonb)
  ON CONFLICT (session_id, game_artifact_id) DO NOTHING;

  SELECT id, state INTO v_state_row
  FROM public.session_artifact_state
  WHERE session_id = p_session_id AND game_artifact_id = p_game_artifact_id
  FOR UPDATE;

  -- 5. Parse puzzle state
  v_state := COALESCE(v_state_row.state, '{}'::jsonb);
  v_puzzle_state := COALESCE(v_state->'puzzleState', '{}'::jsonb);
  v_is_verified := COALESCE((v_puzzle_state->>'verified')::BOOLEAN, false);

  -- 6. Already verified?
  IF v_is_verified THEN
    RETURN jsonb_build_object(
      'status', 'already_solved',
      'message', 'Redan verifierad!',
      'solved', true,
      'state', v_puzzle_state
    );
  END IF;

  -- 7. Check match (case-insensitive, trimmed)
  v_is_match := (lower(trim(p_scanned_value)) = lower(trim(v_expected_value)));

  IF v_is_match THEN
    -- 8. Build and write verified state
    v_new_puzzle_state := jsonb_build_object(
      'verified', true,
      'scannedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    UPDATE public.session_artifact_state
    SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{puzzleState}', v_new_puzzle_state),
        updated_at = now()
    WHERE id = v_state_row.id;

    RETURN jsonb_build_object(
      'status', 'success',
      'message', v_success_message,
      'solved', true,
      'state', v_new_puzzle_state
    );
  ELSE
    -- No state change on failed scan
    RETURN jsonb_build_object(
      'status', 'fail',
      'message', '❌ Fel QR-kod. Sök efter rätt kod.',
      'solved', false,
      'state', v_puzzle_state
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attempt_puzzle_qr_gate_v2(UUID, UUID, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.attempt_puzzle_qr_gate_v2 IS
'Atomic QR gate verification. Checks scanned value with FOR UPDATE row lock. Fixes PLAY-002 race condition.';
