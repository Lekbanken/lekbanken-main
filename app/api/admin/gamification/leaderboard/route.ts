import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import {
  getLeaderboardStats,
  checkLeaderboardAbuseRisk,
  adminSetLeaderboardExclusion,
} from '@/lib/services/gamification-leaderboard.server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/gamification/leaderboard
 * 
 * Get leaderboard statistics for admin dashboard.
 * 
 * Query params:
 * - tenantId: UUID (required)
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // System admin bypass + tenant owner/admin check
    await requireTenantRole(['owner', 'admin'], tenantId)

    const stats = await getLeaderboardStats(tenantId)

    return NextResponse.json(stats)
  },
})

interface AbuseCheckBody {
  tenantId: string
  userId: string
}

/**
 * POST /api/admin/gamification/leaderboard/abuse-check
 * 
 * Check if a user appears to be gaming the leaderboard.
 * Returns risk score and recommendations.
 */
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const body: AbuseCheckBody = await req.json()

    if (!body.tenantId || !body.userId) {
      return NextResponse.json(
        { error: 'tenantId and userId are required' },
        { status: 400 }
      )
    }

    // System admin bypass + tenant owner/admin check
    await requireTenantRole(['owner', 'admin'], body.tenantId)

    const result = await checkLeaderboardAbuseRisk(body.tenantId, body.userId)

    return NextResponse.json(result)
  },
})

interface ExclusionBody {
  tenantId: string
  userId: string
  excluded: boolean
  reason?: string
}

/**
 * PATCH /api/admin/gamification/leaderboard
 * 
 * Exclude or reinstate a user in leaderboards (admin action).
 */
export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const body: ExclusionBody = await req.json()

    if (!body.tenantId || !body.userId || typeof body.excluded !== 'boolean') {
      return NextResponse.json(
        { error: 'tenantId, userId, and excluded are required' },
        { status: 400 }
      )
    }

    // System admin bypass + tenant owner/admin check
    await requireTenantRole(['owner', 'admin'], body.tenantId)

    const result = await adminSetLeaderboardExclusion(
      body.tenantId,
      body.userId,
      body.excluded,
      body.reason
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      excluded: body.excluded,
    })
  },
})
