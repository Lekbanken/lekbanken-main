-- Badge Presets Table
-- Server-side preset storage for badge builder (shared across tenant + system admins)
-- Follows existing patterns: RLS enabled, tenant-scoped with global fallback

--------------------------------------------------------------------------------
-- 1. CREATE TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badge_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope: NULL = global (system only), UUID = tenant-specific
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Preset metadata
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  
  -- The actual icon configuration (AchievementIconConfig JSON)
  icon_config JSONB NOT NULL,
  
  -- Categorization
  category TEXT DEFAULT 'custom' CHECK (category IN ('custom', 'system', 'template')),
  tags TEXT[] DEFAULT '{}',
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  
  -- Ownership and audit
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment for documentation
COMMENT ON TABLE public.badge_presets IS 'Server-side badge preset storage. Tenant-scoped with global support for system admins.';
COMMENT ON COLUMN public.badge_presets.tenant_id IS 'NULL = global preset (system admin only), UUID = tenant-specific preset';
COMMENT ON COLUMN public.badge_presets.icon_config IS 'AchievementIconConfig JSON structure';
COMMENT ON COLUMN public.badge_presets.category IS 'custom = user created, system = built-in, template = starter templates';

--------------------------------------------------------------------------------
-- 2. INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_badge_presets_tenant_id ON public.badge_presets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_badge_presets_created_by ON public.badge_presets(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_badge_presets_category ON public.badge_presets(category);
CREATE INDEX IF NOT EXISTS idx_badge_presets_tags ON public.badge_presets USING GIN(tags);

--------------------------------------------------------------------------------
-- 3. ENABLE RLS
--------------------------------------------------------------------------------
ALTER TABLE public.badge_presets ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 4. RLS POLICIES
--------------------------------------------------------------------------------

-- SELECT: Users can see global presets + their tenant's presets
CREATE POLICY "badge_presets_select_policy" ON public.badge_presets
  FOR SELECT TO authenticated
  USING (
    -- Global presets (tenant_id IS NULL) are visible to all authenticated users
    tenant_id IS NULL
    OR
    -- Tenant presets visible to tenant members
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = badge_presets.tenant_id
        AND tm.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: System admins for global, tenant admins for tenant presets
CREATE POLICY "badge_presets_insert_policy" ON public.badge_presets
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      -- Global presets: system admin only
      tenant_id IS NULL
      AND public.is_system_admin((SELECT auth.uid()))
    )
    OR
    (
      -- Tenant presets: tenant admin or system admin
      tenant_id IS NOT NULL
      AND (
        public.is_system_admin((SELECT auth.uid()))
        OR
        public.has_tenant_role(tenant_id, (SELECT auth.uid()), ARRAY['admin'])
      )
    )
  );

-- UPDATE: Only owner or appropriate admin
CREATE POLICY "badge_presets_update_policy" ON public.badge_presets
  FOR UPDATE TO authenticated
  USING (
    -- System admin can update anything
    public.is_system_admin((SELECT auth.uid()))
    OR
    -- Creator can update their own
    created_by_user_id = (SELECT auth.uid())
    OR
    -- Tenant admin can update tenant presets
    (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, (SELECT auth.uid()), ARRAY['admin'])
    )
  )
  WITH CHECK (
    -- Same conditions for the new row
    public.is_system_admin((SELECT auth.uid()))
    OR created_by_user_id = (SELECT auth.uid())
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, (SELECT auth.uid()), ARRAY['admin'])
    )
  );

-- DELETE: Only owner or appropriate admin
CREATE POLICY "badge_presets_delete_policy" ON public.badge_presets
  FOR DELETE TO authenticated
  USING (
    -- System admin can delete anything
    public.is_system_admin((SELECT auth.uid()))
    OR
    -- Creator can delete their own
    created_by_user_id = (SELECT auth.uid())
    OR
    -- Tenant admin can delete tenant presets
    (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, (SELECT auth.uid()), ARRAY['admin'])
    )
  );

--------------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGER
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.badge_presets_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS badge_presets_updated_at ON public.badge_presets;
CREATE TRIGGER badge_presets_updated_at
  BEFORE UPDATE ON public.badge_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.badge_presets_set_updated_at();

--------------------------------------------------------------------------------
-- 6. INCREMENT USAGE COUNT FUNCTION
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.badge_preset_increment_usage(preset_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.badge_presets
  SET usage_count = usage_count + 1
  WHERE id = preset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.badge_preset_increment_usage(UUID) TO authenticated;
