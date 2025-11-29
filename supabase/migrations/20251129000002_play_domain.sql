-- =========================================
-- PLAY DOMAIN SCHEMA
-- Version 1.0
-- Date: 2025-11-29
-- =========================================
-- This migration adds game sessions, scores, and leaderboards for the Play Domain

-- =========================================
-- 1. ENUM TYPES
-- =========================================

CREATE TYPE session_status_enum AS ENUM (
  'active',
  'paused',
  'completed',
  'abandoned'
);

-- =========================================
-- 2. GAME SESSIONS TABLE
-- =========================================

CREATE TABLE game_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key         text UNIQUE,
  game_id             uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  status              session_status_enum NOT NULL DEFAULT 'active',
  score               integer DEFAULT 0,
  duration_seconds    integer DEFAULT 0,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_sessions_session_key_idx ON game_sessions (session_key);
CREATE INDEX game_sessions_game_idx ON game_sessions (game_id);
CREATE INDEX game_sessions_user_idx ON game_sessions (user_id);
CREATE INDEX game_sessions_tenant_idx ON game_sessions (tenant_id);
CREATE INDEX game_sessions_status_idx ON game_sessions (status);
CREATE INDEX game_sessions_created_at_idx ON game_sessions (created_at);

-- =========================================
-- 3. GAME SCORES TABLE
-- =========================================

CREATE TABLE game_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_key           text UNIQUE,
  session_id          uuid NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  game_id             uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  score               integer NOT NULL DEFAULT 0,
  score_type          text DEFAULT 'points',
  metadata            jsonb,
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_scores_score_key_idx ON game_scores (score_key);
CREATE INDEX game_scores_session_idx ON game_scores (session_id);
CREATE INDEX game_scores_game_idx ON game_scores (game_id);
CREATE INDEX game_scores_user_idx ON game_scores (user_id);
CREATE INDEX game_scores_tenant_idx ON game_scores (tenant_id);
CREATE INDEX game_scores_created_at_idx ON game_scores (created_at);

-- =========================================
-- 4. LEADERBOARDS TABLE (Aggregated scores)
-- =========================================

CREATE TABLE leaderboards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_key     text UNIQUE,
  game_id             uuid REFERENCES games (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  leaderboard_type    text NOT NULL DEFAULT 'global', -- global, tenant, personal
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  total_score         integer NOT NULL DEFAULT 0,
  total_sessions      integer NOT NULL DEFAULT 0,
  avg_score           numeric(10,2),
  best_score          integer,
  worst_score         integer,
  last_played_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leaderboards_leaderboard_key_idx ON leaderboards (leaderboard_key);
CREATE INDEX leaderboards_game_idx ON leaderboards (game_id);
CREATE INDEX leaderboards_tenant_idx ON leaderboards (tenant_id);
CREATE INDEX leaderboards_user_idx ON leaderboards (user_id);
CREATE INDEX leaderboards_leaderboard_type_idx ON leaderboards (leaderboard_type);
CREATE INDEX leaderboards_total_score_idx ON leaderboards (total_score DESC);
CREATE INDEX leaderboards_updated_at_idx ON leaderboards (updated_at);

-- =========================================
-- 5. ACHIEVEMENTS TABLE
-- =========================================

CREATE TABLE achievements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key     text UNIQUE,
  name                text NOT NULL,
  description         text,
  icon_url            text,
  badge_color         text,
  condition_type      text NOT NULL, -- score_milestone, session_count, streak, etc.
  condition_value     integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX achievements_achievement_key_idx ON achievements (achievement_key);
CREATE INDEX achievements_condition_type_idx ON achievements (condition_type);

-- =========================================
-- 6. USER ACHIEVEMENTS TABLE
-- =========================================

CREATE TABLE user_achievements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id      uuid NOT NULL REFERENCES achievements (id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  unlocked_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_achievements_achievement_idx ON user_achievements (achievement_id);
CREATE INDEX user_achievements_user_idx ON user_achievements (user_id);
CREATE INDEX user_achievements_tenant_idx ON user_achievements (tenant_id);
CREATE INDEX user_achievements_unlocked_at_idx ON user_achievements (unlocked_at);

-- =========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 8. RLS POLICIES
-- =========================================

-- GAME_SESSIONS: Users can select their own sessions and tenant members can see tenant sessions
CREATE POLICY "users_can_select_own_game_sessions"
ON game_sessions FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- GAME_SESSIONS: Users can insert their own sessions
CREATE POLICY "users_can_insert_own_game_sessions"
ON game_sessions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- GAME_SESSIONS: Users can update their own sessions
CREATE POLICY "users_can_update_own_game_sessions"
ON game_sessions FOR UPDATE
USING (user_id = auth.uid());

-- GAME_SCORES: Users can select their own scores and tenant scores
CREATE POLICY "users_can_select_own_game_scores"
ON game_scores FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- GAME_SCORES: Users can insert scores for their own sessions
CREATE POLICY "users_can_insert_game_scores"
ON game_scores FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- LEADERBOARDS: Users can select leaderboards
CREATE POLICY "users_can_select_leaderboards"
ON leaderboards FOR SELECT
USING (
  leaderboard_type = 'global'
  OR (leaderboard_type = 'tenant' AND tenant_id IN (SELECT get_user_tenant_ids()))
  OR (leaderboard_type = 'personal' AND user_id = auth.uid())
);

-- ACHIEVEMENTS: All authenticated users can select
CREATE POLICY "authenticated_can_select_achievements"
ON achievements FOR SELECT
USING (auth.role() = 'authenticated');

-- USER_ACHIEVEMENTS: Users can select their own
CREATE POLICY "users_can_select_own_achievements"
ON user_achievements FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- USER_ACHIEVEMENTS: System can insert (via triggers)
CREATE POLICY "system_can_insert_user_achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- =========================================
-- 9. SEED DATA
-- =========================================

-- Insert default achievements
INSERT INTO achievements (achievement_key, name, description, condition_type, condition_value) VALUES
  ('first-game', 'First Step', 'Play your first game', 'session_count', 1),
  ('ten-games', 'Game Master', 'Play 10 games', 'session_count', 10),
  ('fifty-games', 'Dedicated', 'Play 50 games', 'session_count', 50),
  ('hundred-points', 'Century', 'Score 100+ points in one game', 'score_milestone', 100),
  ('thousand-points', 'Legend', 'Earn 1000+ total points', 'score_milestone', 1000)
ON CONFLICT (achievement_key) DO NOTHING;

-- =========================================
-- 10. COMMENTS
-- =========================================

COMMENT ON TABLE game_sessions IS 'Active and completed game play sessions';
COMMENT ON TABLE game_scores IS 'Score events during game sessions';
COMMENT ON TABLE leaderboards IS 'Aggregated leaderboard data for rankings';
COMMENT ON TABLE achievements IS 'Badge definitions for users';
COMMENT ON TABLE user_achievements IS 'User unlocked achievements';
