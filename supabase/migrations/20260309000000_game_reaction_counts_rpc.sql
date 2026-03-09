-- ==========================================================================
-- Migration: get_game_reaction_counts RPC
-- Purpose: Aggregate reaction counts per game, bypassing RLS
-- Sprint F: 6.7 Reaktions-statistik
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.get_game_reaction_counts(p_game_ids UUID[])
RETURNS TABLE (
  game_id UUID,
  like_count BIGINT,
  dislike_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gr.game_id,
    COUNT(*) FILTER (WHERE gr.reaction = 'like')    AS like_count,
    COUNT(*) FILTER (WHERE gr.reaction = 'dislike') AS dislike_count
  FROM public.game_reactions gr
  WHERE gr.game_id = ANY(p_game_ids)
  GROUP BY gr.game_id;
$$;

-- Grant execute to authenticated and anon (stats are public)
GRANT EXECUTE ON FUNCTION public.get_game_reaction_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_reaction_counts(UUID[]) TO anon;

COMMENT ON FUNCTION public.get_game_reaction_counts IS
  'Returns aggregated like/dislike counts per game. SECURITY DEFINER to bypass RLS on game_reactions.';
