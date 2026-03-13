-- =============================================================================
-- Categories table for marketing-driven product grouping
-- =============================================================================
--
-- Products are currently grouped by a free-text `category` column.
-- This migration introduces a proper `categories` table that becomes the
-- single source of truth for marketing presentation, category-level bundle
-- pricing, and /pricing/[category] routing.
--
-- Strategy: gradual migration.
--   Phase 1 (this migration): create categories table, add products.category_slug FK
--   Phase 2 (separate migration): seed categories + backfill products.category_slug
--   Phase 3 (future): remove products.category text once all code uses slug/FK
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. categories table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL-safe identifier, lowercase kebab-case (e.g. 'digitala-aktiviteter')
  slug                  text        UNIQUE NOT NULL,

  -- Display name (e.g. 'Digitala aktiviteter')
  name                  text        NOT NULL,

  -- Short marketing copy shown on category cards
  description_short     text,

  -- Hero/icon key matching Heroicon/Lucide names used in UI
  icon_key              text,

  -- Ordering on pricing/marketing pages (lower = first)
  sort_order            integer     NOT NULL DEFAULT 0,

  -- Controls public visibility on marketing pages
  is_public             boolean     NOT NULL DEFAULT true,

  -- Optional FK to the bundle product that represents "buy entire category"
  -- A category may or may not have a bundle product.
  bundle_product_id     uuid        REFERENCES public.products(id) ON DELETE SET NULL,

  -- Extensible metadata (featured flags, audience tags, etc.)
  metadata              jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.categories IS 'Marketing categories / target audiences that group products';
COMMENT ON COLUMN public.categories.slug IS 'URL-safe unique identifier, kebab-case';
COMMENT ON COLUMN public.categories.bundle_product_id IS 'Optional product with is_bundle=true representing the full-category bundle';
COMMENT ON COLUMN public.categories.is_public IS 'When false, category and its products are hidden from marketing pages';
COMMENT ON COLUMN public.categories.metadata IS 'Extensible JSON for future fields (featured, audience_tags, etc.)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_categories_slug       ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order  ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_public   ON public.categories(is_public) WHERE is_public = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_categories_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public can read categories that are public
DROP POLICY IF EXISTS categories_public_select ON public.categories;
CREATE POLICY categories_public_select
  ON public.categories
  FOR SELECT
  USING (is_public = true);

-- System admins can do everything
DROP POLICY IF EXISTS categories_admin_all ON public.categories;
CREATE POLICY categories_admin_all
  ON public.categories
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grant access
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL    ON public.categories TO service_role;

COMMIT;
