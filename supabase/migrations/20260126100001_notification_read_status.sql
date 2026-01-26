-- Notification Read Status for Broadcast Notifications
-- 
-- This table tracks read status per user for broadcast notifications (where user_id IS NULL).
-- Personal notifications (with user_id) use the is_read field on the notifications table directly.
-- 
-- Purpose: Allow users to mark broadcast notifications as read without affecting other users.

-- 1. Create the notification_read_status table
CREATE TABLE IF NOT EXISTS public.notification_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  
  -- Each user can only have one read status per notification
  UNIQUE(notification_id, user_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification_id 
  ON public.notification_read_status(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_read_status_user_id 
  ON public.notification_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_read_status_user_notification 
  ON public.notification_read_status(user_id, notification_id);

-- 3. Enable RLS
ALTER TABLE public.notification_read_status ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can see their own read status
DROP POLICY IF EXISTS "Users can view their own read status" ON public.notification_read_status;
CREATE POLICY "Users can view their own read status"
  ON public.notification_read_status FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own read status
DROP POLICY IF EXISTS "Users can insert their own read status" ON public.notification_read_status;
CREATE POLICY "Users can insert their own read status"
  ON public.notification_read_status FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own read status (for "mark as unread" if ever needed)
DROP POLICY IF EXISTS "Users can delete their own read status" ON public.notification_read_status;
CREATE POLICY "Users can delete their own read status"
  ON public.notification_read_status FOR DELETE
  USING (user_id = auth.uid());

-- 5. Add comment
COMMENT ON TABLE public.notification_read_status IS 'Tracks per-user read status for broadcast notifications (where notifications.user_id IS NULL)';
