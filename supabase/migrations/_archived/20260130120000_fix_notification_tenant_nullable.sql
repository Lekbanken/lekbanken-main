-- Fix: Allow tenant_id to be NULL for global (scope='all') notifications
-- The original schema required tenant_id NOT NULL, but the notification_deliveries
-- migration added scope='all' which needs tenant_id to be nullable.

-- 1. Make tenant_id nullable
ALTER TABLE public.notifications 
  ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Drop the old constraint that required tenant_id to always be NOT NULL
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notification_belongs_to_user_or_tenant;

-- 3. Add new constraint that validates based on scope
-- For 'tenant' scope: tenant_id must be present
-- For 'all' scope: tenant_id should be NULL (global notification)
ALTER TABLE public.notifications
  ADD CONSTRAINT notification_scope_tenant_check CHECK (
    CASE 
      WHEN scope = 'tenant' THEN tenant_id IS NOT NULL
      WHEN scope = 'all' THEN tenant_id IS NULL
      ELSE TRUE -- Default case for backward compatibility
    END
  );

-- 4. Update RLS policy to allow viewing global notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (
    -- User's own notifications
    user_id = auth.uid() 
    OR
    -- Tenant-scoped notifications for tenants user belongs to
    (scope = 'tenant' AND tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    ))
    OR
    -- Global notifications (scope='all')
    scope = 'all'
  );

-- 5. Comment
COMMENT ON CONSTRAINT notification_scope_tenant_check ON public.notifications IS 
  'Ensures tenant_id is set for tenant-scoped notifications and NULL for global notifications';
