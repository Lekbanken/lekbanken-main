-- Billing Domain Schema
-- Subscriptions, billing history, invoices, and payment management

-- Billing Plans Table
CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '{}',
  user_limit INTEGER,
  api_limit_daily INTEGER,
  storage_gb INTEGER,
  support_level VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Subscriptions Table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, trialing, past_due, canceled, paused
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, stripe_subscription_id)
);

-- Billing History Table
CREATE TABLE public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL, -- subscription_created, upgraded, downgraded, renewed, canceled
  from_plan_id UUID REFERENCES public.billing_plans(id),
  to_plan_id UUID REFERENCES public.billing_plans(id),
  amount_charged DECIMAL(10, 2),
  amount_credited DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Invoices Table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  amount_subtotal DECIMAL(10, 2) NOT NULL,
  amount_tax DECIMAL(10, 2) DEFAULT 0,
  amount_total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, open, paid, void, uncollectible
  paid_at TIMESTAMP,
  due_date TIMESTAMP,
  pdf_url VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Payment Methods Table
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  type VARCHAR(50) NOT NULL, -- card, bank_account
  card_brand VARCHAR(50),
  card_last_four VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Trial Usage Tracking
CREATE TABLE public.trial_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trial_start_date TIMESTAMP NOT NULL,
  trial_end_date TIMESTAMP NOT NULL,
  users_created INTEGER DEFAULT 0,
  games_created INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create Indexes for Performance
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_billing_plan_id ON public.subscriptions(billing_plan_id);
CREATE INDEX idx_billing_history_tenant_id ON public.billing_history(tenant_id);
CREATE INDEX idx_billing_history_created_at ON public.billing_history(created_at);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX idx_payment_methods_tenant_id ON public.payment_methods(tenant_id);
CREATE INDEX idx_trial_usage_tenant_id ON public.trial_usage(tenant_id);

-- Enable RLS
ALTER TABLE public.billing_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Subscriptions
CREATE POLICY "Users can view their tenant subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Billing History
CREATE POLICY "Users can view their billing history"
  ON public.billing_history FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert billing history"
  ON public.billing_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Invoices
CREATE POLICY "Users can view their invoices"
  ON public.invoices FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update invoices"
  ON public.invoices FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Payment Methods
CREATE POLICY "Users can view their payment methods"
  ON public.payment_methods FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their payment methods"
  ON public.payment_methods FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can add payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Trial Usage
CREATE POLICY "Users can view their trial usage"
  ON public.trial_usage FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage trial usage"
  ON public.trial_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update trial usage"
  ON public.trial_usage FOR UPDATE
  USING (true);
