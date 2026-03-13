-- ============================================================================
-- PARTICIPANTS LIVE PROGRESS - Reset-safe baseline placement
-- ============================================================================
-- Replays the original 20241211 live-progress schema after the corrected
-- participant/domain baseline. This migration must be idempotent because some
-- environments already received the original 20241211 version.

CREATE TABLE IF NOT EXISTS public.participant_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  score INTEGER DEFAULT 0,
  max_score INTEGER,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent_seconds INTEGER DEFAULT 0,
  current_level INTEGER,
  current_checkpoint VARCHAR(100),
  game_data JSONB DEFAULT '{}',
  achievements_unlocked UUID[] DEFAULT ARRAY[]::UUID[],
  achievement_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_score CHECK (score >= 0),
  CONSTRAINT valid_time_spent CHECK (time_spent_seconds >= 0),
  UNIQUE (participant_id, game_id)
);

CREATE TABLE IF NOT EXISTS public.participant_achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  game_progress_id UUID REFERENCES public.participant_game_progress(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  achievement_name VARCHAR(255) NOT NULL,
  achievement_points INTEGER DEFAULT 0,
  rarity VARCHAR(20),
  unlock_context JSONB DEFAULT '{}',
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (participant_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.session_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  total_participants INTEGER DEFAULT 0,
  active_participants INTEGER DEFAULT 0,
  games_started INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  total_achievements_unlocked INTEGER DEFAULT 0,
  unique_achievements_unlocked INTEGER DEFAULT 0,
  total_time_played_seconds INTEGER DEFAULT 0,
  average_time_per_participant_seconds INTEGER DEFAULT 0,
  top_scorers JSONB DEFAULT '[]',
  most_achievements JSONB DEFAULT '[]',
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_participant_game_progress_session ON public.participant_game_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_participant_game_progress_participant ON public.participant_game_progress(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_game_progress_game ON public.participant_game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_participant_game_progress_status ON public.participant_game_progress(status);
CREATE INDEX IF NOT EXISTS idx_participant_game_progress_tenant ON public.participant_game_progress(tenant_id);

CREATE INDEX IF NOT EXISTS idx_participant_achievement_unlocks_session ON public.participant_achievement_unlocks(session_id);
CREATE INDEX IF NOT EXISTS idx_participant_achievement_unlocks_participant ON public.participant_achievement_unlocks(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_achievement_unlocks_achievement ON public.participant_achievement_unlocks(achievement_id);
CREATE INDEX IF NOT EXISTS idx_participant_achievement_unlocks_tenant ON public.participant_achievement_unlocks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_session_statistics_session ON public.session_statistics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_statistics_tenant ON public.session_statistics(tenant_id);

ALTER TABLE public.participant_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_statistics ENABLE ROW LEVEL SECURITY;

DO LANGUAGE plpgsql $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_game_progress' AND policyname = 'hosts_can_read_session_progress'
  ) THEN
    CREATE POLICY hosts_can_read_session_progress
    ON public.participant_game_progress FOR SELECT
    USING (
      session_id IN (
        SELECT id FROM public.participant_sessions WHERE host_user_id = auth.uid()
      )
      OR public.is_system_admin()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_game_progress' AND policyname = 'system_can_manage_game_progress'
  ) THEN
    CREATE POLICY system_can_manage_game_progress
    ON public.participant_game_progress FOR ALL
    USING (public.is_system_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_achievement_unlocks' AND policyname = 'hosts_can_read_session_unlocks'
  ) THEN
    CREATE POLICY hosts_can_read_session_unlocks
    ON public.participant_achievement_unlocks FOR SELECT
    USING (
      session_id IN (
        SELECT id FROM public.participant_sessions WHERE host_user_id = auth.uid()
      )
      OR public.is_system_admin()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participant_achievement_unlocks' AND policyname = 'system_can_insert_unlocks'
  ) THEN
    CREATE POLICY system_can_insert_unlocks
    ON public.participant_achievement_unlocks FOR INSERT
    WITH CHECK (public.is_system_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_statistics' AND policyname = 'hosts_can_read_session_stats'
  ) THEN
    CREATE POLICY hosts_can_read_session_stats
    ON public.session_statistics FOR SELECT
    USING (
      session_id IN (
        SELECT id FROM public.participant_sessions WHERE host_user_id = auth.uid()
      )
      OR public.is_system_admin()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_statistics' AND policyname = 'system_can_manage_stats'
  ) THEN
    CREATE POLICY system_can_manage_stats
    ON public.session_statistics FOR ALL
    USING (public.is_system_admin());
  END IF;
END $$;

COMMENT ON TABLE public.participant_game_progress IS 'Tracks real-time game progress for participants in sessions';
COMMENT ON TABLE public.participant_achievement_unlocks IS 'Records achievement unlocks during participant sessions';
COMMENT ON TABLE public.session_statistics IS 'Aggregated statistics for entire session, visible to host';

COMMENT ON COLUMN public.participant_game_progress.game_data IS 'Flexible JSONB for game-specific state (e.g., inventory, custom metrics)';
COMMENT ON COLUMN public.participant_game_progress.achievements_unlocked IS 'Array of achievement IDs unlocked during this game session';
COMMENT ON COLUMN public.participant_achievement_unlocks.unlock_context IS 'JSONB metadata about how the achievement was unlocked';
COMMENT ON COLUMN public.session_statistics.top_scorers IS 'JSONB array of top scoring participants';
COMMENT ON COLUMN public.session_statistics.most_achievements IS 'JSONB array of participants with most achievements';