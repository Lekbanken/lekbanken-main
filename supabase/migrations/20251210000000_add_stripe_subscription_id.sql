-- Add stripe_subscription_id to tenant_subscriptions and private_subscriptions
-- This column links our internal subscriptions to Stripe subscription objects

-- Add column to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for faster lookups by Stripe ID
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_stripe_id 
ON public.tenant_subscriptions(stripe_subscription_id);

-- Add unique constraint to prevent duplicate Stripe subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS tenant_subscriptions_stripe_id_uidx
ON public.tenant_subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add column to private_subscriptions (for consistency)
ALTER TABLE public.private_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for private subscriptions
CREATE INDEX IF NOT EXISTS idx_private_subscriptions_stripe_id 
ON public.private_subscriptions(stripe_subscription_id);

-- Add unique constraint to prevent duplicate Stripe subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS private_subscriptions_stripe_id_uidx
ON public.private_subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_subscriptions.stripe_subscription_id IS 
'Stripe subscription ID (sub_xxx) linking this subscription to Stripe';

COMMENT ON COLUMN public.private_subscriptions.stripe_subscription_id IS 
'Stripe subscription ID (sub_xxx) linking this subscription to Stripe';
