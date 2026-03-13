/**
 * Game Snapshots API
 *
 * POST - Create a new snapshot for a game
 * GET  - List snapshots for a game
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireTenantRole } from '@/lib/api/auth-guard'

const postSchema = z.object({
  versionLabel: z.string().max(100).optional(),
})

/**
 * Verify the caller has snapshot access to a game.
 * Snapshots are a builder feature: system_admin or tenant admin/owner only.
 * Returns the service-role client on success, null on denial (caller returns 404).
 */
async function verifySnapshotAccess(
  gameId: string,
  effectiveGlobalRole: string | null
) {
  const supabase = createServiceRoleClient()
  const { data: game } = await supabase
    .from('games')
    .select('owner_tenant_id')
    .eq('id', gameId)
    .single()

  if (!game) return null

  if (effectiveGlobalRole !== 'system_admin') {
    if (!game.owner_tenant_id) return null
    try {
      await requireTenantRole(['admin', 'owner', 'editor'], game.owner_tenant_id)
    } catch {
      return null
    }
  }

  return supabase
}

// =============================================================================
// GET /api/games/[gameId]/snapshots - List snapshots
// =============================================================================

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const supabase = await verifySnapshotAccess(params.gameId, auth!.effectiveGlobalRole)
    if (!supabase) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: snapshots, error } = await supabase
      .from('game_snapshots')
      .select(`
        id,
        game_id,
        version,
        version_label,
        includes_steps,
        includes_phases,
        includes_roles,
        includes_artifacts,
        includes_triggers,
        includes_board_config,
        checksum,
        created_by,
        created_at
      `)
      .eq('game_id', params.gameId)
      .order('version', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ snapshots: [] })
      }
      console.error('[snapshots] List error:', error)
      return NextResponse.json({ error: 'Failed to list snapshots' }, { status: 500 })
    }

    return NextResponse.json({ snapshots: snapshots ?? [] })
  },
})

// =============================================================================
// POST /api/games/[gameId]/snapshots - Create snapshot
// =============================================================================

export const POST = apiHandler({
  auth: 'user',
  input: postSchema,
  handler: async ({ auth, params, body }) => {
    const supabase = await verifySnapshotAccess(params.gameId, auth!.effectiveGlobalRole)
    if (!supabase) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const userId = auth!.user!.id
    const { data: snapshotId, error } = await supabase.rpc('create_game_snapshot', {
      p_game_id: params.gameId,
      p_version_label: body.versionLabel,
      p_created_by: userId,
    })

    if (error) {
      if (error.code === '42883') {
        return NextResponse.json(
          { error: 'Snapshot system not yet deployed' },
          { status: 501 }
        )
      }
      console.error('[snapshots] Create error:', error)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    const { data: snapshot } = await supabase
      .from('game_snapshots')
      .select('id, version, version_label, created_at')
      .eq('id', snapshotId)
      .single()

    return NextResponse.json({
      success: true,
      snapshot: snapshot ?? { id: snapshotId },
    })
  },
})
