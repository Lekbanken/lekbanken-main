-- Task 9: Live Progress Tracking
-- Enables real-time sync of game progress, achievements, and statistics for participants

-- Participant Game Progress Table
-- Tracks individual participant progress in games during sessions
CREATE TABLE IF NOT EXISTS public.participant_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  
  -- Progress tracking
  status VARCHAR(20) NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed, failed
  score INTEGER DEFAULT 0,
  max_score INTEGER,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 100.00
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Game state
  current_level INTEGER,
  current_checkpoint VARCHAR(100),
  game_data JSONB DEFAULT '{}', -- Flexible game-specific data
  
  -- Achievements unlocked during this session
  achievements_unlocked UUID[] DEFAULT ARRAY[]::UUID[],
  achievement_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_score CHECK (score >= 0),
  CONSTRAINT valid_time_spent CHECK (time_spent_seconds >= 0),
  UNIQUE (participant_id, game_id) -- One progress record per participant per game
);

-- Participant Achievement Unlocks Table
-- Tracks achievements unlocked by participants during sessions
CREATE TABLE IF NOT EXISTS public.participant_achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  game_progress_id UUID REFERENCES public.participant_game_progress(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- Achievement data
  achievement_name VARCHAR(255) NOT NULL,
  achievement_points INTEGER DEFAULT 0,
  rarity VARCHAR(20), -- common, uncommon, rare, epic, legendary
  
  -- Context
  unlock_context JSONB DEFAULT '{}', -- e.g., { "trigger": "score_milestone", "value": 1000 }
  
  -- Timestamps
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  UNIQUE (participant_id, achievement_id) -- Prevent duplicate unlocks
);

-- Session Statistics Table
-- Aggregated statistics for entire session (visible to host)
CREATE TABLE IF NOT EXISTS public.session_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  
  -- Participant stats
  total_participants INTEGER DEFAULT 0,
  active_participants INTEGER DEFAULT 0,
  
  -- Game stats
  games_started INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  
  -- Achievement stats
  total_achievements_unlocked INTEGER DEFAULT 0,
  unique_achievements_unlocked INTEGER DEFAULT 0,
  
  -- Time stats
  total_time_played_seconds INTEGER DEFAULT 0,
  average_time_per_participant_seconds INTEGER DEFAULT 0,
  
  -- Top performers (JSONB array of participant summaries)
  top_scorers JSONB DEFAULT '[]', -- [{ participant_id, display_name, score }, ...]
  most_achievements JSONB DEFAULT '[]',
  
  -- Last calculation
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- One stats record per session
  UNIQUE (session_id)
);

-- Indexes for performance
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

-- RLS Policies
ALTER TABLE public.participant_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_statistics ENABLE ROW LEVEL SECURITY;

-- participant_game_progress: Hosts can read all progress in their sessions
CREATE POLICY "hosts_can_read_session_progress"
ON public.participant_game_progress FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.participant_sessions 
    WHERE host_user_id = auth.uid()
  )
  OR is_system_admin()
);

-- participant_game_progress: System can insert/update
CREATE POLICY "system_can_manage_game_progress"
ON public.participant_game_progress FOR ALL
USING (is_system_admin());

-- participant_achievement_unlocks: Hosts can read all unlocks in their sessions
CREATE POLICY "hosts_can_read_session_unlocks"
ON public.participant_achievement_unlocks FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.participant_sessions 
    WHERE host_user_id = auth.uid()
  )
  OR is_system_admin()
);

-- participant_achievement_unlocks: System can insert
CREATE POLICY "system_can_insert_unlocks"
ON public.participant_achievement_unlocks FOR INSERT
WITH CHECK (is_system_admin());

-- session_statistics: Hosts can read their session stats
CREATE POLICY "hosts_can_read_session_stats"
ON public.session_statistics FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.participant_sessions 
    WHERE host_user_id = auth.uid()
  )
  OR is_system_admin()
);

-- session_statistics: System can manage stats
CREATE POLICY "system_can_manage_stats"
ON public.session_statistics FOR ALL
USING (is_system_admin());

-- Comments
COMMENT ON TABLE public.participant_game_progress IS 'Tracks real-time game progress for participants in sessions';
COMMENT ON TABLE public.participant_achievement_unlocks IS 'Records achievement unlocks during participant sessions';
COMMENT ON TABLE public.session_statistics IS 'Aggregated statistics for entire session, visible to host';

COMMENT ON COLUMN public.participant_game_progress.game_data IS 'Flexible JSONB for game-specific state (e.g., inventory, custom metrics)';
COMMENT ON COLUMN public.participant_game_progress.achievements_unlocked IS 'Array of achievement IDs unlocked during this game session';
COMMENT ON COLUMN public.participant_achievement_unlocks.unlock_context IS 'JSONB metadata about how the achievement was unlocked';
COMMENT ON COLUMN public.session_statistics.top_scorers IS 'JSONB array of top scoring participants';
COMMENT ON COLUMN public.session_statistics.most_achievements IS 'JSONB array of participants with most achievements';
