-- =============================================================================
-- Migration 006: Harden remaining SECURITY DEFINER functions with search_path
-- =============================================================================
-- Purpose: Add SET search_path = pg_catalog, public to all remaining
--          SECURITY DEFINER functions that currently lack it.
-- 
-- Functions affected (19 total):
--   - handle_new_user (CRITICAL - auth trigger)
--   - get_effective_design
--   - create_game_snapshot, create_session_with_snapshot, snapshot_game_roles_to_session
--   - log_session_event, get_session_events, get_session_event_stats
--   - session_trigger_* (4 functions)
--   - learning_* (4 functions)
--   - trg_plan_* (2 functions), get_next_plan_version_number
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRITICAL: handle_new_user (auth trigger)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Insert or update the public.users row
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  -- If there was an orphaned profile with same email but different ID, migrate it
  -- (This handles the case where a user signs up, deletes account, and signs up again)
  UPDATE public.user_tenant_memberships
  SET user_id = NEW.id
  WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE email = NEW.email AND id != NEW.id
  );
  
  -- Remove orphaned profiles with same email
  DELETE FROM public.users 
  WHERE email = NEW.email AND id != NEW.id;
  
  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. get_effective_design
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_design(p_tenant_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_system_config jsonb;
  v_tenant_overrides jsonb;
  v_branding_enabled boolean;
  v_result jsonb;
BEGIN
  -- Get system config
  SELECT jsonb_build_object(
    'brand', brand,
    'media', media,
    'typography', typography,
    'tokens', tokens
  ) INTO v_system_config
  FROM public.system_design_config
  LIMIT 1;
  
  IF v_system_config IS NULL THEN
    v_system_config := '{}'::jsonb;
  END IF;
  
  -- If no tenant specified, return system config
  IF p_tenant_id IS NULL THEN
    RETURN v_system_config;
  END IF;
  
  -- Check if tenant has branding enabled
  SELECT tenant_branding_enabled INTO v_branding_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF NOT COALESCE(v_branding_enabled, false) THEN
    RETURN v_system_config;
  END IF;
  
  -- Get tenant overrides
  SELECT overrides INTO v_tenant_overrides
  FROM public.tenant_design_config
  WHERE tenant_id = p_tenant_id;
  
  IF v_tenant_overrides IS NULL OR v_tenant_overrides = '{}'::jsonb THEN
    RETURN v_system_config;
  END IF;
  
  -- Merge: tenant overrides take precedence (shallow merge per category)
  v_result := jsonb_build_object(
    'brand', COALESCE(v_tenant_overrides->'brand', '{}'::jsonb) || COALESCE(v_system_config->'brand', '{}'::jsonb),
    'media', COALESCE(v_tenant_overrides->'media', '{}'::jsonb) || COALESCE(v_system_config->'media', '{}'::jsonb),
    'typography', v_system_config->'typography', -- Typography NOT overridable by tenant
    'tokens', v_system_config->'tokens' -- Tokens NOT overridable by tenant
  );
  
  -- Actually we want tenant to override, so reverse the merge order for brand/media
  v_result := jsonb_build_object(
    'brand', COALESCE(v_system_config->'brand', '{}'::jsonb) || COALESCE(v_tenant_overrides->'brand', '{}'::jsonb),
    'media', COALESCE(v_system_config->'media', '{}'::jsonb) || COALESCE(v_tenant_overrides->'media', '{}'::jsonb),
    'typography', v_system_config->'typography',
    'tokens', v_system_config->'tokens'
  );
  
  RETURN v_result;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. create_game_snapshot
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_game_snapshot(p_game_id uuid, p_version_label text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
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
$function$;

-- -----------------------------------------------------------------------------
-- 4. create_session_with_snapshot
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_session_with_snapshot(p_game_id uuid, p_host_user_id uuid, p_join_code text DEFAULT NULL::text, p_settings jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(session_id uuid, snapshot_id uuid, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
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
$function$;

-- -----------------------------------------------------------------------------
-- 5. snapshot_game_roles_to_session
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_game_roles_to_session(p_session_id uuid, p_game_id uuid, p_locale text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Copy all roles from game_roles to session_roles
  INSERT INTO public.session_roles (
    session_id,
    source_role_id,
    name,
    icon,
    color,
    role_order,
    public_description,
    private_instructions,
    private_hints,
    min_count,
    max_count,
    assignment_strategy,
    scaling_rules,
    conflicts_with
  )
  SELECT
    p_session_id,
    gr.id,
    gr.name,
    gr.icon,
    gr.color,
    gr.role_order,
    gr.public_description,
    gr.private_instructions,
    gr.private_hints,
    gr.min_count,
    gr.max_count,
    gr.assignment_strategy,
    gr.scaling_rules,
    COALESCE(
      (SELECT array_agg(gr2.name) 
       FROM public.game_roles gr2 
       WHERE gr2.id = ANY(gr.conflicts_with)),
      '{}'::TEXT[]
    )
  FROM public.game_roles gr
  WHERE gr.game_id = p_game_id
    AND (gr.locale = p_locale OR gr.locale IS NULL)
  ORDER BY gr.role_order;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. log_session_event
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_session_event(p_session_id uuid, p_event_type text, p_event_category text, p_actor_type text DEFAULT 'system'::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_name text DEFAULT NULL::text, p_target_type text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_target_name text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid, p_parent_event_id uuid DEFAULT NULL::uuid, p_severity text DEFAULT 'info'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.session_events (
    session_id,
    event_type,
    event_category,
    actor_type,
    actor_id,
    actor_name,
    target_type,
    target_id,
    target_name,
    payload,
    correlation_id,
    parent_event_id,
    severity
  ) VALUES (
    p_session_id,
    p_event_type,
    p_event_category,
    p_actor_type,
    p_actor_id,
    p_actor_name,
    p_target_type,
    p_target_id,
    p_target_name,
    p_payload,
    p_correlation_id,
    p_parent_event_id,
    p_severity
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. get_session_events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_session_events(p_session_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_category text DEFAULT NULL::text, p_severity text DEFAULT NULL::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS TABLE(id uuid, event_type text, event_category text, actor_type text, actor_id uuid, actor_name text, target_type text, target_id text, target_name text, payload jsonb, correlation_id uuid, parent_event_id uuid, severity text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.event_type,
    se.event_category,
    se.actor_type,
    se.actor_id,
    se.actor_name,
    se.target_type,
    se.target_id,
    se.target_name,
    se.payload,
    se.correlation_id,
    se.parent_event_id,
    se.severity,
    se.created_at
  FROM public.session_events se
  WHERE se.session_id = p_session_id
    AND (p_category IS NULL OR se.event_category = p_category)
    AND (p_severity IS NULL OR se.severity = p_severity)
    AND (p_since IS NULL OR se.created_at >= p_since)
  ORDER BY se.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. get_session_event_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_session_event_stats(p_session_id uuid)
RETURNS TABLE(event_category text, event_count bigint, error_count bigint, warning_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    se.event_category,
    COUNT(*) AS event_count,
    COUNT(*) FILTER (WHERE se.severity = 'error') AS error_count,
    COUNT(*) FILTER (WHERE se.severity = 'warning') AS warning_count
  FROM public.session_events se
  WHERE se.session_id = p_session_id
  GROUP BY se.event_category
  ORDER BY event_count DESC;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. session_trigger_clear_error
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_trigger_clear_error(p_trigger_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE id = p_trigger_id
  AND status = 'error';
END;
$function$;

-- -----------------------------------------------------------------------------
-- 10. session_trigger_record_error
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_trigger_record_error(p_trigger_id uuid, p_error_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'error',
    last_error = p_error_message,
    last_error_at = NOW(),
    error_count = error_count + 1,
    updated_at = NOW()
  WHERE id = p_trigger_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 11. session_triggers_disable_all
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_triggers_disable_all(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'disabled',
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('armed', 'error');
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 12. session_triggers_rearm_all
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_triggers_rearm_all(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.session_triggers
  SET 
    status = 'armed',
    last_error = NULL,
    last_error_at = NULL,
    updated_at = NOW()
  WHERE session_id = p_session_id
  AND status IN ('disabled', 'error')
  AND enabled = TRUE;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 13. learning_course_completed
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_course_completed(p_user_id uuid, p_tenant_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_user_progress
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND course_id = p_course_id
    AND status = 'completed'
  );
$function$;

-- -----------------------------------------------------------------------------
-- 14. learning_get_unsatisfied_requirements
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_get_unsatisfied_requirements(p_user_id uuid, p_tenant_id uuid, p_target_kind text, p_target_id uuid)
RETURNS TABLE(requirement_id uuid, course_id uuid, course_title text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT 
    lr.id as requirement_id,
    lr.required_course_id as course_id,
    lc.title as course_title
  FROM public.learning_requirements lr
  JOIN public.learning_courses lc ON lc.id = lr.required_course_id
  WHERE lr.is_active = true
  AND (lr.tenant_id IS NULL OR lr.tenant_id = p_tenant_id)
  AND lr.target_ref->>'kind' = p_target_kind
  AND (lr.target_ref->>'id')::uuid = p_target_id
  AND NOT public.learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  ORDER BY lr.priority;
$function$;

-- -----------------------------------------------------------------------------
-- 15. learning_prerequisites_met
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_prerequisites_met(p_user_id uuid, p_tenant_id uuid, p_path_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT NOT EXISTS (
    -- Find all edges where this course is the target
    SELECT 1 FROM public.learning_path_edges lpe
    WHERE lpe.path_id = p_path_id
    AND lpe.to_course_id = p_course_id
    -- And the prerequisite course is NOT completed
    AND NOT public.learning_course_completed(p_user_id, p_tenant_id, lpe.from_course_id)
  );
$function$;

-- -----------------------------------------------------------------------------
-- 16. learning_requirement_satisfied
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_requirement_satisfied(p_user_id uuid, p_tenant_id uuid, p_requirement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_requirements lr
    WHERE lr.id = p_requirement_id
    AND lr.is_active = true
    AND public.learning_course_completed(p_user_id, p_tenant_id, lr.required_course_id)
  );
$function$;

-- -----------------------------------------------------------------------------
-- 17. get_next_plan_version_number
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_plan_version_number(p_plan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM public.plan_versions WHERE plan_id = p_plan_id),
    1
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 18. trg_plan_blocks_update_plan_status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_plan_blocks_update_plan_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Get plan_id from NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    v_plan_id := OLD.plan_id;
  ELSE
    v_plan_id := NEW.plan_id;
  END IF;
  
  -- If plan was published and blocks change, mark as modified
  UPDATE public.plans 
  SET status = 'modified', updated_at = now()
  WHERE id = v_plan_id
  AND status = 'published'
  AND current_version_id IS NOT NULL;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 19. trg_plans_update_status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_plans_update_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- If plan was published and name/description/metadata changes, mark as modified
  IF OLD.status = 'published' AND OLD.current_version_id IS NOT NULL THEN
    IF OLD.name IS DISTINCT FROM NEW.name 
       OR OLD.description IS DISTINCT FROM NEW.description 
       OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
      NEW.status := 'modified';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- Verification query (run after migration to confirm)
-- =============================================================================
-- SELECT p.proname, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.prosecdef = true
-- AND (p.proconfig IS NULL OR NOT EXISTS (
--   SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
-- ))
-- ORDER BY p.proname;
-- Should return 0 rows after this migration.
