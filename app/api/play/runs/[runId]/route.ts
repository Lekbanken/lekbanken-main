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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run, error: runError } = await (supabase as any)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: version } = await (supabase as any)
    .from('plan_versions')
    .select('id, version_number, name, total_time_minutes')
    .eq('id', run.plan_version_id)
    .single()

  // Fetch version blocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: blocks } = await (supabase as any)
    .from('plan_version_blocks')
    .select('*')
    .eq('plan_version_id', run.plan_version_id)
    .order('position', { ascending: true })

  // Regenerate steps from blocks
  const steps = generateStepsFromBlocks(blocks || [])

  const runResponse: Run = {
    id: run.id,
    planId: run.plan_id,
    planVersionId: run.plan_version_id,
    versionNumber: version?.version_number ?? 0,
    name: version?.name ?? 'Okänd plan',
    status: run.status,
    steps,
    blockCount: (blocks || []).length,
    totalDurationMinutes: version?.total_time_minutes || steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStepIndex: run.current_step_index ?? 0,
    startedAt: run.started_at,
    completedAt: run.completed_at,
  }

  const progress = {
    runId: run.id,
    currentStepIndex: run.current_step_index ?? 0,
    status: run.status,
    timerRemaining: run.metadata?.timerRemaining,
    timerTotal: run.metadata?.timerTotal,
    isTimerRunning: run.metadata?.isTimerRunning,
    updatedAt: run.updated_at,
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
  is_optional: boolean
  game_snapshot: {
    id: string
    title: string
    shortDescription?: string | null
    instructions?: Array<{
      title: string
      description?: string | null
      durationMinutes?: number | null
    }> | null
  } | null
}

const DEFAULT_STEP_DURATION = 5

function generateStepsFromBlocks(blocks: VersionBlock[]): RunStep[] {
  const steps: RunStep[] = []
  let stepIndex = 0

  for (const block of blocks) {
    const tag = block.title || getBlockTypeLabel(block.block_type)
    const baseDuration = block.duration_minutes || DEFAULT_STEP_DURATION

    if (block.game_snapshot?.instructions && block.game_snapshot.instructions.length > 0) {
      for (let i = 0; i < block.game_snapshot.instructions.length; i++) {
        const instruction = block.game_snapshot.instructions[i]
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
            id: block.game_snapshot.id,
            title: block.game_snapshot.title,
            shortDescription: block.game_snapshot.shortDescription,
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
        gameSnapshot: block.game_snapshot ? {
          id: block.game_snapshot.id,
          title: block.game_snapshot.title,
          shortDescription: block.game_snapshot.shortDescription,
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
