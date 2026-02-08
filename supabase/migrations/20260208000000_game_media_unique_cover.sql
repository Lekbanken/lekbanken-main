-- Migration: game_media_unique_cover
-- Purpose: Enforce that each game can have at most ONE cover image
-- This prevents race conditions when multiple processes try to assign covers simultaneously.

-- Step 1: Cleanup any existing duplicates (keep the oldest cover per game)
-- This DELETE runs as a pre-check before creating the unique index.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY created_at ASC, id ASC) as rn
  FROM game_media
  WHERE kind = 'cover'
)
DELETE FROM game_media
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Sanity check - fail fast if duplicates somehow remain
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM game_media
    WHERE kind = 'cover'
    GROUP BY game_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate cover rows still exist after cleanup - migration aborted';
  END IF;
END $$;

-- Step 3: Create partial unique index to enforce one cover per game
-- Using standard CREATE UNIQUE INDEX (not CONCURRENTLY) since Supabase migrations
-- run in transactions. For production with large tables, consider running 
-- CONCURRENTLY outside of a transaction.
CREATE UNIQUE INDEX IF NOT EXISTS game_media_unique_cover
ON game_media (game_id)
WHERE kind = 'cover';

-- Add comment explaining the constraint
COMMENT ON INDEX game_media_unique_cover IS 
  'Ensures each game has at most one cover image. Enforces idempotency for auto-cover assignment.';
