import { createServerRlsClient } from '@/lib/supabase/server'
import type {
  PlanSnapshot,
  SnapshotPreference,
  NormalizedBlock,
  GeneratedStep,
  SessionSpec,
  GameSnapshot,
  GameInstruction,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_STEP_DURATION = 5
const DEFAULT_LOCALE_ORDER = ['sv', 'en', 'no']

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

export type SnapshotResult =
  | { ok: true; snapshot: PlanSnapshot }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'NO_BLOCKS' | 'SERVER_ERROR' }

/**
 * Fetch a normalised, playable snapshot of a plan.
 *
 * @param planId  – UUID of the plan
 * @param prefer  – Which source to use for blocks:
 *   - `'published'` – use `plan_version_blocks` from `current_version_id`
 *   - `'draft'`     – use `plan_blocks` directly
 *   - `'auto'`      – published if available, else draft (default)
 * @param supabaseClient – optional pre-created client (avoids double-creation in routes)
 */
export async function getPlanSnapshot(
  planId: string,
  prefer: SnapshotPreference = 'auto',
  supabaseClient?: Awaited<ReturnType<typeof createServerRlsClient>>,
): Promise<SnapshotResult> {
  const supabase = supabaseClient ?? await createServerRlsClient()

  // ── 1. Fetch plan ────────────────────────────────────────────────
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, description, status, visibility, owner_tenant_id, current_version_id')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) {
    return { ok: false, error: 'Plan not found or access denied', code: 'NOT_FOUND' }
  }

  // ── 2. Decide source ─────────────────────────────────────────────
  const usePublished =
    prefer === 'published' ||
    (prefer === 'auto' && !!plan.current_version_id)

  if (usePublished && plan.current_version_id) {
    return buildFromPublished(supabase, plan, plan.current_version_id)
  }

  // Draft fallback (or explicit 'draft' preference)
  return buildFromDraft(supabase, plan)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal: build from published version
// ═══════════════════════════════════════════════════════════════════════════════

type PlanRow = {
  id: string
  name: string
  description: string | null
  status: string
  visibility: string
  owner_tenant_id: string | null
  current_version_id: string | null
}

async function buildFromPublished(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  plan: PlanRow,
  versionId: string,
): Promise<SnapshotResult> {
  // Fetch version + blocks in parallel
  const [versionResult, blocksResult] = await Promise.all([
    supabase
      .from('plan_versions')
      .select('id, version_number, name, total_time_minutes')
      .eq('id', versionId)
      .single(),
    supabase
      .from('plan_version_blocks')
      .select('*')
      .eq('plan_version_id', versionId)
      .order('position', { ascending: true }),
  ])

  if (versionResult.error || !versionResult.data) {
    return { ok: false, error: 'Published version not found', code: 'NOT_FOUND' }
  }

  if (blocksResult.error) {
    return { ok: false, error: 'Failed to fetch version blocks', code: 'SERVER_ERROR' }
  }

  const version = versionResult.data
  const rawBlocks = blocksResult.data ?? []

  const blocks: NormalizedBlock[] = rawBlocks.map((b) => ({
    id: b.id,
    position: b.position,
    blockType: b.block_type as NormalizedBlock['blockType'],
    durationMinutes: b.duration_minutes ?? DEFAULT_STEP_DURATION,
    title: b.title ?? null,
    notes: b.notes ?? null,
    isOptional: b.is_optional ?? false,
    gameSnapshot: normalizeGameSnapshot(b.game_snapshot),
  }))

  const steps = generateStepsFromBlocks(blocks)

  return {
    ok: true,
    snapshot: {
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        visibility: plan.visibility,
        ownerTenantId: plan.owner_tenant_id,
      },
      source: 'published_version',
      blocks,
      steps,
      stats: {
        totalSteps: steps.length,
        totalTimeMinutes: version.total_time_minutes ??
          steps.reduce((sum, s) => sum + s.durationMinutes, 0),
        blockCount: blocks.filter((b) => b.blockType !== 'section').length,
      },
      version: {
        id: version.id,
        versionNumber: version.version_number,
        name: version.name ?? null,
        totalTimeMinutes: version.total_time_minutes ?? null,
      },
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal: build from draft blocks
// ═══════════════════════════════════════════════════════════════════════════════

async function buildFromDraft(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  plan: PlanRow,
): Promise<SnapshotResult> {
  const { data: rawBlocks, error: blocksError } = await supabase
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
        play_mode,
        translations:game_translations(
          locale,
          title,
          short_description,
          instructions
        )
      )
    `)
    .eq('plan_id', plan.id)
    .order('position', { ascending: true })

  if (blocksError) {
    return { ok: false, error: 'Failed to fetch plan blocks', code: 'SERVER_ERROR' }
  }

  if (!rawBlocks || rawBlocks.length === 0) {
    return { ok: false, error: 'Plan has no blocks', code: 'NO_BLOCKS' }
  }

  const blocks: NormalizedBlock[] = rawBlocks.map((b) => {
    const game = b.game as {
      id: string
      play_mode?: string | null
      translations?: Array<{
        locale: string
        title: string
        short_description?: string | null
        instructions?: unknown
      }>
    } | null

    const translation = game?.translations
      ? pickTranslation(game.translations, DEFAULT_LOCALE_ORDER)
      : null

    const gameSnapshot: GameSnapshot | null = game
      ? {
          id: game.id,
          title: translation?.title ?? 'Okänd lek',
          shortDescription: translation?.short_description ?? null,
          instructions: parseInstructions(translation?.instructions),
          materials: [],
          playMode: game.play_mode ?? null,
        }
      : null

    return {
      id: b.id,
      position: b.position,
      blockType: b.block_type as NormalizedBlock['blockType'],
      durationMinutes: b.duration_minutes ?? DEFAULT_STEP_DURATION,
      title: b.title ?? null,
      notes: b.notes ?? null,
      isOptional: b.is_optional ?? false,
      gameSnapshot,
    }
  })

  const steps = generateStepsFromBlocks(blocks)

  return {
    ok: true,
    snapshot: {
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        visibility: plan.visibility,
        ownerTenantId: plan.owner_tenant_id,
      },
      source: 'draft_blocks',
      blocks,
      steps,
      stats: {
        totalSteps: steps.length,
        totalTimeMinutes: steps.reduce((sum, s) => sum + s.durationMinutes, 0),
        blockCount: blocks.filter((b) => b.blockType !== 'section').length,
      },
      version: null,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step generation (moved from start route — now the Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate playable steps from normalised blocks.
 * Section blocks are skipped. Game blocks with instructions expand into
 * multiple steps; all others become a single step.
 */
export function generateStepsFromBlocks(blocks: NormalizedBlock[]): GeneratedStep[] {
  const steps: GeneratedStep[] = []
  let stepIndex = 0

  for (const block of blocks) {
    if (block.blockType === 'section') continue

    const tag = block.title || getBlockTypeLabel(block.blockType)
    const baseDuration = block.durationMinutes || DEFAULT_STEP_DURATION

    // Detect if this step requires a participant session
    const needsSession =
      block.blockType === 'session_game' ||
      (block.blockType === 'game' && block.gameSnapshot?.playMode === 'participants')

    const sessionSpec: SessionSpec | undefined = needsSession && block.gameSnapshot
      ? { gameId: block.gameSnapshot.id, autoCreate: true }
      : undefined

    if (block.gameSnapshot?.instructions && block.gameSnapshot.instructions.length > 0) {
      const materials = block.gameSnapshot.materials ?? []

      for (let i = 0; i < block.gameSnapshot.instructions.length; i++) {
        const instruction = block.gameSnapshot.instructions[i]
        steps.push({
          id: `${block.id}:${i}`,
          index: stepIndex++,
          blockId: block.id,
          blockType: block.blockType as GeneratedStep['blockType'],
          title: instruction.title || `Steg ${i + 1}`,
          description: instruction.description || '',
          durationMinutes: instruction.durationMinutes ?? baseDuration,
          materials: i === 0 && materials.length > 0 ? materials : undefined,
          tag,
          note: i === 0 ? block.notes || undefined : undefined,
          requiresSession: needsSession,
          sessionSpec: i === 0 ? sessionSpec : undefined,
          gameSnapshot: {
            id: block.gameSnapshot.id,
            title: block.gameSnapshot.title,
            shortDescription: block.gameSnapshot.shortDescription,
          },
        })
      }
    } else {
      steps.push({
        id: `${block.id}:0`,
        index: stepIndex++,
        blockId: block.id,
        blockType: block.blockType as GeneratedStep['blockType'],
        title: tag,
        description: block.notes || getBlockTypeDefaultDescription(block.blockType),
        durationMinutes: baseDuration,
        tag,
        requiresSession: needsSession,
        sessionSpec,
        gameSnapshot: block.gameSnapshot
          ? {
              id: block.gameSnapshot.id,
              title: block.gameSnapshot.title,
              shortDescription: block.gameSnapshot.shortDescription,
            }
          : undefined,
      })
    }
  }

  return steps
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeGameSnapshot(raw: unknown): GameSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  return {
    id: (obj.id as string) ?? '',
    title: (obj.title as string) ?? 'Okänd lek',
    shortDescription: (obj.shortDescription as string) ?? null,
    durationMinutes: (obj.durationMinutes as number) ?? null,
    instructions: parseInstructions(obj.instructions),
    materials: Array.isArray(obj.materials) ? (obj.materials as string[]) : null,
    coverUrl: (obj.coverUrl as string) ?? null,
    energyLevel: (obj.energyLevel as string) ?? null,
    locationType: (obj.locationType as string) ?? null,
    playMode: (obj.playMode as string) ?? null,
  }
}

function parseInstructions(instructions: unknown): GameInstruction[] | null {
  if (!instructions) return null
  if (Array.isArray(instructions)) {
    return instructions.map((step, idx) => ({
      title: (step as Record<string, unknown>)?.title as string || `Steg ${idx + 1}`,
      description: ((step as Record<string, unknown>)?.description as string) || null,
      durationMinutes: ((step as Record<string, unknown>)?.durationMinutes as number) || null,
    }))
  }
  return null
}

function pickTranslation<T extends { locale: string }>(
  translations: T[],
  localeOrder: string[],
): T | null {
  for (const locale of localeOrder) {
    const match = translations.find((t) => t.locale === locale)
    if (match) return match
  }
  return translations[0] ?? null
}

function getBlockTypeLabel(blockType: string): string {
  switch (blockType) {
    case 'game': return 'Lek'
    case 'pause': return 'Paus'
    case 'preparation': return 'Förberedelse'
    case 'custom': return 'Moment'
    case 'session_game': return 'Deltagarlek'
    case 'section': return 'Sektion'
    default: return 'Moment'
  }
}

function getBlockTypeDefaultDescription(blockType: string): string {
  switch (blockType) {
    case 'pause': return 'Ta en paus. Fortsätt när gruppen är redo.'
    case 'preparation': return 'Förbered nästa moment.'
    case 'session_game': return 'Starta en deltagarsession. Deltagarna ansluter med kod.'
    case 'section': return ''
    default: return 'Fortsätt när gruppen är redo.'
  }
}
