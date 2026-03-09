-- Migration: Add game_content_schema_version column to games table
-- Purpose: Schema versioning for forward-compatible content migrations (D3 task 9.3)
-- 
-- This column tracks the content schema version for each game, enabling:
-- 1. Future content structure migrations without breaking existing games
-- 2. Identification of games created under different schema versions
-- 3. Backward-compatible deserialization in mappers
--
-- Default value 1 = current schema (all existing games).

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_content_schema_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN games.game_content_schema_version IS 
  'Content schema version. 1 = initial schema. Increment on structural changes to game content.';
