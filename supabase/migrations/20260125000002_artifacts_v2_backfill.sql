-- =============================================================================
-- Migration: 20260125000002_artifacts_v2_backfill.sql
-- Description: Backfill existing session data to new V2 state tables
-- =============================================================================
-- This migration copies runtime state from old session_artifacts tables to
-- the new V2 state tables. It extracts only runtime state, NOT config/secrets.
-- =============================================================================

-- =============================================================================
-- 1. Backfill session_artifact_state from session_artifacts.metadata
-- =============================================================================
-- Extract runtime state keys (keypadState, puzzleState) but NOT config secrets
-- like correctCode, correctAnswers, etc.

INSERT INTO public.session_artifact_state (
  session_id,
  game_artifact_id,
  state,
  created_at,
  updated_at
)
SELECT 
  sa.session_id,
  sa.source_artifact_id AS game_artifact_id,
  -- Extract ONLY runtime state keys, exclude config/secrets
  jsonb_build_object(
    'keypadState', COALESCE(sa.metadata->'keypadState', '{}'::jsonb),
    'puzzleState', COALESCE(sa.metadata->'puzzleState', '{}'::jsonb)
  ) - 'correctCode' - 'correctAnswers' AS state,
  sa.created_at,
  COALESCE(
    (sa.metadata->'keypadState'->>'unlockedAt')::timestamptz,
    sa.created_at
  ) AS updated_at
FROM public.session_artifacts sa
WHERE 
  sa.source_artifact_id IS NOT NULL
  AND (
    sa.metadata->'keypadState' IS NOT NULL 
    OR sa.metadata->'puzzleState' IS NOT NULL
  )
ON CONFLICT (session_id, game_artifact_id) 
DO UPDATE SET
  state = jsonb_build_object(
    'keypadState', COALESCE(
      EXCLUDED.state->'keypadState',
      session_artifact_state.state->'keypadState',
      '{}'::jsonb
    ),
    'puzzleState', COALESCE(
      EXCLUDED.state->'puzzleState', 
      session_artifact_state.state->'puzzleState',
      '{}'::jsonb
    )
  ),
  updated_at = now();

-- =============================================================================
-- 2. Backfill session_artifact_variant_state from session_artifact_variants
-- =============================================================================
-- Copy revealed_at and highlighted_at from old variants table

INSERT INTO public.session_artifact_variant_state (
  session_id,
  game_artifact_variant_id,
  revealed_at,
  highlighted_at,
  created_at
)
SELECT 
  sa.session_id,
  sav.source_variant_id AS game_artifact_variant_id,
  sav.revealed_at,
  sav.highlighted_at,
  sav.created_at
FROM public.session_artifact_variants sav
JOIN public.session_artifacts sa ON sa.id = sav.session_artifact_id
WHERE 
  sav.source_variant_id IS NOT NULL
  AND (sav.revealed_at IS NOT NULL OR sav.highlighted_at IS NOT NULL)
ON CONFLICT (session_id, game_artifact_variant_id) 
DO UPDATE SET
  revealed_at = COALESCE(
    EXCLUDED.revealed_at, 
    session_artifact_variant_state.revealed_at
  ),
  highlighted_at = COALESCE(
    EXCLUDED.highlighted_at, 
    session_artifact_variant_state.highlighted_at
  );

-- =============================================================================
-- 3. Backfill session_artifact_variant_assignments_v2 from old assignments
-- =============================================================================
-- Map old session_artifact_variant_id to game_artifact_variant_id via source_variant_id

INSERT INTO public.session_artifact_variant_assignments_v2 (
  session_id,
  participant_id,
  game_artifact_variant_id,
  assigned_by,
  assigned_at
)
SELECT 
  saa.session_id,
  saa.participant_id,
  sav.source_variant_id AS game_artifact_variant_id,
  saa.assigned_by,
  saa.assigned_at
FROM public.session_artifact_assignments saa
JOIN public.session_artifact_variants sav ON sav.id = saa.session_artifact_variant_id
WHERE sav.source_variant_id IS NOT NULL
ON CONFLICT (session_id, participant_id, game_artifact_variant_id) 
DO NOTHING;

-- =============================================================================
-- 4. Log backfill statistics
-- =============================================================================

DO $$
DECLARE
  v_artifact_states INT;
  v_variant_states INT;
  v_assignments INT;
BEGIN
  SELECT COUNT(*) INTO v_artifact_states FROM public.session_artifact_state;
  SELECT COUNT(*) INTO v_variant_states FROM public.session_artifact_variant_state;
  SELECT COUNT(*) INTO v_assignments FROM public.session_artifact_variant_assignments_v2;
  
  RAISE NOTICE 'Artifacts V2 Backfill Complete:';
  RAISE NOTICE '  - session_artifact_state: % rows', v_artifact_states;
  RAISE NOTICE '  - session_artifact_variant_state: % rows', v_variant_states;
  RAISE NOTICE '  - session_artifact_variant_assignments_v2: % rows', v_assignments;
END $$;
