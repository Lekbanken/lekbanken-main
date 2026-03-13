-- =============================================================================
-- Add category_slug FK and is_marketing_visible to products
-- =============================================================================
--
-- Adds a nullable FK from products → categories.slug so that product ↔ category
-- relationships can be resolved via join. The existing products.category text
-- column is left intact for backwards compatibility during gradual migration.
--
-- Also adds is_marketing_visible to allow hiding products that don't yet have
-- games/activities from the public marketing pages.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. products.category_slug — FK to categories.slug
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'category_slug'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN category_slug text
        REFERENCES public.categories(slug) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.products.category_slug IS
  'FK to categories.slug — replaces the free-text category column (gradual migration)';

CREATE INDEX IF NOT EXISTS idx_products_category_slug
  ON public.products(category_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. products.is_marketing_visible
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'is_marketing_visible'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN is_marketing_visible boolean NOT NULL DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN public.products.is_marketing_visible IS
  'When false, product is hidden from public marketing/pricing pages (admin can still see it)';

CREATE INDEX IF NOT EXISTS idx_products_marketing_visible
  ON public.products(is_marketing_visible) WHERE is_marketing_visible = true;

-- Composite index for the most common marketing query pattern
CREATE INDEX IF NOT EXISTS idx_products_category_slug_visible
  ON public.products(category_slug, is_marketing_visible)
  WHERE is_marketing_visible = true;

COMMIT;
