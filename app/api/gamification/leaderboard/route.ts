import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  getLeaderboard,
  type LeaderboardType,
  type LeaderboardPeriod,
} from '@/lib/services/gamification-leaderboard.server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gamification/leaderboard
 * 
 * Get leaderboard rankings for a tenant.
 * Respects user opt-out preferences automatically.
 * 
 * Query params:
 * - tenantId: UUID (required)
 * - type: LeaderboardType (default: 'coins_earned')
 * - period: LeaderboardPeriod (default: 'all_time')
 * - limit: number (default: 50, max: 100)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const typeParam = req.nextUrl.searchParams.get('type') ?? 'coins_earned'
    const periodParam = req.nextUrl.searchParams.get('period') ?? 'all_time'
    const limitParam = req.nextUrl.searchParams.get('limit')

    const validTypes: LeaderboardType[] = [
      'coins_earned', 'coins_balance', 'xp_total', 'level',
      'streak_current', 'streak_best', 'sessions_hosted', 'achievements'
    ]
    const validPeriods: LeaderboardPeriod[] = ['all_time', 'monthly', 'weekly', 'daily']

    if (!validTypes.includes(typeParam as LeaderboardType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (!validPeriods.includes(periodParam as LeaderboardPeriod)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      )
    }

    const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 100)

    const result = await getLeaderboard(
      tenantId,
      typeParam as LeaderboardType,
      periodParam as LeaderboardPeriod,
      limit
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/gamification/leaderboard] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
