-- =============================================================================
-- Migration: 20251228120000_game_snapshots.sql
-- Description: Versioned game snapshots for sessions
-- Part of MVP2 - Authoring Features
-- =============================================================================

-- =============================================================================
-- 1. Create game_snapshots table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.game_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to original game
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  version_label TEXT, -- Optional human-readable label like "v1.2" or "Launch version"
  
  -- Full game data snapshot (immutable)
  snapshot_data JSONB NOT NULL,
  
  -- Metadata about what's included
  includes_steps BOOLEAN NOT NULL DEFAULT true,
  includes_phases BOOLEAN NOT NULL DEFAULT false,
  includes_roles BOOLEAN NOT NULL DEFAULT false,
  includes_artifacts BOOLEAN NOT NULL DEFAULT false,
  includes_triggers BOOLEAN NOT NULL DEFAULT false,
  includes_board_config BOOLEAN NOT NULL DEFAULT false,
  
  -- Checksums for integrity
  checksum TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_snapshots_game ON public.game_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_version ON public.game_snapshots(game_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_created ON public.game_snapshots(created_at DESC);

-- Unique constraint: one version number per game
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_snapshots_game_version 
  ON public.game_snapshots(game_id, version);

COMMENT ON TABLE public.game_snapshots IS 'Immutable snapshots of games for session playback';
COMMENT ON COLUMN public.game_snapshots.snapshot_data IS 'Full JSON representation of game at snapshot time';
COMMENT ON COLUMN public.game_snapshots.version IS 'Auto-incrementing version number per game';

-- =============================================================================
-- 2. Add snapshot reference to participant_sessions
-- =============================================================================

ALTER TABLE public.participant_sessions
ADD COLUMN IF NOT EXISTS game_snapshot_id UUID REFERENCES public.game_snapshots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participant_sessions_snapshot 
  ON public.participant_sessions(game_snapshot_id);

COMMENT ON COLUMN public.participant_sessions.game_snapshot_id IS 
  'Reference to immutable game snapshot used for this session';

-- =============================================================================
-- 3. RPC: Create game snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_game_snapshot(
  p_game_id UUID,
  p_version_label TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_next_version INTEGER;
  v_snapshot JSONB;
  v_game RECORD;
  v_steps JSONB;
  v_phases JSONB;
  v_roles JSONB;
  v_artifacts JSONB;
  v_triggers JSONB;
  v_board_config JSONB;
  v_has_phases BOOLEAN := false;
  v_has_roles BOOLEAN := false;
  v_has_artifacts BOOLEAN := false;
  v_has_triggers BOOLEAN := false;
  v_has_board BOOLEAN := false;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.game_snapshots
  WHERE game_id = p_game_id;
  
  -- Get base game data
  SELECT 
    id, game_key, name, short_description, description,
    play_mode, status, locale,
    energy_level, location_type, time_estimate_min, duration_max,
    min_players, max_players, players_recommended,
    age_min, age_max, difficulty,
    accessibility_notes, space_requirements, leader_tips,
    main_purpose_id, product_id, owner_tenant_id,
    cover_media_id
  INTO v_game
  FROM public.games
  WHERE id = p_game_id;
  
  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;
  
  -- Get steps
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_order', step_order,
      'title', title,
      'body', body,
      'duration_seconds', duration_seconds,
      'leader_script', leader_script,
      'participant_prompt', participant_prompt,
      'board_text', board_text,
      'optional', optional
    ) ORDER BY step_order
  ), '[]'::jsonb) INTO v_steps
  FROM public.game_steps
  WHERE game_id = p_game_id;
  
  -- Get phases
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'phase_order', phase_order,
      'name', name,
      'phase_type', phase_type,
      'duration_seconds', duration_seconds,
      'timer_visible', timer_visible,
      'timer_style', timer_style,
      'description', description,
      'board_message', board_message,
      'auto_advance', auto_advance
    ) ORDER BY phase_order
  ), '[]'::jsonb) INTO v_phases
  FROM public.game_phases
  WHERE game_id = p_game_id;
  
  v_has_phases := jsonb_array_length(v_phases) > 0;
  
  -- Get roles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'role_order', role_order,
      'name', name,
      'icon', icon,
      'color', color,
      'public_description', public_description,
      'private_instructions', private_instructions,
      'private_hints', private_hints,
      'min_count', min_count,
      'max_count', max_count,
      'assignment_strategy', assignment_strategy,
      'scaling_rules', scaling_rules,
      'conflicts_with', conflicts_with
    ) ORDER BY role_order
  ), '[]'::jsonb) INTO v_roles
  FROM public.game_roles
  WHERE game_id = p_game_id;
  
  v_has_roles := jsonb_array_length(v_roles) > 0;
  
  -- Get artifacts (if table exists)
  BEGIN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'artifact_order', artifact_order,
        'title', title,
        'description', description,
        'artifact_type', artifact_type,
        'locale', locale,
        'tags', tags,
        'metadata', metadata
      ) ORDER BY artifact_order
    ), '[]'::jsonb) INTO v_artifacts
    FROM public.game_artifacts
    WHERE game_id = p_game_id;
    
    v_has_artifacts := jsonb_array_length(v_artifacts) > 0;
  EXCEPTION WHEN undefined_table THEN
    v_artifacts := '[]'::jsonb;
  END;
  
  -- Get triggers (if table exists)
  BEGIN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'sort_order', sort_order,
        'name', name,
        'description', description,
        'enabled', enabled,
        'condition_type', condition_type,
        'condition_config', condition_config,
        'actions', actions,
        'execute_once', execute_once,
        'delay_seconds', delay_seconds
      ) ORDER BY sort_order
    ), '[]'::jsonb) INTO v_triggers
    FROM public.game_triggers
    WHERE game_id = p_game_id;
    
    v_has_triggers := jsonb_array_length(v_triggers) > 0;
  EXCEPTION WHEN undefined_table THEN
    v_triggers := '[]'::jsonb;
  END;
  
  -- Get board config (if table exists)
  BEGIN
    SELECT jsonb_build_object(
      'show_game_name', show_game_name,
      'show_current_phase', show_current_phase,
      'show_timer', show_timer,
      'show_participants', show_participants,
      'show_public_roles', show_public_roles,
      'show_leaderboard', show_leaderboard,
      'show_qr_code', show_qr_code,
      'welcome_message', welcome_message,
      'theme', theme,
      'background_color', background_color,
      'layout_variant', layout_variant
    ) INTO v_board_config
    FROM public.board_configs
    WHERE game_id = p_game_id
    LIMIT 1;
    
    v_has_board := v_board_config IS NOT NULL;
  EXCEPTION WHEN undefined_table THEN
    v_board_config := NULL;
  END;
  
  -- Build complete snapshot
  v_snapshot := jsonb_build_object(
    'game', jsonb_build_object(
      'id', v_game.id,
      'game_key', v_game.game_key,
      'name', v_game.name,
      'short_description', v_game.short_description,
      'description', v_game.description,
      'play_mode', v_game.play_mode,
      'status', v_game.status,
      'locale', v_game.locale,
      'energy_level', v_game.energy_level,
      'location_type', v_game.location_type,
      'time_estimate_min', v_game.time_estimate_min,
      'duration_max', v_game.duration_max,
      'min_players', v_game.min_players,
      'max_players', v_game.max_players,
      'players_recommended', v_game.players_recommended,
      'age_min', v_game.age_min,
      'age_max', v_game.age_max,
      'difficulty', v_game.difficulty,
      'accessibility_notes', v_game.accessibility_notes,
      'space_requirements', v_game.space_requirements,
      'leader_tips', v_game.leader_tips,
      'main_purpose_id', v_game.main_purpose_id,
      'product_id', v_game.product_id,
      'owner_tenant_id', v_game.owner_tenant_id,
      'cover_media_id', v_game.cover_media_id
    ),
    'steps', v_steps,
    'phases', v_phases,
    'roles', v_roles,
    'artifacts', v_artifacts,
    'triggers', v_triggers,
    'board_config', v_board_config,
    'snapshot_meta', jsonb_build_object(
      'created_at', now(),
      'game_id', p_game_id,
      'version', v_next_version
    )
  );
  
  -- Insert snapshot
  INSERT INTO public.game_snapshots (
    game_id,
    version,
    version_label,
    snapshot_data,
    includes_steps,
    includes_phases,
    includes_roles,
    includes_artifacts,
    includes_triggers,
    includes_board_config,
    checksum,
    created_by
  ) VALUES (
    p_game_id,
    v_next_version,
    p_version_label,
    v_snapshot,
    true,
    v_has_phases,
    v_has_roles,
    v_has_artifacts,
    v_has_triggers,
    v_has_board,
    md5(v_snapshot::text),
    p_created_by
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION public.create_game_snapshot IS 
  'Create an immutable snapshot of a game for session playback';

-- =============================================================================
-- 4. RPC: Get latest snapshot for game
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_latest_game_snapshot(p_game_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.game_snapshots
  WHERE game_id = p_game_id
  ORDER BY version DESC
  LIMIT 1;
$$;

-- =============================================================================
-- 5. RPC: Create session with snapshot
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_session_with_snapshot(
  p_game_id UUID,
  p_host_user_id UUID,
  p_join_code TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(session_id UUID, snapshot_id UUID, join_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_snapshot_id UUID;
  v_join_code TEXT;
BEGIN
  -- Create or get latest snapshot
  v_snapshot_id := public.get_latest_game_snapshot(p_game_id);
  
  IF v_snapshot_id IS NULL THEN
    -- No snapshot exists, create one
    v_snapshot_id := public.create_game_snapshot(p_game_id, NULL, p_host_user_id);
  END IF;
  
  -- Generate join code if not provided
  v_join_code := COALESCE(p_join_code, upper(substr(md5(random()::text), 1, 6)));
  
  -- Create session
  INSERT INTO public.participant_sessions (
    game_id,
    game_snapshot_id,
    host_user_id,
    join_code,
    settings,
    status
  ) VALUES (
    p_game_id,
    v_snapshot_id,
    p_host_user_id,
    v_join_code,
    p_settings,
    'pending'
  )
  RETURNING id INTO v_session_id;
  
  RETURN QUERY SELECT v_session_id, v_snapshot_id, v_join_code;
END;
$$;

COMMENT ON FUNCTION public.create_session_with_snapshot IS 
  'Create a new session with an associated game snapshot';

-- =============================================================================
-- 6. RLS Policies for game_snapshots
-- =============================================================================

ALTER TABLE public.game_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read snapshots for games they can access
DROP POLICY IF EXISTS "game_snapshots_select" ON public.game_snapshots;
CREATE POLICY "game_snapshots_select" ON public.game_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_snapshots.game_id
      AND (
        g.status = 'published'
        OR g.owner_tenant_id IN (
          SELECT tm.tenant_id FROM public.tenant_memberships tm
          WHERE tm.user_id = auth.uid()
        )
        OR public.is_global_admin()
      )
    )
  );

-- Only game owners/admins can create snapshots
DROP POLICY IF EXISTS "game_snapshots_insert" ON public.game_snapshots;
CREATE POLICY "game_snapshots_insert" ON public.game_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_snapshots.game_id
      AND (
        g.owner_tenant_id IN (
          SELECT tm.tenant_id FROM public.tenant_memberships tm
          WHERE tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'editor')
        )
        OR public.is_global_admin()
      )
    )
  );

-- Snapshots are immutable - no updates or deletes (except for admins)
DROP POLICY IF EXISTS "game_snapshots_delete" ON public.game_snapshots;
CREATE POLICY "game_snapshots_delete" ON public.game_snapshots
  FOR DELETE USING (public.is_global_admin());

-- =============================================================================
-- 7. Grant permissions
-- =============================================================================

GRANT SELECT ON public.game_snapshots TO authenticated;
GRANT INSERT ON public.game_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_game_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_with_snapshot TO authenticated;
