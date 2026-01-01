import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';

type EnergyLevel = Database['public']['Enums']['energy_level_enum'];
type LocationType = Database['public']['Enums']['location_type_enum'];

type GameStatus = 'draft' | 'published';

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
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: Record<string, unknown>;
  actions: Record<string, unknown>[];
  execute_once?: boolean;
  delay_seconds?: number;
  sort_order?: number;
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
};

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

  const variantsByArtifact: Record<string, unknown[]> = {};
  for (const rawVariant of artifactVariants ?? []) {
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
    steps: steps || [],
    materials: materials || null,
    phases: phases || [],
    roles: roles || [],
    boardConfig: boardConfig || null,
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

  // Replace steps
  await supabase.from('game_steps').delete().eq('game_id', id);
  const steps = body.steps ?? [];
  if (steps.length > 0) {
    const rows = steps.map((s, idx) => ({
      game_id: id,
      locale: s.locale ?? null,
      step_order: s.step_order ?? idx,
      title: s.title ?? null,
      body: s.body ?? null,
      duration_seconds: s.duration_seconds ?? null,
      leader_script: s.leader_script ?? null,
      participant_prompt: s.participant_prompt ?? null,
      board_text: s.board_text ?? null,
      media_ref: s.media_ref ?? null,
      optional: s.optional ?? false,
      conditional: s.conditional ?? null,
    }));
    await supabase.from('game_steps').insert(rows);
  }

  if (body.materials) {
    const m = body.materials;
    await supabase
      .from('game_materials')
      .upsert({
        game_id: id,
        locale: m.locale ?? null,
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

  // Replace phases (upsert pattern: delete all, insert new)
  const phases = body.phases ?? [];
  await supabase.from('game_phases').delete().eq('game_id', id);
  if (phases.length > 0) {
    const phaseRows = phases.map((p, idx) => ({
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
    await supabase.from('game_phases').insert(phaseRows);
  }

  // Replace roles (upsert pattern: delete all, insert new)
  const roles = body.roles ?? [];
  await supabase.from('game_roles').delete().eq('game_id', id);
  if (roles.length > 0) {
    const roleRows = roles.map((r, idx) => ({
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
    await supabase.from('game_roles').insert(roleRows);
  }

  // Replace board config (upsert pattern: delete all, insert new)
  await supabase.from('game_board_config').delete().eq('game_id', id);
  if (body.boardConfig) {
    const bc = body.boardConfig;
    // Validate: at least one element visible OR welcome_message set
    const hasContent = bc.show_game_name || bc.show_current_phase || 
      bc.show_timer || bc.show_participants || bc.show_public_roles || 
      bc.show_leaderboard || bc.show_qr_code || bc.welcome_message?.trim();
    
    if (hasContent) {
      await supabase.from('game_board_config').insert({
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
      });
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

  // Replace artifacts and variants
  const artifacts = body.artifacts ?? [];
  const { data: existingArtifacts } = await supabase
    .from('game_artifacts')
    .select('id')
    .eq('game_id', id);

  const artifactIds = (existingArtifacts ?? []).map((a: { id: string }) => a.id as string);
  if (artifactIds.length > 0) {
    await supabase.from('game_artifact_variants').delete().in('artifact_id', artifactIds);
  }
  await supabase.from('game_artifacts').delete().eq('game_id', id);

  if (artifacts.length > 0) {
    const artifactRows = artifacts.map((a, idx) => ({
      game_id: id,
      artifact_order: a.artifact_order ?? idx,
      artifact_type: a.artifact_type ?? 'card',
      title: (a.title ?? '').trim() || 'Artefakt',
      description: a.description ?? null,
      tags: a.tags ?? [],
      metadata: toJson(a.metadata),
      locale: a.locale ?? null,
    }));

    const { data: insertedArtifacts, error: artifactsError } = await supabase
      .from('game_artifacts')
      .insert(artifactRows)
      .select();

    if (artifactsError) {
      return NextResponse.json({ error: 'Failed to save artifacts', details: artifactsError.message }, { status: 500 });
    }

    const insertedArtifactsSafe = (insertedArtifacts ?? []) as Array<{ id: string }>;

    const variantRows = insertedArtifactsSafe.flatMap((art: { id: string }, idx: number) => {
      const source = artifacts[idx];
      const variants = source?.variants ?? [];

      return variants.map((v, j) => {
        const meta: Record<string, unknown> = { ...(v.metadata ?? {}) };
        if (v.step_index !== undefined && v.step_index !== null) meta.step_index = v.step_index;
        if (v.phase_index !== undefined && v.phase_index !== null) meta.phase_index = v.phase_index;
        const hasMetadata = Object.keys(meta).length > 0;

        return {
          artifact_id: art.id,
          variant_order: v.variant_order ?? j,
          visibility: v.visibility ?? 'public',
          visible_to_role_id: v.visible_to_role_id ?? null,
          title: v.title ?? null,
          body: v.body ?? null,
          media_ref: v.media_ref ?? null,
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

  // Replace triggers (delete all, insert new)
  const triggers = body.triggers ?? [];
  await supabase.from('game_triggers').delete().eq('game_id', id);
  if (triggers.length > 0) {
    const triggerRows = triggers.map((t, idx) => ({
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
    const { error: triggersError } = await supabase.from('game_triggers').insert(triggerRows);
    if (triggersError) {
      return NextResponse.json({ error: 'Failed to save triggers', details: triggersError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
