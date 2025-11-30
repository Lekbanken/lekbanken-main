-- Personalization Domain: User preferences, recommendations, and customization
-- Tracks user preferences, content recommendations, interest profiles, and personalization settings

-- User Preferences Table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preference Settings
  language VARCHAR(10),
  theme VARCHAR(20) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly, never
  
  -- Content Preferences
  preferred_game_categories TEXT[] DEFAULT '{}',
  difficulty_preference VARCHAR(20), -- easy, medium, hard, mixed
  content_maturity_level VARCHAR(20) DEFAULT 'teen', -- kids, teen, mature
  
  -- Privacy Settings
  profile_visibility VARCHAR(20) DEFAULT 'public', -- public, friends_only, private
  show_stats_publicly BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  
  -- Recommendation Settings
  enable_recommendations BOOLEAN DEFAULT true,
  recommendation_frequency VARCHAR(20) DEFAULT 'weekly',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, user_id),
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Saved Items Table (bookmarks, favorites)
CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  item_type VARCHAR(50) NOT NULL, -- game, challenge, event, achievement, content
  item_id UUID NOT NULL,
  item_title VARCHAR(255),
  item_metadata JSONB,
  
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, user_id, item_type, item_id),
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Personalization Events Table (clicks, views, interactions)
CREATE TABLE personalization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL, -- view, click, complete, save, share
  item_type VARCHAR(50),
  item_id UUID,
  item_title VARCHAR(255),
  
  event_metadata JSONB, -- time_spent, context, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Recommendation History Table
CREATE TABLE recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  recommendation_id UUID DEFAULT gen_random_uuid(),
  item_type VARCHAR(50), -- game, challenge, event, achievement
  item_id UUID,
  item_title VARCHAR(255),
  
  -- Recommendation Details
  reason VARCHAR(255), -- trending, popular, similar_to_interests, personalized_recommendation
  confidence_score FLOAT DEFAULT 0.5, -- 0.0-1.0
  rank_position INTEGER,
  
  -- Interaction
  was_clicked BOOLEAN DEFAULT false,
  was_completed BOOLEAN DEFAULT false,
  interaction_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Interest Profiles Table
CREATE TABLE interest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Interest Categories
  interest_category VARCHAR(100),
  interest_weight FLOAT DEFAULT 0.5, -- 0.0-1.0, importance
  interest_activity INTEGER DEFAULT 0, -- engagement count
  
  -- Trending & Seasonal
  is_trending BOOLEAN DEFAULT false,
  trend_score FLOAT DEFAULT 0,
  last_engagement_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, user_id, interest_category),
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Content Preferences Table (genre/tag preferences)
CREATE TABLE content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content Details
  content_category VARCHAR(100),
  preference_level VARCHAR(20) DEFAULT 'neutral', -- love, like, neutral, dislike, hate
  frequency_preference VARCHAR(20), -- frequent, occasional, rare
  
  -- Engagement
  engagement_count INTEGER DEFAULT 0,
  last_engaged_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, user_id, content_category),
  CONSTRAINT fk_tenant FOREIGN KEY(tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Create Indexes
CREATE INDEX idx_user_preferences_tenant ON user_preferences(tenant_id);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_saved_items_tenant ON saved_items(tenant_id);
CREATE INDEX idx_saved_items_user ON saved_items(user_id);
CREATE INDEX idx_saved_items_type ON saved_items(item_type);
CREATE INDEX idx_personalization_events_tenant ON personalization_events(tenant_id);
CREATE INDEX idx_personalization_events_user ON personalization_events(user_id);
CREATE INDEX idx_personalization_events_type ON personalization_events(event_type);
CREATE INDEX idx_recommendation_history_tenant ON recommendation_history(tenant_id);
CREATE INDEX idx_recommendation_history_user ON recommendation_history(user_id);
CREATE INDEX idx_recommendation_history_clicked ON recommendation_history(was_clicked);
CREATE INDEX idx_interest_profiles_tenant ON interest_profiles(tenant_id);
CREATE INDEX idx_interest_profiles_user ON interest_profiles(user_id);
CREATE INDEX idx_interest_profiles_category ON interest_profiles(interest_category);
CREATE INDEX idx_content_preferences_tenant ON content_preferences(tenant_id);
CREATE INDEX idx_content_preferences_user ON content_preferences(user_id);
CREATE INDEX idx_content_preferences_category ON content_preferences(content_category);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User Preferences
CREATE POLICY user_preferences_user_select ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_preferences_user_update ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_preferences_admin_all ON user_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = user_preferences.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies: Saved Items
CREATE POLICY saved_items_user_select ON saved_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY saved_items_user_crud ON saved_items
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies: Personalization Events
CREATE POLICY personalization_events_user_insert ON personalization_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY personalization_events_user_select ON personalization_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY personalization_events_admin_all ON personalization_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = personalization_events.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies: Recommendation History
CREATE POLICY recommendation_history_user_select ON recommendation_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY recommendation_history_user_update ON recommendation_history
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY recommendation_history_admin_all ON recommendation_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = recommendation_history.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies: Interest Profiles
CREATE POLICY interest_profiles_user_select ON interest_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY interest_profiles_admin_all ON interest_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = interest_profiles.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies: Content Preferences
CREATE POLICY content_preferences_user_select ON content_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY content_preferences_user_crud ON content_preferences
  FOR ALL USING (user_id = auth.uid());

