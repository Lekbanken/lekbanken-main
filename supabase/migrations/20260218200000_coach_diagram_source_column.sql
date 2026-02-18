-- =============================================================================
-- Add "source" column to coach_diagram_exports
-- =============================================================================
-- Marks whether a diagram was created by legacy coach builder or migrated
-- from the spatial editor. Used by the adapter-route to decide which
-- renderer to use (renderDiagramSvg vs renderSpatialSvg).
--
-- Values: NULL (legacy coach builder), 'spatial' (migrated from spatial editor)
-- =============================================================================

ALTER TABLE public.coach_diagram_exports
  ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;

COMMENT ON COLUMN public.coach_diagram_exports.source IS
  'Origin system: NULL = legacy coach builder, ''spatial'' = spatial editor';
