-- =============================================================================
-- Migration: 20260201000000_atomic_game_upsert.sql
-- Purpose: Atomic upsert (delete+insert) for game content import/update
-- Schema verified: 2026-02-01 against lib/supabase/database.types.ts
--
-- Guarantees:
--   - All-or-nothing for child content when p_payload.is_update=true
--   - Uses subtransaction rollback via BEGIN...EXCEPTION...END
--   - FK-safe delete order: leaf → parent
--   - FK-safe insert order: parent → leaf
-- =============================================================================

create or replace function public.upsert_game_content_v1(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_is_update boolean;
  v_import_run_id uuid;
  v_owner_tenant_id uuid;
  v_expected_tenant_id uuid;

  -- Counters for response
  v_steps_count int := 0;
  v_phases_count int := 0;
  v_artifacts_count int := 0;
  v_variants_count int := 0;
  v_triggers_count int := 0;
  v_roles_count int := 0;
begin
  -- ---------------------------------------------------------------------------
  -- 0) Basic payload validation
  -- ---------------------------------------------------------------------------
  v_game_id := nullif(p_payload->>'game_id', '')::uuid;
  v_is_update := coalesce((p_payload->>'is_update')::boolean, false);
  v_import_run_id := nullif(p_payload->>'import_run_id', '')::uuid;
  v_expected_tenant_id := nullif(p_payload->>'expected_tenant_id', '')::uuid;

  if v_game_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing game_id', 'code', 'MISSING_GAME_ID');
  end if;

  -- ---------------------------------------------------------------------------
  -- 1) Auth / caller guard
  -- ---------------------------------------------------------------------------
  -- Allow either:
  --   - authenticated user (auth.uid() not null), or
  --   - service_role (current_user = 'service_role')
  if auth.uid() is null and current_user <> 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated', 'code', 'AUTH_REQUIRED');
  end if;

  -- ---------------------------------------------------------------------------
  -- 2) Tenant ownership check (BEFORE any writes)
  -- ---------------------------------------------------------------------------
  select owner_tenant_id
    into v_owner_tenant_id
  from public.games
  where id = v_game_id;

  if v_owner_tenant_id is null then
    return jsonb_build_object('ok', false, 'error', 'Game not found', 'code', 'GAME_NOT_FOUND');
  end if;

  -- Optional: lock payload to the expected tenant (protects against wrong-target updates)
  if v_expected_tenant_id is not null and v_expected_tenant_id <> v_owner_tenant_id then
    return jsonb_build_object('ok', false, 'error', 'Tenant mismatch', 'code', 'TENANT_MISMATCH');
  end if;

  -- Log start
  raise log 'upsert_game_content_v1 run=% game=% is_update=%',
    coalesce(v_import_run_id::text, 'null'), v_game_id, v_is_update;

  -- ---------------------------------------------------------------------------
  -- 3) Atomic write block (subtransaction)
  --    If anything fails here, the block rolls back and we return ok:false.
  -- ---------------------------------------------------------------------------
  begin
    -- -------------------------------------------------------------------------
    -- 3A) Deletes (only when updating)
    -- FK-safe order: leaf → parent
    -- -------------------------------------------------------------------------
    if v_is_update then
      -- 1. Variants (refs artifacts + roles)
      delete from public.game_artifact_variants
      where artifact_id in (
        select id from public.game_artifacts where game_id = v_game_id
      );

      -- 2. Triggers
      delete from public.game_triggers where game_id = v_game_id;

      -- 3. Artifacts
      delete from public.game_artifacts where game_id = v_game_id;

      -- 4. Steps (refs phases via phase_id)
      delete from public.game_steps where game_id = v_game_id;

      -- 5. Phases
      delete from public.game_phases where game_id = v_game_id;

      -- 6. Roles (was referenced by variants, now safe)
      delete from public.game_roles where game_id = v_game_id;

      -- 7. Materials
      delete from public.game_materials where game_id = v_game_id;

      -- 8. Board config
      delete from public.game_board_config where game_id = v_game_id;

      -- 9. Secondary purposes
      delete from public.game_secondary_purposes where game_id = v_game_id;
    end if;

    -- -------------------------------------------------------------------------
    -- 3B) Inserts (parent → leaf order)
    -- -------------------------------------------------------------------------

    -- ---- Phases (before steps, since steps reference phases) ----------------
    -- Verified columns: id, game_id, phase_order, name, phase_type,
    -- duration_seconds, timer_visible, timer_style, description, board_message,
    -- auto_advance, locale
    if (p_payload ? 'phases') 
       and jsonb_typeof(p_payload->'phases') = 'array' 
       and jsonb_array_length(p_payload->'phases') > 0 
    then
      insert into public.game_phases (
        id, game_id, phase_order, name, phase_type,
        duration_seconds, timer_visible, timer_style,
        description, board_message, auto_advance, locale
      )
      select
        (ph->>'id')::uuid,
        v_game_id,
        (ph->>'phase_order')::int,
        ph->>'name',
        coalesce(ph->>'phase_type', 'round'),
        nullif(ph->>'duration_seconds', '')::int,
        coalesce((ph->>'timer_visible')::boolean, true),
        coalesce(ph->>'timer_style', 'countdown'),
        ph->>'description',
        ph->>'board_message',
        coalesce((ph->>'auto_advance')::boolean, false),
        ph->>'locale'
      from jsonb_array_elements(p_payload->'phases') as ph;

      get diagnostics v_phases_count = row_count;
    end if;

    -- ---- Steps --------------------------------------------------------------
    -- Verified columns: id, game_id, step_order, title, body, duration_seconds,
    -- leader_script, participant_prompt, board_text, optional, locale, phase_id,
    -- conditional, media_ref, display_mode
    if (p_payload ? 'steps') 
       and jsonb_typeof(p_payload->'steps') = 'array' 
       and jsonb_array_length(p_payload->'steps') > 0 
    then
      insert into public.game_steps (
        id, game_id, step_order, title, body,
        duration_seconds, leader_script, participant_prompt,
        board_text, optional, locale, phase_id,
        conditional, media_ref, display_mode
      )
      select
        (s->>'id')::uuid,
        v_game_id,
        (s->>'step_order')::int,
        s->>'title',
        s->>'body',
        nullif(s->>'duration_seconds', '')::int,
        s->>'leader_script',
        s->>'participant_prompt',
        s->>'board_text',
        coalesce((s->>'optional')::boolean, false),
        s->>'locale',
        nullif(s->>'phase_id', '')::uuid,
        s->>'conditional',
        nullif(s->>'media_ref', '')::uuid,
        s->>'display_mode'
      from jsonb_array_elements(p_payload->'steps') as s;

      get diagnostics v_steps_count = row_count;
    end if;

    -- ---- Roles (before variants, since variants reference roles) ------------
    -- Verified columns: id, game_id, role_order, name, icon, color,
    -- public_description, private_instructions, private_hints, min_count,
    -- max_count, assignment_strategy, scaling_rules, conflicts_with, locale
    -- CRITICAL: Must include 'id' because game_artifact_variants.visible_to_role_id
    -- references game_roles.id. Payload must pre-generate role IDs.
    if (p_payload ? 'roles') 
       and jsonb_typeof(p_payload->'roles') = 'array' 
       and jsonb_array_length(p_payload->'roles') > 0 
    then
      insert into public.game_roles (
        id, game_id, role_order, name, icon, color,
        public_description, private_instructions, private_hints,
        min_count, max_count, assignment_strategy,
        scaling_rules, conflicts_with, locale
      )
      select
        (r->>'id')::uuid,  -- REQUIRED: pre-generated by route.ts
        v_game_id,
        (r->>'role_order')::int,
        r->>'name',
        r->>'icon',
        r->>'color',
        r->>'public_description',
        r->>'private_instructions',
        r->>'private_hints',
        coalesce((r->>'min_count')::int, 1),
        nullif(r->>'max_count', '')::int,
        coalesce(r->>'assignment_strategy', 'random'),
        r->'scaling_rules',
        case 
          when r->'conflicts_with' is not null and jsonb_typeof(r->'conflicts_with') = 'array'
          then array(select jsonb_array_elements_text(r->'conflicts_with'))::uuid[]
          else '{}'::uuid[]
        end,
        r->>'locale'
      from jsonb_array_elements(p_payload->'roles') as r;

      get diagnostics v_roles_count = row_count;
    end if;

    -- ---- Materials ----------------------------------------------------------
    -- Verified columns: id, game_id, items, safety_notes, preparation, locale
    if (p_payload ? 'materials') and p_payload->'materials' is not null then
      insert into public.game_materials (game_id, items, safety_notes, preparation, locale)
      values (
        v_game_id,
        case 
          when p_payload->'materials'->'items' is not null 
               and jsonb_typeof(p_payload->'materials'->'items') = 'array'
          then array(select jsonb_array_elements_text(p_payload->'materials'->'items'))
          else '{}'::text[]
        end,
        p_payload->'materials'->>'safety_notes',
        p_payload->'materials'->>'preparation',
        p_payload->'materials'->>'locale'
      );
    end if;

    -- ---- Board config -------------------------------------------------------
    -- Verified columns: id, game_id, show_game_name, show_current_phase,
    -- show_timer, show_participants, show_public_roles, show_leaderboard,
    -- show_qr_code, welcome_message, theme, background_color, layout_variant,
    -- locale, background_media_id
    if (p_payload ? 'board_config') and p_payload->'board_config' is not null then
      insert into public.game_board_config (
        game_id, show_game_name, show_current_phase, show_timer,
        show_participants, show_public_roles, show_leaderboard, show_qr_code,
        welcome_message, theme, background_color, layout_variant,
        locale, background_media_id
      )
      values (
        v_game_id,
        coalesce((p_payload->'board_config'->>'show_game_name')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_current_phase')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_timer')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_participants')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_public_roles')::boolean, true),
        coalesce((p_payload->'board_config'->>'show_leaderboard')::boolean, false),
        coalesce((p_payload->'board_config'->>'show_qr_code')::boolean, false),
        p_payload->'board_config'->>'welcome_message',
        coalesce(p_payload->'board_config'->>'theme', 'neutral'),
        p_payload->'board_config'->>'background_color',
        coalesce(p_payload->'board_config'->>'layout_variant', 'standard'),
        p_payload->'board_config'->>'locale',
        nullif(p_payload->'board_config'->>'background_media_id', '')::uuid
      );
    end if;

    -- ---- Secondary purposes -------------------------------------------------
    -- Verified columns: game_id, purpose_id
    if (p_payload ? 'secondary_purpose_ids') 
       and jsonb_typeof(p_payload->'secondary_purpose_ids') = 'array'
       and jsonb_array_length(p_payload->'secondary_purpose_ids') > 0 
    then
      insert into public.game_secondary_purposes (game_id, purpose_id)
      select v_game_id, (pid)::uuid
      from jsonb_array_elements_text(p_payload->'secondary_purpose_ids') as pid;
    end if;

    -- ---- Artifacts ----------------------------------------------------------
    -- Verified columns: id, game_id, artifact_order, artifact_type, title,
    -- description, metadata, tags, locale
    -- NOTE: 'description' NOT 'body', 'tags' is TEXT[] not JSONB
    if (p_payload ? 'artifacts') 
       and jsonb_typeof(p_payload->'artifacts') = 'array' 
       and jsonb_array_length(p_payload->'artifacts') > 0 
    then
      insert into public.game_artifacts (
        id, game_id, artifact_order, artifact_type, title,
        description, metadata, tags, locale
      )
      select
        (a->>'id')::uuid,
        v_game_id,
        (a->>'artifact_order')::int,
        coalesce(a->>'artifact_type', 'card'),
        a->>'title',
        a->>'description',  -- NOT 'body'
        coalesce(a->'metadata', '{}'::jsonb),
        case 
          when a->'tags' is not null and jsonb_typeof(a->'tags') = 'array'
          then array(select jsonb_array_elements_text(a->'tags'))
          else '{}'::text[]
        end,
        a->>'locale'
      from jsonb_array_elements(p_payload->'artifacts') as a;

      get diagnostics v_artifacts_count = row_count;
    end if;

    -- ---- Artifact Variants (flat array, refs artifacts + roles) -------------
    -- Verified columns: id, artifact_id, visibility, visible_to_role_id,
    -- title, body, media_ref, variant_order, metadata
    if (p_payload ? 'artifact_variants') 
       and jsonb_typeof(p_payload->'artifact_variants') = 'array'
       and jsonb_array_length(p_payload->'artifact_variants') > 0 
    then
      insert into public.game_artifact_variants (
        artifact_id, visibility, visible_to_role_id,
        title, body, media_ref, variant_order, metadata
      )
      select
        (v->>'artifact_id')::uuid,
        coalesce(v->>'visibility', 'public'),
        nullif(v->>'visible_to_role_id', '')::uuid,
        v->>'title',
        v->>'body',
        nullif(v->>'media_ref', '')::uuid,
        coalesce((v->>'variant_order')::int, 0),
        coalesce(v->'metadata', '{}'::jsonb)
      from jsonb_array_elements(p_payload->'artifact_variants') as v;

      get diagnostics v_variants_count = row_count;
    end if;

    -- ---- Triggers -----------------------------------------------------------
    -- Verified columns: id, game_id, name, description, enabled, condition,
    -- actions, execute_once, delay_seconds, sort_order
    -- NOTE: 'condition' (singular), 'actions' (plural), 'enabled' NOT 'is_active',
    -- 'execute_once' NOT 'run_once', 'sort_order' NOT 'trigger_order'
    if (p_payload ? 'triggers') 
       and jsonb_typeof(p_payload->'triggers') = 'array' 
       and jsonb_array_length(p_payload->'triggers') > 0 
    then
      insert into public.game_triggers (
        id, game_id, name, description, enabled,
        condition, actions, execute_once, delay_seconds, sort_order
      )
      select
        (t->>'id')::uuid,
        v_game_id,
        t->>'name',
        t->>'description',
        coalesce((t->>'enabled')::boolean, true),
        coalesce(t->'condition', '{}'::jsonb),  -- singular, NOT 'conditions'
        coalesce(t->'actions', '[]'::jsonb),    -- plural, NOT 'action'
        coalesce((t->>'execute_once')::boolean, false),
        coalesce((t->>'delay_seconds')::int, 0),
        coalesce((t->>'sort_order')::int, 0)
      from jsonb_array_elements(p_payload->'triggers') as t;

      get diagnostics v_triggers_count = row_count;
    end if;

  exception when others then
    -- Automatic rollback of this BEGIN block
    raise log 'upsert_game_content_v1 FAILED run=% game=% error=% code=%',
      coalesce(v_import_run_id::text, 'null'), v_game_id, sqlerrm, sqlstate;

    return jsonb_build_object(
      'ok', false,
      'error', sqlerrm,
      'code', sqlstate,
      'game_id', v_game_id::text,
      'import_run_id', coalesce(v_import_run_id::text, null)
    );
  end;

  -- ---------------------------------------------------------------------------
  -- 4) Success response
  -- ---------------------------------------------------------------------------
  raise log 'upsert_game_content_v1 SUCCESS run=% game=% steps=% phases=% artifacts=% triggers=%',
    coalesce(v_import_run_id::text, 'null'), v_game_id, 
    v_steps_count, v_phases_count, v_artifacts_count, v_triggers_count;

  return jsonb_build_object(
    'ok', true,
    'game_id', v_game_id::text,
    'import_run_id', coalesce(v_import_run_id::text, null),
    'counts', jsonb_build_object(
      'steps', v_steps_count,
      'phases', v_phases_count,
      'artifacts', v_artifacts_count,
      'variants', v_variants_count,
      'triggers', v_triggers_count,
      'roles', v_roles_count
    )
  );
end;
$$;

comment on function public.upsert_game_content_v1(jsonb)
  is 'Atomic game content upsert (v1). All-or-nothing for child content via subtransaction. Schema verified 2026-02-01.';

-- Security: restrict execution
revoke all on function public.upsert_game_content_v1(jsonb) from public;
grant execute on function public.upsert_game_content_v1(jsonb) to service_role;
-- Grant to authenticated for potential direct admin use
grant execute on function public.upsert_game_content_v1(jsonb) to authenticated;
