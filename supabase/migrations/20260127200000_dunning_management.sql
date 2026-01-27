-- Dunning Management Tables
-- Created: 2026-01-27
-- Purpose: Track failed payments, retry attempts, and grace periods

-- ============================================
-- Payment Failure Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id TEXT, -- Stripe subscription ID
  invoice_id TEXT, -- Stripe invoice ID
  stripe_customer_id TEXT,
  
  -- Failure details
  failure_code TEXT, -- Stripe error code
  failure_message TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'sek',
  
  -- Retry tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, retrying, recovered, failed, canceled
  resolved_at TIMESTAMPTZ,
  resolution_method TEXT, -- 'auto_retry', 'manual_payment', 'card_update', 'canceled'
  
  -- Notifications
  notification_sent_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  
  -- Grace period
  grace_period_ends_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_failures_tenant ON payment_failures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_status ON payment_failures(status);
CREATE INDEX IF NOT EXISTS idx_payment_failures_next_retry ON payment_failures(next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_payment_failures_grace_period ON payment_failures(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- ============================================
-- Dunning Actions Log
-- ============================================
CREATE TABLE IF NOT EXISTS dunning_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_failure_id UUID NOT NULL REFERENCES payment_failures(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- 'retry_scheduled', 'retry_attempted', 'email_sent', 'subscription_paused', 'subscription_canceled', 'recovered'
  action_result TEXT, -- 'success', 'failed'
  action_details JSONB DEFAULT '{}',
  
  performed_by TEXT, -- 'system', 'admin', user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_actions_failure ON dunning_actions(payment_failure_id);
CREATE INDEX IF NOT EXISTS idx_dunning_actions_type ON dunning_actions(action_type);

-- ============================================
-- Dunning Configuration (per-tenant or global)
-- ============================================
CREATE TABLE IF NOT EXISTS dunning_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global config
  
  -- Retry settings
  max_retry_attempts INTEGER NOT NULL DEFAULT 3,
  retry_interval_hours INTEGER NOT NULL DEFAULT 24, -- Hours between retries
  
  -- Grace period
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  
  -- Actions
  pause_after_failure BOOLEAN NOT NULL DEFAULT true,
  cancel_after_grace_period BOOLEAN NOT NULL DEFAULT false,
  
  -- Notifications
  send_failure_email BOOLEAN NOT NULL DEFAULT true,
  send_reminder_email BOOLEAN NOT NULL DEFAULT true,
  reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 3, 7], -- Days before grace period ends
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT dunning_config_unique_tenant UNIQUE (tenant_id)
);

-- Insert global default config
INSERT INTO dunning_config (tenant_id) 
VALUES (NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_config ENABLE ROW LEVEL SECURITY;

-- Payment failures: tenant owners/admins can view their own
CREATE POLICY payment_failures_select_own ON payment_failures
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Payment failures: system/admin can do everything
CREATE POLICY payment_failures_admin_all ON payment_failures
  FOR ALL
  USING (public.is_system_admin());

-- Dunning actions: read-only for tenant members
CREATE POLICY dunning_actions_select_own ON dunning_actions
  FOR SELECT
  USING (
    payment_failure_id IN (
      SELECT id FROM payment_failures
      WHERE tenant_id IN (
        SELECT tenant_id FROM user_tenant_memberships
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
      )
    )
  );

-- Dunning actions: system/admin can do everything
CREATE POLICY dunning_actions_admin_all ON dunning_actions
  FOR ALL
  USING (public.is_system_admin());

-- Dunning config: only system admins
CREATE POLICY dunning_config_admin_all ON dunning_config
  FOR ALL
  USING (public.is_system_admin());

-- ============================================
-- Helper Functions
-- ============================================

-- Function to calculate next retry timestamp
CREATE OR REPLACE FUNCTION calculate_next_retry(
  p_retry_count INTEGER,
  p_retry_interval_hours INTEGER DEFAULT 24
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  -- Exponential backoff: interval * 2^retry_count
  RETURN now() + (p_retry_interval_hours * power(2, p_retry_count) || ' hours')::INTERVAL;
END;
$$;

-- Function to record dunning action
CREATE OR REPLACE FUNCTION log_dunning_action(
  p_payment_failure_id UUID,
  p_action_type TEXT,
  p_action_result TEXT DEFAULT NULL,
  p_action_details JSONB DEFAULT '{}',
  p_performed_by TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO dunning_actions (payment_failure_id, action_type, action_result, action_details, performed_by)
  VALUES (p_payment_failure_id, p_action_type, p_action_result, p_action_details, p_performed_by)
  RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_dunning_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_failures_updated
  BEFORE UPDATE ON payment_failures
  FOR EACH ROW
  EXECUTE FUNCTION update_dunning_timestamps();

CREATE TRIGGER dunning_config_updated
  BEFORE UPDATE ON dunning_config
  FOR EACH ROW
  EXECUTE FUNCTION update_dunning_timestamps();
