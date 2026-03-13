-- ============================================================================
-- PRODUCT STRIPE SYNC MIGRATION
-- Adds Stripe integration fields to products table and creates product_prices
-- 
-- Reference: docs/reports/PRODUCT_STRIPE_SYNC_PLAN.md
-- ============================================================================

-- 1. Add Stripe fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS stripe_product_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_default_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_sync_status text DEFAULT 'unsynced',
  ADD COLUMN IF NOT EXISTS stripe_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_sync_error text,
  ADD COLUMN IF NOT EXISTS internal_description text,
  ADD COLUMN IF NOT EXISTS customer_description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'license';

-- 2. Add check constraints for enum-like fields (with IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_stripe_sync_status_check'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_stripe_sync_status_check 
      CHECK (stripe_sync_status IN ('unsynced', 'synced', 'drift', 'error', 'locked'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_status_check 
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_product_type_check 
      CHECK (product_type IN ('license', 'addon', 'consumable', 'one_time', 'bundle'));
  END IF;
END $$;

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS products_stripe_product_id_idx ON products (stripe_product_id);
CREATE INDEX IF NOT EXISTS products_stripe_sync_status_idx ON products (stripe_sync_status);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);

-- 4. Create product_prices table
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stripe_price_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'NOK',
  interval text NOT NULL,
  interval_count integer DEFAULT 1,
  tax_behavior text DEFAULT 'exclusive',
  billing_model text DEFAULT 'per_seat',
  nickname text,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT product_prices_currency_check 
    CHECK (currency IN ('NOK', 'SEK', 'EUR')),
  CONSTRAINT product_prices_interval_check 
    CHECK (interval IN ('month', 'year', 'one_time')),
  CONSTRAINT product_prices_tax_behavior_check 
    CHECK (tax_behavior IN ('inclusive', 'exclusive', 'unspecified')),
  CONSTRAINT product_prices_billing_model_check 
    CHECK (billing_model IN ('per_seat', 'per_tenant', 'per_user', 'flat'))
);

-- 5. Create indexes for product_prices
CREATE INDEX IF NOT EXISTS product_prices_product_id_idx ON product_prices (product_id);
CREATE INDEX IF NOT EXISTS product_prices_stripe_price_id_idx ON product_prices (stripe_price_id);
CREATE INDEX IF NOT EXISTS product_prices_active_idx ON product_prices (active);
CREATE INDEX IF NOT EXISTS product_prices_currency_idx ON product_prices (currency);

-- 6. Partial unique index: only one default per product+currency+interval
-- This ensures we can only have one is_default=true per combination
CREATE UNIQUE INDEX IF NOT EXISTS product_prices_default_unique_idx 
  ON product_prices (product_id, currency, interval) 
  WHERE is_default = true;

-- 7. Updated_at trigger for product_prices
CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS product_prices_updated_at ON product_prices;
CREATE TRIGGER product_prices_updated_at
  BEFORE UPDATE ON product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_product_prices_updated_at();

-- 8. Migrate existing description to customer_description
UPDATE products 
SET customer_description = description 
WHERE customer_description IS NULL AND description IS NOT NULL;

-- 9. Set existing products to 'active' status (they already have data in production)
UPDATE products 
SET status = 'active' 
WHERE status IS NULL OR status = 'draft';

-- 10. RLS Policies for product_prices
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- Allow system admins to manage prices
CREATE POLICY "product_prices_admin_all" ON product_prices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND (u.raw_app_meta_data->>'role')::text = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND (u.raw_app_meta_data->>'role')::text = 'system_admin'
    )
  );

-- Allow authenticated users to read active prices (for checkout)
CREATE POLICY "product_prices_read_active" ON product_prices
  FOR SELECT
  TO authenticated
  USING (active = true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN products.stripe_product_id IS 'Stripe Product ID (format: lek_prod_<uuid>)';
COMMENT ON COLUMN products.stripe_default_price_id IS 'Default Stripe Price ID for this product';
COMMENT ON COLUMN products.stripe_sync_status IS 'Sync status: unsynced, synced, drift, error, locked';
COMMENT ON COLUMN products.stripe_last_synced_at IS 'Timestamp of last successful sync to Stripe';
COMMENT ON COLUMN products.stripe_sync_error IS 'Error message from last failed sync attempt';
COMMENT ON COLUMN products.internal_description IS 'Admin-only description (NOT synced to Stripe)';
COMMENT ON COLUMN products.customer_description IS 'Customer-facing description (synced to Stripe)';
COMMENT ON COLUMN products.status IS 'Product lifecycle status: draft, active, archived';
COMMENT ON COLUMN products.product_type IS 'Product type: license, addon, consumable, one_time, bundle';

COMMENT ON TABLE product_prices IS 'Product prices synced with Stripe. Stripe prices are immutable.';
COMMENT ON COLUMN product_prices.stripe_price_id IS 'Stripe Price ID (generated by Stripe, cannot be chosen)';
COMMENT ON COLUMN product_prices.amount IS 'Price amount in smallest currency unit (øre/cent)';
COMMENT ON COLUMN product_prices.interval IS 'Billing interval: month, year, one_time';
COMMENT ON COLUMN product_prices.is_default IS 'Default price for this product+currency+interval';
