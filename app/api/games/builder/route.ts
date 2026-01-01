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
  name: string;
  short_description: string;
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

type BuilderBody = {
  core?: CorePayload;
  steps?: StepPayload[];
  materials?: MaterialsPayload;
  artifacts?: ArtifactPayload[];
  secondaryPurposes?: string[];
  coverMediaId?: string | null;
};

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  const body = (await request.json().catch(() => ({}))) as BuilderBody;

  const core = body.core;
  if (!core || !core.name?.trim() || !core.short_description?.trim()) {
    return NextResponse.json({ error: 'name and short_description are required' }, { status: 400 });
  }

  const insertGame = {
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

  const { data: game, error } = await supabase.from('games').insert(insertGame).select().single();
  if (error || !game) {
    return NextResponse.json({ error: 'Failed to create game', details: error?.message }, { status: 500 });
  }

  const secondaryPurposes = body.secondaryPurposes ?? [];
  if (secondaryPurposes.length > 0) {
    const purposeRows = secondaryPurposes.map((purposeId: string) => ({
      game_id: game.id,
      purpose_id: purposeId,
    }));
    await supabase.from('game_secondary_purposes').insert(purposeRows);
  }

  if (body.coverMediaId) {
    await supabase.from('game_media').insert({
      game_id: game.id,
      media_id: body.coverMediaId,
      kind: 'cover',
      position: 0,
      tenant_id: core.owner_tenant_id ?? null,
    });
  }

  const steps = body.steps ?? [];
  if (steps.length > 0) {
    const rows = steps.map((s, idx) => ({
      game_id: game.id,
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
    await supabase.from('game_materials').upsert({
      game_id: game.id,
      locale: m.locale ?? null,
      items: m.items ?? [],
      safety_notes: m.safety_notes ?? null,
      preparation: m.preparation ?? null,
    });
  }

  const artifacts = body.artifacts ?? [];
  if (artifacts.length > 0) {
    const artifactRows = artifacts.map((a, idx) => ({
      game_id: game.id,
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

  return NextResponse.json({ gameId: game.id, session: game });
}
