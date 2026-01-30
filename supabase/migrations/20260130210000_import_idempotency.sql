-- =============================================================================
-- Import Idempotency Support
-- =============================================================================
-- Purpose: Enable re-running import batches without creating duplicates
-- 
-- Columns added:
-- - external_ref: External system identifier for the game
-- - import_source: Source system identifier (e.g., 'csv', 'legacy_db', 'partner_api')
-- - imported_at: Timestamp when the game was imported
--
-- Usage:
-- - Import scripts use UPSERT on external_ref
-- - Re-running same batch updates existing records instead of duplicating
-- =============================================================================

-- Add import tracking columns
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS external_ref TEXT;

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS import_source TEXT;

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN public.games.external_ref IS 
  'External system identifier for import idempotency. Unique per import_source.';

COMMENT ON COLUMN public.games.import_source IS 
  'Source system identifier (e.g., ''csv'', ''legacy_db'', ''partner_api'')';

COMMENT ON COLUMN public.games.imported_at IS 
  'Timestamp when this game was imported from external source';

-- =============================================================================
-- UNIQUE CONSTRAINT for Idempotent Imports
-- =============================================================================
-- Allows same external_ref across different sources, but unique within a source.
-- NULL import_source is treated as separate namespace (for manually created games).

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_games_external_ref_source
ON public.games (import_source, external_ref)
WHERE external_ref IS NOT NULL AND import_source IS NOT NULL;

-- Also index for lookup by external_ref alone (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_external_ref
ON public.games (external_ref)
WHERE external_ref IS NOT NULL;

COMMENT ON INDEX public.idx_games_external_ref_source IS 
  'Unique constraint for import idempotency: (import_source, external_ref)';

COMMENT ON INDEX public.idx_games_external_ref IS 
  'Fast lookup by external_ref for import duplicate checking';

-- =============================================================================
-- VERIFICATION QUERY (run after migration)
-- =============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'games' 
-- AND column_name IN ('external_ref', 'import_source', 'imported_at');
