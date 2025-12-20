-- =============================================================================
-- Migration: 20251220090000_play_primitives_spec_compat.sql
-- Description: Compatibility tweaks for Play Primitives (vote uniqueness + artifact state view)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Votes: enforce 1 vote per decision per participant
-- -----------------------------------------------------------------------------

-- De-dupe any historical data so we can add a stricter unique constraint.
WITH ranked AS (
  SELECT
    id,
    decision_id,
    participant_id,
    ROW_NUMBER() OVER (
      PARTITION BY decision_id, participant_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.session_votes
)
DELETE FROM public.session_votes v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

-- Replace old unique (decision_id, participant_id, option_key) with strict unique.
ALTER TABLE public.session_votes
  DROP CONSTRAINT IF EXISTS session_votes_decision_id_participant_id_option_key_key;

ALTER TABLE public.session_votes
  DROP CONSTRAINT IF EXISTS session_votes_one_per_decision_participant;

ALTER TABLE public.session_votes
  ADD CONSTRAINT session_votes_one_per_decision_participant
  UNIQUE (decision_id, participant_id);

-- Helpful index for aggregations
CREATE INDEX IF NOT EXISTS idx_session_votes_decision_option
  ON public.session_votes(decision_id, option_key);


-- -----------------------------------------------------------------------------
-- 2) Artifacts: compatibility view for "session_artifact_state"
-- -----------------------------------------------------------------------------

-- Some specs refer to a session-level artifact state table. Our implementation
-- stores state on session_artifact_variants (revealed_at/highlighted_at).
-- This view provides a session-centric state summary without duplicating data.

CREATE OR REPLACE VIEW public.session_artifact_state AS
SELECT
  sa.session_id,
  ARRAY_REMOVE(
    ARRAY_AGG(sav.id ORDER BY sav.revealed_at ASC)
      FILTER (WHERE sav.revealed_at IS NOT NULL),
    NULL
  ) AS revealed_variant_ids,
  (
    SELECT sav2.id
    FROM public.session_artifact_variants sav2
    JOIN public.session_artifacts sa2 ON sa2.id = sav2.session_artifact_id
    WHERE sa2.session_id = sa.session_id
      AND sav2.highlighted_at IS NOT NULL
    ORDER BY sav2.highlighted_at DESC
    LIMIT 1
  ) AS highlighted_variant_id,
  MAX(sav.revealed_at) AS last_revealed_at,
  MAX(sav.highlighted_at) AS last_highlighted_at
FROM public.session_artifacts sa
LEFT JOIN public.session_artifact_variants sav
  ON sav.session_artifact_id = sa.id
GROUP BY sa.session_id;
