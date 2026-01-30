-- =============================================================================
-- Browse Performance Indexes
-- =============================================================================
-- Purpose: Optimize games listing for Browse/Planner at scale (100s-1000s games)
-- 
-- Key optimizations:
-- 1. Composite index for stable cursor/offset pagination
-- 2. Filter combination indexes for common Browse queries
-- 3. Partial indexes limited to published games (most common case)
-- =============================================================================

-- =============================================================================
-- 1. CURSOR/PAGINATION INDEX
-- =============================================================================
-- Supports ORDER BY popularity_score DESC, created_at DESC, id DESC
-- Critical for stable pagination when dataset grows
-- Partial index on status='published' since Browse always filters on this

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_browse_sort
ON public.games (popularity_score DESC, created_at DESC, id DESC)
WHERE status = 'published';

COMMENT ON INDEX public.idx_games_browse_sort IS 
  'Browse pagination: stable sort on popularity→created→id for published games';

-- =============================================================================
-- 2. COMMON FILTER COMBINATION INDEXES
-- =============================================================================
-- These cover the most common Browse filter patterns

-- Product filter (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_product
ON public.games (status, product_id)
WHERE product_id IS NOT NULL;

COMMENT ON INDEX public.idx_games_status_product IS 
  'Browse filter: games by product';

-- Main purpose filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_purpose
ON public.games (status, main_purpose_id)
WHERE main_purpose_id IS NOT NULL;

COMMENT ON INDEX public.idx_games_status_purpose IS 
  'Browse filter: games by main purpose';

-- Play mode filter (basic/facilitated/participants)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_playmode
ON public.games (status, play_mode)
WHERE play_mode IS NOT NULL;

COMMENT ON INDEX public.idx_games_status_playmode IS 
  'Browse filter: games by play mode';

-- Player count range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_player_range
ON public.games (min_players, max_players)
WHERE status = 'published';

COMMENT ON INDEX public.idx_games_player_range IS 
  'Browse filter: games by player count range';

-- =============================================================================
-- 3. COVERING INDEX FOR SUMMARY QUERIES (optional optimization)
-- =============================================================================
-- If needed later, this can reduce I/O by including all summary columns
-- For now, the base indexes are sufficient

-- =============================================================================
-- VERIFICATION QUERY (run after migration)
-- =============================================================================
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'games' 
-- AND indexname LIKE 'idx_games_browse%' OR indexname LIKE 'idx_games_status%';
