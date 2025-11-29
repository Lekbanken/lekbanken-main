-- Social Domain Schema
-- Friends, friend requests, and social leaderboards

-- Friends Table
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id_1 UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_id_2 UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT different_users CHECK (user_id_1 < user_id_2),
  CONSTRAINT users_not_same CHECK (user_id_1 != user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

-- Friend Requests Table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, blocked
  created_at TIMESTAMP DEFAULT now(),
  responded_at TIMESTAMP,
  CONSTRAINT different_users CHECK (requester_id != recipient_id),
  UNIQUE(requester_id, recipient_id)
);

-- Social Leaderboards Table
CREATE TABLE public.social_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  total_plays INTEGER DEFAULT 0,
  best_score INTEGER,
  avg_score DECIMAL(10, 2),
  achievements_unlocked INTEGER DEFAULT 0,
  last_played_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, user_id, game_id)
);

-- Session Multiplayer Table (for tracking multiplayer sessions)
CREATE TABLE public.multiplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, in_progress, completed, canceled
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  winner_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Multiplayer Session Participants
CREATE TABLE public.multiplayer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.multiplayer_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER,
  placement INTEGER,
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create Indexes for Performance
CREATE INDEX idx_friends_user_id_1 ON public.friends(user_id_1);
CREATE INDEX idx_friends_user_id_2 ON public.friends(user_id_2);
CREATE INDEX idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX idx_friend_requests_recipient ON public.friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_social_leaderboards_tenant_id ON public.social_leaderboards(tenant_id);
CREATE INDEX idx_social_leaderboards_game_id ON public.social_leaderboards(game_id);
CREATE INDEX idx_social_leaderboards_user_id ON public.social_leaderboards(user_id);
CREATE INDEX idx_social_leaderboards_score ON public.social_leaderboards(score DESC);
CREATE INDEX idx_multiplayer_sessions_game_id ON public.multiplayer_sessions(game_id);
CREATE INDEX idx_multiplayer_sessions_created_by ON public.multiplayer_sessions(created_by_user_id);
CREATE INDEX idx_multiplayer_sessions_status ON public.multiplayer_sessions(status);
CREATE INDEX idx_multiplayer_participants_session_id ON public.multiplayer_participants(session_id);
CREATE INDEX idx_multiplayer_participants_user_id ON public.multiplayer_participants(user_id);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Friends
CREATE POLICY "Users can view their own friendships"
  ON public.friends FOR SELECT
  USING (
    user_id_1 = auth.uid() OR
    user_id_2 = auth.uid()
  );

CREATE POLICY "Service can manage friendships"
  ON public.friends FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can remove friendships"
  ON public.friends FOR DELETE
  USING (
    user_id_1 = auth.uid() OR
    user_id_2 = auth.uid()
  );

-- RLS Policies for Friend Requests
CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    recipient_id = auth.uid()
  );

CREATE POLICY "Users can create friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update their received requests"
  ON public.friend_requests FOR UPDATE
  USING (recipient_id = auth.uid());

-- RLS Policies for Social Leaderboards
CREATE POLICY "Users can view leaderboards for their tenant"
  ON public.social_leaderboards FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert leaderboard entries"
  ON public.social_leaderboards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update leaderboard entries"
  ON public.social_leaderboards FOR UPDATE
  USING (true);

-- RLS Policies for Multiplayer Sessions
CREATE POLICY "Users can view multiplayer sessions"
  ON public.multiplayer_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create multiplayer sessions"
  ON public.multiplayer_sessions FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON public.multiplayer_sessions FOR UPDATE
  USING (created_by_user_id = auth.uid());

-- RLS Policies for Multiplayer Participants
CREATE POLICY "Users can view session participants"
  ON public.multiplayer_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join sessions"
  ON public.multiplayer_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can update participant data"
  ON public.multiplayer_participants FOR UPDATE
  USING (true);
