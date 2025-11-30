-- Notifications Domain Schema
-- User alerts, system notifications, and notification preferences

-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, success, warning, error, achievement, system
  category VARCHAR(50), -- billing, gameplay, support, achievement, system
  related_entity_id UUID,
  related_entity_type VARCHAR(50), -- game, subscription, achievement, ticket
  action_url VARCHAR(512),
  action_label VARCHAR(100),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT notification_belongs_to_user_or_tenant CHECK (
    (user_id IS NOT NULL AND tenant_id IS NOT NULL) OR
    (user_id IS NULL AND tenant_id IS NOT NULL)
  )
);

-- Notification Preferences Table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  
  -- Category preferences
  billing_notifications BOOLEAN DEFAULT true,
  gameplay_notifications BOOLEAN DEFAULT true,
  achievement_notifications BOOLEAN DEFAULT true,
  support_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  
  -- Frequency preferences
  digest_frequency VARCHAR(50) DEFAULT 'realtime', -- realtime, daily, weekly, never
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Notification Log Table (for analytics)
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_method VARCHAR(50), -- email, push, sms, in_app
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Indexes for Performance
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_expires_at ON public.notifications(expires_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_tenant_id ON public.notification_preferences(tenant_id);
CREATE INDEX idx_notification_log_notification_id ON public.notification_log(notification_id);
CREATE INDEX idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX idx_notification_log_status ON public.notification_log(status);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for Notification Preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Notification Log
CREATE POLICY "Service can insert notification logs"
  ON public.notification_log FOR INSERT
  WITH CHECK (true);

