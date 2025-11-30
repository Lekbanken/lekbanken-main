-- Tenant Enhancements Migration
-- Add missing columns to tenants table for admin settings page

-- Add slug column
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- Add description column  
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description TEXT;

-- Add logo_url column
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add subscription_tier column (free, starter, pro, enterprise)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Add subscription_status column (active, trialing, past_due, canceled, paused)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Create payment_methods table (used by billingService)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT,
  type TEXT NOT NULL DEFAULT 'card',
  card_brand TEXT,
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON public.payment_methods(tenant_id);

-- Enable RLS on payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_methods
CREATE POLICY "Users can view their tenant payment methods"
  ON public.payment_methods FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Add missing columns to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_subtotal DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_tax DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_total DECIMAL(10, 2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Update amount_total to default to amount if null
UPDATE public.invoices SET amount_total = amount WHERE amount_total IS NULL;

-- Add category column to games table (referenced by gameService)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_games_category ON public.games(category);
