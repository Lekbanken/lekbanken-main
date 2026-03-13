-- =============================================================================
-- Slug collision guard: prevent categories.slug from colliding with
-- products.product_key (used as the product slug in /pricing/[slug]).
--
-- A bidirectional pair of triggers:
--   1. On categories INSERT/UPDATE → reject if slug exists in products.product_key
--   2. On products INSERT/UPDATE  → reject if product_key exists in categories.slug
-- =============================================================================

-- ─── Guard function: category slug must not clash with product slugs ─────────

CREATE OR REPLACE FUNCTION public.guard_category_slug_collision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE product_key = NEW.slug
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Category slug "%" collides with an existing product_key', NEW.slug
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Guard function: product slug must not clash with category slugs ─────────

CREATE OR REPLACE FUNCTION public.guard_product_slug_collision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only check when product_key is set (it's nullable)
  IF NEW.product_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.categories
      WHERE slug = NEW.product_key
    ) THEN
      RAISE EXCEPTION 'Product product_key "%" collides with an existing category slug', NEW.product_key
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_categories_slug_collision
  BEFORE INSERT OR UPDATE OF slug ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_category_slug_collision();

CREATE TRIGGER trg_products_slug_collision
  BEFORE INSERT OR UPDATE OF product_key ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_slug_collision();
