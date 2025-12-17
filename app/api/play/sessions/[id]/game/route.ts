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

type GameStepRow = Database['public']['Tables']['game_steps']['Row'];
type GamePhaseRow = Database['public']['Tables']['game_phases']['Row'];

type StepInfo = {
  id: string;
  index: number;
  title: string;
  description: string;
  content?: string;
  durationMinutes?: number;
  duration?: number | null;
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
};

type PhaseInfo = {
  id: string;
  index: number;
  name: string;
  description?: string;
  duration?: number | null;
};

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
      .select('id, display_name, host_user_id, game_id')
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

    const steps: StepInfo[] = mergedSteps.map((s, index) => {
      const durationSeconds = s.duration_seconds ?? null;
      const durationMinutes = durationSeconds ? Math.ceil(durationSeconds / 60) : undefined;

      return {
        id: s.id,
        index,
        title: s.title || `Steg ${index + 1}`,
        description: s.body || '',
        content: s.body || '',
        durationMinutes,
        duration: durationSeconds,
        materials: materialsRow?.items ?? undefined,
        safety: materialsRow?.safety_notes ?? undefined,
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

    return NextResponse.json({
      title: game?.name || session.display_name,
      steps,
      phases,
    });
  } catch (error) {
    console.error('Error fetching session game content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session game content' },
      { status: 500 }
    );
  }
}
