-- ============================================
-- FULL DATABASE DIAGNOSTIC FOR johan@formgiver.no
-- Run this in Supabase SQL Editor
-- Created: 2026-01-03
-- ============================================

-- ============================================
-- 1. ALL AUTH USERS WITH THIS EMAIL
-- ============================================
SELECT 
  '1. AUTH USERS' as section,
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data->>'full_name' as meta_name,
  raw_app_meta_data->>'role' as app_role,
  confirmed_at
FROM auth.users 
WHERE email ILIKE '%johan%' OR email ILIKE '%formgiver%'
ORDER BY created_at;

-- ============================================
-- 2. ALL PUBLIC.USERS PROFILES (check for duplicates/orphans)
-- ============================================
SELECT 
  '2. PUBLIC USERS' as section,
  u.id,
  u.email,
  u.full_name,
  u.global_role,
  u.created_at,
  u.updated_at,
  CASE WHEN au.id IS NULL THEN '❌ ORPHANED - NO AUTH USER' ELSE '✅ Linked' END as auth_status
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
WHERE u.email ILIKE '%johan%' 
   OR u.email ILIKE '%formgiver%'
   OR u.full_name ILIKE '%johan%'
ORDER BY u.created_at;

-- ============================================
-- 3. CHECK FOR ID MISMATCH (same email, different IDs)
-- ============================================
SELECT 
  '3. ID MISMATCH CHECK' as section,
  au.id as auth_id,
  au.email as auth_email,
  u.id as public_id,
  u.email as public_email,
  u.full_name,
  CASE 
    WHEN au.id = u.id THEN '✅ IDs match'
    ELSE '❌ ID MISMATCH - THIS IS THE PROBLEM!'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users u ON u.email = au.email
WHERE (au.email ILIKE '%johan%' OR au.email ILIKE '%formgiver%'
   OR u.email ILIKE '%johan%' OR u.email ILIKE '%formgiver%'
   OR u.full_name ILIKE '%johan%')
ORDER BY au.email, u.email;

-- ============================================
-- 4. ALL TENANT MEMBERSHIPS FOR THESE USERS
-- ============================================
SELECT 
  '4. TENANT MEMBERSHIPS' as section,
  m.id as membership_id,
  m.user_id,
  u.email,
  u.full_name,
  m.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  m.role as membership_role,
  m.created_at,
  CASE 
    WHEN m.tenant_id = '00000000-0000-0000-0000-000000000000' THEN '⚠️ NULL UUID TENANT'
    WHEN m.tenant_id = '00000000-0000-0000-0000-000000000001' THEN '⚠️ SEED TENANT'
    ELSE '✅ Normal'
  END as tenant_status
FROM public.user_tenant_memberships m
JOIN public.users u ON u.id = m.user_id
LEFT JOIN public.tenants t ON t.id = m.tenant_id
WHERE u.email ILIKE '%johan%' 
   OR u.email ILIKE '%formgiver%'
   OR u.full_name ILIKE '%johan%'
ORDER BY m.created_at;

-- ============================================
-- 5. CHECK FOR SPECIAL/SEED TENANTS
-- ============================================
SELECT 
  '5. SPECIAL TENANTS' as section,
  id,
  name,
  slug,
  created_at,
  CASE 
    WHEN id = '00000000-0000-0000-0000-000000000000' THEN '⚠️ NULL UUID - SHOULD NOT EXIST'
    WHEN id = '00000000-0000-0000-0000-000000000001' THEN '⚠️ SEED TENANT - May cause issues'
    WHEN id::text LIKE '00000000%' THEN '⚠️ Suspicious zero-prefix UUID'
    ELSE '✅ Normal'
  END as status
FROM public.tenants
WHERE id::text LIKE '00000000%'
ORDER BY created_at;

-- ============================================
-- 6. ALL ORPHANED PUBLIC.USERS (no matching auth.users)
-- ============================================
SELECT 
  '6. ALL ORPHANED PROFILES' as section,
  u.id,
  u.email,
  u.full_name,
  u.global_role,
  u.created_at,
  '❌ NO AUTH USER - SHOULD BE DELETED' as status
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
WHERE au.id IS NULL
ORDER BY u.created_at;

-- ============================================
-- 7. DUPLICATE EMAILS IN PUBLIC.USERS
-- ============================================
SELECT 
  '7. DUPLICATE EMAILS' as section,
  email,
  COUNT(*) as count,
  array_agg(id) as user_ids,
  array_agg(full_name) as names
FROM public.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================
-- 8. SEARCH ALL TABLES FOR "Johan" (without email domain)
-- ============================================
SELECT 
  '8a. USERS NAMED JOHAN' as section,
  id, email, full_name, global_role, created_at
FROM public.users
WHERE full_name ILIKE '%johan%'
ORDER BY created_at;

-- ============================================
-- 9. AUTH IDENTITIES (for OAuth issues)
-- ============================================
SELECT 
  '9. AUTH IDENTITIES' as section,
  au.email,
  au.id as auth_user_id,
  i.provider,
  i.identity_data->>'email' as identity_email,
  i.identity_data->>'name' as identity_name,
  i.created_at
FROM auth.users au
JOIN auth.identities i ON i.user_id = au.id
WHERE au.email ILIKE '%johan%' OR au.email ILIKE '%formgiver%'
ORDER BY au.email, i.created_at;

-- ============================================
-- 10. SESSIONS FOR THIS USER (active logins)
-- ============================================
SELECT 
  '10. USER SESSIONS' as section,
  s.id as session_id,
  s.user_id,
  au.email,
  au.raw_user_meta_data->>'full_name' as meta_name,
  s.created_at,
  s.updated_at,
  s.factor_id,
  s.aal
FROM auth.sessions s
JOIN auth.users au ON au.id = s.user_id
WHERE au.email ILIKE '%johan%' OR au.email ILIKE '%formgiver%'
ORDER BY s.updated_at DESC;

-- ============================================
-- SUMMARY: Quick diagnostic
-- ============================================
SELECT 
  'SUMMARY' as section,
  (SELECT COUNT(*) FROM auth.users WHERE email ILIKE '%johan%' OR email ILIKE '%formgiver%') as auth_users_count,
  (SELECT COUNT(*) FROM public.users WHERE email ILIKE '%johan%' OR email ILIKE '%formgiver%' OR full_name ILIKE '%johan%') as public_users_count,
  (SELECT COUNT(*) FROM public.users u LEFT JOIN auth.users au ON au.id = u.id WHERE au.id IS NULL AND (u.email ILIKE '%johan%' OR u.full_name ILIKE '%johan%')) as orphaned_profiles,
  (SELECT COUNT(*) FROM public.tenants WHERE id::text LIKE '00000000%') as suspicious_tenants;
