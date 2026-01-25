import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';
import { TOOL_REGISTRY } from '@/features/tools/registry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EnergyLevel = Database['public']['Enums']['energy_level_enum'];
type LocationType = Database['public']['Enums']['location_type_enum'];

type GameStatus = 'draft' | 'published';

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveMediaRefsToGameMediaIds(params: {
  supabase: ReturnType<typeof createServiceRoleClient>;
  gameId: string;
  tenantId: string | null;
  refs: string[];
}) {
  const { supabase, gameId, tenantId, refs } = params;
  const uniqueRefs = Array.from(new Set(refs.filter((r) => isUuid(r))));
  const mapping = new Map<string, string>();
  if (uniqueRefs.length === 0) return mapping;

  const { data: existingRows } = await supabase
    .from('game_media')
    .select('id, media_id, kind, position')
    .eq('game_id', gameId);

  const gameMediaIds = new Set<string>();
  const galleryByMediaId = new Map<string, string>();
  let maxGalleryPosition = 0;

  for (const row of (existingRows ?? []) as Array<{ id: string; media_id: string; kind: string; position: number }>) {
    gameMediaIds.add(row.id);
    if (row.kind === 'gallery') {
      galleryByMediaId.set(row.media_id, row.id);
      if (typeof row.position === 'number') maxGalleryPosition = Math.max(maxGalleryPosition, row.position);
    }
  }

  for (const ref of uniqueRefs) {
    if (gameMediaIds.has(ref)) {
      mapping.set(ref, ref);
      continue;
    }

    const existingGalleryId = galleryByMediaId.get(ref);
    if (existingGalleryId) {
      mapping.set(ref, existingGalleryId);
      continue;
    }

    maxGalleryPosition += 1;
    const { data: inserted, error } = await supabase
      .from('game_media')
      .insert({
        game_id: gameId,
        media_id: ref,
        kind: 'gallery',
        position: maxGalleryPosition,
        tenant_id: tenantId,
      })
      .select('id')
      .single();

    if (!error && inserted?.id) {
      mapping.set(ref, inserted.id);
      gameMediaIds.add(inserted.id);
      galleryByMediaId.set(ref, inserted.id);
    }
  }

  return mapping;
}

function asEnergyLevel(value: unknown): EnergyLevel | null {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return null;
}

function asLocationType(value: unknown): LocationType | null {
  if (value === 'indoor' || value === 'outdoor' || value === 'both') return value;
  return null;
}

function asGameStatus(value: unknown): GameStatus {
  if (value === 'published') return 'published';
  return 'draft';
}

function toJson(value: unknown): Json | null {
  if (value === null || value === undefined) return null;
  return value as Json;
}

type CorePayload = {
  name?: string;
  short_description?: string;
  description?: string | null;
  status?: string;
  main_purpose_id?: string | null;
  product_id?: string | null;
  owner_tenant_id?: string | null;
  category?: string | null;
  energy_level?: string | null;
  location_type?: string | null;
  time_estimate_min?: number | null;
  duration_max?: number | null;
  min_players?: number | null;
  max_players?: number | null;
  players_recommended?: number | null;
  age_min?: number | null;
  age_max?: number | null;
  play_mode?: string | null;
  difficulty?: string | null;
  accessibility_notes?: string | null;
  space_requirements?: string | null;
  leader_tips?: string | null;
};

type StepPayload = {
  id?: string;
  locale?: string | null;
  step_order?: number;
  title?: string;
  body?: string;
  duration_seconds?: number | null;
  leader_script?: string | null;
  participant_prompt?: string | null;
  board_text?: string | null;
  media_ref?: string | null;
  optional?: boolean;
  conditional?: string | null;
};

type MaterialsPayload = {
  locale?: string | null;
  items?: string[];
  safety_notes?: string | null;
  preparation?: string | null;
};

type ArtifactVariantPayload = {
  id?: string;
  title?: string | null;
  body?: string | null;
  media_ref?: string | null;
  variant_order?: number;
  visibility?: string;
  visible_to_role_id?: string | null;
  metadata?: Record<string, unknown> | null;
  step_index?: number | null;
  phase_index?: number | null;
};

type ArtifactPayload = {
  id?: string;
  title?: string;
  description?: string | null;
  artifact_type?: string;
  artifact_order?: number;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  locale?: string | null;
  variants?: ArtifactVariantPayload[];
};

type PhasePayload = {
  id?: string;
  locale?: string | null;
  name: string;
  phase_type?: string;
  phase_order?: number;
  duration_seconds?: number | null;
  timer_visible?: boolean;
  timer_style?: string;
  description?: string | null;
  board_message?: string | null;
  auto_advance?: boolean;
};

type RolePayload = {
  id?: string;
  locale?: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  role_order?: number;
  public_description?: string | null;
  private_instructions: string;
  private_hints?: string | null;
  min_count?: number;
  max_count?: number | null;
  assignment_strategy?: string;
  scaling_rules?: Record<string, number> | null;
  conflicts_with?: string[];
};

type BoardConfigPayload = {
  locale?: string | null;
  show_game_name?: boolean;
  show_current_phase?: boolean;
  show_timer?: boolean;
  show_participants?: boolean;
  show_public_roles?: boolean;
  show_leaderboard?: boolean;
  show_qr_code?: boolean;
  welcome_message?: string | null;
  theme?: string;
  background_media_id?: string | null;
  background_color?: string | null;
  layout_variant?: string;
};

type TriggerPayload = {
  id?: string;
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: Record<string, unknown>;
  actions: Record<string, unknown>[];
  execute_once?: boolean;
  delay_seconds?: number;
  sort_order?: number;
};

type GameToolPayload = {
  tool_key: string;
  enabled?: boolean;
  scope?: string;
};

type BuilderBody = {
  core?: CorePayload;
  steps?: StepPayload[];
  materials?: MaterialsPayload;
  phases?: PhasePayload[];
  roles?: RolePayload[];
  boardConfig?: BoardConfigPayload;
  artifacts?: ArtifactPayload[];
  triggers?: TriggerPayload[];
  secondaryPurposes?: string[];
  coverMediaId?: string | null;
  tools?: GameToolPayload[];
};

const VALID_TOOL_KEYS = new Set<string>(TOOL_REGISTRY.map((t) => t.key));

function normalizeToolScope(value: unknown): 'host' | 'participants' | 'both' {
  if (value === 'host' || value === 'participants' || value === 'both') return value;
  return 'both';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: steps } = await supabase
    .from('game_steps')
    .select('*')
    .eq('game_id', id)
    .order('step_order', { ascending: true });

  // Builder UI works with media.id values. DB stores media_ref as game_media.id.
  // Map game_media.id -> media.id for steps and artifact variants.
  const stepGameMediaIds = Array.from(
    new Set(
      (steps ?? [])
        .map((s) => (s as { media_ref?: string | null }).media_ref ?? null)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    )
  );

  const { data: materials } = await supabase
    .from('game_materials')
    .select('*')
    .eq('game_id', id)
    .maybeSingle();

  const { data: phases } = await supabase
    .from('game_phases')
    .select('*')
    .eq('game_id', id)
    .order('phase_order', { ascending: true });

  const { data: roles } = await supabase
    .from('game_roles')
    .select('*')
    .eq('game_id', id)
    .order('role_order', { ascending: true });

  const { data: boardConfig } = await supabase
    .from('game_board_config')
    .select('*')
    .eq('game_id', id)
    .maybeSingle();

  const { data: gameTools } = await supabase
    .from('game_tools')
    .select('tool_key, enabled, scope')
    .eq('game_id', id)
    .order('created_at', { ascending: true });

  const { data: secondaryPurposes } = await supabase
    .from('game_secondary_purposes')
    .select('purpose_id')
    .eq('game_id', id);

  const { data: coverMedia } = await supabase
    .from('game_media')
    .select('media_id, media:media(url, alt_text, id)')
    .eq('game_id', id)
    .eq('kind', 'cover')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: artifacts } = await supabase
    .from('game_artifacts')
    .select('*')
    .eq('game_id', id)
    .order('artifact_order', { ascending: true });

  const artifactIds = (artifacts ?? []).map((a: { id: string }) => a.id).filter(Boolean);
  const { data: artifactVariants } = artifactIds.length
    ? await supabase
        .from('game_artifact_variants')
        .select('*')
        .in('artifact_id', artifactIds)
        .order('variant_order', { ascending: true })
    : { data: [] as unknown[] | null };

  const variantGameMediaIds = Array.from(
    new Set(
      (artifactVariants ?? [])
        .map((v) => (v as { media_ref?: string | null }).media_ref ?? null)
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
    )
  );

  const allGameMediaIds = Array.from(new Set([...stepGameMediaIds, ...variantGameMediaIds]));
  const gameMediaIdToMediaId = new Map<string, string>();
  if (allGameMediaIds.length > 0) {
    const { data: gameMediaRows } = await supabase
      .from('game_media')
      .select('id, media_id')
      .in('id', allGameMediaIds);

    for (const row of (gameMediaRows ?? []) as Array<{ id: string; media_id: string }>) {
      if (row?.id && row?.media_id) gameMediaIdToMediaId.set(row.id, row.media_id);
    }
  }

  const stepsForBuilder = (steps ?? []).map((s) => {
    const gmId = (s as { media_ref?: string | null }).media_ref ?? null;
    return {
      ...s,
      media_ref: gmId ? (gameMediaIdToMediaId.get(gmId) ?? gmId) : null,
    };
  });

  const artifactVariantsForBuilder = (artifactVariants ?? []).map((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const v = raw as Record<string, unknown> & { media_ref?: string | null };
    const gmId = typeof v.media_ref === 'string' ? v.media_ref : null;
    return {
      ...v,
      media_ref: gmId ? (gameMediaIdToMediaId.get(gmId) ?? gmId) : null,
    };
  });

  const variantsByArtifact: Record<string, unknown[]> = {};
  for (const rawVariant of artifactVariantsForBuilder ?? []) {
    if (!rawVariant || typeof rawVariant !== 'object') continue;
    const artifactId = (rawVariant as { artifact_id?: unknown }).artifact_id;
    if (typeof artifactId !== 'string' || !artifactId) continue;
    variantsByArtifact[artifactId] = variantsByArtifact[artifactId] || [];
    variantsByArtifact[artifactId].push(rawVariant);
  }

  const artifactsWithVariants = (artifacts ?? []).map((a: { id: string } & Record<string, unknown>) => ({
    ...a,
    variants: variantsByArtifact[a.id] ?? [],
  }));

  // Fetch triggers
  const { data: triggers } = await supabase
    .from('game_triggers')
    .select('*')
    .eq('game_id', id)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    game,
    steps: stepsForBuilder,
    materials: materials || null,
    phases: phases || [],
    roles: roles || [],
    boardConfig: boardConfig || null,
    gameTools: gameTools || [],
    secondaryPurposes: (secondaryPurposes || []).map((p: { purpose_id: string }) => p.purpose_id),
    coverMedia: coverMedia
      ? {
          media_id: coverMedia.media_id,
          url: (coverMedia.media as { url?: string } | null)?.url ?? null,
          alt_text: (coverMedia.media as { alt_text?: string | null } | null)?.alt_text ?? null,
        }
      : null,
    artifacts: artifactsWithVariants,
    triggers: triggers || [],
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const body = (await request.json().catch(() => ({}))) as BuilderBody;

  const core = body.core;
  if (!core?.name?.trim() || !core.short_description?.trim()) {
    return NextResponse.json({ error: 'name and short_description are required' }, { status: 400 });
  }

  const updateGame = {
    name: core.name.trim(),
    short_description: core.short_description.trim(),
    description: core.description ?? null,
    status: asGameStatus(core.status),
    main_purpose_id: core.main_purpose_id ?? null,
    product_id: core.product_id ?? null,
    owner_tenant_id: core.owner_tenant_id ?? null,
    category: core.category ?? null,
    energy_level: asEnergyLevel(core.energy_level),
    location_type: asLocationType(core.location_type),
    time_estimate_min: core.time_estimate_min ?? null,
    duration_max: core.duration_max ?? null,
    min_players: core.min_players ?? null,
    max_players: core.max_players ?? null,
    players_recommended: core.players_recommended ?? null,
    age_min: core.age_min ?? null,
    age_max: core.age_max ?? null,
    play_mode: core.play_mode ?? 'basic',
    game_content_version: 'v2',
    difficulty: core.difficulty ?? null,
    accessibility_notes: core.accessibility_notes ?? null,
    space_requirements: core.space_requirements ?? null,
    leader_tips: core.leader_tips ?? null,
  };

  const { error: updateError } = await supabase
    .from('games')
    .update(updateGame)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update game', details: updateError.message }, { status: 500 });
  }

  const rawStepRefs = (body.steps ?? [])
    .map((s) => s.media_ref)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  const rawVariantRefs = (body.artifacts ?? [])
    .flatMap((a) => a.variants ?? [])
    .map((v) => v.media_ref)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  const mediaRefMap = await resolveMediaRefsToGameMediaIds({
    supabase,
    gameId: id,
    tenantId: core.owner_tenant_id ?? null,
    refs: [...rawStepRefs, ...rawVariantRefs],
  });

  // Update steps - preserve IDs for existing steps, create new for new ones
  const steps = body.steps ?? [];
  const stepIdsToKeep = steps.filter((s) => isUuid(s.id)).map((s) => s.id as string);
  
  // Delete steps that are no longer present
  if (stepIdsToKeep.length > 0) {
    await supabase.from('game_steps').delete().eq('game_id', id).not('id', 'in', `(${stepIdsToKeep.join(',')})`);
  } else {
    await supabase.from('game_steps').delete().eq('game_id', id);
  }
  
  if (steps.length > 0) {
    const rows = steps.map((s, idx) => ({
      ...(isUuid(s.id) ? { id: s.id } : {}),
      game_id: id,
      locale: s.locale ?? null,
      step_order: s.step_order ?? idx,
      title: s.title ?? null,
      body: s.body ?? null,
      duration_seconds: s.duration_seconds ?? null,
      leader_script: s.leader_script ?? null,
      participant_prompt: s.participant_prompt ?? null,
      board_text: s.board_text ?? null,
      media_ref: isUuid(s.media_ref) ? (mediaRefMap.get(s.media_ref) ?? null) : null,
      optional: s.optional ?? false,
      conditional: s.conditional ?? null,
    }));
    await supabase.from('game_steps').upsert(rows, { onConflict: 'id' });
  }

  if (body.materials) {
    const m = body.materials;
    const materialLocale = m.locale ?? null;
    // Delete existing materials for this game+locale, then insert fresh
    // (materials are not referenced by triggers, so ID change is safe)
    await supabase
      .from('game_materials')
      .delete()
      .eq('game_id', id)
      .is('locale', materialLocale);
    
    await supabase.from('game_materials').insert({
      game_id: id,
      locale: materialLocale,
      items: m.items ?? [],
      safety_notes: m.safety_notes ?? null,
      preparation: m.preparation ?? null,
    });
  }

  // Replace secondary purposes
  await supabase.from('game_secondary_purposes').delete().eq('game_id', id);
  const secondaryPurposes = body.secondaryPurposes ?? [];
  if (secondaryPurposes.length > 0) {
    const purposeRows = secondaryPurposes.map((purposeId: string) => ({
      game_id: id,
      purpose_id: purposeId,
    }));
    await supabase.from('game_secondary_purposes').insert(purposeRows);
  }

  // Replace toolbelt configuration (optional)
  if (Array.isArray(body.tools)) {
    const rows = body.tools
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        game_id: id,
        tool_key: String(t.tool_key || '').trim(),
        enabled: typeof t.enabled === 'boolean' ? t.enabled : true,
        scope: normalizeToolScope(t.scope),
      }))
      .filter((t) => t.tool_key && VALID_TOOL_KEYS.has(t.tool_key));

    // Keep schema simple: we persist one row per tool key (even when disabled)
    if (rows.length > 0) {
      const { error: toolsError } = await supabase
        .from('game_tools')
        .upsert(rows, { onConflict: 'game_id,tool_key' });
      if (toolsError) {
        if (toolsError.code === 'PGRST205') {
          return NextResponse.json(
            {
              error:
                "Toolbelt DB is not migrated: missing table public.game_tools. Apply migration supabase/migrations/20260102120000_game_tools_v1.sql and reload PostgREST schema.",
              details: {
                message: toolsError.message,
                code: toolsError.code,
                hint: toolsError.hint,
                details: toolsError.details,
              },
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          {
            error: `Failed to save tools: ${toolsError.message}`,
            details: { message: toolsError.message, code: toolsError.code, hint: toolsError.hint, details: toolsError.details },
          },
          { status: 500 }
        );
      }
    }
  }

  // Update phases - preserve IDs for existing phases
  const phases = body.phases ?? [];
  const phaseIdsToKeep = phases.filter((p) => isUuid(p.id)).map((p) => p.id as string);
  
  if (phaseIdsToKeep.length > 0) {
    await supabase.from('game_phases').delete().eq('game_id', id).not('id', 'in', `(${phaseIdsToKeep.join(',')})`);
  } else {
    await supabase.from('game_phases').delete().eq('game_id', id);
  }
  
  if (phases.length > 0) {
    const phaseRows = phases.map((p, idx) => ({
      ...(isUuid(p.id) ? { id: p.id } : {}),
      game_id: id,
      locale: p.locale ?? null,
      name: p.name,
      phase_type: p.phase_type ?? 'round',
      phase_order: p.phase_order ?? idx,
      duration_seconds: p.duration_seconds ?? null,
      timer_visible: p.timer_visible ?? true,
      timer_style: p.timer_style ?? 'countdown',
      description: p.description ?? null,
      board_message: p.board_message ?? null,
      auto_advance: p.auto_advance ?? false,
    }));
    await supabase.from('game_phases').upsert(phaseRows, { onConflict: 'id' });
  }

  // Update roles - preserve IDs for existing roles
  const roles = body.roles ?? [];
  const roleIdsToKeep = roles.filter((r) => isUuid(r.id)).map((r) => r.id as string);
  
  if (roleIdsToKeep.length > 0) {
    await supabase.from('game_roles').delete().eq('game_id', id).not('id', 'in', `(${roleIdsToKeep.join(',')})`);
  } else {
    await supabase.from('game_roles').delete().eq('game_id', id);
  }
  
  if (roles.length > 0) {
    const roleRows = roles.map((r, idx) => ({
      ...(isUuid(r.id) ? { id: r.id } : {}),
      game_id: id,
      locale: r.locale ?? null,
      name: r.name,
      icon: r.icon ?? null,
      color: r.color ?? null,
      role_order: r.role_order ?? idx,
      public_description: r.public_description ?? null,
      private_instructions: r.private_instructions ?? null,
      private_hints: r.private_hints ?? null,
      min_count: r.min_count ?? 0,
      max_count: r.max_count ?? null,
      assignment_strategy: r.assignment_strategy ?? 'random',
      scaling_rules: r.scaling_rules ?? null,
      conflicts_with: r.conflicts_with ?? null,
    }));
    await supabase.from('game_roles').upsert(roleRows, { onConflict: 'id' });
  }

  // Update board config (upsert pattern)
  if (body.boardConfig) {
    const bc = body.boardConfig;
    // Validate: at least one element visible OR welcome_message set
    const hasContent = bc.show_game_name || bc.show_current_phase || 
      bc.show_timer || bc.show_participants || bc.show_public_roles || 
      bc.show_leaderboard || bc.show_qr_code || bc.welcome_message?.trim();
    
    if (hasContent) {
      await supabase.from('game_board_config').upsert({
        game_id: id,
        locale: bc.locale ?? null,
        show_game_name: bc.show_game_name ?? true,
        show_current_phase: bc.show_current_phase ?? true,
        show_timer: bc.show_timer ?? true,
        show_participants: bc.show_participants ?? true,
        show_public_roles: bc.show_public_roles ?? true,
        show_leaderboard: bc.show_leaderboard ?? false,
        show_qr_code: bc.show_qr_code ?? false,
        welcome_message: bc.welcome_message ?? null,
        theme: bc.theme ?? 'neutral',
        background_media_id: bc.background_media_id ?? null,
        background_color: bc.background_color ?? null,
        layout_variant: bc.layout_variant ?? 'standard',
      }, { onConflict: 'game_id,locale', ignoreDuplicates: false });
    } else {
      // No content - remove any existing board config
      await supabase.from('game_board_config').delete().eq('game_id', id);
    }
  }

  // Replace cover media
  await supabase.from('game_media').delete().eq('game_id', id).eq('kind', 'cover');
  if (body.coverMediaId) {
    await supabase.from('game_media').insert({
      game_id: id,
      media_id: body.coverMediaId,
      kind: 'cover',
      position: 0,
      tenant_id: core.owner_tenant_id ?? null,
    });
  }

  // Update artifacts and variants - preserve IDs for existing artifacts
  const artifacts = body.artifacts ?? [];
  const artifactIdsToKeep = artifacts.filter((a) => isUuid(a.id)).map((a) => a.id as string);
  
  // Get existing artifact IDs to clean up orphaned variants
  const { data: existingArtifacts } = await supabase
    .from('game_artifacts')
    .select('id')
    .eq('game_id', id);

  const existingArtifactIds = (existingArtifacts ?? []).map((a: { id: string }) => a.id as string);
  const artifactIdsToDelete = existingArtifactIds.filter((eId) => !artifactIdsToKeep.includes(eId));
  
  // Delete variants for artifacts that will be removed
  if (artifactIdsToDelete.length > 0) {
    await supabase.from('game_artifact_variants').delete().in('artifact_id', artifactIdsToDelete);
    await supabase.from('game_artifacts').delete().in('id', artifactIdsToDelete);
  }
  
  // Also delete all variants for artifacts we're keeping (we'll re-insert them)
  if (artifactIdsToKeep.length > 0) {
    await supabase.from('game_artifact_variants').delete().in('artifact_id', artifactIdsToKeep);
  }

  if (artifacts.length > 0) {
    const artifactRows = artifacts.map((a, idx) => ({
      ...(isUuid(a.id) ? { id: a.id } : {}),
      game_id: id,
      artifact_order: a.artifact_order ?? idx,
      artifact_type: a.artifact_type ?? 'card',
      title: (a.title ?? '').trim() || 'Artefakt',
      description: a.description ?? null,
      tags: a.tags ?? [],
      metadata: toJson(a.metadata),
      locale: a.locale ?? null,
    }));

    const { data: upsertedArtifacts, error: artifactsError } = await supabase
      .from('game_artifacts')
      .upsert(artifactRows, { onConflict: 'id' })
      .select();

    if (artifactsError) {
      return NextResponse.json({ error: 'Failed to save artifacts', details: artifactsError.message }, { status: 500 });
    }

    const upsertedArtifactsSafe = (upsertedArtifacts ?? []) as Array<{ id: string }>;

    // Build a map from frontend artifact order to the actual artifact ID
    const artifactIdByOrder = new Map<number, string>();
    upsertedArtifactsSafe.forEach((art, idx) => {
      artifactIdByOrder.set(idx, art.id);
    });

    const variantRows = artifacts.flatMap((source, idx) => {
      const artifactId = artifactIdByOrder.get(idx);
      if (!artifactId) return [];
      
      const variants = source?.variants ?? [];

      return variants.map((v, j) => {
        const meta: Record<string, unknown> = { ...(v.metadata ?? {}) };
        if (v.step_index !== undefined && v.step_index !== null) meta.step_index = v.step_index;
        if (v.phase_index !== undefined && v.phase_index !== null) meta.phase_index = v.phase_index;
        const hasMetadata = Object.keys(meta).length > 0;

        return {
          artifact_id: artifactId,
          variant_order: v.variant_order ?? j,
          visibility: v.visibility ?? 'public',
          visible_to_role_id: v.visible_to_role_id ?? null,
          title: v.title ?? null,
          body: v.body ?? null,
          media_ref: typeof v.media_ref === 'string' && isUuid(v.media_ref)
            ? (mediaRefMap.get(v.media_ref) ?? null)
            : null,
          metadata: hasMetadata ? toJson(meta) : null,
        };
      });
    });

    if (variantRows.length > 0) {
      const { error: variantsError } = await supabase.from('game_artifact_variants').insert(variantRows);
      if (variantsError) {
        return NextResponse.json({ error: 'Failed to save artifact variants', details: variantsError.message }, { status: 500 });
      }
    }
  }

  // Update triggers - preserve IDs for existing triggers
  const triggers = body.triggers ?? [];
  const triggerIdsToKeep = triggers.filter((t) => isUuid(t.id)).map((t) => t.id as string);
  
  if (triggerIdsToKeep.length > 0) {
    await supabase.from('game_triggers').delete().eq('game_id', id).not('id', 'in', `(${triggerIdsToKeep.join(',')})`);
  } else {
    await supabase.from('game_triggers').delete().eq('game_id', id);
  }
  
  if (triggers.length > 0) {
    const triggerRows = triggers.map((t, idx) => ({
      ...(isUuid(t.id) ? { id: t.id } : {}),
      game_id: id,
      name: t.name || 'Trigger',
      description: t.description ?? null,
      enabled: t.enabled ?? true,
      condition: toJson(t.condition) ?? ({} as Json),
      actions: toJson(t.actions ?? []) ?? ([] as unknown as Json),
      execute_once: t.execute_once ?? false,
      delay_seconds: t.delay_seconds ?? 0,
      sort_order: t.sort_order ?? idx,
    }));
    const { error: triggersError } = await supabase.from('game_triggers').upsert(triggerRows, { onConflict: 'id' });
    if (triggersError) {
      return NextResponse.json({ error: 'Failed to save triggers', details: triggersError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
