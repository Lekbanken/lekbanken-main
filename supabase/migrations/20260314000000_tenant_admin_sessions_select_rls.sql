-- APC-003 / APC-011: Add RLS policy allowing tenant admins to SELECT sessions in their tenant.
-- This enables sessions/route.ts to drop createServiceRoleClient() in favor of createServerRlsClient().
--
-- Existing SELECT policies on participant_sessions:
--   participant_sessions_select:      host_user_id = auth.uid() OR is_system_admin() OR status = 'active'
--   participant_sessions_select_anon:  status = 'active' (anon role)
--   host_can_manage_participant_sessions: host_user_id = auth.uid() (FOR ALL)
--
-- Gap: tenant admins cannot see non-active sessions in their tenant unless they are the host.
-- This policy fills that gap.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'participant_sessions'
      AND policyname = 'tenant_admin_view_sessions'
  ) THEN
    CREATE POLICY tenant_admin_view_sessions
    ON public.participant_sessions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_tenant_memberships m
        WHERE m.user_id = (SELECT auth.uid())
          AND m.tenant_id = participant_sessions.tenant_id
          AND m.role IN ('owner', 'admin')
      )
    );
  END IF;
END $$;
