-- Kör detta i Supabase SQL Editor för att verifiera vilka migrations som körts
-- och vilka tabeller/enums som finns

-- 1. Visa alla körda migrations
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC
LIMIT 50;

-- 2. Kolla om kritiska tabeller finns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_mfa') 
    THEN '✅' ELSE '❌' 
  END AS user_mfa,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_audit_logs') 
    THEN '✅' ELSE '❌' 
  END AS user_audit_logs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') 
    THEN '✅' ELSE '❌' 
  END AS user_sessions,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_devices') 
    THEN '✅' ELSE '❌' 
  END AS user_devices,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_settings') 
    THEN '✅' ELSE '❌' 
  END AS tenant_settings,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_branding') 
    THEN '✅' ELSE '❌' 
  END AS tenant_branding,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_invitations') 
    THEN '✅' ELSE '❌' 
  END AS tenant_invitations,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_accounts') 
    THEN '✅' ELSE '❌' 
  END AS billing_accounts;

-- 3. Kolla om kritiska enums finns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role_enum') 
    THEN '✅' ELSE '❌' 
  END AS global_role_enum,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type_enum') 
    THEN '✅' ELSE '❌' 
  END AS tenant_type_enum,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status_enum') 
    THEN '✅' ELSE '❌' 
  END AS tenant_status_enum;

-- 4. Kolla vilka kolumner som finns på tenants
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 5. Kolla vilka kolumner som finns på tenant_memberships
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenant_memberships'
ORDER BY ordinal_position;
