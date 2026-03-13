-- Cosmetic Loadout Gating (Phase 2)
-- Restrict equipping cosmetics until the user reaches a minimum level.

-- NOTE: We enforce this via the player_cosmetics UPDATE policy so users can't bypass UI gating.

DO $$
BEGIN
  -- Replace update policy with a level-aware version.
  EXECUTE 'DROP POLICY IF EXISTS "player_cosmetics_update" ON player_cosmetics';

  EXECUTE '
    CREATE POLICY "player_cosmetics_update" ON player_cosmetics
      FOR UPDATE
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM user_progress up
          WHERE up.user_id = auth.uid()
            AND up.tenant_id = player_cosmetics.tenant_id
            AND COALESCE(up.level, 1) >= 2
        )
      )
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM user_progress up
          WHERE up.user_id = auth.uid()
            AND up.tenant_id = player_cosmetics.tenant_id
            AND COALESCE(up.level, 1) >= 2
        )
      )
  ';
END $$;
