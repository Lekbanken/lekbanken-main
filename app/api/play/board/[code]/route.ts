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

  // Allow board for active/paused/locked/ended sessions
  const allowedStatuses = new Set(['active', 'paused', 'locked', 'ended']);
  if (!allowedStatuses.has(session.status)) {
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
  // FIX: Use array indexing after ordering by phase_order, not direct phase_order lookup
  // This avoids off-by-one if phase_order is 1-based while current_phase_index is 0-based
  let currentPhaseName: string | null = null;
  if (session.game_id) {
    const { data: phases } = await service
      .from('game_phases')
      .select('name')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('phase_order', { ascending: true });

    const phase = (phases ?? [])[session.current_phase_index ?? 0];
    currentPhaseName = (phase?.name as string | undefined) ?? null;
  }

  // Current step title + board text (best-effort)
  let currentStepTitle: string | null = null;
  let currentStepBoardText: string | null = null;
  if (session.game_id) {
    const { data: steps } = await service
      .from('game_steps')
      .select('title, board_text, body')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('step_order', { ascending: true });

    const step = (steps ?? [])[session.current_step_index ?? 0];
    if (step) {
      currentStepTitle = (step.title as string | null) ?? null;
      currentStepBoardText = (step.board_text as string | null) ?? null;
      if (!currentStepBoardText) {
        currentStepBoardText = (step.body as string | null) ?? null;
      }
    }
  }

  // V2: Revealed public artifacts + highlighted variant from game_* + session_*_state
  // Fetch game artifacts for this session's game
  const { data: gameArtifacts } = session.game_id
    ? await service
        .from('game_artifacts')
        .select('id, title, artifact_order')
        .eq('game_id', session.game_id)
        .is('locale', null)
        .order('artifact_order', { ascending: true })
    : { data: [] };

  const artifactIds = (gameArtifacts ?? []).map((a) => a.id as string).filter(Boolean);

  // Fetch game artifact variants
  const { data: gameVariants } = artifactIds.length
    ? await service
        .from('game_artifact_variants')
        .select('id, artifact_id, title, body, media_ref, variant_order, visibility')
        .in('artifact_id', artifactIds)
        .order('variant_order', { ascending: true })
    : { data: [] };

  const variantIds = (gameVariants ?? []).map((v) => v.id as string);

  // Fetch variant state for this session
  const { data: variantStates } = variantIds.length
    ? await service
        .from('session_artifact_variant_state')
        .select('game_artifact_variant_id, revealed_at, highlighted_at')
        .eq('session_id', session.id)
        .in('game_artifact_variant_id', variantIds)
    : { data: [] };

  const variantStateMap = new Map<string, { revealed_at: string | null; highlighted_at: string | null }>();
  for (const vs of variantStates ?? []) {
    variantStateMap.set(vs.game_artifact_variant_id as string, {
      revealed_at: vs.revealed_at as string | null,
      highlighted_at: vs.highlighted_at as string | null,
    });
  }

  // Build revealed variants (public + revealed_at set)
  const revealed = (gameVariants ?? [])
    .filter((v) => {
      const visibility = v.visibility as string;
      const state = variantStateMap.get(v.id as string);
      return visibility === 'public' && state?.revealed_at;
    })
    .map((v) => {
      const state = variantStateMap.get(v.id as string);
      return {
        id: v.id,
        session_artifact_id: v.artifact_id, // For backward compat
        title: v.title,
        body: v.body,
        media_ref: v.media_ref,
        variant_order: v.variant_order,
        visibility: v.visibility,
        revealed_at: state?.revealed_at ?? null,
        highlighted_at: state?.highlighted_at ?? null,
      };
    });

  // Find highlighted variant
  const highlightedVariant = (gameVariants ?? []).find((v) => {
    const state = variantStateMap.get(v.id as string);
    return state?.highlighted_at;
  });

  const highlighted = highlightedVariant
    ? {
        id: highlightedVariant.id,
        session_artifact_id: highlightedVariant.artifact_id,
        title: highlightedVariant.title,
        body: highlightedVariant.body,
        media_ref: highlightedVariant.media_ref,
        variant_order: highlightedVariant.variant_order,
        visibility: highlightedVariant.visibility,
        revealed_at: variantStateMap.get(highlightedVariant.id as string)?.revealed_at ?? null,
        highlighted_at: variantStateMap.get(highlightedVariant.id as string)?.highlighted_at ?? null,
      }
    : null;

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
        started_at: session.started_at ?? null,
        ended_at: session.ended_at ?? null,
        current_step_index: session.current_step_index ?? 0,
        current_phase_index: session.current_phase_index ?? 0,
        current_phase_name: currentPhaseName,
        current_step_title: currentStepTitle,
        current_step_board_text: currentStepBoardText,
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
