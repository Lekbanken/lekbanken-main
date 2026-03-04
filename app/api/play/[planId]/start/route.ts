import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getPlanSnapshot } from '@/lib/planner/server/snapshot'
import type { Run, RunStep, RunStatus } from '@/features/play/types'
import type { Json } from '@/types/supabase'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

/**
 * Upsert a run_session row for the given run + step index.
 * Uses type assertion because run_sessions isn't in generated Supabase types yet
 * (migration 20260305200000 needs to be applied first).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertRunSession(supabase: any, runId: string, stepIndex: number) {
  const { data, error } = await supabase
    .from('run_sessions')
    .upsert(
      { run_id: runId, step_index: stepIndex, status: 'created' },
      { onConflict: 'run_id,step_index', ignoreDuplicates: true }
    )
    .select('*')
    .single()
  if (error) {
    console.warn('[api/play/:id/start] run_session upsert failed (table may not exist yet)', error.message)
    return null
  }
  return data
}

/**
 * POST /api/play/[planId]/start
 * 
 * Creates a new Run from the plan's current published version (or draft fallback).
 * Uses PlanSnapshot pipeline as the Single Source of Truth for block→step generation.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid plan id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  // ── Get snapshot (published → draft fallback) ─────────────────────
  const result = await getPlanSnapshot(planId, 'auto', supabase)

  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404
      : result.code === 'NO_BLOCKS' ? 400
      : 500
    return NextResponse.json(
      { error: { code: result.code, message: result.error } },
      { status }
    )
  }

  const { snapshot } = result

  if (snapshot.steps.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Plan has no playable content' } },
      { status: 400 }
    )
  }

  // ── Draft plans → virtual run (not persisted) ─────────────────────
  if (snapshot.source === 'draft_blocks' || !snapshot.version) {
    const run: Run = {
      id: `draft-${planId}-${Date.now()}`,
      planId,
      planVersionId: 'draft',
      versionNumber: 0,
      name: snapshot.plan.name,
      status: 'in_progress',
      steps: snapshot.steps as RunStep[],
      blockCount: snapshot.stats.blockCount,
      totalDurationMinutes: snapshot.stats.totalTimeMinutes,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    }
    return NextResponse.json({ run })
  }

  // ── Resume existing run (idempotent) ──────────────────────────────
  const { data: existingRun } = await supabase
    .from('runs')
    .select('*')
    .eq('plan_version_id', snapshot.version.id)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existingRun) {
    // Upsert run_session for current step if it requires a session
    const currentStep = existingRun.current_step ?? 0
    const stepAtCurrent = snapshot.steps[currentStep]
    let runSession = null

    if (stepAtCurrent?.requiresSession) {
      runSession = await upsertRunSession(supabase, existingRun.id, currentStep)
    }

    const run: Run = {
      id: existingRun.id,
      planId,
      planVersionId: existingRun.plan_version_id,
      versionNumber: snapshot.version.versionNumber,
      name: snapshot.version.name ?? snapshot.plan.name,
      status: existingRun.status,
      steps: snapshot.steps as RunStep[],
      blockCount: snapshot.stats.blockCount,
      totalDurationMinutes: snapshot.stats.totalTimeMinutes,
      currentStepIndex: existingRun.current_step ?? 0,
      startedAt: existingRun.started_at ?? existingRun.created_at ?? new Date().toISOString(),
      completedAt: existingRun.completed_at ?? null,
    }

    return NextResponse.json({
      run,
      resumed: true,
      resumeReason: 'active_run_exists',
      resumeMeta: {
        currentStep: existingRun.current_step ?? 0,
        totalSteps: snapshot.stats.totalSteps,
        versionNumber: snapshot.version.versionNumber,
        startedAt: existingRun.started_at ?? existingRun.created_at ?? new Date().toISOString(),
      },
      ...(runSession ? { runSession } : {}),
    })
  }

  // ── Create new run ────────────────────────────────────────────────
  const runPayload = {
    plan_version_id: snapshot.version.id,
    user_id: user.id,
    tenant_id: snapshot.plan.ownerTenantId ?? null,
    status: 'in_progress' as RunStatus,
    current_step: 0,
    last_heartbeat_at: new Date().toISOString(),
    metadata: ({
      planId,
      stepsGenerated: snapshot.stats.totalSteps,
      versionNumber: snapshot.version.versionNumber,
    } as Json),
  }

  const { data: runData, error: runError } = await supabase
    .from('runs')
    .insert(runPayload)
    .select('*')
    .single()

  if (runError) {
    console.error('[api/play/:id/start] run insert error', runError)
    // Fallback: return virtual run if runs table is unavailable
    const run: Run = {
      id: `virtual-${planId}-${Date.now()}`,
      planId,
      planVersionId: snapshot.version.id,
      versionNumber: snapshot.version.versionNumber,
      name: snapshot.version.name ?? snapshot.plan.name,
      status: 'in_progress',
      steps: snapshot.steps as RunStep[],
      blockCount: snapshot.stats.blockCount,
      totalDurationMinutes: snapshot.stats.totalTimeMinutes,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    }
    return NextResponse.json({ run })
  }

  const run: Run = {
    id: runData.id,
    planId,
    planVersionId: runData.plan_version_id,
    versionNumber: snapshot.version.versionNumber,
    name: snapshot.version.name ?? snapshot.plan.name,
    status: runData.status,
    steps: snapshot.steps as RunStep[],
    blockCount: snapshot.stats.blockCount,
    totalDurationMinutes: snapshot.stats.totalTimeMinutes,
    currentStepIndex: 0,
    startedAt: runData.started_at || runData.created_at || new Date().toISOString(),
    completedAt: null,
  }

  // Upsert run_session for step 0 if it requires a session
  const firstStep = snapshot.steps[0]
  let newRunSession = null

  if (firstStep?.requiresSession) {
    newRunSession = await upsertRunSession(supabase, runData.id, 0)
  }

  return NextResponse.json({
    run,
    ...(newRunSession ? { runSession: newRunSession } : {}),
  })
}
