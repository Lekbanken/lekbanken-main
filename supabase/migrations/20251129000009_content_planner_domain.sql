-- Content & Planner Domain
-- Game scheduling, content calendar, seasonal events

-- Content Items (games, collections, featured content)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('game', 'collection', 'event', 'challenge')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- store type-specific data
);

-- Content Schedule (when content should be visible/active)
CREATE TABLE IF NOT EXISTS content_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seasonal Events (limited-time events, themed content)
CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT, -- 'halloween', 'christmas', 'summer', etc.
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  reward_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.5x points during event
  featured_content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Collections (curated groups of games)
CREATE TABLE IF NOT EXISTS content_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'trending', 'new', 'educational', 'popular', 'custom'
  cover_image_url TEXT,
  game_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0, -- for sorting on homepage
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection Items (games in collections)
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES content_collections(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Analytics (track engagement)
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, content_id)
);

-- Indexes for common queries
CREATE INDEX idx_content_items_tenant_id ON content_items(tenant_id);
CREATE INDEX idx_content_items_type ON content_items(type);
CREATE INDEX idx_content_items_is_published ON content_items(is_published);
CREATE INDEX idx_content_items_is_featured ON content_items(is_featured);
CREATE INDEX idx_content_items_created_by_user_id ON content_items(created_by_user_id);

CREATE INDEX idx_content_schedules_tenant_id ON content_schedules(tenant_id);
CREATE INDEX idx_content_schedules_content_id ON content_schedules(content_id);
CREATE INDEX idx_content_schedules_start_date ON content_schedules(start_date);
CREATE INDEX idx_content_schedules_end_date ON content_schedules(end_date);

CREATE INDEX idx_seasonal_events_tenant_id ON seasonal_events(tenant_id);
CREATE INDEX idx_seasonal_events_is_active ON seasonal_events(is_active);
CREATE INDEX idx_seasonal_events_start_date ON seasonal_events(start_date);

CREATE INDEX idx_content_collections_tenant_id ON content_collections(tenant_id);
CREATE INDEX idx_content_collections_is_published ON content_collections(is_published);
CREATE INDEX idx_content_collections_is_featured ON content_collections(is_featured);
CREATE INDEX idx_content_collections_category ON content_collections(category);

CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_collection_items_game_id ON collection_items(game_id);

CREATE INDEX idx_content_analytics_tenant_id ON content_analytics(tenant_id);
CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);

-- RLS Policies
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

-- Content Items: Users see published content, admins see all
CREATE POLICY "content_items_published_select" ON content_items
  FOR SELECT USING (is_published = true OR auth.uid() = created_by_user_id);

CREATE POLICY "content_items_insert" ON content_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "content_items_update" ON content_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_items.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "content_items_delete" ON content_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_items.tenant_id
        AND role = 'admin'
    )
  );

-- Content Schedules: Admins only
CREATE POLICY "content_schedules_select" ON content_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_schedules.tenant_id
    )
  );

CREATE POLICY "content_schedules_insert" ON content_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_schedules.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "content_schedules_update" ON content_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_schedules.tenant_id
        AND role IN ('admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_schedules.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

-- Seasonal Events: Admins only
CREATE POLICY "seasonal_events_select" ON seasonal_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = seasonal_events.tenant_id
    )
  );

CREATE POLICY "seasonal_events_insert" ON seasonal_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = seasonal_events.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "seasonal_events_update" ON seasonal_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = seasonal_events.tenant_id
        AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = seasonal_events.tenant_id
        AND role = 'admin'
    )
  );

-- Content Collections: Editors can create/manage
CREATE POLICY "content_collections_select" ON content_collections
  FOR SELECT USING (is_published = true OR created_by_user_id = auth.uid());

CREATE POLICY "content_collections_insert" ON content_collections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_collections.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "content_collections_update" ON content_collections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_collections.tenant_id
        AND role IN ('admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_collections.tenant_id
        AND role IN ('admin', 'editor')
    )
  );

-- Collection Items: Inherited from collection permissions
CREATE POLICY "collection_items_select" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_collections cc
      WHERE cc.id = collection_items.collection_id
        AND (cc.is_published = true OR cc.created_by_user_id = auth.uid())
    )
  );

CREATE POLICY "collection_items_insert" ON collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_collections cc
      WHERE cc.id = collection_items.collection_id
        AND EXISTS (
          SELECT 1 FROM user_tenant_memberships utm
          WHERE utm.user_id = auth.uid()
            AND utm.tenant_id = cc.tenant_id
            AND utm.role IN ('admin', 'editor')
        )
    )
  );

CREATE POLICY "collection_items_delete" ON collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM content_collections cc
      WHERE cc.id = collection_items.collection_id
        AND EXISTS (
          SELECT 1 FROM user_tenant_memberships utm
          WHERE utm.user_id = auth.uid()
            AND utm.tenant_id = cc.tenant_id
            AND utm.role IN ('admin', 'editor')
        )
    )
  );

-- Content Analytics: Admins only
CREATE POLICY "content_analytics_select" ON content_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_analytics.tenant_id
    )
  );

CREATE POLICY "content_analytics_insert" ON content_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_analytics.tenant_id
    )
  );

CREATE POLICY "content_analytics_update" ON content_analytics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_analytics.tenant_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = content_analytics.tenant_id
    )
  );
