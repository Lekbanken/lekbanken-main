-- ============================================================================
-- CRITICAL STRIPE FIELDS MIGRATION
-- Adds unit_label, statement_descriptor on products
-- Adds lookup_key on product_prices (tax_behavior already exists)
-- 
-- Reference: docs/reports/PRODUCT_SYNC_FIELD_ANALYSIS.md
-- ============================================================================

-- 1. Add new fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'seat',
  ADD COLUMN IF NOT EXISTS statement_descriptor text;

-- 2. Add check constraint for unit_label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_label_check'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_unit_label_check 
      CHECK (unit_label IN ('seat', 'license', 'user'));
  END IF;
END $$;

-- 3. Add check constraint for statement_descriptor length (max 22 chars per Stripe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_statement_descriptor_length'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_statement_descriptor_length 
      CHECK (statement_descriptor IS NULL OR length(statement_descriptor) <= 22);
  END IF;
END $$;

-- 4. Add lookup_key to product_prices (for deterministic price references)
ALTER TABLE product_prices
  ADD COLUMN IF NOT EXISTS lookup_key text;

-- 5. Create unique index for lookup_key
CREATE UNIQUE INDEX IF NOT EXISTS product_prices_lookup_key_unique_idx 
  ON product_prices (lookup_key) 
  WHERE lookup_key IS NOT NULL;

-- 6. Add index for statement_descriptor searches
CREATE INDEX IF NOT EXISTS products_unit_label_idx ON products (unit_label);

-- 7. Comment on new fields
COMMENT ON COLUMN products.unit_label IS 'What customers are charged for: seat, license, user. Synced to Stripe.';
COMMENT ON COLUMN products.statement_descriptor IS 'Text on customer bank statement (max 22 chars). Synced to Stripe.';
COMMENT ON COLUMN product_prices.lookup_key IS 'Deterministic key for price lookup: product_key:currency:interval:interval_count. Synced to Stripe.';
