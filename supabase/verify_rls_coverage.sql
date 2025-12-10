-- ============================================
-- RLS COVERAGE AUDIT SCRIPT
-- ============================================
-- This script verifies that ALL tables in the public schema have Row Level Security enabled.
-- Run this in Supabase SQL Editor to audit RLS coverage.
--
-- Expected output:
--   - Tables with RLS enabled: ✅ RLS Enabled
--   - Tables WITHOUT RLS: ❌ RLS MISSING (SECURITY RISK!)
--
-- How to use:
--   1. Copy this entire file
--   2. Go to Supabase Dashboard → SQL Editor
--   3. Paste and run
--   4. Review results - fix any ❌ RLS MISSING entries
-- ============================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS MISSING'
  END as rls_status,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT IN (
    -- System tables that don't need RLS
    'schema_migrations',
    'supabase_migrations'
  )
ORDER BY 
  CASE WHEN rowsecurity = true THEN 1 ELSE 0 END, -- Show missing RLS first
  tablename;

-- ============================================
-- SUMMARY COUNT
-- ============================================

SELECT 
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT IN ('schema_migrations', 'supabase_migrations');

-- ============================================
-- FIX TEMPLATE (If any tables are missing RLS)
-- ============================================
-- If you find tables with ❌ RLS MISSING, enable RLS with:
--
-- ALTER TABLE public.YOUR_TABLE_NAME ENABLE ROW LEVEL SECURITY;
--
-- Then create appropriate RLS policies:
--
-- CREATE POLICY "policy_name" ON public.YOUR_TABLE_NAME
--   FOR ALL USING (
--     -- Your RLS logic here
--     -- Examples:
--     -- auth.uid() = user_id  (user owns row)
--     -- tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())  (tenant isolation)
--   );
-- ============================================
