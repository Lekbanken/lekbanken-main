-- Tenant Domain foundational tables
DO $$ BEGIN
  CREATE TYPE tenant_type_enum AS ENUM ('school','sports','workplace','private','demo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tenant_status_enum AS ENUM ('active','suspended','trial','demo','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  modules jsonb DEFAULT '{}'::jsonb,
  product_access jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  value jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  logo_media_id uuid REFERENCES public.media(id),
  primary_color text,
  secondary_color text,
  accent_color text,
  theme text,
  brand_name_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'organisation_user',
  token text NOT NULL,
  invited_by uuid REFERENCES public.users(id),
  expires_at timestamptz,
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id),
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend tenants with type/status/theme/colors if missing
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS type tenant_type_enum,
  ADD COLUMN IF NOT EXISTS status tenant_status_enum DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS default_language text,
  ADD COLUMN IF NOT EXISTS default_theme text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS demo_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

ALTER TABLE public.tenant_memberships
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seat_assignment_id uuid REFERENCES public.tenant_seat_assignments(id);

-- RLS enable
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper predicates
CREATE OR REPLACE FUNCTION public.is_system_admin() RETURNS boolean AS $$
  SELECT coalesce((current_setting('request.jwt.claims', true)::json ->> 'role') = 'system_admin', false);
$$ LANGUAGE sql STABLE;

-- Policies (system_admin bypass)
-- tenant_settings
DROP POLICY IF EXISTS tenant_settings_select ON public.tenant_settings;
CREATE POLICY tenant_settings_select ON public.tenant_settings
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_settings_update ON public.tenant_settings;
CREATE POLICY tenant_settings_update ON public.tenant_settings
FOR UPDATE USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_settings_insert ON public.tenant_settings;
CREATE POLICY tenant_settings_insert ON public.tenant_settings
FOR INSERT WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

-- tenant_features
DROP POLICY IF EXISTS tenant_features_select ON public.tenant_features;
CREATE POLICY tenant_features_select ON public.tenant_features
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_features_mutate ON public.tenant_features;
CREATE POLICY tenant_features_mutate ON public.tenant_features
FOR ALL USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

-- tenant_branding
DROP POLICY IF EXISTS tenant_branding_select ON public.tenant_branding;
CREATE POLICY tenant_branding_select ON public.tenant_branding
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_branding_mutate ON public.tenant_branding;
CREATE POLICY tenant_branding_mutate ON public.tenant_branding
FOR ALL USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

-- tenant_invitations
DROP POLICY IF EXISTS tenant_invitations_select ON public.tenant_invitations;
CREATE POLICY tenant_invitations_select ON public.tenant_invitations
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_invitations_mutate ON public.tenant_invitations;
CREATE POLICY tenant_invitations_mutate ON public.tenant_invitations
FOR ALL USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()))
WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

-- tenant_audit_logs
DROP POLICY IF EXISTS tenant_audit_logs_select ON public.tenant_audit_logs;
CREATE POLICY tenant_audit_logs_select ON public.tenant_audit_logs
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS tenant_audit_logs_insert ON public.tenant_audit_logs;
CREATE POLICY tenant_audit_logs_insert ON public.tenant_audit_logs
FOR INSERT WITH CHECK (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));

-- tenants table policies (lightweight, rely on existing ones but add if missing)
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_select_self';
  IF NOT FOUND THEN
    CREATE POLICY tenants_select_self ON public.tenants FOR SELECT USING (is_system_admin() OR id = ANY(get_user_tenant_ids()));
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_update_admin';
  IF NOT FOUND THEN
    CREATE POLICY tenants_update_admin ON public.tenants FOR UPDATE USING (is_system_admin() OR id = ANY(get_user_tenant_ids())) WITH CHECK (is_system_admin() OR id = ANY(get_user_tenant_ids()));
  END IF;
END $$;
