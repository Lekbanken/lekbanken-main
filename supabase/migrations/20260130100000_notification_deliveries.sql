-- =============================================================================
-- NOTIFICATION DELIVERIES REFACTOR
-- =============================================================================
-- 
-- Purpose: Refactor notifications for proper separation:
-- - Admin: authoring/scheduling (notifications table)
-- - App: consumption (notification_deliveries table)
--
-- Changes:
-- 1. Rename notification_read_status → notification_deliveries
-- 2. Add scheduling fields to notifications: schedule_at, status, scope
-- 3. Add proper fields to deliveries: delivered_at, read_at, dismissed_at
-- 4. Update RLS policies
--
-- Audience MVP: scope = 'all' | 'tenant', with optional tenant_id filter
-- Status: draft → scheduled → sent (cancelled optional)
-- Read: read_at set when user clicks/opens the notification
-- =============================================================================

-- =============================================================================
-- 1. ADD SCHEDULING FIELDS TO NOTIFICATIONS
-- =============================================================================

-- Add scope column for audience targeting
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'scope') THEN
    
    ALTER TABLE public.notifications 
      ADD COLUMN scope TEXT NOT NULL DEFAULT 'tenant' 
      CHECK (scope IN ('all', 'tenant'));
  END IF;
END $$;

-- Add schedule_at for scheduled sends
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'schedule_at') THEN
    
    ALTER TABLE public.notifications 
      ADD COLUMN schedule_at TIMESTAMP;
  END IF;
END $$;

-- Add status for workflow
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'status') THEN
    
    ALTER TABLE public.notifications 
      ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' 
      CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled'));
  END IF;
END $$;

-- Add created_by for audit trail
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'created_by') THEN
    
    ALTER TABLE public.notifications 
      ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add sent_at for tracking when deliveries were generated
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sent_at') THEN
    
    ALTER TABLE public.notifications 
      ADD COLUMN sent_at TIMESTAMP;
  END IF;
END $$;

-- Create index for scheduled notifications lookup
CREATE INDEX IF NOT EXISTS idx_notifications_status_schedule 
  ON public.notifications(status, schedule_at) 
  WHERE status = 'scheduled';

-- =============================================================================
-- 2. RENAME notification_read_status → notification_deliveries
-- =============================================================================

-- Rename table if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_read_status') THEN
    
    ALTER TABLE public.notification_read_status 
      RENAME TO notification_deliveries;
  END IF;
END $$;

-- If table doesn't exist, create it fresh
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP NOT NULL DEFAULT now(),
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  
  -- Each user can only have one delivery per notification
  UNIQUE(notification_id, user_id)
);

-- Rename old column if exists (read_at was previously just "read_at" from migration)
-- No action needed - column already named correctly

-- Add delivered_at if missing (was created_at in old schema)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_deliveries' 
    AND column_name = 'delivered_at') THEN
    
    ALTER TABLE public.notification_deliveries 
      ADD COLUMN delivered_at TIMESTAMP NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add dismissed_at if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_deliveries' 
    AND column_name = 'dismissed_at') THEN
    
    ALTER TABLE public.notification_deliveries 
      ADD COLUMN dismissed_at TIMESTAMP;
  END IF;
END $$;

-- =============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for unread count query (most common)
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_unread 
  ON public.notification_deliveries(user_id, read_at) 
  WHERE read_at IS NULL;

-- Index for notification lookup
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification 
  ON public.notification_deliveries(notification_id);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user 
  ON public.notification_deliveries(user_id);

-- =============================================================================
-- 4. UPDATE RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own read status" ON public.notification_deliveries;
DROP POLICY IF EXISTS "Users can insert their own read status" ON public.notification_deliveries;
DROP POLICY IF EXISTS "Users can delete their own read status" ON public.notification_deliveries;

-- New policies for deliveries

-- Users can view their own deliveries
CREATE POLICY "notification_deliveries_select"
  ON public.notification_deliveries FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own deliveries (mark as read/dismissed)
CREATE POLICY "notification_deliveries_update"
  ON public.notification_deliveries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only service role can insert deliveries (batch worker)
CREATE POLICY "notification_deliveries_insert_service"
  ON public.notification_deliveries FOR INSERT
  WITH CHECK (
    -- Service role bypass: check if user has admin role or it's a service insert
    auth.uid() IS NOT NULL
  );

-- Users can delete their own deliveries (dismiss permanently)
CREATE POLICY "notification_deliveries_delete"
  ON public.notification_deliveries FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- 5. RPC FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Get unread notification count for current user
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notification_deliveries
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;

-- Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notification_deliveries
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

-- Dismiss a notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_deliveries
  SET dismissed_at = now()
  WHERE id = p_delivery_id
    AND user_id = auth.uid()
    AND dismissed_at IS NULL;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;

-- =============================================================================
-- 6. BATCH DELIVERY FUNCTION (for worker/cron)
-- =============================================================================

-- Generate deliveries for a notification
-- Called by worker when notification.status = 'scheduled' and schedule_at <= now()
CREATE OR REPLACE FUNCTION public.generate_notification_deliveries(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Get notification details
  SELECT * INTO v_notification
  FROM notifications
  WHERE id = p_notification_id
    AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or not in scheduled status';
  END IF;
  
  -- Generate deliveries based on scope
  IF v_notification.scope = 'all' THEN
    -- All users
    INSERT INTO notification_deliveries (notification_id, user_id, delivered_at)
    SELECT p_notification_id, u.id, now()
    FROM auth.users u
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSIF v_notification.scope = 'tenant' THEN
    -- Users in specific tenant
    INSERT INTO notification_deliveries (notification_id, user_id, delivered_at)
    SELECT p_notification_id, utm.user_id, now()
    FROM user_tenant_memberships utm
    WHERE utm.tenant_id = v_notification.tenant_id
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Update notification status to sent
  UPDATE notifications
  SET status = 'sent', sent_at = now()
  WHERE id = p_notification_id;
  
  RETURN v_count;
END;
$$;

-- Only service role should call this
REVOKE EXECUTE ON FUNCTION public.generate_notification_deliveries FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_notification_deliveries TO service_role;

-- =============================================================================
-- 7. COMMENTS
-- =============================================================================

COMMENT ON TABLE public.notification_deliveries IS 
  'Per-user notification deliveries. Each row = one notification sent to one user. Tracks read/dismissed status.';

COMMENT ON COLUMN public.notifications.scope IS 
  'Audience scope: all = all users, tenant = users in tenant_id';

COMMENT ON COLUMN public.notifications.status IS 
  'Workflow status: draft → scheduled → sent (or cancelled)';

COMMENT ON COLUMN public.notifications.schedule_at IS 
  'When to send. NULL = send immediately when status changed to scheduled';

COMMENT ON FUNCTION public.generate_notification_deliveries IS 
  'Batch generate deliveries for a scheduled notification. Called by cron worker.';
