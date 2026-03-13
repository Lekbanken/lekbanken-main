-- Ensure authenticated users can read and update their own profile row in public.users
-- This fixes client-side "Kunde inte spara profiljusteringar." caused by RLS blocking UPDATE

-- Enable RLS (safe if already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated to SELECT their own row (needed when UPDATE ... RETURNING)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY users_select_own
      ON public.users
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END$$;

-- Allow authenticated to UPDATE their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid());
  END IF;
END$$;
