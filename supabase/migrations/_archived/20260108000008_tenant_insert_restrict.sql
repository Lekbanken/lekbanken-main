-- =============================================================================
-- Migration 008: Restrict tenant creation + Remove duplicate SELECT policies
-- =============================================================================
-- Purpose: 
--   1. Restrict tenant INSERT to admin/service only (business decision)
--   2. Remove redundant duplicate SELECT policies
-- 
-- FUTURE NOTE: When implementing tenant purchase flow, create a new SECURITY
-- DEFINER function that validates purchase and creates tenant, called via
-- service_role from Edge Function after payment validation.
-- =============================================================================

-- =============================================================================
-- PHASE 1: Restrict tenant creation to admin/service only
-- =============================================================================
-- Current policy allows: is_global_admin() OR service_role OR auth.uid() IS NOT NULL
-- New policy allows: is_global_admin() OR service_role ONLY
-- 
-- FUTURE: Tenant purchase will go through an Edge Function that:
--   1. Validates payment/license purchase
--   2. Calls create_tenant() function via service_role
--   3. Sets up initial tenant configuration
-- =============================================================================

DROP POLICY IF EXISTS "tenant_insert_authenticated" ON public.tenants;

CREATE POLICY "tenant_insert_admin_only" ON public.tenants
  FOR INSERT
  TO public
  WITH CHECK (
    is_global_admin() 
    OR auth.role() = 'service_role'
  );

-- Add a comment explaining the restriction
COMMENT ON POLICY "tenant_insert_admin_only" ON public.tenants IS 
  'Only system admins and service role can create tenants. For self-service tenant creation, use the tenant purchase flow via Edge Functions.';

-- =============================================================================
-- PHASE 2: Remove redundant duplicate SELECT policies
-- =============================================================================
-- These tables have two SELECT policies - one with TRUE and one requiring auth.
-- Since PERMISSIVE policies OR together, the TRUE policy wins.
-- Keep the TRUE policy (public catalog data should be accessible).
-- =============================================================================

-- 2.1 products - keep products_select_all, drop authenticated_can_select_products
DROP POLICY IF EXISTS "authenticated_can_select_products" ON public.products;

-- 2.2 purposes - keep purposes_select_all, drop authenticated_can_select_purposes  
DROP POLICY IF EXISTS "authenticated_can_select_purposes" ON public.purposes;

-- =============================================================================
-- Verification query
-- =============================================================================
-- SELECT policyname, cmd, with_check::text 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'tenants' AND cmd = 'INSERT';
-- Should show: tenant_insert_admin_only with is_global_admin() OR service_role check
-- =============================================================================
