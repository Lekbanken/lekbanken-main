/**
 * POST /api/play/runs/[runId]/sessions/end
 *
 * Force-ends a participant_session linked to a run_session, then marks the
 * run_session as "ended".  Used by the dashboard "Avsluta" button.
 *
 * Semantic distinction:
 *   'completed' = run step finished normally (host advanced past it)
 *   'ended'     = session force-ended from dashboard
 *
 * Body: { stepIndex: number }
 *
 * 200 → { success: true, runSessionStatus, participantSessionStatus }
 * 400 → missing / invalid stepIndex
 * 401 → unauthenticated
 * 404 → run / run_session not found
 * 409 → session already ended / completed
 */

import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logGamificationEventV1 } from '@/lib/services/gamification-events.server'
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server'
import { isTerminalRunSessionStatus } from '@/features/play/types'
import { apiHandler } from '@/lib/api/route-handler'

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { runId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  // Parse body
  const body = await req.json().catch(() => ({}))
  const stepIndex = (body as { stepIndex?: number }).stepIndex

  if (typeof stepIndex !== 'number' || stepIndex < 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'stepIndex is required (number >= 0)' } },
      { status: 400 }
    )
  }

  // ── 1) Verify run ownership (RLS ensures user_id match) ────────────────
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Run not found' } },
      { status: 404 }
    )
  }

  // ── 2) Fetch run_session for this step ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { data: runSession, error: rsError } = await (supabase as any)
    .from('run_sessions')
    .select('id, session_id, status')
    .eq('run_id', runId)
    .eq('step_index', stepIndex)
    .maybeSingle()

  if (rsError || !runSession) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Run session not found for this step' } },
      { status: 404 }
    )
  }

  // Guard: already in terminal state
  if (isTerminalRunSessionStatus(runSession.status)) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: `Session already ${runSession.status}` } },
      { status: 409 }
    )
  }

  // ── 3) End the linked participant_session (if exists) ──────────────────
  let participantSessionStatus: string | null = null

  if (runSession.session_id) {
    const { data: ps } = await supabase
      .from('participant_sessions')
      .select('id, status, tenant_id, game_id, plan_id')
      .eq('id', runSession.session_id)
      .single()

    if (ps && ps.status !== 'ended') {
      const { error: updateError } = await supabase
        .from('participant_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ps.id)

      if (updateError) {
        console.warn('[run-sessions/end] failed to end participant_session', updateError.message)
      } else {
        participantSessionStatus = 'ended'

        // Fire gamification event
        try {
          await logGamificationEventV1({
            tenantId: (ps.tenant_id as string | null) ?? null,
            actorUserId: userId,
            eventType: 'session_completed',
            source: 'play',
            idempotencyKey: `participant_session:${ps.id}:ended`,
            metadata: {
              participantSessionId: ps.id,
              gameId: (ps.game_id as string | null) ?? null,
              planId: (ps.plan_id as string | null) ?? null,
            },
          })
        } catch (e) {
          console.warn('[run-sessions/end] gamification event log failed', e)
        }

        // Broadcast status change for real-time participant updates
        await broadcastPlayEvent(ps.id, {
          type: 'state_change',
          payload: { status: 'ended' },
          timestamp: new Date().toISOString(),
        })
      }
    } else if (ps) {
      participantSessionStatus = ps.status
    }
  }

  // ── 4) Mark run_session as ended ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { error: rsUpdateError } = await (supabase as any)
    .from('run_sessions')
    .update({ status: 'ended', updated_at: new Date().toISOString() })
    .eq('id', runSession.id)

  if (rsUpdateError) {
    console.warn('[run-sessions/end] failed to update run_session status', rsUpdateError.message)
  }

  console.info('[run-sessions/end]', {
    runId,
    stepIndex,
    runSessionId: runSession.id,
    participantSessionStatus,
  })

  return NextResponse.json({
    success: true,
    runSessionStatus: 'ended',
    participantSessionStatus,
  })
  },
})
