import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { generateStepsFromBlocks } from '@/lib/planner/server/snapshot'
import type { NormalizedBlock } from '@/lib/planner/server/snapshot'
import type { Run, RunStep } from '@/features/play/types'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

/**
 * GET /api/play/runs/[runId]
 * 
 * Fetches a run with its steps and current progress.
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

  // Virtual runs can't be fetched (they're ephemeral)
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Virtual runs cannot be fetched' } },
      { status: 404 }
    )
  }

  // Fetch run
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', user.id)
    .single()

  if (runError || !run) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Run not found' } },
      { status: 404 }
    )
  }

  // Fetch version to get name and blocks
  const { data: version } = await supabase
    .from('plan_versions')
    .select('id, plan_id, version_number, name, total_time_minutes')
    .eq('id', run.plan_version_id)
    .single()

  // Fetch version blocks
  const { data: rawBlocks } = await supabase
    .from('plan_version_blocks')
    .select('*')
    .eq('plan_version_id', run.plan_version_id)
    .order('position', { ascending: true })

  // Normalise to NormalizedBlock[] and regenerate steps via snapshot pipeline
  const blocks: NormalizedBlock[] = (rawBlocks ?? []).map((b) => ({
    id: b.id,
    position: b.position,
    blockType: b.block_type as NormalizedBlock['blockType'],
    durationMinutes: b.duration_minutes ?? 5,
    title: b.title ?? null,
    notes: b.notes ?? null,
    isOptional: b.is_optional ?? false,
    gameSnapshot: normalizeGameSnapshot(b.game_snapshot),
  }))

  const steps = generateStepsFromBlocks(blocks)

  const runMetadata = (run.metadata ?? null) as unknown as {
    timerRemaining?: number
    timerTotal?: number
    isTimerRunning?: boolean
    planId?: string
  } | null

  const runResponse: Run = {
    id: run.id,
    planId: version?.plan_id ?? (typeof runMetadata?.planId === 'string' ? runMetadata.planId : ''),
    planVersionId: run.plan_version_id,
    versionNumber: version?.version_number ?? 0,
    name: version?.name ?? 'Okänd plan',
    status: run.status,
    steps: steps as RunStep[],
    blockCount: blocks.filter((b) => b.blockType !== 'section').length,
    totalDurationMinutes: version?.total_time_minutes || steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStepIndex: run.current_step ?? 0,
    startedAt: run.started_at ?? run.created_at ?? new Date().toISOString(),
    completedAt: run.completed_at,
  }

  const progress = {
    runId: run.id,
    currentStepIndex: run.current_step ?? 0,
    status: run.status,
    timerRemaining: runMetadata?.timerRemaining,
    timerTotal: runMetadata?.timerTotal,
    isTimerRunning: runMetadata?.isTimerRunning,
    updatedAt: run.created_at ?? new Date().toISOString(),
  }

  return NextResponse.json({ run: runResponse, progress })
}

// ── Helper: normalise raw game_snapshot JSON to typed object ──────────
function normalizeGameSnapshot(raw: unknown): NormalizedBlock['gameSnapshot'] {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  return {
    id: (obj.id as string) ?? '',
    title: (obj.title as string) ?? 'Okänd lek',
    shortDescription: (obj.shortDescription as string) ?? null,
    durationMinutes: (obj.durationMinutes as number) ?? null,
    instructions: Array.isArray(obj.instructions)
      ? (obj.instructions as Array<Record<string, unknown>>).map((s, i) => ({
          title: (s.title as string) || `Steg ${i + 1}`,
          description: (s.description as string) || null,
          durationMinutes: (s.durationMinutes as number) || null,
        }))
      : null,
    materials: Array.isArray(obj.materials) ? (obj.materials as string[]) : null,
  }
}
