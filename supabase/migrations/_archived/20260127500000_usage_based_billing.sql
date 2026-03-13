-- Usage-Based Billing Tables
-- Created: 2026-01-27
-- Purpose: Track and bill for metered usage (API calls, seats, storage)

-- ============================================
-- Usage Meters Table (defines what can be metered)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name TEXT NOT NULL, -- e.g., "API Calls", "Storage GB", "Active Seats"
  slug TEXT UNIQUE NOT NULL, -- e.g., "api_calls", "storage_gb", "active_seats"
  description TEXT,
  
  -- Units
  unit_name TEXT NOT NULL DEFAULT 'unit', -- e.g., "call", "GB", "seat"
  unit_name_plural TEXT NOT NULL DEFAULT 'units',
  
  -- Billing configuration
  aggregation_type TEXT NOT NULL DEFAULT 'sum', -- sum, max, last_value, unique_count
  reset_period TEXT NOT NULL DEFAULT 'month', -- month, year, never
  
  -- Pricing (can be overridden per-product)
  default_unit_price INTEGER, -- In cents per unit
  default_included_units INTEGER DEFAULT 0, -- Free tier
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, deprecated
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Usage Records Table (actual usage data)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE RESTRICT,
  
  -- Usage data
  quantity NUMERIC(15,4) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Period (for aggregation)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Source tracking
  source TEXT, -- e.g., "api_gateway", "storage_service", "seat_sync"
  idempotency_key TEXT, -- For deduplication
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Usage Summaries Table (aggregated per billing period)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE RESTRICT,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Aggregated values
  total_quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
  billable_quantity NUMERIC(15,4) NOT NULL DEFAULT 0, -- After free tier
  
  -- Pricing snapshot
  unit_price INTEGER NOT NULL, -- Locked at time of billing
  included_units INTEGER NOT NULL DEFAULT 0,
  amount_due INTEGER NOT NULL DEFAULT 0, -- In cents
  
  -- Billing status
  billed BOOLEAN NOT NULL DEFAULT false,
  billed_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  stripe_usage_record_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT usage_summaries_unique_period UNIQUE (tenant_id, meter_id, period_start, period_end)
);

-- ============================================
-- Product Usage Pricing (override per-product)
-- ============================================
CREATE TABLE IF NOT EXISTS product_usage_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES usage_meters(id) ON DELETE CASCADE,
  
  -- Pricing
  unit_price INTEGER NOT NULL, -- In cents per unit
  included_units INTEGER NOT NULL DEFAULT 0, -- Free tier for this product
  
  -- Tiered pricing (optional)
  pricing_tiers JSONB, -- [{"up_to": 1000, "unit_price": 10}, {"up_to": 5000, "unit_price": 8}]
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT product_usage_pricing_unique UNIQUE (product_id, meter_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_meter ON usage_records(tenant_id, meter_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_records_idempotency ON usage_records(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_summaries_tenant ON usage_summaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_summaries_unbilled ON usage_summaries(billed) WHERE billed = false;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_usage_pricing ENABLE ROW LEVEL SECURITY;

-- Usage meters: public read, admin write
CREATE POLICY usage_meters_select ON usage_meters FOR SELECT USING (true);
CREATE POLICY usage_meters_admin ON usage_meters FOR ALL USING (
  public.is_system_admin()
);

-- Usage records: tenant members can read their own
CREATE POLICY usage_records_select_own ON usage_records FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Usage records: system can insert (for API tracking)
CREATE POLICY usage_records_admin ON usage_records FOR ALL USING (
  public.is_system_admin()
);

-- Usage summaries: tenant admins can read
CREATE POLICY usage_summaries_select_own ON usage_summaries FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- Admin full access
CREATE POLICY usage_summaries_admin ON usage_summaries FOR ALL USING (
  public.is_system_admin()
);

CREATE POLICY product_usage_pricing_select ON product_usage_pricing FOR SELECT USING (true);
CREATE POLICY product_usage_pricing_admin ON product_usage_pricing FOR ALL USING (
  public.is_system_admin()
);

-- ============================================
-- Helper Functions
-- ============================================

-- Record usage (with deduplication)
CREATE OR REPLACE FUNCTION record_usage(
  p_tenant_id UUID,
  p_meter_slug TEXT,
  p_quantity NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meter_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_record_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get meter
  SELECT id INTO v_meter_id FROM usage_meters WHERE slug = p_meter_slug AND status = 'active';
  IF v_meter_id IS NULL THEN
    RAISE EXCEPTION 'Unknown meter: %', p_meter_slug;
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM usage_records WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Calculate period (current month)
  v_period_start := date_trunc('month', now())::DATE;
  v_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::DATE;

  -- Insert record
  INSERT INTO usage_records (tenant_id, meter_id, quantity, period_start, period_end, idempotency_key, metadata)
  VALUES (p_tenant_id, v_meter_id, p_quantity, v_period_start, v_period_end, p_idempotency_key, p_metadata)
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

-- Aggregate usage for billing
CREATE OR REPLACE FUNCTION aggregate_usage_for_period(
  p_period_start DATE,
  p_period_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_meter RECORD;
  v_tenant RECORD;
  v_total NUMERIC;
  v_unit_price INTEGER;
  v_included INTEGER;
  v_billable NUMERIC;
  v_amount INTEGER;
BEGIN
  -- Loop through all meters
  FOR v_meter IN SELECT * FROM usage_meters WHERE status = 'active' LOOP
    -- Loop through tenants with usage
    FOR v_tenant IN 
      SELECT DISTINCT tenant_id 
      FROM usage_records 
      WHERE meter_id = v_meter.id 
      AND period_start = p_period_start 
      AND period_end = p_period_end
    LOOP
      -- Aggregate based on type
      IF v_meter.aggregation_type = 'sum' THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_total
        FROM usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      ELSIF v_meter.aggregation_type = 'max' THEN
        SELECT COALESCE(MAX(quantity), 0) INTO v_total
        FROM usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      ELSE
        SELECT COALESCE(SUM(quantity), 0) INTO v_total
        FROM usage_records
        WHERE tenant_id = v_tenant.tenant_id
        AND meter_id = v_meter.id
        AND period_start = p_period_start;
      END IF;

      -- Get pricing
      v_unit_price := COALESCE(v_meter.default_unit_price, 0);
      v_included := COALESCE(v_meter.default_included_units, 0);

      -- Calculate billable
      v_billable := GREATEST(v_total - v_included, 0);
      v_amount := ROUND(v_billable * v_unit_price);

      -- Upsert summary
      INSERT INTO usage_summaries (
        tenant_id, meter_id, period_start, period_end,
        total_quantity, billable_quantity, unit_price, included_units, amount_due
      )
      VALUES (
        v_tenant.tenant_id, v_meter.id, p_period_start, p_period_end,
        v_total, v_billable, v_unit_price, v_included, v_amount
      )
      ON CONFLICT (tenant_id, meter_id, period_start, period_end)
      DO UPDATE SET
        total_quantity = EXCLUDED.total_quantity,
        billable_quantity = EXCLUDED.billable_quantity,
        amount_due = EXCLUDED.amount_due,
        updated_at = now();

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER usage_meters_updated
  BEFORE UPDATE ON usage_meters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER usage_summaries_updated
  BEFORE UPDATE ON usage_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create update_updated_at_column if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Seed Standard Meters
-- ============================================
INSERT INTO usage_meters (name, slug, description, unit_name, unit_name_plural, aggregation_type)
VALUES 
  ('API Calls', 'api_calls', 'Number of API requests made', 'call', 'calls', 'sum'),
  ('Storage', 'storage_gb', 'Storage used in gigabytes', 'GB', 'GB', 'max'),
  ('Active Seats', 'active_seats', 'Number of active user seats', 'seat', 'seats', 'max')
ON CONFLICT (slug) DO NOTHING;
