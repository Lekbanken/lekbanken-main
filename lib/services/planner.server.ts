import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'
import type { PlannerPlan, PlannerPlayView, PlannerBlock, PlannerPlayBlock, PlannerGameSummary } from '@/types/planner'

type PlanRow = Tables<'plans'>
type BlockRow = Tables<'plan_blocks'> & {
  game?: (Tables<'games'> & {
    translations?: Tables<'game_translations'>[] | null
    media?: Tables<'game_media'>[] | null
  }) | null
}

type PlanWithRelations = PlanRow & {
  blocks?: (BlockRow & { game?: BlockRow['game'] })[] | null
  private_notes?: PrivateNoteRow[] | null
  tenant_notes?: TenantNoteRow[] | null
}

type PrivateNoteRow = Tables<'plan_notes_private'>
type TenantNoteRow = Tables<'plan_notes_tenant'>

const DEFAULT_LOCALE_ORDER = ['sv', 'no', 'en']

function pickTranslation(
  translations: Tables<'game_translations'>[] | null | undefined,
  localeOrder: string[]
) {
  if (!translations || translations.length === 0) return null
  return (
    localeOrder.map((locale) => translations.find((t) => t.locale?.toLowerCase() === locale)).find(Boolean) ||
    translations[0]
  )
}

function getCoverUrl(media?: Tables<'game_media'>[] | null) {
  if (!media) return null
  const cover = media
    .filter((m) => m.kind === 'cover')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
  return cover?.media_id ?? null
}

function mapGameSummary(
  game: BlockRow['game'],
  localeOrder: string[] = DEFAULT_LOCALE_ORDER
): PlannerGameSummary | null {
  if (!game) return null
  const translation = pickTranslation(game.translations || [], localeOrder)
  return {
    id: game.id,
    title: translation?.title || game.name,
    shortDescription: translation?.short_description || game.description,
    durationMinutes: game.time_estimate_min ?? null,
    energyLevel: game.energy_level ?? null,
    locationType: game.location_type ?? null,
    coverUrl: getCoverUrl(game.media),
  }
}

function mapBlocks(
  blocks: BlockRow[] | null | undefined,
  localeOrder: string[] = DEFAULT_LOCALE_ORDER
): PlannerBlock[] {
  if (!blocks || blocks.length === 0) return []
  return blocks.map((block) => ({
    id: block.id,
    planId: block.plan_id,
    position: block.position,
    blockType: block.block_type,
    durationMinutes: block.duration_minutes,
    title: block.title,
    notes: block.notes,
    isOptional: block.is_optional,
    metadata: block.metadata as Record<string, unknown> | null,
    game: block.block_type === 'game' ? mapGameSummary(block.game, localeOrder) : null,
  }))
}

function pickLatestNote<T extends PrivateNoteRow | TenantNoteRow>(notes?: T[] | null) {
  if (!notes || notes.length === 0) return null
  return [...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
}

function computeTotalDuration(blocks: PlannerBlock[]) {
  if (!blocks || blocks.length === 0) return 0
  return blocks.reduce((sum, block) => {
    const blockDuration =
      typeof block.durationMinutes === 'number'
        ? block.durationMinutes
        : block.game?.durationMinutes ?? 0
    return sum + (blockDuration || 0)
  }, 0)
}

function buildPlanModel(
  row: PlanRow & {
    blocks?: BlockRow[] | null
    private_notes?: PrivateNoteRow[] | null
    tenant_notes?: TenantNoteRow[] | null
  },
  localeOrder: string[] = DEFAULT_LOCALE_ORDER
): PlannerPlan {
  const blocks = mapBlocks(row.blocks, localeOrder)
  const totalDuration = row.total_time_minutes ?? computeTotalDuration(blocks)
  const privateNote = pickLatestNote(row.private_notes)
  const tenantNote = pickLatestNote(row.tenant_notes)

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    ownerTenantId: row.owner_tenant_id,
    totalTimeMinutes: totalDuration,
    updatedAt: row.updated_at,
    metadata: row.metadata as Record<string, unknown> | null,
    blocks,
    notes: {
      privateNote: privateNote
        ? {
            id: privateNote.id,
            content: privateNote.content,
            updatedAt: privateNote.updated_at,
            updatedBy: privateNote.updated_by,
          }
        : null,
      tenantNote: tenantNote
        ? {
            id: tenantNote.id,
            content: tenantNote.content,
            updatedAt: tenantNote.updated_at,
            updatedBy: tenantNote.updated_by,
          }
        : null,
    },
  }
}

function mapInstructionsToSteps(
  translation?: Tables<'game_translations'> | null
): { title: string; description?: string | null; durationMinutes?: number | null }[] {
  const instructions = translation?.instructions
  if (Array.isArray(instructions)) {
    return instructions.map((step, idx: number) => {
      const stepObj = step as { title?: string; description?: string; duration_minutes?: number }
      return {
        title:
          typeof stepObj.title === 'string' && stepObj.title.length > 0
            ? stepObj.title
            : `Steg ${idx + 1}`,
        description: typeof stepObj.description === 'string' ? stepObj.description : '',
        durationMinutes:
          typeof stepObj.duration_minutes === 'number' ? stepObj.duration_minutes : null,
      }
    })
  }
  return [
    {
      title: translation?.title || 'Instruktioner',
      description: translation?.short_description || '',
      durationMinutes: null,
    },
  ]
}

function buildPlayBlock(
  block: PlannerBlock,
  localeOrder: string[],
  gameRow?: BlockRow['game']
): PlannerPlayBlock {
  if (block.blockType !== 'game' || !gameRow) {
    return {
      id: block.id,
      type: block.blockType,
      title: block.title || (block.blockType === 'pause' ? 'Paus' : 'Moment'),
      durationMinutes: block.durationMinutes ?? null,
      notes: block.notes ?? undefined,
    }
  }

  const translation = pickTranslation(gameRow.translations || [], localeOrder)
  return {
    id: block.id,
    type: block.blockType,
    title: translation?.title || gameRow.name,
    durationMinutes: block.durationMinutes ?? gameRow.time_estimate_min ?? null,
    notes: block.notes ?? undefined,
    game: {
      id: gameRow.id,
      title: translation?.title || gameRow.name,
      summary: translation?.short_description || gameRow.description,
      materials: (translation?.materials as string[] | null | undefined) || null,
      coverUrl: getCoverUrl(gameRow.media),
      steps: mapInstructionsToSteps(translation),
    },
  }
}

export function buildPlayView(
  row: PlanRow & { blocks?: (BlockRow & { game?: BlockRow['game'] })[] | null },
  localeOrder: string[] = DEFAULT_LOCALE_ORDER
): PlannerPlayView {
  const mappedBlocks = (row.blocks ?? []).map((block) =>
    buildPlayBlock(
      {
        id: block.id,
        planId: block.plan_id,
        position: block.position,
        blockType: block.block_type,
        durationMinutes: block.duration_minutes,
        title: block.title,
        notes: block.notes,
        isOptional: block.is_optional,
        metadata: block.metadata as Record<string, unknown> | null,
        game: null,
      },
      localeOrder,
      block.game
    )
  )

  const totalDuration = mappedBlocks.reduce(
    (sum, b) => sum + (b.durationMinutes ?? 0),
    0
  )

  return {
    planId: row.id,
    name: row.name,
    blocks: mappedBlocks,
    totalDurationMinutes: row.total_time_minutes ?? totalDuration,
  }
}

export async function fetchPlanWithRelations(
  planId: string,
  options: { localeOrder?: string[]; withNotes?: boolean } = {}
): Promise<{ plan: PlannerPlan | null; error?: string }> {
  const supabase = await createServerRlsClient()
  const localeOrder = options.localeOrder ?? DEFAULT_LOCALE_ORDER

  const { data, error } = await supabase
    .from('plans')
    .select(
      `
        *,
        blocks:plan_blocks(
          *,
          game:games(
            *,
            translations:game_translations(*),
            media:game_media(*)
          )
        ),
        private_notes:plan_notes_private(*),
        tenant_notes:plan_notes_tenant(*)
      `
    )
    .eq('id', planId)
    .order('position', { foreignTable: 'plan_blocks', ascending: true })
    .maybeSingle()

  if (error) {
    console.error('[planner] fetchPlanWithRelations error', error)
    return { plan: null, error: 'not_found' }
  }

  if (!data) return { plan: null, error: 'not_found' }

  return { plan: buildPlanModel(data as PlanWithRelations, localeOrder) }
}

export function sortBlocks(blocks: PlannerBlock[]) {
  return [...blocks].sort((a, b) => a.position - b.position)
}

export function recalcPlanDuration(blocks: PlannerBlock[]) {
  return computeTotalDuration(blocks)
}

export { DEFAULT_LOCALE_ORDER }

export function toPlannerPlan(
  row: PlanRow & {
    blocks?: BlockRow[] | null
    private_notes?: PrivateNoteRow[] | null
    tenant_notes?: TenantNoteRow[] | null
  },
  localeOrder: string[] = DEFAULT_LOCALE_ORDER
) {
  return buildPlanModel(row, localeOrder)
}
