-- ============================================================================
-- PARTICIPANTS DOMAIN - Database Schema
-- ============================================================================
-- Created: 2024-12-10
-- Purpose: Enable anonymous participants to join sessions via codes
-- Features: Session codes, participant tokens, role assignment, progress tracking
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Session status enum
CREATE TYPE participant_session_status AS ENUM (
  'active',      -- Session is running, accepting joins
  'paused',      -- Session paused by host, no new activity
  'locked',      -- No new joins allowed
  'ended',       -- Session completed normally
  'archived',    -- Soft-deleted (>30 days old)
  'cancelled'    -- Ended prematurely
);

-- Participant role enum
CREATE TYPE participant_role AS ENUM (
  'observer',    -- Can watch but not participate
  'player',      -- Active participant
  'team_lead',   -- Can coordinate team activities
  'facilitator'  -- Can assist host (teacher aide)
);

-- Participant status enum
CREATE TYPE participant_status AS ENUM (
  'active',      -- Currently connected
  'idle',        -- Connected but inactive
  'disconnected',-- Temporarily disconnected
  'kicked',      -- Removed by host
  'blocked'      -- Permanently banned from session
);

-- ============================================================================
-- PARTICIPANT_SESSIONS TABLE
-- ============================================================================

CREATE TABLE participant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session identity
  session_code TEXT NOT NULL UNIQUE, -- 6-char code (e.g., H3K9QF)
  display_name TEXT NOT NULL,        -- Human-readable name (e.g., "Matte 4A - Multiplikation")
  description TEXT,
  
  -- Status & lifecycle
  status participant_session_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,            -- When session auto-closes (NULL = never)
  archived_at TIMESTAMPTZ,           -- When soft-deleted
  
  -- Settings (JSONB for flexibility)
  settings JSONB NOT NULL DEFAULT '{
    "allow_rejoin": true,
    "max_participants": 100,
    "require_approval": false,
    "allow_anonymous": true,
    "token_expiry_hours": 24,
    "enable_chat": false,
    "enable_progress_tracking": true
  }'::jsonb,
  
  -- Linked resources (optional)
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  
  -- Metadata
  participant_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_participant_count CHECK (participant_count >= 0),
  CONSTRAINT valid_dates CHECK (
    (ended_at IS NULL OR ended_at >= started_at) AND
    (paused_at IS NULL OR paused_at >= started_at) AND
    (archived_at IS NULL OR archived_at >= started_at)
  )
);

-- Indexes for performance
CREATE INDEX idx_participant_sessions_tenant ON participant_sessions(tenant_id);
CREATE INDEX idx_participant_sessions_host ON participant_sessions(host_user_id);
CREATE INDEX idx_participant_sessions_code ON participant_sessions(session_code) WHERE status = 'active';
CREATE INDEX idx_participant_sessions_status ON participant_sessions(status, tenant_id);
CREATE INDEX idx_participant_sessions_expires ON participant_sessions(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session linkage
  session_id UUID NOT NULL REFERENCES participant_sessions(id) ON DELETE CASCADE,
  
  -- Identity
  display_name TEXT NOT NULL,             -- Name shown to others (e.g., "Anna")
  participant_token TEXT NOT NULL UNIQUE, -- JWT for re-authentication
  avatar_url TEXT,                        -- Optional avatar
  
  -- Role & permissions
  role participant_role NOT NULL DEFAULT 'player',
  status participant_status NOT NULL DEFAULT 'active',
  
  -- Activity tracking
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  
  -- Token expiry
  token_expires_at TIMESTAMPTZ,          -- NULL = no expiry (for system admins)
  
  -- Progress tracking (JSONB for flexibility)
  progress JSONB NOT NULL DEFAULT '{
    "games_completed": 0,
    "achievements_unlocked": [],
    "score": 0,
    "time_active_seconds": 0
  }'::jsonb,
  
  -- Metadata
  user_agent TEXT,                       -- Browser info for debugging
  ip_address INET,                       -- For security/moderation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_display_name CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 50),
  CONSTRAINT valid_token_expiry CHECK (token_expires_at IS NULL OR token_expires_at > joined_at)
);

-- Indexes for performance
CREATE INDEX idx_participants_session ON participants(session_id, status);
CREATE INDEX idx_participants_token ON participants(participant_token) WHERE status NOT IN ('kicked', 'blocked');
CREATE INDEX idx_participants_last_seen ON participants(last_seen_at) WHERE status = 'active';
CREATE INDEX idx_participants_token_expiry ON participants(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- ============================================================================
-- PARTICIPANT_ACTIVITY_LOG TABLE
-- ============================================================================
-- Track participant actions for analytics and debugging

CREATE TABLE participant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  session_id UUID NOT NULL REFERENCES participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL, -- NULL if participant deleted
  
  -- Event details
  event_type TEXT NOT NULL,              -- 'join', 'leave', 'role_change', 'kick', 'game_complete', etc.
  event_data JSONB,                      -- Additional context
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (LENGTH(event_type) > 0)
);

-- Index for queries
CREATE INDEX idx_activity_log_session ON participant_activity_log(session_id, created_at DESC);
CREATE INDEX idx_activity_log_participant ON participant_activity_log(participant_id, created_at DESC);
CREATE INDEX idx_activity_log_event_type ON participant_activity_log(event_type, session_id);

-- ============================================================================
-- NO-EXPIRY TOKEN QUOTAS TABLE
-- ============================================================================
-- Track usage of no-expiry tokens per tenant (limited to 2-3 per tenant)

CREATE TABLE participant_token_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Quota tracking
  no_expiry_tokens_used INT NOT NULL DEFAULT 0,
  no_expiry_tokens_limit INT NOT NULL DEFAULT 2, -- Configurable per tenant
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_quota CHECK (no_expiry_tokens_used >= 0 AND no_expiry_tokens_limit >= 0),
  CONSTRAINT unique_tenant_quota UNIQUE(tenant_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE participant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_token_quotas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - PARTICIPANT_SESSIONS
-- ============================================================================

-- Hosts can manage their own sessions
CREATE POLICY "Hosts can create sessions"
  ON participant_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can view their own sessions"
  ON participant_sessions FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own sessions"
  ON participant_sessions FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own sessions"
  ON participant_sessions FOR DELETE
  USING (auth.uid() = host_user_id);

-- System admins can view all sessions
CREATE POLICY "System admins can view all sessions"
  ON participant_sessions FOR SELECT
  USING (public.is_system_admin());

-- Anyone can view active sessions by code (for join flow)
-- Note: This is intentionally permissive - the join flow validates separately
CREATE POLICY "Public can view active sessions by code"
  ON participant_sessions FOR SELECT
  USING (status = 'active');

-- ============================================================================
-- RLS POLICIES - PARTICIPANTS
-- ============================================================================

-- Hosts can view participants in their sessions
CREATE POLICY "Hosts can view participants in their sessions"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participant_sessions
      WHERE participant_sessions.id = participants.session_id
      AND participant_sessions.host_user_id = auth.uid()
    )
  );

-- Hosts can update participants in their sessions (role changes, kicks)
CREATE POLICY "Hosts can update participants in their sessions"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participant_sessions
      WHERE participant_sessions.id = participants.session_id
      AND participant_sessions.host_user_id = auth.uid()
    )
  );

-- Service role can create participants (join flow)
CREATE POLICY "Service role can create participants"
  ON participants FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Participants can view themselves by token
CREATE POLICY "Participants can view themselves"
  ON participants FOR SELECT
  USING (true); -- Token validation happens in application layer

-- ============================================================================
-- RLS POLICIES - PARTICIPANT_ACTIVITY_LOG
-- ============================================================================

-- Hosts can view activity for their sessions
CREATE POLICY "Hosts can view activity for their sessions"
  ON participant_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participant_sessions
      WHERE participant_sessions.id = participant_activity_log.session_id
      AND participant_sessions.host_user_id = auth.uid()
    )
  );

-- Service role can insert activity logs
CREATE POLICY "Service role can insert activity logs"
  ON participant_activity_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES - PARTICIPANT_TOKEN_QUOTAS
-- ============================================================================

-- Tenants can view their own quota
CREATE POLICY "Tenants can view their own quota"
  ON participant_token_quotas FOR SELECT
  USING (tenant_id = ANY(public.get_user_tenant_ids()));

-- System admins can view all quotas
CREATE POLICY "System admins can view all quotas"
  ON participant_token_quotas FOR SELECT
  USING (public.is_system_admin());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update participant_count on participant changes
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE participant_sessions
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE participant_sessions
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_count
AFTER INSERT OR DELETE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_participant_count();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participant_sessions_updated_at
BEFORE UPDATE ON participant_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_participants_updated_at
BEFORE UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_token_quotas_updated_at
BEFORE UPDATE ON participant_token_quotas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default quota entries for existing tenants
INSERT INTO participant_token_quotas (tenant_id, no_expiry_tokens_limit)
SELECT id, 2 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE participant_sessions IS 'Sessions that participants can join via codes';
COMMENT ON TABLE participants IS 'Anonymous participants in sessions';
COMMENT ON TABLE participant_activity_log IS 'Audit log of participant actions';
COMMENT ON TABLE participant_token_quotas IS 'Quota tracking for no-expiry tokens per tenant';

COMMENT ON COLUMN participant_sessions.session_code IS '6-character unique code (e.g., H3K9QF)';
COMMENT ON COLUMN participant_sessions.settings IS 'JSONB settings: allow_rejoin, max_participants, require_approval, token_expiry_hours, etc.';
COMMENT ON COLUMN participants.participant_token IS 'JWT token for re-authentication (rejoin flow)';
COMMENT ON COLUMN participants.token_expires_at IS 'NULL = no expiry (limited quota), or timestamp for 24h default';
COMMENT ON COLUMN participants.progress IS 'JSONB tracking: games_completed, achievements_unlocked, score, time_active_seconds';
