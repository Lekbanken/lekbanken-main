-- =========================================
-- GAME REACTIONS (Like/Dislike)
-- Version 1.0
-- Date: 2026-01-30
-- =========================================
-- Personal user reactions to games (not tenant-scoped).
-- Supports "like" with optional "dislike" via feature flag.
-- =========================================

-- =========================================
-- 1. TABLE
-- =========================================

CREATE TABLE public.game_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT game_reactions_user_game_unique UNIQUE (user_id, game_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.game_reactions IS 'Personal user reactions (like/dislike) to games. Not tenant-scoped.';
COMMENT ON COLUMN public.game_reactions.reaction IS 'Reaction type: like or dislike. Neutral = no row.';

-- =========================================
-- 2. INDEXES
-- =========================================

-- Primary lookup: user's reactions
CREATE INDEX game_reactions_user_id_idx ON public.game_reactions(user_id);

-- Lookup by game (for aggregation later)
CREATE INDEX game_reactions_game_id_idx ON public.game_reactions(game_id);

-- Efficient filter for "show liked games"
CREATE INDEX game_reactions_user_reaction_idx ON public.game_reactions(user_id, reaction);

-- =========================================
-- 3. UPDATED_AT TRIGGER
-- =========================================

CREATE OR REPLACE FUNCTION public.game_reactions_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER game_reactions_updated_at
  BEFORE UPDATE ON public.game_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.game_reactions_set_updated_at();

-- =========================================
-- 4. ROW LEVEL SECURITY
-- =========================================

ALTER TABLE public.game_reactions ENABLE ROW LEVEL SECURITY;

-- User can read their own reactions
CREATE POLICY game_reactions_select_own ON public.game_reactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User can insert their own reactions
CREATE POLICY game_reactions_insert_own ON public.game_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User can update their own reactions
CREATE POLICY game_reactions_update_own ON public.game_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User can delete their own reactions (toggle off = neutral)
CREATE POLICY game_reactions_delete_own ON public.game_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- 5. GRANTS
-- =========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_reactions TO authenticated;

-- =========================================
-- 6. UPSERT FUNCTION (for toggle logic)
-- =========================================

-- Upsert or delete reaction in one atomic operation
-- Returns the new reaction state (null if deleted)
CREATE OR REPLACE FUNCTION public.upsert_game_reaction(
  p_game_id UUID,
  p_reaction TEXT DEFAULT NULL
)
RETURNS TABLE(
  reaction TEXT,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing TEXT;
  v_created BOOLEAN := false;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate reaction value
  IF p_reaction IS NOT NULL AND p_reaction NOT IN ('like', 'dislike') THEN
    RAISE EXCEPTION 'Invalid reaction: %', p_reaction;
  END IF;

  -- Get current reaction
  SELECT gr.reaction INTO v_existing
  FROM game_reactions gr
  WHERE gr.user_id = v_user_id AND gr.game_id = p_game_id;

  IF p_reaction IS NULL THEN
    -- Delete (set to neutral)
    DELETE FROM game_reactions
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT NULL::TEXT, false;
  ELSIF v_existing IS NULL THEN
    -- Insert new reaction
    INSERT INTO game_reactions (user_id, game_id, reaction)
    VALUES (v_user_id, p_game_id, p_reaction);
    
    v_created := true;
    RETURN QUERY SELECT p_reaction, true;
  ELSIF v_existing = p_reaction THEN
    -- Same reaction = toggle off (delete)
    DELETE FROM game_reactions
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT NULL::TEXT, false;
  ELSE
    -- Different reaction = update
    UPDATE game_reactions
    SET reaction = p_reaction
    WHERE user_id = v_user_id AND game_id = p_game_id;
    
    RETURN QUERY SELECT p_reaction, false;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_game_reaction IS 'Toggle or set game reaction. Pass NULL to remove. Returns new state.';

GRANT EXECUTE ON FUNCTION public.upsert_game_reaction TO authenticated;

-- =========================================
-- 7. BATCH READ FUNCTION (for Browse performance)
-- =========================================

-- Get reactions for multiple games in one query
CREATE OR REPLACE FUNCTION public.get_game_reactions_batch(
  p_game_ids UUID[]
)
RETURNS TABLE(
  game_id UUID,
  reaction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    -- Return empty for unauthenticated
    RETURN;
  END IF;

  RETURN QUERY
  SELECT gr.game_id, gr.reaction
  FROM game_reactions gr
  WHERE gr.user_id = v_user_id
    AND gr.game_id = ANY(p_game_ids);
END;
$$;

COMMENT ON FUNCTION public.get_game_reactions_batch IS 'Batch fetch user reactions for multiple games. For Browse performance.';

GRANT EXECUTE ON FUNCTION public.get_game_reactions_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_reactions_batch TO anon;

-- =========================================
-- 8. GET LIKED GAME IDS (for filter)
-- =========================================

CREATE OR REPLACE FUNCTION public.get_liked_game_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  RETURN ARRAY(
    SELECT gr.game_id
    FROM game_reactions gr
    WHERE gr.user_id = v_user_id
      AND gr.reaction = 'like'
  );
END;
$$;

COMMENT ON FUNCTION public.get_liked_game_ids IS 'Get all game IDs that user has liked. For "Show liked" filter.';

GRANT EXECUTE ON FUNCTION public.get_liked_game_ids TO authenticated;
