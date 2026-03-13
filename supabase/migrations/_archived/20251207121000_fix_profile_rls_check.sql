-- Add WITH CHECK so updates are allowed when new row values are validated against auth.uid()
-- Fixes profile save failures where UPDATE is visible but rejected by RLS check

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Replace update policy to include WITH CHECK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    DROP POLICY users_update_own ON public.users;
  END IF;
  CREATE POLICY users_update_own
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
END$$;

-- Ensure select policy remains (idempotent)
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
