-- Update loadout_insert RLS policy to allow dynamic level eligibility.
-- Previously the policy required a row in user_cosmetics (explicit grant).
-- Now it also allows equipping cosmetics where the user meets the level requirement.

DROP POLICY IF EXISTS "loadout_insert" ON public.user_cosmetic_loadout;

CREATE POLICY "loadout_insert" ON public.user_cosmetic_loadout
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      -- Explicit grant: row exists in user_cosmetics
      cosmetic_id IN (
        SELECT uc.cosmetic_id FROM public.user_cosmetics uc
        WHERE uc.user_id = (SELECT auth.uid())
      )
      OR
      -- Dynamic level eligibility: user level >= required level
      cosmetic_id IN (
        SELECT cur.cosmetic_id
        FROM public.cosmetic_unlock_rules cur
        WHERE cur.unlock_type = 'level'
          AND (cur.unlock_config->>'required_level')::int <= (
            SELECT COALESCE(MAX(up.level), 0)
            FROM public.user_progress up
            WHERE up.user_id = (SELECT auth.uid())
          )
      )
    )
  );
