-- ============================================
-- DIAGNOSTIK: Tenant/Membership namngivning
-- Kör detta i Supabase SQL Editor för att se nuvarande tillstånd
-- ============================================

-- 1. Visa vilka objekt som finns och om de är tabeller eller vyer
SELECT 
  c.relname as name,
  CASE c.relkind 
    WHEN 'r' THEN 'TABLE ✅'
    WHEN 'v' THEN 'VIEW 📋'
    WHEN 'm' THEN 'MATERIALIZED VIEW'
    ELSE c.relkind::text
  END as type,
  CASE WHEN c.relkind = 'r' THEN 'RLS kan appliceras här' 
       WHEN c.relkind = 'v' THEN 'RLS kan INTE appliceras (vy)'
       ELSE 'Okänt'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('user_tenant_memberships', 'tenant_memberships', 'tenants', 'users')
ORDER BY c.relname;

-- 2. Visa RLS-status för relevanta tabeller
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'RLS AKTIVERAT ✅' ELSE 'RLS AV ❌' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_tenant_memberships', 'tenant_memberships', 'tenants', 'users')
ORDER BY tablename;

-- 3. Lista alla policies på tenant-relaterade tabeller
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE' ELSE '❌ RESTRICTIVE' END as type,
  left(qual::text, 80) as condition_preview
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_tenant_memberships', 'tenant_memberships', 'tenants', 'users')
ORDER BY tablename, policyname;

-- 4. Kontrollera is_system_admin funktionen
SELECT 'is_system_admin function:' as info, 
       pg_get_functiondef(oid) as definition 
FROM pg_proc 
WHERE proname = 'is_system_admin' AND pronamespace = 'public'::regnamespace;

-- 5. Testa is_system_admin för nuvarande användare
SELECT 
  auth.uid() as current_user_id,
  is_system_admin() as is_system_admin,
  (auth.jwt() -> 'app_metadata' ->> 'role') as jwt_role,
  (SELECT global_role FROM users WHERE id = auth.uid()) as db_role;

-- 6. Kontrollera hur många rader varje tabell/vy returnerar
-- (Detta visar om RLS policies blockerar data)
SELECT 'tenants' as source, count(*) as row_count FROM tenants
UNION ALL
SELECT 'users' as source, count(*) as row_count FROM users
UNION ALL
SELECT 'user_tenant_memberships', count(*) FROM user_tenant_memberships
UNION ALL
SELECT 'tenant_memberships', count(*) FROM tenant_memberships;
