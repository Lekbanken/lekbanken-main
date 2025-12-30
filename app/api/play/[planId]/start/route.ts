import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Run, RunStep, RunStatus } from '@/features/play/types'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

const DEFAULT_STEP_DURATION = 5

type GameSnapshot = {
  id: string
  title: string
  shortDescription?: string | null
  durationMinutes?: number | null
  instructions?: Array<{
    title: string
    description?: string | null
    durationMinutes?: number | null
  }> | null
  materials?: string[] | null
}

type VersionBlock = {
  id: string
  position: number
  block_type: string
  duration_minutes: number
  title: string | null
  notes: string | null
  is_optional: boolean
  game_snapshot: GameSnapshot | null
}

/**
 * POST /api/play/[planId]/start
 * 
 * Creates a new Run from the plan's current published version.
 * Server generates steps from version blocks - client receives ready-to-play structure.
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

  // Fetch plan with current version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan, error: planError } = await (supabase as any)
    .from('plans')
    .select('id, name, status, current_version_id')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Plan not found or access denied' } },
      { status: 404 }
    )
  }

  // Check if plan has a published version
  if (!plan.current_version_id) {
    // Fallback: Allow playing draft plans (backward compatibility)
    // In future, might require published version
    return await startFromDraftPlan(supabase, planId, plan.name, user.id)
  }

  // Fetch the current version with its blocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: version, error: versionError } = await (supabase as any)
    .from('plan_versions')
    .select(`
      id,
      plan_id,
      version_number,
      name,
      description,
      total_time_minutes,
      published_at
    `)
    .eq('id', plan.current_version_id)
    .single()

  if (versionError || !version) {
    console.error('[api/play/:id/start] version fetch error', versionError)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Published version not found' } },
      { status: 404 }
    )
  }

  // Fetch version blocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: versionBlocks, error: blocksError } = await (supabase as any)
    .from('plan_version_blocks')
    .select('*')
    .eq('plan_version_id', version.id)
    .order('position', { ascending: true })

  if (blocksError) {
    console.error('[api/play/:id/start] blocks fetch error', blocksError)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch version blocks' } },
      { status: 500 }
    )
  }

  const blocks = (versionBlocks || []) as VersionBlock[]

  // Generate steps from version blocks (server-side logic)
  const steps = generateStepsFromBlocks(blocks)

  if (steps.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Plan has no playable content' } },
      { status: 400 }
    )
  }

  // Create run record
  const runPayload = {
    plan_id: planId,
    plan_version_id: version.id,
    user_id: user.id,
    status: 'in_progress' as RunStatus,
    current_step_index: 0,
    metadata: {
      stepsGenerated: steps.length,
      versionNumber: version.version_number,
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: runData, error: runError } = await (supabase as any)
    .from('runs')
    .insert(runPayload)
    .select('*')
    .single()

  if (runError) {
    console.error('[api/play/:id/start] run insert error', runError)
    // If runs table doesn't exist yet (migration not run), return a virtual run
    return NextResponse.json({
      run: buildVirtualRun(planId, version, steps),
    })
  }

  const run: Run = {
    id: runData.id,
    planId: runData.plan_id,
    planVersionId: runData.plan_version_id,
    versionNumber: version.version_number,
    name: version.name,
    status: runData.status,
    steps,
    blockCount: blocks.length,
    totalDurationMinutes: version.total_time_minutes || steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStepIndex: 0,
    startedAt: runData.started_at || new Date().toISOString(),
    completedAt: null,
  }

  return NextResponse.json({ run })
}

/**
 * Fallback for draft plans without published versions.
 * Maintains backward compatibility with existing plans.
 */
async function startFromDraftPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  planId: string,
  planName: string,
  _userId: string
): Promise<NextResponse> {
  // Fetch plan blocks directly
  const { data: blocks, error: blocksError } = await supabase
    .from('plan_blocks')
    .select(`
      id,
      position,
      block_type,
      duration_minutes,
      title,
      notes,
      is_optional,
      game:games(
        id,
        translations:game_translations(
          locale,
          title,
          short_description,
          instructions
        )
      )
    `)
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (blocksError || !blocks || blocks.length === 0) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Plan has no blocks' } },
      { status: 404 }
    )
  }

  // Convert to version block format for step generation
  const versionBlocks: VersionBlock[] = blocks.map((b: {
    id: string
    position: number
    block_type: string
    duration_minutes: number
    title: string | null
    notes: string | null
    is_optional: boolean
    game?: {
      id: string
      translations?: Array<{
        locale: string
        title: string
        short_description?: string | null
        instructions?: unknown
      }>
    } | null
  }) => {
    const translation = b.game?.translations?.find((t: { locale: string }) => t.locale === 'sv') 
      || b.game?.translations?.[0]
    
    return {
      id: b.id,
      position: b.position,
      block_type: b.block_type,
      duration_minutes: b.duration_minutes,
      title: b.title,
      notes: b.notes,
      is_optional: b.is_optional,
      game_snapshot: b.game ? {
        id: b.game.id,
        title: translation?.title || 'Okänd lek',
        shortDescription: translation?.short_description,
        instructions: parseInstructions(translation?.instructions),
        materials: [],
      } : null,
    }
  })

  const steps = generateStepsFromBlocks(versionBlocks)

  // Return virtual run (not persisted since no version)
  const run: Run = {
    id: `draft-${planId}-${Date.now()}`,
    planId,
    planVersionId: 'draft',
    versionNumber: 0,
    name: planName,
    status: 'in_progress',
    steps,
    blockCount: blocks.length,
    totalDurationMinutes: steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStepIndex: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }

  return NextResponse.json({ run })
}

function parseInstructions(instructions: unknown): Array<{
  title: string
  description?: string | null
  durationMinutes?: number | null
}> | null {
  if (!instructions) return null
  if (Array.isArray(instructions)) {
    return instructions.map((step, idx) => ({
      title: step?.title || `Steg ${idx + 1}`,
      description: step?.description || null,
      durationMinutes: step?.durationMinutes || null,
    }))
  }
  return null
}

/**
 * Generate RunSteps from version blocks.
 * This is the core server-side logic that transforms blocks into playable steps.
 */
function generateStepsFromBlocks(blocks: VersionBlock[]): RunStep[] {
  const steps: RunStep[] = []
  let stepIndex = 0

  for (const block of blocks) {
    const tag = block.title || getBlockTypeLabel(block.block_type)
    const baseDuration = block.duration_minutes || DEFAULT_STEP_DURATION

    if (block.game_snapshot?.instructions && block.game_snapshot.instructions.length > 0) {
      // Game block with instructions → multiple steps
      const materials = block.game_snapshot.materials || []
      
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
          materials: i === 0 && materials.length > 0 ? materials : undefined,
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
      // Non-game block or game without instructions → single step
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVirtualRun(planId: string, version: any, steps: RunStep[]): Run {
  return {
    id: `virtual-${planId}-${Date.now()}`,
    planId,
    planVersionId: version.id,
    versionNumber: version.version_number,
    name: version.name,
    status: 'in_progress',
    steps,
    blockCount: steps.length,
    totalDurationMinutes: version.total_time_minutes || steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStepIndex: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
}
