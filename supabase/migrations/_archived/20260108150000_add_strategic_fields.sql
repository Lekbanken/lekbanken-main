-- Migration: 20260108150000_add_strategic_fields.sql
-- Step 3: Strategic fields for product and pricing configuration

-- =============================================================================
-- PRODUCTS: Add strategic metadata fields
-- =============================================================================

-- Target audience: who is this product for?
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all';

-- Feature tier: what tier does this product belong to?
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS feature_tier text DEFAULT 'standard';

-- Seat limits for per_seat products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_seats integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_seats integer DEFAULT 100;

-- Constraints for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_target_audience_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_target_audience_check 
      CHECK (target_audience IN ('all', 'school', 'club', 'individual', 'enterprise'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_feature_tier_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_feature_tier_check 
      CHECK (feature_tier IN ('free', 'basic', 'standard', 'pro', 'enterprise'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_seats_range_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_seats_range_check 
      CHECK (min_seats >= 1 AND max_seats >= min_seats);
  END IF;
END $$;

-- =============================================================================
-- PRODUCT_PRICES: Add trial period
-- =============================================================================

-- Trial period in days (Stripe subscription trial)
ALTER TABLE product_prices
  ADD COLUMN IF NOT EXISTS trial_period_days integer DEFAULT 0;

-- Constraint: trial must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_prices_trial_check'
  ) THEN
    ALTER TABLE product_prices
      ADD CONSTRAINT product_prices_trial_check 
      CHECK (trial_period_days >= 0);
  END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN products.target_audience IS 'Target customer segment: all, school, club, individual, enterprise';
COMMENT ON COLUMN products.feature_tier IS 'Product tier: free, basic, standard, pro, enterprise';
COMMENT ON COLUMN products.min_seats IS 'Minimum seats required for per_seat billing';
COMMENT ON COLUMN products.max_seats IS 'Maximum seats allowed for per_seat billing';
COMMENT ON COLUMN product_prices.trial_period_days IS 'Free trial period in days before billing starts';

-- =============================================================================
-- DONE
-- =============================================================================
