-- Migration: Make products.product_key NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────
-- product_key is already UNIQUE (initial schema). This migration:
--   1. Backfills any NULLs with a slug derived from the product name
--   2. Adds a NOT NULL constraint
--   3. Updates the slug collision trigger to drop the NULL guard
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Backfill NULLs — derive key from name (lowercase, spaces→hyphens, strip non-word)
UPDATE public.products
SET product_key = lower(
  regexp_replace(
    regexp_replace(trim(name), '\s+', '-', 'g'),
    '[^\w-]', '', 'g'
  )
)
WHERE product_key IS NULL;

-- 2. Add NOT NULL constraint
ALTER TABLE public.products
  ALTER COLUMN product_key SET NOT NULL;

-- 3. Update the collision trigger — no longer need the NULL guard
CREATE OR REPLACE FUNCTION public.guard_product_slug_collision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- product_key is now NOT NULL, always check
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = NEW.product_key
  ) THEN
    RAISE EXCEPTION 'Product product_key "%" collides with an existing category slug', NEW.product_key
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;
