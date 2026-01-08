import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  getLeaderboardPreferences,
  setLeaderboardVisibility,
} from '@/lib/services/gamification-leaderboard.server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gamification/leaderboard/preferences
 * 
 * Get current user's leaderboard preferences for a tenant.
 * 
 * Query params:
 * - tenantId: UUID (required)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const prefs = await getLeaderboardPreferences(tenantId)

    return NextResponse.json({
      visible: prefs.leaderboardVisible,
      optedOutAt: prefs.optedOutAt,
      notificationsEnabled: prefs.notificationsEnabled,
    })
  } catch (error) {
    console.error('[GET /api/gamification/leaderboard/preferences] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

interface UpdatePreferencesBody {
  tenantId: string
  visible: boolean
}

/**
 * POST /api/gamification/leaderboard/preferences
 * 
 * Update current user's leaderboard visibility.
 * 
 * Body:
 * - tenantId: UUID (required)
 * - visible: boolean (required)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: UpdatePreferencesBody = await req.json()

    if (!body.tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    if (typeof body.visible !== 'boolean') {
      return NextResponse.json({ error: 'visible must be a boolean' }, { status: 400 })
    }

    const result = await setLeaderboardVisibility(body.tenantId, body.visible)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      visible: body.visible,
    })
  } catch (error) {
    console.error('[POST /api/gamification/leaderboard/preferences] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
