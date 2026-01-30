-- =========================================
-- GAME REACTIONS RLS TESTS
-- =========================================
-- Manual test script to verify RLS policies work correctly.
-- Run these in Supabase SQL Editor with different user contexts.
-- =========================================

-- =============================================================================
-- SETUP: Create test data
-- =============================================================================

-- First, ensure you have a test game and test users
-- (Replace with actual IDs from your test environment)

-- Get a sample game ID
SELECT id, name FROM games LIMIT 1;
-- Expected: Returns at least one game

-- Get current user (run as authenticated user)
SELECT auth.uid() as current_user_id;
-- Expected: Returns your user ID if authenticated

-- =============================================================================
-- TEST 1: Insert own reaction
-- =============================================================================

-- As authenticated user, insert a like
INSERT INTO game_reactions (user_id, game_id, reaction)
SELECT 
  auth.uid(), 
  (SELECT id FROM games LIMIT 1), 
  'like'
ON CONFLICT (user_id, game_id) 
DO UPDATE SET reaction = 'like', updated_at = now();

-- Verify it was inserted
SELECT * FROM game_reactions WHERE user_id = auth.uid();
-- Expected: One row with reaction = 'like'

-- =============================================================================
-- TEST 2: Cannot insert for other user
-- =============================================================================

-- This should fail with RLS violation
-- (Replace with a different user ID)
INSERT INTO game_reactions (user_id, game_id, reaction)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- fake user ID
  (SELECT id FROM games LIMIT 1),
  'like'
);
-- Expected: Error - violates RLS policy

-- =============================================================================
-- TEST 3: Cannot read other users' reactions
-- =============================================================================

-- This should only return your own reactions
SELECT COUNT(*) as my_reactions FROM game_reactions;
-- Expected: Count matches only your reactions, not all users

-- =============================================================================
-- TEST 4: Update own reaction
-- =============================================================================

-- Change from like to dislike
UPDATE game_reactions 
SET reaction = 'dislike' 
WHERE user_id = auth.uid() 
  AND game_id = (SELECT id FROM games LIMIT 1);

-- Verify
SELECT reaction FROM game_reactions 
WHERE user_id = auth.uid() 
  AND game_id = (SELECT id FROM games LIMIT 1);
-- Expected: reaction = 'dislike'

-- =============================================================================
-- TEST 5: Delete own reaction (toggle off)
-- =============================================================================

DELETE FROM game_reactions 
WHERE user_id = auth.uid() 
  AND game_id = (SELECT id FROM games LIMIT 1);

-- Verify
SELECT * FROM game_reactions 
WHERE user_id = auth.uid() 
  AND game_id = (SELECT id FROM games LIMIT 1);
-- Expected: No rows

-- =============================================================================
-- TEST 6: RPC - upsert_game_reaction
-- =============================================================================

-- Toggle like on
SELECT * FROM upsert_game_reaction(
  (SELECT id FROM games LIMIT 1),
  'like'
);
-- Expected: reaction = 'like', created = true

-- Toggle like off (same call again)
SELECT * FROM upsert_game_reaction(
  (SELECT id FROM games LIMIT 1),
  'like'
);
-- Expected: reaction = NULL, created = false

-- Set like again
SELECT * FROM upsert_game_reaction(
  (SELECT id FROM games LIMIT 1),
  'like'
);
-- Expected: reaction = 'like', created = true

-- Clear reaction
SELECT * FROM upsert_game_reaction(
  (SELECT id FROM games LIMIT 1),
  NULL
);
-- Expected: reaction = NULL, created = false

-- =============================================================================
-- TEST 7: RPC - get_game_reactions_batch
-- =============================================================================

-- First, set up some reactions
SELECT * FROM upsert_game_reaction(
  (SELECT id FROM games LIMIT 1),
  'like'
);

-- Batch fetch
SELECT * FROM get_game_reactions_batch(
  ARRAY(SELECT id FROM games LIMIT 5)
);
-- Expected: Returns your reactions for those games

-- =============================================================================
-- TEST 8: RPC - get_liked_game_ids
-- =============================================================================

SELECT * FROM get_liked_game_ids();
-- Expected: Array of game IDs you have liked

-- =============================================================================
-- CLEANUP
-- =============================================================================

-- Remove test reactions
DELETE FROM game_reactions WHERE user_id = auth.uid();

-- Verify cleanup
SELECT COUNT(*) FROM game_reactions WHERE user_id = auth.uid();
-- Expected: 0
