-- Seed Billing Plans
-- Inserts default billing plans for the platform

INSERT INTO public.billing_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  user_limit,
  api_limit_daily,
  storage_gb,
  support_level,
  is_active
) VALUES
(
  'Free',
  'free',
  'Perfect for getting started',
  0,
  0,
  jsonb_build_object(
    'games', 3,
    'max_players', 10,
    'analytics', false,
    'api_access', false,
    'custom_branding', false
  ),
  5,
  1000,
  5,
  'community',
  true
),
(
  'Starter',
  'starter',
  'Great for small teams',
  29,
  290,
  jsonb_build_object(
    'games', 25,
    'max_players', 100,
    'analytics', true,
    'api_access', true,
    'custom_branding', false
  ),
  25,
  10000,
  50,
  'email',
  true
),
(
  'Pro',
  'pro',
  'For growing organizations',
  99,
  990,
  jsonb_build_object(
    'games', 100,
    'max_players', 1000,
    'analytics', true,
    'api_access', true,
    'custom_branding', true,
    'advanced_analytics', true,
    'webhook_support', true
  ),
  100,
  50000,
  500,
  'priority',
  true
),
(
  'Enterprise',
  'enterprise',
  'For large-scale deployments',
  499,
  4990,
  jsonb_build_object(
    'games', 'unlimited',
    'max_players', 'unlimited',
    'analytics', true,
    'api_access', true,
    'custom_branding', true,
    'advanced_analytics', true,
    'webhook_support', true,
    'sso', true,
    'dedicated_support', true,
    'custom_integration', true
  ),
  NULL,
  NULL,
  NULL,
  'dedicated',
  true
) ON CONFLICT (slug) DO NOTHING;

