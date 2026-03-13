-- ============================================================================
-- Migration: Fix RLS policies for system_design_config and tenant_design_config
-- Purpose: Replace is_system_admin() with is_system_admin_jwt_only() to prevent
--          infinite recursion when policies query the users table
-- ============================================================================

-- ============================================================================
-- 1. Fix system_design_config RLS Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "System admin can read system design config" ON public.system_design_config;
DROP POLICY IF EXISTS "System admin can update system design config" ON public.system_design_config;

-- Create safe policies using JWT-only check
CREATE POLICY "System admin can read system design config"
  ON public.system_design_config
  FOR SELECT
  USING (public.is_system_admin_jwt_only());

CREATE POLICY "System admin can update system design config"
  ON public.system_design_config
  FOR UPDATE
  USING (public.is_system_admin_jwt_only())
  WITH CHECK (public.is_system_admin_jwt_only());

-- ============================================================================
-- 2. Fix tenant_design_config RLS Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "System admin full access to tenant design config" ON public.tenant_design_config;
DROP POLICY IF EXISTS "Tenant admin can read own tenant design config" ON public.tenant_design_config;
DROP POLICY IF EXISTS "Tenant admin can update own tenant design config" ON public.tenant_design_config;

-- System admin: full access (using JWT-only check)
CREATE POLICY "System admin full access to tenant design config"
  ON public.tenant_design_config
  FOR ALL
  USING (public.is_system_admin_jwt_only())
  WITH CHECK (public.is_system_admin_jwt_only());

-- Tenant admin: can read own config
-- Using direct membership check instead of function to avoid recursion
CREATE POLICY "Tenant admin can read own tenant design config"
  ON public.tenant_design_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships m
      WHERE m.tenant_id = tenant_design_config.tenant_id
        AND m.user_id = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

-- Tenant admin: can update own config
CREATE POLICY "Tenant admin can update own tenant design config"
  ON public.tenant_design_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships m
      WHERE m.tenant_id = tenant_design_config.tenant_id
        AND m.user_id = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships m
      WHERE m.tenant_id = tenant_design_config.tenant_id
        AND m.user_id = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Verify (optional - can be run manually)
-- ============================================================================
-- SELECT policyname, cmd, qual FROM pg_policies 
-- WHERE tablename IN ('system_design_config', 'tenant_design_config');
