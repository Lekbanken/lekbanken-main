import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { RunStatus } from '@/features/play/types'
import { logGamificationEventV1 } from '@/lib/services/gamification-events.server'
import type { Json } from '@/types/supabase'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

type ProgressPayload = {
  currentStepIndex?: number
  status?: RunStatus
  timerRemaining?: number
  timerTotal?: number
  isTimerRunning?: boolean
}

/**
 * POST /api/play/runs/[runId]/progress
 * 
 * Updates progress for an active run.
 * Used for saving current step, timer state, etc.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const params = await context.params
  const runId = normalizeId(params?.runId)
  if (!runId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid run id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  let payload: ProgressPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY', message: 'Invalid request body' } }, { status: 400 })
  }

  // Handle virtual runs (draft plans, not persisted)
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    // Virtual runs aren't persisted - just acknowledge
    return NextResponse.json({
      progress: {
        runId,
        currentStepIndex: payload.currentStepIndex ?? 0,
        status: payload.status ?? 'in_progress',
        timerRemaining: payload.timerRemaining,
        timerTotal: payload.timerTotal,
        isTimerRunning: payload.isTimerRunning,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  // Update real run
  const updatePayload: Record<string, unknown> = {}

  if (typeof payload.currentStepIndex === 'number') {
    updatePayload.current_step = payload.currentStepIndex
  }

  if (payload.status) {
    updatePayload.status = payload.status
    if (payload.status === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    }
  }

  // Store timer state in metadata
  const metadataUpdate: Record<string, unknown> = {}
  if (typeof payload.timerRemaining === 'number') {
    metadataUpdate.timerRemaining = payload.timerRemaining
  }
  if (typeof payload.timerTotal === 'number') {
    metadataUpdate.timerTotal = payload.timerTotal
  }
  if (typeof payload.isTimerRunning === 'boolean') {
    metadataUpdate.isTimerRunning = payload.isTimerRunning
  }

  if (Object.keys(metadataUpdate).length > 0) {
    updatePayload.metadata = metadataUpdate as Json
  }

  const { data: run, error } = await supabase
    .from('runs')
    .update(updatePayload)
    .eq('id', runId)
    .eq('user_id', user.id) // Ensure user owns the run
    .select('id, tenant_id, plan_version_id, current_step, status, metadata, completed_at, created_at')
    .single()

  if (error) {
    console.error('[api/play/runs/:id/progress] update error', error)
    // If runs table doesn't exist, return acknowledged progress
    return NextResponse.json({
      progress: {
        runId,
        currentStepIndex: payload.currentStepIndex ?? 0,
        status: payload.status ?? 'in_progress',
        timerRemaining: payload.timerRemaining,
        timerTotal: payload.timerTotal,
        isTimerRunning: payload.isTimerRunning,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const runMetadata = (run.metadata ?? null) as unknown as {
    timerRemaining?: number
    timerTotal?: number
    isTimerRunning?: boolean
    planId?: string
  } | null

  const planIdFromMetadata = typeof runMetadata?.planId === 'string' ? runMetadata.planId : null

  if (payload.status === 'completed' && run.status === 'completed') {
    try {
      await logGamificationEventV1({
        tenantId: (run.tenant_id as string | null) ?? null,
        actorUserId: user.id,
        eventType: 'run_completed',
        source: 'play',
        idempotencyKey: `run:${run.id}:completed`,
        metadata: {
          runId: run.id,
          planId: planIdFromMetadata,
          planVersionId: (run.plan_version_id as string | null) ?? null,
          completedAt: (run.completed_at as string | null) ?? null,
        },
      })
    } catch (e) {
      // Best-effort: do not fail the request if gamification event logging fails.
      console.warn('[api/play/runs/:id/progress] gamification event log failed', e)
    }
  }

  return NextResponse.json({
    progress: {
      runId: run.id,
      currentStepIndex: run.current_step,
      status: run.status,
      timerRemaining: runMetadata?.timerRemaining,
      timerTotal: runMetadata?.timerTotal,
      isTimerRunning: runMetadata?.isTimerRunning,
      updatedAt: new Date().toISOString(),
    },
  })
}

/**
 * GET /api/play/runs/[runId]/progress
 * 
 * Fetches current progress for a run.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const params = await context.params
  const runId = normalizeId(params?.runId)
  if (!runId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid run id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  // Virtual runs have no persisted progress
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    return NextResponse.json({ progress: null })
  }

  const { data: run, error } = await supabase
    .from('runs')
    .select('id, current_step, status, metadata, created_at')
    .eq('id', runId)
    .eq('user_id', user.id)
    .single()

  if (error || !run) {
    return NextResponse.json({ progress: null })
  }

  const runMetadata = (run.metadata ?? null) as unknown as {
    timerRemaining?: number
    timerTotal?: number
    isTimerRunning?: boolean
  } | null

  return NextResponse.json({
    progress: {
      runId: run.id,
      currentStepIndex: run.current_step,
      status: run.status,
      timerRemaining: runMetadata?.timerRemaining,
      timerTotal: runMetadata?.timerTotal,
      isTimerRunning: runMetadata?.isTimerRunning,
      updatedAt: run.created_at ?? new Date().toISOString(),
    },
  })
}
