-- Gift Subscriptions Tables
-- Created: 2026-01-27
-- Purpose: Allow purchasing subscriptions as gifts with redemption codes

-- ============================================
-- Gift Purchases Table
-- ============================================
CREATE TABLE IF NOT EXISTS gift_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Purchaser info
  purchaser_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  purchaser_email TEXT NOT NULL,
  
  -- Product info
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_price_id UUID NOT NULL REFERENCES product_prices(id) ON DELETE RESTRICT,
  
  -- Gift details
  recipient_email TEXT, -- Optional: for sending gift notification
  recipient_name TEXT,
  gift_message TEXT,
  
  -- Redemption
  redemption_code TEXT NOT NULL UNIQUE,
  redemption_code_expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, redeemed, expired, canceled
  
  -- Payment
  purchase_intent_id UUID REFERENCES purchase_intents(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- In cents
  currency TEXT NOT NULL DEFAULT 'sek',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_purchases_code ON gift_purchases(redemption_code);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_purchaser ON gift_purchases(purchaser_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_recipient_email ON gift_purchases(recipient_email) WHERE recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_purchases_status ON gift_purchases(status);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_expires ON gift_purchases(redemption_code_expires_at) WHERE status = 'paid';

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE gift_purchases ENABLE ROW LEVEL SECURITY;

-- Users can see gifts they purchased
CREATE POLICY gift_purchases_select_own_purchased ON gift_purchases
  FOR SELECT
  USING (purchaser_user_id = auth.uid());

-- Users can see gifts redeemed by them
CREATE POLICY gift_purchases_select_own_redeemed ON gift_purchases
  FOR SELECT
  USING (redeemed_by_user_id = auth.uid());

-- System admins can do everything
CREATE POLICY gift_purchases_admin_all ON gift_purchases
  FOR ALL
  USING (public.is_system_admin());

-- ============================================
-- Helper Functions
-- ============================================

-- Generate unique redemption code (8 characters, uppercase alphanumeric)
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing characters
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Redeem a gift code
CREATE OR REPLACE FUNCTION redeem_gift_code(
  p_code TEXT,
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  gift_id UUID,
  product_id UUID,
  entitlement_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift gift_purchases%ROWTYPE;
  v_tenant_id UUID;
  v_entitlement_id UUID;
BEGIN
  -- Find the gift
  SELECT * INTO v_gift
  FROM gift_purchases
  WHERE redemption_code = upper(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid gift code'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_gift.status != 'paid' THEN
    RETURN QUERY SELECT false, 
      CASE v_gift.status
        WHEN 'pending' THEN 'Gift payment not completed'
        WHEN 'redeemed' THEN 'Gift already redeemed'
        WHEN 'expired' THEN 'Gift has expired'
        WHEN 'canceled' THEN 'Gift was canceled'
        ELSE 'Gift not available'
      END::TEXT,
      NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_gift.redemption_code_expires_at < now() THEN
    -- Mark as expired
    UPDATE gift_purchases SET status = 'expired', updated_at = now()
    WHERE id = v_gift.id;
    
    RETURN QUERY SELECT false, 'Gift code has expired'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Determine tenant
  v_tenant_id := COALESCE(p_tenant_id, v_gift.redeemed_tenant_id);

  -- If no tenant provided, create a private tenant for the user
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, type, status, created_by, updated_by)
    VALUES (
      (SELECT COALESCE(display_name, split_part(email, '@', 1) || '''s Account') FROM users WHERE id = p_user_id),
      'gift-' || lower(substr(v_gift.redemption_code, 1, 8)),
      'private',
      'active',
      p_user_id,
      p_user_id
    )
    RETURNING id INTO v_tenant_id;

    -- Add user as owner
    INSERT INTO user_tenant_memberships (tenant_id, user_id, role, is_primary, status)
    VALUES (v_tenant_id, p_user_id, 'owner', true, 'active');
  END IF;

  -- Create entitlement
  INSERT INTO tenant_product_entitlements (
    tenant_id,
    product_id,
    status,
    source,
    quantity_seats,
    created_by,
    metadata
  )
  VALUES (
    v_tenant_id,
    v_gift.product_id,
    'active',
    'gift',
    1,
    p_user_id,
    jsonb_build_object(
      'gift_purchase_id', v_gift.id,
      'gift_code', v_gift.redemption_code,
      'gifted_by', v_gift.purchaser_user_id
    )
  )
  RETURNING id INTO v_entitlement_id;

  -- Assign seat to the user
  INSERT INTO tenant_entitlement_seat_assignments (
    tenant_id,
    entitlement_id,
    user_id,
    assigned_by,
    status
  )
  VALUES (v_tenant_id, v_entitlement_id, p_user_id, p_user_id, 'active');

  -- Mark gift as redeemed
  UPDATE gift_purchases
  SET 
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_by_user_id = p_user_id,
    redeemed_tenant_id = v_tenant_id,
    updated_at = now()
  WHERE id = v_gift.id;

  RETURN QUERY SELECT true, 'Gift redeemed successfully'::TEXT, v_gift.id, v_gift.product_id, v_entitlement_id;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_gift_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gift_purchases_updated
  BEFORE UPDATE ON gift_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_timestamp();
