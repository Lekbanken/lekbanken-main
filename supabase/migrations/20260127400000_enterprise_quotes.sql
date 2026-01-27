-- Enterprise Quotes Tables
-- Created: 2026-01-27
-- Purpose: Quote generation system for enterprise customers with custom pricing

-- ============================================
-- Quotes Table
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL, -- QTE-2026-0001 format
  
  -- Customer info
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  
  -- Quote details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  currency TEXT NOT NULL DEFAULT 'sek',
  subtotal INTEGER NOT NULL DEFAULT 0, -- In cents
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2),
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Terms
  valid_until DATE NOT NULL,
  payment_terms TEXT DEFAULT 'net_30', -- net_30, net_60, immediate
  contract_length_months INTEGER DEFAULT 12,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired
  
  -- Acceptance
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT, -- Name of person who accepted
  signature_data TEXT, -- Base64 signature if used
  
  -- Internal
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes_internal TEXT, -- Internal notes, not shown to customer
  
  -- Conversion
  converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote Line Items
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Product reference (optional - for standard products)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_price_id UUID REFERENCES product_prices(id) ON DELETE SET NULL,
  
  -- Line item details (can be custom)
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- In cents
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total_price INTEGER NOT NULL, -- quantity * unit_price - discount
  
  -- Billing type
  billing_type TEXT NOT NULL DEFAULT 'recurring', -- recurring, one_time
  billing_interval TEXT, -- month, year (for recurring)
  
  -- Position
  position INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote Activity Log
CREATE TABLE IF NOT EXISTS quote_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL, -- created, updated, sent, viewed, accepted, rejected, commented
  activity_data JSONB DEFAULT '{}',
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until) WHERE status IN ('sent', 'viewed');
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_activities_quote ON quote_activities(quote_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_activities ENABLE ROW LEVEL SECURITY;

-- System admins can do everything
CREATE POLICY quotes_admin_all ON quotes
  FOR ALL
  USING (public.is_system_admin());

CREATE POLICY quote_line_items_admin_all ON quote_line_items
  FOR ALL
  USING (public.is_system_admin());

CREATE POLICY quote_activities_admin_all ON quote_activities
  FOR ALL
  USING (public.is_system_admin());

-- Tenant admins can view quotes for their org
CREATE POLICY quotes_tenant_select ON quotes
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(quote_number, '^QTE-' || v_year || '-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM quotes
  WHERE quote_number LIKE 'QTE-' || v_year || '-%';
  
  v_number := 'QTE-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- Calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals(p_quote_id UUID)
RETURNS TABLE (subtotal INTEGER, total_amount INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal INTEGER;
  v_discount INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM quote_line_items
  WHERE quote_id = p_quote_id;
  
  SELECT discount_amount INTO v_discount
  FROM quotes
  WHERE id = p_quote_id;
  
  v_total := v_subtotal - COALESCE(v_discount, 0);
  
  RETURN QUERY SELECT v_subtotal, v_total;
END;
$$;

-- Log quote activity
CREATE OR REPLACE FUNCTION log_quote_activity(
  p_quote_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}',
  p_performed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO quote_activities (quote_id, activity_type, activity_data, performed_by)
  VALUES (p_quote_id, p_activity_type, p_activity_data, COALESCE(p_performed_by, auth.uid()))
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_quote_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_timestamp();

-- Auto-calculate line item total
CREATE OR REPLACE FUNCTION calculate_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := (NEW.quantity * NEW.unit_price) - 
    ROUND((NEW.quantity * NEW.unit_price * COALESCE(NEW.discount_percent, 0) / 100));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_line_items_calculate_total
  BEFORE INSERT OR UPDATE ON quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_line_item_total();
