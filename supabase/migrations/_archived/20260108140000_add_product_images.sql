-- Migration: 20260108140000_add_product_images.sql
-- Adds product images support for Step 2

-- =============================================================================
-- PRODUCTS: Add image_url column
-- =============================================================================

-- Primary product image URL (synced to Stripe images[])
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for documentation
COMMENT ON COLUMN products.image_url IS 'Primary product image URL. Synced to Stripe as images[0].';

-- =============================================================================
-- DONE
-- =============================================================================

-- Note: Images should be stored in Supabase Storage and referenced by URL.
-- Stripe accepts up to 8 images, but we start with one primary image.
