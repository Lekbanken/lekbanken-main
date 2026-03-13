-- Allow authenticated signups to insert their own profile row in public.users

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS users_insert_self ON public.users;
END $$;

CREATE POLICY users_insert_self
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Keep select/update policies intact (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY users_select_own
      ON public.users
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;
