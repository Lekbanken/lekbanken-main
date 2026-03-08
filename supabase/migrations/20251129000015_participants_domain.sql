-- ============================================================================
-- PARTICIPANTS DOMAIN - Reset-safe baseline placement
-- ============================================================================
-- Replays the original participant domain after the current baseline schema,
-- so fresh `supabase db reset` runs have tenants/games/plans available.
-- This migration is intentionally idempotent because older remote databases
-- may already have received the original 20241210 migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'participant_session_status'
  ) THEN
    CREATE TYPE public.participant_session_status AS ENUM (
      'active',
      'paused',
      'locked',
      'ended',
      'archived',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'participant_role'
  ) THEN
    CREATE TYPE public.participant_role AS ENUM (
      'observer',
      'player',
      'team_lead',
      'facilitator'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'participant_status'
  ) THEN
    CREATE TYPE public.participant_status AS ENUM (
      'active',
      'idle',
      'disconnected',
      'kicked',
      'blocked'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.participant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  status public.participant_session_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{
    "allow_rejoin": true,
    "max_participants": 100,
    "require_approval": false,
    "allow_anonymous": true,
    "token_expiry_hours": 24,
    "enable_chat": false,
    "enable_progress_tracking": true
  }'::jsonb,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  participant_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_participant_count CHECK (participant_count >= 0),
  CONSTRAINT valid_participant_session_dates CHECK (
    (ended_at IS NULL OR ended_at >= started_at) AND
    (paused_at IS NULL OR paused_at >= started_at) AND
    (archived_at IS NULL OR archived_at >= started_at)
  )
);

CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  participant_token TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role public.participant_role NOT NULL DEFAULT 'player',
  status public.participant_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  progress JSONB NOT NULL DEFAULT '{
    "games_completed": 0,
    "achievements_unlocked": [],
    "score": 0,
    "time_active_seconds": 0
  }'::jsonb,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_participant_display_name CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 50),
  CONSTRAINT valid_participant_token_expiry CHECK (token_expires_at IS NULL OR token_expires_at > joined_at)
);

CREATE TABLE IF NOT EXISTS public.participant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_participant_event_type CHECK (LENGTH(event_type) > 0)
);

CREATE TABLE IF NOT EXISTS public.participant_token_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  no_expiry_tokens_used INT NOT NULL DEFAULT 0,
  no_expiry_tokens_limit INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_participant_quota CHECK (no_expiry_tokens_used >= 0 AND no_expiry_tokens_limit >= 0),
  CONSTRAINT unique_tenant_quota UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_tenant ON public.participant_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_host ON public.participant_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_code ON public.participant_sessions(session_code) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_participant_sessions_status ON public.participant_sessions(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_expires ON public.participant_sessions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_token ON public.participants(participant_token) WHERE status NOT IN ('kicked', 'blocked');
CREATE INDEX IF NOT EXISTS idx_participants_last_seen ON public.participants(last_seen_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_participants_token_expiry ON public.participants(token_expires_at) WHERE token_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_session ON public.participant_activity_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_participant ON public.participant_activity_log(participant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON public.participant_activity_log(event_type, session_id);

ALTER TABLE public.participant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_token_quotas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'Hosts can create sessions'
  ) THEN
    CREATE POLICY "Hosts can create sessions"
      ON public.participant_sessions FOR INSERT
      WITH CHECK (auth.uid() = host_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'Hosts can view their own sessions'
  ) THEN
    CREATE POLICY "Hosts can view their own sessions"
      ON public.participant_sessions FOR SELECT
      USING (auth.uid() = host_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'Hosts can update their own sessions'
  ) THEN
    CREATE POLICY "Hosts can update their own sessions"
      ON public.participant_sessions FOR UPDATE
      USING (auth.uid() = host_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'Hosts can delete their own sessions'
  ) THEN
    CREATE POLICY "Hosts can delete their own sessions"
      ON public.participant_sessions FOR DELETE
      USING (auth.uid() = host_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'System admins can view all sessions'
  ) THEN
    CREATE POLICY "System admins can view all sessions"
      ON public.participant_sessions FOR SELECT
      USING (public.is_system_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_sessions' AND policyname = 'Public can view active sessions by code'
  ) THEN
    CREATE POLICY "Public can view active sessions by code"
      ON public.participant_sessions FOR SELECT
      USING (status = 'active');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'Hosts can view participants in their sessions'
  ) THEN
    CREATE POLICY "Hosts can view participants in their sessions"
      ON public.participants FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.participant_sessions
          WHERE participant_sessions.id = participants.session_id
            AND participant_sessions.host_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'Hosts can update participants in their sessions'
  ) THEN
    CREATE POLICY "Hosts can update participants in their sessions"
      ON public.participants FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.participant_sessions
          WHERE participant_sessions.id = participants.session_id
            AND participant_sessions.host_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'Service role can create participants'
  ) THEN
    CREATE POLICY "Service role can create participants"
      ON public.participants FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'Participants can view themselves'
  ) THEN
    CREATE POLICY "Participants can view themselves"
      ON public.participants FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_activity_log' AND policyname = 'Hosts can view activity for their sessions'
  ) THEN
    CREATE POLICY "Hosts can view activity for their sessions"
      ON public.participant_activity_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.participant_sessions
          WHERE participant_sessions.id = participant_activity_log.session_id
            AND participant_sessions.host_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_activity_log' AND policyname = 'Service role can insert activity logs'
  ) THEN
    CREATE POLICY "Service role can insert activity logs"
      ON public.participant_activity_log FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_token_quotas' AND policyname = 'Tenants can view their own quota'
  ) THEN
    CREATE POLICY "Tenants can view their own quota"
      ON public.participant_token_quotas FOR SELECT
      USING (tenant_id = ANY(public.get_user_tenant_ids()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_token_quotas' AND policyname = 'System admins can view all quotas'
  ) THEN
    CREATE POLICY "System admins can view all quotas"
      ON public.participant_token_quotas FOR SELECT
      USING (public.is_system_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.participant_sessions
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.participant_sessions
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_participant_count ON public.participants;
CREATE TRIGGER trigger_update_participant_count
AFTER INSERT OR DELETE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.update_participant_count();

DROP TRIGGER IF EXISTS trigger_participant_sessions_updated_at ON public.participant_sessions;
CREATE TRIGGER trigger_participant_sessions_updated_at
BEFORE UPDATE ON public.participant_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_participants_updated_at ON public.participants;
CREATE TRIGGER trigger_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_token_quotas_updated_at ON public.participant_token_quotas;
CREATE TRIGGER trigger_token_quotas_updated_at
BEFORE UPDATE ON public.participant_token_quotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.participant_token_quotas (tenant_id, no_expiry_tokens_limit)
SELECT id, 2
FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE public.participant_sessions IS 'Sessions that participants can join via codes';
COMMENT ON TABLE public.participants IS 'Anonymous participants in sessions';
COMMENT ON TABLE public.participant_activity_log IS 'Audit log of participant actions';
COMMENT ON TABLE public.participant_token_quotas IS 'Quota tracking for no-expiry tokens per tenant';

COMMENT ON COLUMN public.participant_sessions.session_code IS '6-character unique code (e.g., H3K9QF)';
COMMENT ON COLUMN public.participant_sessions.settings IS 'JSONB settings: allow_rejoin, max_participants, require_approval, token_expiry_hours, etc.';
COMMENT ON COLUMN public.participants.participant_token IS 'JWT token for re-authentication (rejoin flow)';
COMMENT ON COLUMN public.participants.token_expires_at IS 'NULL = no expiry (limited quota), or timestamp for 24h default';
COMMENT ON COLUMN public.participants.progress IS 'JSONB tracking: games_completed, achievements_unlocked, score, time_active_seconds';