-- Migration: Add game_triggers table for declarative automation rules
-- Triggers define "When X happens, do Y" rules for escape-room automation

-- =============================================================================
-- Table: game_triggers
-- =============================================================================
-- Master trigger definitions tied to a game. Copied to session_triggers when session starts.

CREATE TABLE IF NOT EXISTS public.game_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Condition: WHEN this happens...
  -- JSONB structure: { type: 'keypad_correct', keypadId: 'abc' }
  condition JSONB NOT NULL,
  
  -- Actions: THEN do these... 
  -- JSONB array: [{ type: 'reveal_artifact', artifactId: 'xyz' }]
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Execution options
  execute_once BOOLEAN NOT NULL DEFAULT FALSE,
  delay_seconds INT DEFAULT 0,
  
  -- Ordering
  sort_order INT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_triggers_game_id ON public.game_triggers(game_id);
CREATE INDEX IF NOT EXISTS idx_game_triggers_condition_type ON public.game_triggers((condition->>'type'));

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_game_triggers_updated ON public.game_triggers;
CREATE TRIGGER trg_game_triggers_updated
  BEFORE UPDATE ON public.game_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.game_triggers IS 'Declarative automation rules for games. When X happens, do Y.';
COMMENT ON COLUMN public.game_triggers.condition IS 'JSONB condition that activates this trigger, e.g., { type: "keypad_correct", keypadId: "..." }';
COMMENT ON COLUMN public.game_triggers.actions IS 'JSONB array of actions to execute, e.g., [{ type: "reveal_artifact", artifactId: "..." }]';
COMMENT ON COLUMN public.game_triggers.execute_once IS 'If true, trigger disables itself after first execution';
COMMENT ON COLUMN public.game_triggers.delay_seconds IS 'Optional delay before executing actions';

-- =============================================================================
-- Table: session_triggers
-- =============================================================================
-- Runtime copy of triggers with execution state

CREATE TABLE IF NOT EXISTS public.session_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  source_trigger_id UUID REFERENCES public.game_triggers(id) ON DELETE SET NULL,
  
  -- Copy of game_trigger fields
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  condition JSONB NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  execute_once BOOLEAN NOT NULL DEFAULT FALSE,
  delay_seconds INT DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  
  -- Runtime state
  status TEXT NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'fired', 'disabled')),
  fired_at TIMESTAMPTZ,
  fired_count INT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_triggers_session_id ON public.session_triggers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_triggers_status ON public.session_triggers(status);
CREATE INDEX IF NOT EXISTS idx_session_triggers_condition_type ON public.session_triggers((condition->>'type'));

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_session_triggers_updated ON public.session_triggers;
CREATE TRIGGER trg_session_triggers_updated
  BEFORE UPDATE ON public.session_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.session_triggers IS 'Runtime copy of game triggers with execution state';
COMMENT ON COLUMN public.session_triggers.status IS 'armed = ready to fire, fired = has executed, disabled = manually disabled';
COMMENT ON COLUMN public.session_triggers.fired_at IS 'Timestamp when trigger last fired';
COMMENT ON COLUMN public.session_triggers.fired_count IS 'Number of times this trigger has fired';

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.game_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_triggers ENABLE ROW LEVEL SECURITY;

-- game_triggers: Same as game_artifacts (game owner can manage)
CREATE POLICY "game_triggers_select" ON public.game_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_triggers.game_id
      AND g.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "game_triggers_insert" ON public.game_triggers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_triggers.game_id
      AND g.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "game_triggers_update" ON public.game_triggers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_triggers.game_id
      AND g.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "game_triggers_delete" ON public.game_triggers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_triggers.game_id
      AND g.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- session_triggers: Session owner or tenant member can manage
CREATE POLICY "session_triggers_select" ON public.session_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions s
      WHERE s.id = session_triggers.session_id
      AND (
        s.user_id = auth.uid()
        OR s.tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "session_triggers_update" ON public.session_triggers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions s
      WHERE s.id = session_triggers.session_id
      AND (
        s.user_id = auth.uid()
        OR s.tenant_id IN (
          SELECT tenant_id FROM public.tenant_members 
          WHERE user_id = auth.uid() 
          AND role IN ('owner', 'admin', 'member')
        )
      )
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_triggers TO authenticated;
GRANT SELECT, UPDATE ON public.session_triggers TO authenticated;
GRANT ALL ON public.game_triggers TO service_role;
GRANT ALL ON public.session_triggers TO service_role;
