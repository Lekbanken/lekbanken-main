-- Ensure system admins can read/update user records and profiles

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_select_admin_or_self'
  ) THEN
    CREATE POLICY users_select_admin_or_self
      ON public.users
      FOR SELECT
      USING (id = auth.uid() OR public.is_system_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update_admin_or_self'
  ) THEN
    DROP POLICY users_update_admin_or_self ON public.users;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update_own'
  ) THEN
    DROP POLICY users_update_own ON public.users;
  END IF;
  CREATE POLICY users_update_admin_or_self
    ON public.users
    FOR UPDATE
    USING (id = auth.uid() OR public.is_system_admin())
    WITH CHECK (id = auth.uid() OR public.is_system_admin());
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_insert_self'
  ) THEN
    DROP POLICY users_insert_self ON public.users;
  END IF;
  CREATE POLICY users_insert_self
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='user_profiles_admin_or_self'
  ) THEN
    CREATE POLICY user_profiles_admin_or_self
      ON public.user_profiles
      FOR ALL
      USING (user_id = auth.uid() OR public.is_system_admin())
      WITH CHECK (user_id = auth.uid() OR public.is_system_admin());
  END IF;
END $$;
