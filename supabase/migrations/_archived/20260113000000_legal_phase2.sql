-- Legal & Data Handling Phase 2: drafts, publishing, audit, tenant scope

CREATE TABLE IF NOT EXISTS public.legal_document_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','tenant')),
  tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('terms','privacy','org_terms','dpa','cookie_policy')),
  locale text NOT NULL CHECK (locale IN ('no','sv','en')),
  title text NOT NULL,
  content_markdown text NOT NULL,
  requires_acceptance boolean NOT NULL DEFAULT true,
  change_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES public.users(id),
  CONSTRAINT legal_document_drafts_scope_tenant_check CHECK (
    (scope = 'global' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_document_drafts_unique ON public.legal_document_drafts (
  type,
  locale,
  scope,
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_drafts_updated ON public.legal_document_drafts (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.org_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  accepted_by uuid NOT NULL REFERENCES public.users(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_org_legal_acceptances_tenant ON public.org_legal_acceptances (tenant_id);

CREATE TABLE IF NOT EXISTS public.legal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','tenant')),
  tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NULL REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  actor_user_id uuid NULL REFERENCES public.users(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_audit_log_tenant ON public.legal_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_audit_log_doc ON public.legal_audit_log (document_id);
CREATE INDEX IF NOT EXISTS idx_legal_audit_log_created ON public.legal_audit_log (created_at DESC);

ALTER TABLE public.legal_document_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_document_drafts_system_admin_all ON public.legal_document_drafts;
CREATE POLICY legal_document_drafts_system_admin_all ON public.legal_document_drafts
  FOR ALL USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS legal_document_drafts_tenant_admin_all ON public.legal_document_drafts;
CREATE POLICY legal_document_drafts_tenant_admin_all ON public.legal_document_drafts
  FOR ALL USING (
    scope = 'tenant'
    AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    scope = 'tenant'
    AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS org_legal_acceptances_select ON public.org_legal_acceptances;
CREATE POLICY org_legal_acceptances_select ON public.org_legal_acceptances
  FOR SELECT USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS org_legal_acceptances_insert ON public.org_legal_acceptances;
CREATE POLICY org_legal_acceptances_insert ON public.org_legal_acceptances
  FOR INSERT WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS legal_audit_log_system_admin_select ON public.legal_audit_log;
CREATE POLICY legal_audit_log_system_admin_select ON public.legal_audit_log
  FOR SELECT USING (public.is_system_admin());

DROP POLICY IF EXISTS legal_audit_log_tenant_select ON public.legal_audit_log;
CREATE POLICY legal_audit_log_tenant_select ON public.legal_audit_log
  FOR SELECT USING (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS legal_audit_log_insert ON public.legal_audit_log;
CREATE POLICY legal_audit_log_insert ON public.legal_audit_log
  FOR INSERT WITH CHECK (
    public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    )
  );

CREATE OR REPLACE FUNCTION public.publish_legal_document_v1(
  p_scope text,
  p_tenant_id uuid,
  p_type text,
  p_locale text,
  p_title text,
  p_content_markdown text,
  p_requires_acceptance boolean,
  p_change_summary text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_id uuid;
  v_version int;
  v_new_id uuid;
BEGIN
  IF p_scope = 'global' THEN
    IF NOT public.is_system_admin() THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Tenant is required';
    END IF;
    IF NOT (
      public.is_system_admin()
      OR public.has_tenant_role(p_tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  SELECT id, version_int INTO v_prev_id, v_version
  FROM public.legal_documents
  WHERE type = p_type
    AND locale = p_locale
    AND scope = p_scope
    AND (
      (p_scope = 'tenant' AND tenant_id = p_tenant_id)
      OR (p_scope = 'global' AND tenant_id IS NULL)
    )
  ORDER BY version_int DESC
  LIMIT 1;

  v_version := COALESCE(v_version, 0) + 1;

  UPDATE public.legal_documents
    SET is_active = false
  WHERE type = p_type
    AND locale = p_locale
    AND scope = p_scope
    AND (
      (p_scope = 'tenant' AND tenant_id = p_tenant_id)
      OR (p_scope = 'global' AND tenant_id IS NULL)
    )
    AND is_active = true;

  INSERT INTO public.legal_documents (
    scope,
    tenant_id,
    type,
    locale,
    title,
    content_markdown,
    version_int,
    is_active,
    requires_acceptance,
    change_summary,
    previous_version_id,
    created_by,
    created_at,
    published_at
  ) VALUES (
    p_scope,
    CASE WHEN p_scope = 'tenant' THEN p_tenant_id ELSE NULL END,
    p_type,
    p_locale,
    p_title,
    p_content_markdown,
    v_version,
    true,
    COALESCE(p_requires_acceptance, true),
    p_change_summary,
    v_prev_id,
    auth.uid(),
    now(),
    now()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.legal_audit_log (
    scope,
    tenant_id,
    document_id,
    actor_user_id,
    event_type,
    payload,
    created_at
  ) VALUES (
    p_scope,
    CASE WHEN p_scope = 'tenant' THEN p_tenant_id ELSE NULL END,
    v_new_id,
    auth.uid(),
    'publish',
    jsonb_build_object(
      'previous_id', v_prev_id,
      'version', v_version,
      'requires_acceptance', p_requires_acceptance
    ),
    now()
  );

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_legal_document_v1(text, uuid, text, text, text, text, boolean, text)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_legal_document_v1(text, uuid, text, text, text, text, boolean, text)
  FROM public;
