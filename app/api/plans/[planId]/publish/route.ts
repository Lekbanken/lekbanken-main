import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'
import {
  derivePlanCapabilities,
  capabilitiesToObject,
  planToResource,
  buildCapabilityContextFromMemberships,
} from '@/lib/auth/capabilities'
import type { GlobalRole } from '@/types/auth'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

// Type for version table row since TypeScript types aren't generated yet
type PlanVersionRow = {
  id: string
  plan_id: string
  version_number: number
  name: string
  description: string | null
  total_time_minutes: number
  published_at: string
  published_by: string
  metadata: Record<string, unknown>
}

/**
 * POST /api/plans/[planId]/publish
 * 
 * Creates a new version from the current plan state.
 * Copies all blocks with game data frozen at publish time.
 * Updates plan status to 'published' and sets current_version_id.
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

  // Fetch plan with all relations
  const { plan, raw, error } = await fetchPlanWithRelations(planId)
  if (error || !plan || !raw) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: error || 'Plan not found' } }, { status: 404 })
  }

  // Check capabilities
  const { data: memberships } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)

  const capabilityContext = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole: (user.app_metadata?.global_role as GlobalRole) ?? null,
    memberships: memberships || [],
  })
  const resource = planToResource(raw)
  const caps = derivePlanCapabilities(capabilityContext, resource)
  const capabilities = capabilitiesToObject(caps)

  if (!capabilities.canPublish) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not have permission to publish this plan' } },
      { status: 403 }
    )
  }

  // Check if plan has blocks
  if (plan.blocks.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Cannot publish a plan without blocks' } },
      { status: 400 }
    )
  }

  // Get next version number by querying existing versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingVersions, error: versionsError } = await (supabase as any)
    .from('plan_versions')
    .select('version_number')
    .eq('plan_id', planId)
    .order('version_number', { ascending: false })
    .limit(1)

  if (versionsError) {
    console.error('[api/plans/:id/publish] version query error', versionsError)
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastVersion = (existingVersions as any)?.[0]?.version_number ?? 0
  const nextVersionNumber = (lastVersion as number) + 1

  // Create version record
  const versionPayload = {
    plan_id: planId,
    version_number: nextVersionNumber,
    name: plan.name,
    description: plan.description ?? null,
    total_time_minutes: plan.totalTimeMinutes ?? 0,
    metadata: plan.metadata ?? {},
    published_by: user.id,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: versionData, error: insertVersionError } = await (supabase as any)
    .from('plan_versions')
    .insert(versionPayload)
    .select('*')
    .single()

  if (insertVersionError || !versionData) {
    console.error('[api/plans/:id/publish] insert version error', insertVersionError)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create version' } },
      { status: 500 }
    )
  }

  const version = versionData as unknown as PlanVersionRow

  // Copy blocks with game snapshots
  const versionBlocks = plan.blocks.map((block) => ({
    plan_version_id: version.id,
    position: block.position,
    block_type: block.blockType,
    duration_minutes: block.durationMinutes ?? 0,
    title: block.title ?? null,
    notes: block.notes ?? null,
    is_optional: block.isOptional ?? false,
    game_id: block.game?.id ?? null,
    game_snapshot: block.game
      ? {
          id: block.game.id,
          title: block.game.title,
          shortDescription: block.game.shortDescription,
          durationMinutes: block.game.durationMinutes,
          coverUrl: block.game.coverUrl,
          energyLevel: block.game.energyLevel,
          locationType: block.game.locationType,
        }
      : null,
    metadata: block.metadata ?? {},
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertBlocksError } = await (supabase as any)
    .from('plan_version_blocks')
    .insert(versionBlocks)

  if (insertBlocksError) {
    console.error('[api/plans/:id/publish] insert version blocks error', insertBlocksError)
    // Rollback: delete the version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('plan_versions').delete().eq('id', version.id)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create version blocks' } },
      { status: 500 }
    )
  }

  // Update plan status and current_version_id
  const { error: updatePlanError } = await supabase
    .from('plans')
    .update({
      status: 'published',
      current_version_id: version.id,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', planId)

  if (updatePlanError) {
    console.error('[api/plans/:id/publish] update plan error', updatePlanError)
    // Note: version is already created, so plan may be in inconsistent state
    // In production, this should be a transaction
  }

  return NextResponse.json({
    version: {
      id: version.id,
      planId: version.plan_id,
      versionNumber: version.version_number,
      name: version.name,
      description: version.description,
      totalTimeMinutes: version.total_time_minutes,
      publishedAt: version.published_at,
      publishedBy: version.published_by,
    },
    plan: {
      id: planId,
      status: 'published',
      currentVersionId: version.id,
    },
  })
}
