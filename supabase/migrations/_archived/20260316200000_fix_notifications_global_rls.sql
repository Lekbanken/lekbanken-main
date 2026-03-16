-- Fix notifications_select to include global broadcasts (scope='all', tenant_id IS NULL)
-- Previously missing: global broadcasts were invisible through direct PostgREST queries
-- because NULL tenant_id never matches IN (user's tenant_ids).
-- RPC path (get_user_notifications) was unaffected since it's SECURITY DEFINER.
--
-- See: notifications-e2e-audit.md E2E-001

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (
      user_id IS NULL
      AND (
        scope = 'all'
        OR tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships
          WHERE user_id = (SELECT auth.uid())
        )
      )
    )
  );
