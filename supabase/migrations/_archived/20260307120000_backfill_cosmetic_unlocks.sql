-- Backfill: Grant cosmetics to existing users based on their current level.
-- This is a one-time migration to ensure users who reached levels BEFORE the
-- cosmetics system was deployed receive their earned cosmetics.

INSERT INTO public.user_cosmetics (user_id, cosmetic_id, unlock_type)
SELECT DISTINCT
  up.user_id,
  cur.cosmetic_id,
  'level'
FROM public.user_progress up
JOIN public.cosmetic_unlock_rules cur
  ON cur.unlock_type = 'level'
  AND (cur.unlock_config->>'required_level')::int <= up.level
LEFT JOIN public.user_cosmetics uc
  ON uc.user_id = up.user_id
  AND uc.cosmetic_id = cur.cosmetic_id
WHERE uc.id IS NULL
  AND up.level >= 1;
