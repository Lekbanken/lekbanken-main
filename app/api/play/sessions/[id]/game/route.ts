/**
 * GET /api/play/sessions/[id]/game
 *
 * Returns game content (title, steps, phases) for a play session.
 *
 * Access:
 * - Host (authenticated) for their own sessions (or system_admin)
 * - Participants via x-participant-token for the given session
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import type { BoardTheme } from '@/types/games';

type GameStepRow = Database['public']['Tables']['game_steps']['Row'];
type GamePhaseRow = Database['public']['Tables']['game_phases']['Row'];
type GameToolRow = Database['public']['Tables']['game_tools']['Row'];

type StepInfo = {
  id: string;
  index: number;
  title: string;
  description: string;
  content?: string;
  durationMinutes?: number;
  duration?: number | null;
  display_mode?: 'instant' | 'typewriter' | 'dramatic' | null;
  media?: { type: string; url: string; altText?: string };
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
  leaderScript?: string;
};

type PhaseInfo = {
  id: string;
  index: number;
  name: string;
  description?: string;
  duration?: number | null;
};

type ToolInfo = Pick<GameToolRow, 'tool_key' | 'enabled' | 'scope'>;

type AdminOverrides = {
  steps?: Array<{
    id: string;
    title?: string;
    description?: string;
    durationMinutes?: number;
    order?: number;
    display_mode?: 'instant' | 'typewriter' | 'dramatic' | null;
  }>;
  phases?: Array<{
    id: string;
    name?: string;
    description?: string;
    duration?: number | null;
    order?: number;
  }>;
  safety?: {
    safetyNotes?: string;
    accessibilityNotes?: string;
    spaceRequirements?: string;
    leaderTips?: string;
  };
};

function applyStepOverrides(steps: StepInfo[], overrides?: AdminOverrides['steps']): StepInfo[] {
  if (!overrides || overrides.length === 0) return steps;

  const map = new Map(overrides.map((o) => [o.id, o]));

  const merged = steps.map((step) => {
    const override = map.get(step.id);
    if (!override) return step;

    const durationMinutes = override.durationMinutes ?? step.durationMinutes;
    const duration = durationMinutes ? durationMinutes * 60 : step.duration;

    return {
      ...step,
      title: override.title ?? step.title,
      description: override.description ?? step.description,
      content: override.description ?? step.content,
      durationMinutes,
      duration,
      display_mode: override.display_mode ?? step.display_mode,
      index: step.index, // will be reindexed after sorting
    };
  });

  const hasOrder = overrides.some((o) => typeof o.order === 'number');
  if (!hasOrder) return merged;

  const orderMap = new Map(overrides.filter((o) => typeof o.order === 'number').map((o) => [o.id, o.order as number]));

  const reordered = [...merged].sort((a, b) => {
    const ao = orderMap.get(a.id);
    const bo = orderMap.get(b.id);
    if (ao === undefined && bo === undefined) return a.index - b.index;
    if (ao === undefined) return 1;
    if (bo === undefined) return -1;
    return ao - bo;
  });

  return reordered.map((step, index) => ({ ...step, index }));
}

function applyPhaseOverrides(phases: PhaseInfo[], overrides?: AdminOverrides['phases']): PhaseInfo[] {
  if (!overrides || overrides.length === 0) return phases;

  const map = new Map(overrides.map((o) => [o.id, o]));

  const merged = phases.map((phase) => {
    const override = map.get(phase.id);
    if (!override) return phase;
    return {
      ...phase,
      name: override.name ?? phase.name,
      description: override.description ?? phase.description,
      duration: override.duration !== undefined ? override.duration : phase.duration,
      index: phase.index,
    };
  });

  const hasOrder = overrides.some((o) => typeof o.order === 'number');
  if (!hasOrder) return merged;

  const orderMap = new Map(overrides.filter((o) => typeof o.order === 'number').map((o) => [o.id, o.order as number]));

  const reordered = [...merged].sort((a, b) => {
    const ao = orderMap.get(a.id);
    const bo = orderMap.get(b.id);
    if (ao === undefined && bo === undefined) return a.index - b.index;
    if (ao === undefined) return 1;
    if (bo === undefined) return -1;
    return ao - bo;
  });

  return reordered.map((phase, index) => ({ ...phase, index }));
}

function pickLocalizedByOrder<T extends { step_order?: number; phase_order?: number }>(
  fallbackRows: T[],
  localeRows: T[],
  key: 'step_order' | 'phase_order'
): T[] {
  const byOrder = new Map<number, T>();
  for (const row of fallbackRows) {
    const order = row[key];
    if (typeof order === 'number') byOrder.set(order, row);
  }
  for (const row of localeRows) {
    const order = row[key];
    if (typeof order === 'number') byOrder.set(order, row);
  }
  return Array.from(byOrder.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const url = new URL(request.url);
    const locale = url.searchParams.get('locale') || null;

    const participantToken = request.headers.get('x-participant-token');

    const supabaseAdmin = await createServiceRoleClient();

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('participant_sessions')
      .select('id, display_name, host_user_id, game_id, settings')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // ------------------------------------------------------------
    // Authorization
    // ------------------------------------------------------------
    let authorized = false;

    // 1) Host auth via request-scoped RLS client
    const supabaseRls = await createServerRlsClient();
    const { data: authData } = await supabaseRls.auth.getUser();
    const user = authData.user;

    if (user) {
      if (session.host_user_id === user.id) {
        authorized = true;
      } else {
        const { data: userData } = await supabaseRls
          .from('users')
          .select('global_role')
          .eq('id', user.id)
          .single();

        if (userData?.global_role === 'system_admin') {
          authorized = true;
        }
      }
    }

    // 2) Participant auth via token
    if (!authorized && participantToken) {
      const { data: participant } = await supabaseAdmin
        .from('participants')
        .select('id, status, token_expires_at')
        .eq('participant_token', participantToken)
        .eq('session_id', sessionId)
        .single();

      if (participant) {
        if (participant.status === 'blocked' || participant.status === 'kicked') {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
          return NextResponse.json({ error: 'Token expired' }, { status: 401 });
        }

        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // No game linked
    if (!session.game_id) {
      return NextResponse.json({
        title: session.display_name,
        steps: [] as StepInfo[],
        phases: [] as PhaseInfo[],
      });
    }

    // ------------------------------------------------------------
    // Fetch game + steps/phases (locale fallback: prefer exact locale, else NULL)
    // ------------------------------------------------------------

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id, name')
      .eq('id', session.game_id)
      .single();

    // Board config (theme) - optional
    const { data: boardConfig } = await supabaseAdmin
      .from('game_board_config')
      .select('theme')
      .eq('game_id', session.game_id)
      .maybeSingle();

    // Enabled toolbelt tools for this game
    const { data: tools } = await supabaseAdmin
      .from('game_tools')
      .select('tool_key, enabled, scope')
      .eq('game_id', session.game_id)
      .eq('enabled', true);

    // Steps
    const { data: fallbackSteps } = await supabaseAdmin
      .from('game_steps')
      .select('*')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('step_order', { ascending: true });

    const { data: localeSteps } = locale
      ? await supabaseAdmin
          .from('game_steps')
          .select('*')
          .eq('game_id', session.game_id)
          .eq('locale', locale)
          .order('step_order', { ascending: true })
      : { data: [] as GameStepRow[] };

    const mergedSteps = pickLocalizedByOrder(
      (fallbackSteps || []) as GameStepRow[],
      (localeSteps || []) as GameStepRow[],
      'step_order'
    );

    // Resolve media references for steps (game_steps.media_ref -> game_media.id -> media)
    const mediaRefIds = Array.from(
      new Set(
        (mergedSteps || [])
          .map((s) => (s as GameStepRow & { media_ref?: string | null }).media_ref ?? null)
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      )
    );

    const stepMediaByGameMediaId = new Map<string, { type: string; url: string; altText?: string }>();
    if (mediaRefIds.length > 0) {
      const { data: gameMediaRows } = await supabaseAdmin
        .from('game_media')
        .select('id, media:media_id (id, url, type, alt_text, name)')
        .in('id', mediaRefIds);

      for (const row of (gameMediaRows ?? []) as Array<{
        id: string;
        media?: { id: string; url: string | null; type: string; alt_text: string | null; name: string | null } | null;
      }>) {
        const media = row.media;
        if (!media?.url) continue;
        stepMediaByGameMediaId.set(row.id, {
          type: String(media.type ?? 'unknown'),
          url: media.url,
          altText: media.alt_text ?? media.name ?? undefined,
        });
      }
    }

    // Materials/safety (single row)
    const { data: materialsRowLocale } = locale
      ? await supabaseAdmin
          .from('game_materials')
          .select('items, safety_notes')
          .eq('game_id', session.game_id)
          .eq('locale', locale)
          .maybeSingle()
      : { data: null as { items: string[] | null; safety_notes: string | null } | null };

    const { data: materialsRowFallback } = await supabaseAdmin
      .from('game_materials')
      .select('items, safety_notes')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .maybeSingle();

    const materialsRow = materialsRowLocale ?? materialsRowFallback;

    // Phases
    const { data: fallbackPhases } = await supabaseAdmin
      .from('game_phases')
      .select('*')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('phase_order', { ascending: true });

    const { data: localePhases } = locale
      ? await supabaseAdmin
          .from('game_phases')
          .select('*')
          .eq('game_id', session.game_id)
          .eq('locale', locale)
          .order('phase_order', { ascending: true })
      : { data: [] as GamePhaseRow[] };

    const mergedPhases = pickLocalizedByOrder(
      (fallbackPhases || []) as GamePhaseRow[],
      (localePhases || []) as GamePhaseRow[],
      'phase_order'
    );

    const adminOverrides = ((session.settings as { admin_overrides?: AdminOverrides } | null)?.admin_overrides) ?? {};

    const steps: StepInfo[] = mergedSteps.map((s, index) => {
      const durationSeconds = s.duration_seconds ?? null;
      const durationMinutes = durationSeconds ? Math.ceil(durationSeconds / 60) : undefined;

      const displayMode =
        s.display_mode === 'instant' || s.display_mode === 'typewriter' || s.display_mode === 'dramatic'
          ? s.display_mode
          : null;

      const mediaRef = (s as GameStepRow & { media_ref?: string | null }).media_ref ?? null;
      const media = mediaRef ? stepMediaByGameMediaId.get(mediaRef) : undefined;

      return {
        id: s.id,
        index,
        title: s.title || `Steg ${index + 1}`,
        description: s.body || '',
        content: s.body || '',
        durationMinutes,
        duration: durationSeconds,
        display_mode: displayMode,
        media,
        materials: materialsRow?.items ?? undefined,
        safety: materialsRow?.safety_notes ?? undefined,
        leaderScript: s.leader_script ?? undefined,
        // Future fields (kept for compatibility with existing UI)
        tag: undefined,
        note: undefined,
      };
    });

    const phases: PhaseInfo[] = mergedPhases.map((p, index) => ({
      id: p.id,
      index,
      name: p.name,
      description: p.description ?? undefined,
      duration: p.duration_seconds ?? null,
    }));

    const mergedStepsWithOverrides = applyStepOverrides(steps, adminOverrides.steps);
    const mergedPhasesWithOverrides = applyPhaseOverrides(phases, adminOverrides.phases);

    return NextResponse.json({
      title: game?.name || session.display_name,
      board: {
        theme: (boardConfig?.theme as BoardTheme | null) ?? 'neutral',
      },
      steps: mergedStepsWithOverrides,
      phases: mergedPhasesWithOverrides,
      tools: (tools ?? []) as ToolInfo[],
      safety: {
        safetyNotes: adminOverrides.safety?.safetyNotes ?? materialsRow?.safety_notes ?? undefined,
        accessibilityNotes: adminOverrides.safety?.accessibilityNotes,
        spaceRequirements: adminOverrides.safety?.spaceRequirements,
        leaderTips: adminOverrides.safety?.leaderTips,
      },
    });
  } catch (error) {
    console.error('Error fetching session game content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session game content' },
      { status: 500 }
    );
  }
}
