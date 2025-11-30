-- Marketplace Domain
-- In-game shop, cosmetics, power-ups, virtual currency

-- Virtual Currency (coins, gems, etc)
CREATE TABLE IF NOT EXISTS virtual_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- 'coins', 'gems', 'gold'
  symbol TEXT, -- '💰', '💎'
  exchange_rate DECIMAL(10,4) DEFAULT 1.0, -- relative to base currency
  is_premium BOOLEAN DEFAULT false, -- requires real money to purchase
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Currency Balances
CREATE TABLE IF NOT EXISTS user_currency_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency_id UUID NOT NULL REFERENCES virtual_currencies(id) ON DELETE CASCADE,
  balance DECIMAL(20,2) DEFAULT 0,
  total_earned DECIMAL(20,2) DEFAULT 0,
  total_spent DECIMAL(20,2) DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, currency_id)
);

-- Shop Items (cosmetics, power-ups, bundles)
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'cosmetic', 'powerup', 'bundle', 'season_pass'
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency_id UUID NOT NULL REFERENCES virtual_currencies(id) ON DELETE SET NULL,
  quantity_limit INTEGER, -- NULL = unlimited
  quantity_sold INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- store type-specific data
);

-- User Purchases
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  price_paid DECIMAL(10,2) NOT NULL,
  currency_id UUID NOT NULL REFERENCES virtual_currencies(id) ON DELETE SET NULL,
  is_gift BOOLEAN DEFAULT false,
  gifted_from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cosmetics/Inventory (owned cosmetics for players)
CREATE TABLE IF NOT EXISTS player_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  equipped_at TIMESTAMPTZ,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Analytics
CREATE TABLE IF NOT EXISTS marketplace_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  total_purchases INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  unique_buyers INTEGER DEFAULT 0,
  average_purchase_value DECIMAL(10,2) DEFAULT 0,
  most_popular_item_id UUID REFERENCES shop_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- Promo Codes / Discounts
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Indexes for common queries
CREATE INDEX idx_virtual_currencies_tenant_id ON virtual_currencies(tenant_id);
CREATE INDEX idx_virtual_currencies_code ON virtual_currencies(code);

CREATE INDEX idx_user_currency_balances_tenant_id ON user_currency_balances(tenant_id);
CREATE INDEX idx_user_currency_balances_user_id ON user_currency_balances(user_id);
CREATE INDEX idx_user_currency_balances_currency_id ON user_currency_balances(currency_id);

CREATE INDEX idx_shop_items_tenant_id ON shop_items(tenant_id);
CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_is_available ON shop_items(is_available);
CREATE INDEX idx_shop_items_is_featured ON shop_items(is_featured);

CREATE INDEX idx_user_purchases_tenant_id ON user_purchases(tenant_id);
CREATE INDEX idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_shop_item_id ON user_purchases(shop_item_id);
CREATE INDEX idx_user_purchases_created_at ON user_purchases(created_at);

CREATE INDEX idx_player_cosmetics_tenant_id ON player_cosmetics(tenant_id);
CREATE INDEX idx_player_cosmetics_user_id ON player_cosmetics(user_id);
CREATE INDEX idx_player_cosmetics_is_equipped ON player_cosmetics(is_equipped);

CREATE INDEX idx_marketplace_analytics_tenant_id ON marketplace_analytics(tenant_id);
CREATE INDEX idx_marketplace_analytics_date ON marketplace_analytics(date);

CREATE INDEX idx_promo_codes_tenant_id ON promo_codes(tenant_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);

-- RLS Policies
ALTER TABLE virtual_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Virtual Currencies: Users see all, admins manage
CREATE POLICY "virtual_currencies_select" ON virtual_currencies
  FOR SELECT USING (true);

CREATE POLICY "virtual_currencies_insert" ON virtual_currencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = virtual_currencies.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "virtual_currencies_update" ON virtual_currencies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = virtual_currencies.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "virtual_currencies_delete" ON virtual_currencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = virtual_currencies.tenant_id
        AND role = 'admin'
    )
  );

-- User Currency Balances: Users see own, admins see all
CREATE POLICY "user_currency_balances_select" ON user_currency_balances
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = user_currency_balances.tenant_id
    )
  );

CREATE POLICY "user_currency_balances_insert" ON user_currency_balances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = user_currency_balances.tenant_id
    )
  );

CREATE POLICY "user_currency_balances_update" ON user_currency_balances
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Shop Items: Users see available, admins manage
CREATE POLICY "shop_items_select" ON shop_items
  FOR SELECT USING (is_available = true OR created_by_user_id = auth.uid());

CREATE POLICY "shop_items_insert" ON shop_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = shop_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "shop_items_update" ON shop_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = shop_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "shop_items_delete" ON shop_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = shop_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

-- User Purchases: Users see own, admins see all
CREATE POLICY "user_purchases_select" ON user_purchases
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = user_purchases.tenant_id
    )
  );

CREATE POLICY "user_purchases_insert" ON user_purchases
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = user_purchases.tenant_id
    )
  );

-- Player Cosmetics: Users see own, admins see all
CREATE POLICY "player_cosmetics_select" ON player_cosmetics
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = player_cosmetics.tenant_id
    )
  );

CREATE POLICY "player_cosmetics_insert" ON player_cosmetics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "player_cosmetics_update" ON player_cosmetics
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Marketplace Analytics: Admins only
CREATE POLICY "marketplace_analytics_select" ON marketplace_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = marketplace_analytics.tenant_id
    )
  );

CREATE POLICY "marketplace_analytics_insert" ON marketplace_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = marketplace_analytics.tenant_id
    )
  );

-- Promo Codes: Admins manage
CREATE POLICY "promo_codes_select" ON promo_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = promo_codes.tenant_id
    )
  );

CREATE POLICY "promo_codes_insert" ON promo_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = promo_codes.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "promo_codes_update" ON promo_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = promo_codes.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "promo_codes_delete" ON promo_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = promo_codes.tenant_id
        AND role = 'admin'
    )
  );

