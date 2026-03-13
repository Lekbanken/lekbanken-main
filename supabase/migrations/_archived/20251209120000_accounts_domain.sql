-- Accounts Domain foundations: user profiles, devices, sessions, MFA, audit logs
-- Plus tenant membership normalization and helper unification.

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role_enum') THEN
    CREATE TYPE public.global_role_enum AS ENUM ('system_admin','private_user','demo_private_user','member');
  END IF;
END $$;

-- Extend tenant_role_enum with organisation/demo roles if missing
DO $$
DECLARE
  vals text[] := ARRAY['organisation_admin','organisation_user','demo_org_admin','demo_org_user'];
  v text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_role_enum') THEN
    CREATE TYPE public.tenant_role_enum AS ENUM ('owner','admin','editor','member');
  END IF;

  FOREACH v IN ARRAY vals LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.tenant_role_enum ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;
  END LOOP;
END $$;

-- 2) Users table hardening
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS global_role public.global_role_enum DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_enforced boolean DEFAULT false;

-- Refresh auth sync trigger to populate new columns and preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, language, avatar_url, preferred_theme, show_theme_toggle_in_header, global_role, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    COALESCE((new.raw_user_meta_data->>'language')::public.language_code_enum, 'NO'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(new.raw_user_meta_data->>'preferred_theme', 'system'),
    COALESCE((new.raw_user_meta_data->>'show_theme_toggle_in_header')::boolean, true),
    COALESCE((new.raw_user_meta_data->>'global_role')::public.global_role_enum, 'member'),
    new.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', public.users.full_name),
    language = COALESCE((new.raw_user_meta_data->>'language')::public.language_code_enum, public.users.language),
    avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', public.users.avatar_url),
    preferred_theme = COALESCE(new.raw_user_meta_data->>'preferred_theme', public.users.preferred_theme),
    show_theme_toggle_in_header = COALESCE((new.raw_user_meta_data->>'show_theme_toggle_in_header')::boolean, public.users.show_theme_toggle_in_header),
    global_role = COALESCE((new.raw_user_meta_data->>'global_role')::public.global_role_enum, public.users.global_role),
    email_verified = new.email_confirmed_at IS NOT NULL,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Normalize membership base table and add compatibility in both directions
DO $$
DECLARE
  base_table text;
  user_tbl regclass := to_regclass('public.user_tenant_memberships');
  tenant_tbl regclass := to_regclass('public.tenant_memberships');
  user_tbl_is_table boolean := FALSE;
  tenant_tbl_is_table boolean := FALSE;
BEGIN
  user_tbl_is_table := user_tbl IS NOT NULL AND EXISTS (SELECT 1 FROM pg_class WHERE oid = user_tbl AND relkind IN ('r','p'));
  tenant_tbl_is_table := tenant_tbl IS NOT NULL AND EXISTS (SELECT 1 FROM pg_class WHERE oid = tenant_tbl AND relkind IN ('r','p'));

  IF user_tbl_is_table THEN
    base_table := 'public.user_tenant_memberships';
  ELSIF tenant_tbl_is_table THEN
    base_table := 'public.tenant_memberships';
  ELSE
    -- create base as user_tenant_memberships if nothing exists
    EXECUTE $ct$
      CREATE TABLE public.user_tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        role public.tenant_role_enum NOT NULL DEFAULT 'member',
        is_primary boolean NOT NULL DEFAULT false,
        status text DEFAULT 'active',
        seat_assignment_id uuid REFERENCES public.tenant_seat_assignments(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, tenant_id)
      );
    $ct$;
    base_table := 'public.user_tenant_memberships';
    user_tbl_is_table := TRUE;
  END IF;

  -- Ensure columns exist on the chosen base table
  IF base_table IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS status text DEFAULT ''active''', base_table);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS seat_assignment_id uuid REFERENCES public.tenant_seat_assignments(id) ON DELETE SET NULL', base_table);
  END IF;

  -- Create compatibility view for the other name if missing
  IF base_table = 'public.user_tenant_memberships' THEN
    IF tenant_tbl IS NULL OR NOT tenant_tbl_is_table THEN
      EXECUTE 'DROP VIEW IF EXISTS public.tenant_memberships CASCADE';
      EXECUTE $v$
        CREATE VIEW public.tenant_memberships AS
          SELECT id, user_id, tenant_id, role, is_primary, status, seat_assignment_id, created_at, updated_at
          FROM public.user_tenant_memberships
      $v$;
    END IF;
  ELSIF base_table = 'public.tenant_memberships' THEN
    IF user_tbl IS NULL OR NOT user_tbl_is_table THEN
      EXECUTE 'DROP VIEW IF EXISTS public.user_tenant_memberships CASCADE';
      EXECUTE $v$
        CREATE VIEW public.user_tenant_memberships AS
          SELECT id, user_id, tenant_id, role, is_primary, status, seat_assignment_id, created_at, updated_at
          FROM public.tenant_memberships
      $v$;
    END IF;
  END IF;

  -- Apply DML rules on the tenant_memberships view when it is a view
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenant_memberships' AND relkind = 'v') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'tenant_memberships'::regclass AND rulename = 'tenant_memberships_insert_rule') THEN
      CREATE RULE tenant_memberships_insert_rule AS
      ON INSERT TO public.tenant_memberships DO INSTEAD
        INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary, status, seat_assignment_id, created_at, updated_at)
        VALUES (NEW.user_id, NEW.tenant_id, NEW.role, COALESCE(NEW.is_primary,false), COALESCE(NEW.status,'active'), NEW.seat_assignment_id, COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'tenant_memberships'::regclass AND rulename = 'tenant_memberships_update_rule') THEN
      CREATE RULE tenant_memberships_update_rule AS
      ON UPDATE TO public.tenant_memberships DO INSTEAD
        UPDATE public.user_tenant_memberships SET
          role = COALESCE(NEW.role, public.user_tenant_memberships.role),
          is_primary = COALESCE(NEW.is_primary, public.user_tenant_memberships.is_primary),
          status = COALESCE(NEW.status, public.user_tenant_memberships.status),
          seat_assignment_id = NEW.seat_assignment_id,
          updated_at = COALESCE(NEW.updated_at, now())
        WHERE id = OLD.id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'tenant_memberships'::regclass AND rulename = 'tenant_memberships_delete_rule') THEN
      CREATE RULE tenant_memberships_delete_rule AS
      ON DELETE TO public.tenant_memberships DO INSTEAD
        DELETE FROM public.user_tenant_memberships WHERE id = OLD.id;
    END IF;
  END IF;
END $$;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.is_global_admin() RETURNS boolean AS $$
  SELECT public.is_system_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_tenant_member(target_tenant uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_system_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = target_tenant
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_system_admin() THEN ARRAY(SELECT id FROM public.tenants)
    ELSE COALESCE(array_agg(tenant_id), ARRAY[]::uuid[])
  END
  FROM public.user_tenant_memberships
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(target_tenant uuid, required_roles public.tenant_role_enum[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_system_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = target_tenant
      AND role = ANY(required_roles)
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(target_tenant uuid, required_role public.tenant_role_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_tenant_role(target_tenant, ARRAY[required_role]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.tenant_role_enum) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_global_admin() FROM public;

-- 5) RLS policies on memberships (base table, whichever is physical)
DO $$
DECLARE
  base_table text;
BEGIN
  base_table := CASE
    WHEN to_regclass('public.user_tenant_memberships') IS NOT NULL AND EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.user_tenant_memberships') AND relkind IN ('r','p'))
      THEN 'public.user_tenant_memberships'
    WHEN to_regclass('public.tenant_memberships') IS NOT NULL AND EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.tenant_memberships') AND relkind IN ('r','p'))
      THEN 'public.tenant_memberships'
    ELSE NULL
  END;

  IF base_table IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', base_table);
    -- Drop legacy policies by name if they exist on the base
    EXECUTE format('DROP POLICY IF EXISTS users_can_select_own_memberships ON %s', base_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_admins_can_select_memberships ON %s', base_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_memberships_select ON %s', base_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_memberships_manage ON %s', base_table);

    EXECUTE format($p$
      CREATE POLICY tenant_memberships_select ON %s
        FOR SELECT USING (
          user_id = auth.uid()
          OR tenant_id = ANY(public.get_user_tenant_ids())
          OR public.is_system_admin()
        )$p$, base_table);

    EXECUTE format($p$
      CREATE POLICY tenant_memberships_manage ON %s
        FOR ALL USING (
          public.is_system_admin()
          OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
        )
        WITH CHECK (
          public.is_system_admin()
          OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
        )$p$, base_table);
  END IF;
END $$;

-- 6) Accounts tables
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  job_title text,
  organisation text,
  timezone text,
  locale text,
  avatar_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_fingerprint text,
  user_agent text,
  device_type text,
  ip_last inet,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  risk_score numeric,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON public.user_devices(last_seen_at);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supabase_session_id text,
  device_id uuid REFERENCES public.user_devices(id) ON DELETE SET NULL,
  ip inet,
  user_agent text,
  last_login_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  risk_flags jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session ON public.user_sessions(supabase_session_id);

CREATE TABLE IF NOT EXISTS public.user_mfa (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enforced_reason text,
  enrolled_at timestamptz,
  last_verified_at timestamptz,
  recovery_codes_hashed text[],
  methods jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id),
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user ON public.user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_actor ON public.user_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created ON public.user_audit_logs(created_at);

-- 7) Enable RLS and policies for new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_owner ON public.user_profiles;
CREATE POLICY user_profiles_owner ON public.user_profiles
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_devices_owner ON public.user_devices;
CREATE POLICY user_devices_owner ON public.user_devices
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_sessions_owner ON public.user_sessions;
CREATE POLICY user_sessions_owner ON public.user_sessions
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_mfa_owner ON public.user_mfa;
CREATE POLICY user_mfa_owner ON public.user_mfa
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_audit_logs_owner ON public.user_audit_logs;
CREATE POLICY user_audit_logs_owner ON public.user_audit_logs
  FOR SELECT USING (user_id = auth.uid() OR actor_user_id = auth.uid() OR public.is_system_admin());

-- 8) Tenant-adjacent RLS hardening using normalized helpers
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_invitations_select ON public.tenant_invitations;
DROP POLICY IF EXISTS tenant_invitations_mutate ON public.tenant_invitations;
CREATE POLICY tenant_invitations_select ON public.tenant_invitations
  FOR SELECT USING (public.is_system_admin() OR tenant_id = ANY(public.get_user_tenant_ids()));
CREATE POLICY tenant_invitations_mutate ON public.tenant_invitations
  FOR ALL USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS tenant_audit_logs_select ON public.tenant_audit_logs;
DROP POLICY IF EXISTS tenant_audit_logs_insert ON public.tenant_audit_logs;
CREATE POLICY tenant_audit_logs_select ON public.tenant_audit_logs
  FOR SELECT USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin','editor','member']::public.tenant_role_enum[])
  );
CREATE POLICY tenant_audit_logs_insert ON public.tenant_audit_logs
  FOR INSERT WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

-- 9) Ensure tenants update policy uses normalized helper
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_update_admin ON public.tenants;
CREATE POLICY tenants_update_admin ON public.tenants
  FOR UPDATE USING (
    public.is_system_admin()
    OR public.has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

-- 10) Comments for clarity
COMMENT ON TABLE public.user_profiles IS 'Structured per-user profile data (1:1 with users)';
COMMENT ON TABLE public.user_devices IS 'Registered devices for session security';
COMMENT ON TABLE public.user_sessions IS 'Session records linked to Supabase session IDs';
COMMENT ON TABLE public.user_mfa IS 'MFA enrollment/enforcement metadata';
COMMENT ON TABLE public.user_audit_logs IS 'Audit events for user-level actions';
