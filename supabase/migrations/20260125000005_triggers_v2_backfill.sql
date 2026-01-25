-- =============================================================================
-- Migration: 20260125000005_triggers_v2_backfill.sql
-- Description: Backfill session_trigger_state from existing session_triggers
-- =============================================================================
-- Migrates existing runtime state from session_triggers to session_trigger_state.
-- Only copies runtime state (status, fired_count, fired_at), not config.
-- =============================================================================

-- Backfill from existing session_triggers (where source_trigger_id exists)
INSERT INTO public.session_trigger_state (
  session_id,
  game_trigger_id,
  status,
  fired_count,
  fired_at,
  enabled,
  created_at
)
SELECT 
  st.session_id,
  st.source_trigger_id AS game_trigger_id,
  st.status,
  COALESCE(st.fired_count, 0),
  st.fired_at,
  COALESCE(st.enabled, TRUE),
  COALESCE(st.created_at, now())
FROM public.session_triggers st
WHERE st.source_trigger_id IS NOT NULL
  -- Only backfill if not already migrated
  AND NOT EXISTS (
    SELECT 1 FROM public.session_trigger_state sts
    WHERE sts.session_id = st.session_id
      AND sts.game_trigger_id = st.source_trigger_id
  )
ON CONFLICT (session_id, game_trigger_id) DO NOTHING;

-- Log migration result
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.session_trigger_state;
  RAISE NOTICE 'Triggers V2 backfill complete. Total session_trigger_state records: %', v_count;
END;
$$;
