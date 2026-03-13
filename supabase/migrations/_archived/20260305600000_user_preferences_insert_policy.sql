-- Fix: Allow authenticated users to INSERT their own user_preferences row.
-- Without this policy, upsert fails on first save (no existing row) for non-admin users.
-- Pattern matches existing SELECT/UPDATE policies from 20260108000019.

CREATE POLICY "user_preferences_user_insert"
  ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND tenant_id = ANY(get_user_tenant_ids())
  );
