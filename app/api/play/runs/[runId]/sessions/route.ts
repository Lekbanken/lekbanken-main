/**
 * Run Session API
 * 
 * POST /api/play/runs/:runId/sessions
 *   Creates a participant_session for a session_game step, links it via run_sessions.
 * 
 * GET /api/play/runs/:runId/sessions?stepIndex=0
 *   Returns the run_session record for a given step (with participant_session data).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { CreateSessionOptions } from '@/lib/services/participants/session-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const stepIndex = Number(request.nextUrl.searchParams.get('stepIndex') ?? '0');

  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify run ownership via RLS (runs table has RLS)
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  // Fetch run_session for this step — TEMP: cast to bypass missing generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { data: runSession, error: rsError } = await (supabase as any)
    .from('run_sessions')
    .select('*')
    .eq('run_id', runId)
    .eq('step_index', stepIndex)
    .maybeSingle();

  if (rsError) {
    return NextResponse.json({ error: 'Failed to fetch run session' }, { status: 500 });
  }

  if (!runSession) {
    return NextResponse.json({ runSession: null });
  }

  // If there's a linked participant_session, fetch its details
  let participantSession = null;
  if (runSession.session_id) {
    const { data: ps } = await supabase
      .from('participant_sessions')
      .select('id, session_code, display_name, status, participant_count, created_at, expires_at, game_id')
      .eq('id', runSession.session_id)
      .single();
    participantSession = ps ? {
      id: ps.id,
      sessionCode: ps.session_code,
      displayName: ps.display_name,
      status: ps.status,
      participantCount: ps.participant_count,
      createdAt: ps.created_at,
      expiresAt: ps.expires_at,
      gameId: ps.game_id,
    } : null;
  }

  return NextResponse.json({
    runSession: {
      id: runSession.id,
      runId: runSession.run_id,
      stepIndex: runSession.step_index,
      sessionId: runSession.session_id,
      status: runSession.status,
      createdAt: runSession.created_at,
      updatedAt: runSession.updated_at,
      participantSession,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { stepIndex, gameId, displayName } = body as {
    stepIndex: number;
    gameId: string;
    displayName?: string;
  };

  if (typeof stepIndex !== 'number' || !gameId) {
    return NextResponse.json({ error: 'stepIndex and gameId are required' }, { status: 400 });
  }

  // Verify run ownership via RLS
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id, plan_version_id, plan_versions!inner(plan_id)')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  // Extract plan_id from the joined plan_versions
  const planId = (run.plan_versions as unknown as { plan_id: string })?.plan_id ?? null;

  // Check if there's already a run_session with an active participant_session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { data: existing } = await (supabase as any)
    .from('run_sessions')
    .select('*')
    .eq('run_id', runId)
    .eq('step_index', stepIndex)
    .maybeSingle();

  if (existing?.session_id && existing.status !== 'abandoned') {
    // Already has a session — return current state
    const { data: ps } = await supabase
      .from('participant_sessions')
      .select('id, session_code, display_name, status, participant_count, created_at, expires_at, game_id')
      .eq('id', existing.session_id)
      .single();

    return NextResponse.json({
      runSession: {
        id: existing.id,
        runId: existing.run_id,
        stepIndex: existing.step_index,
        sessionId: existing.session_id,
        status: existing.status,
        participantSession: ps ? {
          id: ps.id,
          sessionCode: ps.session_code,
          displayName: ps.display_name,
          status: ps.status,
          participantCount: ps.participant_count,
          gameId: ps.game_id,
        } : null,
      },
      alreadyExists: true,
    });
  }

  // Resolve tenant ID
  let tenantId = await getRequestTenantId();
  if (!tenantId) {
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    tenantId = membership?.tenant_id ?? null;
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
  }

  // Create participant_session
  const sessionName = displayName?.trim() || `Session – Steg ${stepIndex + 1}`;
  const session = await ParticipantSessionService.createSession({
    tenantId,
    hostUserId: user.id,
    displayName: sessionName,
    gameId,
    planId,
    settings: {} as CreateSessionOptions['settings'],
  });

  // Defensive 409 guard: if an existing run_session already links to a DIFFERENT
  // session_id, refuse the overwrite. This catches cross-run session reuse bugs.
  if (existing?.session_id && existing.session_id !== session.id) {
    console.warn('[run-sessions] 409 conflict: tried to overwrite session_id', {
      runId,
      stepIndex,
      existingSessionId: existing.session_id,
      newSessionId: session.id,
    });
    return NextResponse.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'This run step already has a different session linked',
        },
      },
      { status: 409 }
    );
  }

  // Upsert run_session linking to the new participant_session — TEMP: cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { data: runSession, error: upsertError } = await (supabase as any)
    .from('run_sessions')
    .upsert(
      {
        run_id: runId,
        step_index: stepIndex,
        session_id: session.id,
        status: 'active',
      },
      { onConflict: 'run_id,step_index' }
    )
    .select('*')
    .single();

  if (upsertError) {
    console.error('[run-sessions] upsert error:', upsertError);
    return NextResponse.json(
      { error: 'Failed to link session to run', details: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    runSession: {
      id: runSession.id,
      runId: runSession.run_id,
      stepIndex: runSession.step_index,
      sessionId: session.id,
      status: runSession.status,
      participantSession: {
        id: session.id,
        sessionCode: session.session_code,
        displayName: session.display_name,
        status: session.status,
        participantCount: session.participant_count,
        gameId: session.game_id,
      },
    },
  });
}
