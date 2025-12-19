import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await ParticipantSessionService.getSessionByCode(code);
  if (!session) return jsonError('Session not found', 404);

  // Only active/paused sessions should show a board
  if (session.status !== 'active' && session.status !== 'paused') {
    return jsonError('Session is not active', 409);
  }

  const service = await createServiceRoleClient();

  // Game title
  let gameTitle = session.display_name ?? 'Session';
  if (session.game_id) {
    const { data: game } = await service
      .from('games')
      .select('name')
      .eq('id', session.game_id)
      .single();

    if (game?.name) gameTitle = game.name;
  }

  // Board config (locale-agnostic for now: prefer NULL)
  let boardConfig: Record<string, unknown> | null = null;
  if (session.game_id) {
    const { data: cfg } = await service
      .from('game_board_config')
      .select('*')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .single();

    boardConfig = (cfg as unknown as Record<string, unknown>) ?? null;
  }

  // Current phase name (best-effort)
  let currentPhaseName: string | null = null;
  if (session.game_id) {
    const { data: phase } = await service
      .from('game_phases')
      .select('name')
      .eq('game_id', session.game_id)
      .eq('phase_order', session.current_phase_index ?? 0)
      .single();

    currentPhaseName = (phase?.name as string | undefined) ?? null;
  }

  // Revealed public artifacts + highlighted variant
  const { data: sArtifacts } = await service
    .from('session_artifacts')
    .select('id, title, artifact_order')
    .eq('session_id', session.id);

  const artifactIds = (sArtifacts ?? []).map((a) => a.id as string).filter(Boolean);

  const { data: variants } = artifactIds.length
    ? await service
        .from('session_artifact_variants')
        .select(
          'id, session_artifact_id, title, body, media_ref, variant_order, visibility, revealed_at, highlighted_at'
        )
        .in('session_artifact_id', artifactIds)
        .order('variant_order', { ascending: true })
    : {
        data: [] as Array<{
          id?: unknown;
          session_artifact_id?: unknown;
          title?: unknown;
          body?: unknown;
          media_ref?: unknown;
          variant_order?: unknown;
          visibility?: unknown;
          revealed_at?: unknown;
          highlighted_at?: unknown;
        }>,
      };

  const revealed = (variants ?? []).filter(
    (v) => (v.visibility as string) === 'public' && Boolean(v.revealed_at)
  );

  const highlighted = (variants ?? []).find((v) => Boolean(v.highlighted_at)) ?? null;

  // Revealed decision results
  const { data: decisions } = await service
    .from('session_decisions')
    .select('id, title, options, status, revealed_at')
    .eq('session_id', session.id)
    .eq('status', 'revealed')
    .order('created_at', { ascending: true });

  const decisionIds = (decisions ?? []).map((d) => d.id as string).filter(Boolean);

  const { data: votes } = decisionIds.length
    ? await service
        .from('session_votes')
        .select('decision_id, option_key')
        .in('decision_id', decisionIds)
    : { data: [] as Array<{ decision_id?: unknown; option_key?: unknown }> };

  const voteCounts = new Map<string, Record<string, number>>();
  for (const d of decisions ?? []) {
    const options = (d.options as Array<{ key?: string; label?: string }> | null) ?? [];
    const counts: Record<string, number> = {};
    for (const opt of options) {
      if (opt?.key) counts[opt.key] = 0;
    }
    voteCounts.set(d.id as string, counts);
  }

  for (const v of votes ?? []) {
    const dId = v.decision_id as string;
    const key = v.option_key as string;
    const counts = voteCounts.get(dId);
    if (counts && counts[key] !== undefined) counts[key] += 1;
  }

  const decisionResults = (decisions ?? []).map((d) => {
    const options = (d.options as Array<{ key?: string; label?: string }> | null) ?? [];
    const counts = voteCounts.get(d.id as string) ?? {};
    return {
      id: d.id,
      title: d.title,
      results: options.map((o) => ({ key: o.key, label: o.label, count: counts[o.key ?? ''] ?? 0 })),
    };
  });

  // Revealed outcomes
  const { data: outcomes } = await service
    .from('session_outcomes')
    .select('id, title, body, outcome_type, revealed_at, created_at')
    .eq('session_id', session.id)
    .not('revealed_at', 'is', null)
    .order('created_at', { ascending: true });

  return NextResponse.json(
    {
      session: {
        id: session.id,
        code: session.session_code,
        status: session.status,
        current_step_index: session.current_step_index ?? 0,
        current_phase_index: session.current_phase_index ?? 0,
        current_phase_name: currentPhaseName,
        timer_state: session.timer_state ?? null,
        board_state: session.board_state ?? null,
      },
      game: {
        id: session.game_id,
        title: gameTitle,
        board_config: boardConfig,
      },
      artifacts: {
        revealed_public_variants: revealed,
        highlighted_variant: highlighted,
      },
      decisions: {
        revealed: decisionResults,
      },
      outcomes: outcomes ?? [],
    },
    { status: 200 }
  );
}
