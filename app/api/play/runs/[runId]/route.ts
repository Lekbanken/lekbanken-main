import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
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
  const { data: blocks } = await supabase
    .from('plan_version_blocks')
    .select('*')
    .eq('plan_version_id', run.plan_version_id)
    .order('position', { ascending: true })

  // Regenerate steps from blocks
  const steps = generateStepsFromBlocks(blocks || [])

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
    steps,
    blockCount: (blocks || []).length,
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

type VersionBlock = {
  id: string
  position: number
  block_type: string
  duration_minutes: number
  title: string | null
  notes: string | null
  is_optional: boolean | null
  game_snapshot: unknown | null
}

const DEFAULT_STEP_DURATION = 5

function generateStepsFromBlocks(blocks: VersionBlock[]): RunStep[] {
  const steps: RunStep[] = []
  let stepIndex = 0

  for (const block of blocks) {
    const tag = block.title || getBlockTypeLabel(block.block_type)
    const baseDuration = block.duration_minutes || DEFAULT_STEP_DURATION

    const snapshot = (block.game_snapshot ?? null) as unknown as {
      id: string
      title: string
      shortDescription?: string | null
      instructions?: Array<{
        title: string
        description?: string | null
        durationMinutes?: number | null
      }> | null
    } | null

    if (snapshot?.instructions && snapshot.instructions.length > 0) {
      for (let i = 0; i < snapshot.instructions.length; i++) {
        const instruction = snapshot.instructions[i]
        steps.push({
          id: `${block.id}:${i}`,
          index: stepIndex++,
          blockId: block.id,
          blockType: block.block_type as 'game' | 'pause' | 'preparation' | 'custom',
          title: instruction.title || `Steg ${i + 1}`,
          description: instruction.description || '',
          durationMinutes: instruction.durationMinutes ?? baseDuration,
          tag,
          note: i === 0 ? block.notes || undefined : undefined,
          gameSnapshot: {
            id: snapshot.id,
            title: snapshot.title,
            shortDescription: snapshot.shortDescription,
          },
        })
      }
    } else {
      steps.push({
        id: `${block.id}:0`,
        index: stepIndex++,
        blockId: block.id,
        blockType: block.block_type as 'game' | 'pause' | 'preparation' | 'custom',
        title: tag,
        description: block.notes || getBlockTypeDefaultDescription(block.block_type),
        durationMinutes: baseDuration,
        tag,
        gameSnapshot: snapshot ? {
          id: snapshot.id,
          title: snapshot.title,
          shortDescription: snapshot.shortDescription,
        } : undefined,
      })
    }
  }

  return steps
}

function getBlockTypeLabel(blockType: string): string {
  switch (blockType) {
    case 'game': return 'Lek'
    case 'pause': return 'Paus'
    case 'preparation': return 'Förberedelse'
    case 'custom': return 'Moment'
    default: return 'Moment'
  }
}

function getBlockTypeDefaultDescription(blockType: string): string {
  switch (blockType) {
    case 'pause': return 'Ta en paus. Fortsätt när gruppen är redo.'
    case 'preparation': return 'Förbered nästa moment.'
    default: return 'Fortsätt när gruppen är redo.'
  }
}
