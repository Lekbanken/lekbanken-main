-- ============================================================================
-- NOTIFICATIONS: Allow broadcast notifications (user_id IS NULL)
-- ============================================================================
-- This migration updates the notifications RLS policy to allow users to see:
-- 1. Personal notifications (user_id = auth.uid())
-- 2. Broadcast notifications (user_id IS NULL) for tenants they belong to

-- Drop the existing select policy
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

-- Create new select policy that includes broadcast notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    -- Personal notifications
    user_id = (SELECT auth.uid())
    OR
    -- Broadcast notifications for user's tenants
    (
      user_id IS NULL
      AND tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_memberships
        WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- Also update the update policy to allow marking broadcast notifications as read
-- (though we use notification_read_status table for this, we should still allow it)
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    -- Personal notifications
    user_id = (SELECT auth.uid())
    OR
    -- Broadcast notifications for user's tenants (read-only update for is_read)
    (
      user_id IS NULL
      AND tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_memberships
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    -- Can only update personal notifications directly
    user_id = (SELECT auth.uid())
  );
