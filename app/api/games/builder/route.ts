import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createServiceRoleClient() as any;
  const body = (await request.json().catch(() => ({}))) as {
    core?: CorePayload;
    steps?: StepPayload[];
    materials?: MaterialsPayload;
  };

  const core = body.core;
  if (!core || !core.name?.trim() || !core.short_description?.trim()) {
    return NextResponse.json({ error: 'name and short_description are required' }, { status: 400 });
  }

  const insertGame = {
    name: core.name.trim(),
    short_description: core.short_description.trim(),
    description: core.description ?? null,
    status: core.status ?? 'draft',
    main_purpose_id: core.main_purpose_id ?? null,
    product_id: core.product_id ?? null,
    owner_tenant_id: core.owner_tenant_id ?? null,
    category: core.category ?? null,
    energy_level: core.energy_level ?? null,
    location_type: core.location_type ?? null,
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

  return NextResponse.json({ gameId: game.id, session: game });
}
