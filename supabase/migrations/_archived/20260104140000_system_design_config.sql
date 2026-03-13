-- Migration: System Design Configuration + Tenant Branding Feature
-- Purpose: Central Design Hub with tenant override capability

-- ============================================================================
-- 1. System Design Config table (single row for platform-wide design settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_design_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Brand assets (logos, icons, favicons)
  brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Media library defaults (profile images, cover images)
  media jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Typography settings (font family, scale, title format)
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Advanced/future tokens
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS system_design_config_singleton 
  ON public.system_design_config ((true));

-- Insert default row if not exists
INSERT INTO public.system_design_config (brand, media, typography, tokens)
VALUES ('{}', '{}', '{}', '{}')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.system_design_config IS 
  'Central design configuration for platform-wide brand assets and design tokens. Single row.';

-- ============================================================================
-- 2. Tenant Design Config table (per-tenant overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_design_config (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Partial overrides (same shape as system config but sparse)
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_design_config IS 
  'Per-tenant design overrides. Only effective if tenant_branding_enabled=true on the tenant.';

-- ============================================================================
-- 3. Add tenant_branding_enabled toggle to tenants table
-- ============================================================================
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS tenant_branding_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.tenant_branding_enabled IS 
  'When true, allows tenant to override system design settings. Controlled by system admin (paid feature).';

-- ============================================================================
-- 4. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.system_design_config;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.system_design_config
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.tenant_design_config;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenant_design_config
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 5. RLS Policies for system_design_config
-- ============================================================================
ALTER TABLE public.system_design_config ENABLE ROW LEVEL SECURITY;

-- System admin only: read
DROP POLICY IF EXISTS "System admin can read system design config" ON public.system_design_config;
CREATE POLICY "System admin can read system design config"
  ON public.system_design_config
  FOR SELECT
  USING (public.is_system_admin());

-- System admin only: update (no insert/delete - singleton)
DROP POLICY IF EXISTS "System admin can update system design config" ON public.system_design_config;
CREATE POLICY "System admin can update system design config"
  ON public.system_design_config
  FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- ============================================================================
-- 6. RLS Policies for tenant_design_config
-- ============================================================================
ALTER TABLE public.tenant_design_config ENABLE ROW LEVEL SECURITY;

-- System admin: full access
DROP POLICY IF EXISTS "System admin full access to tenant design config" ON public.tenant_design_config;
CREATE POLICY "System admin full access to tenant design config"
  ON public.tenant_design_config
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Tenant admin/owner: access only if branding enabled
DROP POLICY IF EXISTS "Tenant admin can manage own design if enabled" ON public.tenant_design_config;
CREATE POLICY "Tenant admin can manage own design if enabled"
  ON public.tenant_design_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_design_config.tenant_id
        AND t.tenant_branding_enabled = true
    )
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_design_config.tenant_id
        AND t.tenant_branding_enabled = true
    )
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- ============================================================================
-- 7. Storage bucket for system assets (if not exists)
-- ============================================================================
-- Note: Bucket creation is done via Supabase Dashboard or supabase CLI
-- This is documented here for reference:
-- CREATE BUCKET IF NOT EXISTS system-assets (public: true)
-- Path schema:
--   system/logo/light.png
--   system/logo/dark.png
--   system/icon/app.png
--   system/favicon/light.png
--   system/favicon/dark.png
--   system/defaults/profile/*
--   system/defaults/covers/*

-- ============================================================================
-- 8. Helper function to get effective design for a tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_effective_design(p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_system_config jsonb;
  v_tenant_overrides jsonb;
  v_branding_enabled boolean;
  v_result jsonb;
BEGIN
  -- Get system config
  SELECT jsonb_build_object(
    'brand', brand,
    'media', media,
    'typography', typography,
    'tokens', tokens
  ) INTO v_system_config
  FROM public.system_design_config
  LIMIT 1;
  
  IF v_system_config IS NULL THEN
    v_system_config := '{}'::jsonb;
  END IF;
  
  -- If no tenant specified, return system config
  IF p_tenant_id IS NULL THEN
    RETURN v_system_config;
  END IF;
  
  -- Check if tenant has branding enabled
  SELECT tenant_branding_enabled INTO v_branding_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF NOT COALESCE(v_branding_enabled, false) THEN
    RETURN v_system_config;
  END IF;
  
  -- Get tenant overrides
  SELECT overrides INTO v_tenant_overrides
  FROM public.tenant_design_config
  WHERE tenant_id = p_tenant_id;
  
  IF v_tenant_overrides IS NULL OR v_tenant_overrides = '{}'::jsonb THEN
    RETURN v_system_config;
  END IF;
  
  -- Merge: tenant overrides take precedence (shallow merge per category)
  v_result := jsonb_build_object(
    'brand', COALESCE(v_tenant_overrides->'brand', '{}'::jsonb) || COALESCE(v_system_config->'brand', '{}'::jsonb),
    'media', COALESCE(v_tenant_overrides->'media', '{}'::jsonb) || COALESCE(v_system_config->'media', '{}'::jsonb),
    'typography', v_system_config->'typography', -- Typography NOT overridable by tenant
    'tokens', v_system_config->'tokens' -- Tokens NOT overridable by tenant
  );
  
  -- Actually we want tenant to override, so reverse the merge order for brand/media
  v_result := jsonb_build_object(
    'brand', COALESCE(v_system_config->'brand', '{}'::jsonb) || COALESCE(v_tenant_overrides->'brand', '{}'::jsonb),
    'media', COALESCE(v_system_config->'media', '{}'::jsonb) || COALESCE(v_tenant_overrides->'media', '{}'::jsonb),
    'typography', v_system_config->'typography',
    'tokens', v_system_config->'tokens'
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_effective_design IS 
  'Returns merged design config with tenant overrides applied (if enabled). Typography and tokens are not overridable.';
