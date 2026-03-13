-- ============================================================================
-- Add missing updated_at trigger for the products table
--
-- Problem: products.updated_at was only set via DEFAULT on INSERT and never
-- auto-updated on UPDATE. This means the column shows the creation date
-- rather than the last modification date.
--
-- Fix: Attach the shared update_updated_at_column() trigger so any UPDATE
-- on a products row automatically sets updated_at = now().
-- ============================================================================

DROP TRIGGER IF EXISTS products_updated_at ON public.products;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: set updated_at to the most recent known timestamp for each row
-- so existing data reflects reality. Use GREATEST of all available timestamps.
UPDATE public.products
SET updated_at = GREATEST(
  updated_at,
  COALESCE(stripe_last_synced_at, updated_at)
)
WHERE stripe_last_synced_at IS NOT NULL
  AND stripe_last_synced_at > updated_at;
