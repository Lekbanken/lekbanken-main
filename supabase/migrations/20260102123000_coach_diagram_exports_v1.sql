-- Coach Diagram exports (v1)
-- Stores versioned diagram JSON + derived SVG output as a reusable library asset.

-- 1) Extend media_type_enum to support diagram-backed media rows
DO $$
BEGIN
  BEGIN
    EXECUTE format('ALTER TYPE public.media_type_enum ADD VALUE IF NOT EXISTS %L', 'diagram');
  EXCEPTION WHEN duplicate_object THEN
    -- ignore
  END;
END $$;

-- 2) Canonical diagram exports
CREATE TABLE IF NOT EXISTS public.coach_diagram_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('global','tenant')),
  schema_version text NOT NULL,

  title text NOT NULL,
  sport_type text NOT NULL,
  field_template_id text NOT NULL,

  exported_at timestamptz NOT NULL DEFAULT now(),
  exported_by_user_id uuid,
  exported_by_tool text,

  document jsonb NOT NULL,
  svg text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT coach_diagram_exports_scope_matches_tenant
    CHECK (
      (scope_type = 'global' AND tenant_id IS NULL)
      OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS coach_diagram_exports_tenant_created_at_idx
  ON public.coach_diagram_exports (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coach_diagram_exports_scope_created_at_idx
  ON public.coach_diagram_exports (scope_type, created_at DESC);

ALTER TABLE public.coach_diagram_exports ENABLE ROW LEVEL SECURITY;

-- Admin-only access (owner/admin per tenant; system_admin for everything).
-- Service role is always allowed.

DROP POLICY IF EXISTS "admins_can_select_coach_diagram_exports" ON public.coach_diagram_exports;
CREATE POLICY "admins_can_select_coach_diagram_exports"
  ON public.coach_diagram_exports FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  );

DROP POLICY IF EXISTS "admins_can_insert_coach_diagram_exports" ON public.coach_diagram_exports;
CREATE POLICY "admins_can_insert_coach_diagram_exports"
  ON public.coach_diagram_exports FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  );

DROP POLICY IF EXISTS "admins_can_update_coach_diagram_exports" ON public.coach_diagram_exports;
CREATE POLICY "admins_can_update_coach_diagram_exports"
  ON public.coach_diagram_exports FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  );

DROP POLICY IF EXISTS "admins_can_delete_coach_diagram_exports" ON public.coach_diagram_exports;
CREATE POLICY "admins_can_delete_coach_diagram_exports"
  ON public.coach_diagram_exports FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  );

COMMENT ON TABLE public.coach_diagram_exports IS 'Canonical training/coach diagrams exported by Coach Diagram Builder (versioned JSON + derived SVG).';
