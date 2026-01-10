-- Achievement Awards v1: Manual awarding with audit trail
-- Purpose: Create tables for tracking manual achievement awards with message and audit
-- Date: 2026-01-10

BEGIN;

--------------------------------------------------------------------------------
-- 1) ACHIEVEMENT_AWARDS TABLE (Event Header)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievement_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for idempotency (per tenant context)
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_awards_idempotency
  ON public.achievement_awards(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), idempotency_key);

-- Index for querying by achievement
CREATE INDEX IF NOT EXISTS idx_achievement_awards_achievement_id
  ON public.achievement_awards(achievement_id);

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_achievement_awards_awarded_by
  ON public.achievement_awards(awarded_by);

-- Index for querying by tenant
CREATE INDEX IF NOT EXISTS idx_achievement_awards_tenant_id
  ON public.achievement_awards(tenant_id);

-- Index for recent awards
CREATE INDEX IF NOT EXISTS idx_achievement_awards_created_at
  ON public.achievement_awards(created_at DESC);

--------------------------------------------------------------------------------
-- 2) ACHIEVEMENT_AWARD_RECIPIENTS TABLE (Per-User Records)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievement_award_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES public.achievement_awards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_achievement_id UUID REFERENCES public.user_achievements(id) ON DELETE SET NULL,
  was_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one user per award event
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_award_recipients_unique
  ON public.achievement_award_recipients(award_id, user_id);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_achievement_award_recipients_user_id
  ON public.achievement_award_recipients(user_id);

-- Index for querying by award
CREATE INDEX IF NOT EXISTS idx_achievement_award_recipients_award_id
  ON public.achievement_award_recipients(award_id);

--------------------------------------------------------------------------------
-- 3) RLS POLICIES
--------------------------------------------------------------------------------

ALTER TABLE public.achievement_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_award_recipients ENABLE ROW LEVEL SECURITY;

-- achievement_awards: system_admin can do everything
DROP POLICY IF EXISTS achievement_awards_system_admin ON public.achievement_awards;
CREATE POLICY achievement_awards_system_admin
  ON public.achievement_awards
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- achievement_awards: service_role can do everything (for RPC)
DROP POLICY IF EXISTS achievement_awards_service_role ON public.achievement_awards;
CREATE POLICY achievement_awards_service_role
  ON public.achievement_awards
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- achievement_awards: tenant admins can view their tenant's awards
DROP POLICY IF EXISTS achievement_awards_tenant_admin_select ON public.achievement_awards;
CREATE POLICY achievement_awards_tenant_admin_select
  ON public.achievement_awards
  FOR SELECT
  USING (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- achievement_award_recipients: same policies
DROP POLICY IF EXISTS achievement_award_recipients_system_admin ON public.achievement_award_recipients;
CREATE POLICY achievement_award_recipients_system_admin
  ON public.achievement_award_recipients
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS achievement_award_recipients_service_role ON public.achievement_award_recipients;
CREATE POLICY achievement_award_recipients_service_role
  ON public.achievement_award_recipients
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Recipients: tenant admins can view recipients for their tenant's awards
DROP POLICY IF EXISTS achievement_award_recipients_tenant_admin_select ON public.achievement_award_recipients;
CREATE POLICY achievement_award_recipients_tenant_admin_select
  ON public.achievement_award_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.achievement_awards aa
      WHERE aa.id = achievement_award_recipients.award_id
        AND aa.tenant_id IS NOT NULL
        AND public.has_tenant_role(aa.tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
    )
  );

--------------------------------------------------------------------------------
-- 4) COMMENTS
--------------------------------------------------------------------------------

COMMENT ON TABLE public.achievement_awards IS 'Audit log for manual achievement awards. Each row represents a batch award event.';
COMMENT ON COLUMN public.achievement_awards.message IS 'Optional message displayed to recipients when awarded';
COMMENT ON COLUMN public.achievement_awards.recipient_count IS 'Number of users targeted in this award event';
COMMENT ON COLUMN public.achievement_awards.idempotency_key IS 'Client-provided key to prevent duplicate award events';

COMMENT ON TABLE public.achievement_award_recipients IS 'Per-user records for each award event. Links to user_achievements.';
COMMENT ON COLUMN public.achievement_award_recipients.was_duplicate IS 'True if user already had this achievement (skipped)';
COMMENT ON COLUMN public.achievement_award_recipients.user_achievement_id IS 'Reference to the created user_achievements row (null if duplicate)';

COMMIT;
