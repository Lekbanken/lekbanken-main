import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  getLeaderboardStats,
  checkLeaderboardAbuseRisk,
  adminSetLeaderboardExclusion,
} from '@/lib/services/gamification-leaderboard.server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/gamification/leaderboard
 * 
 * Get leaderboard statistics for admin dashboard.
 * 
 * Query params:
 * - tenantId: UUID (required)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = req.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Check admin role
    const { data: hasAccess } = await supabase.rpc('has_tenant_role', {
      p_tenant_id: tenantId,
      required_roles: ['owner', 'admin'],
    })

    const { data: isSystemAdmin } = await supabase.rpc('is_system_admin')

    if (!hasAccess && !isSystemAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const stats = await getLeaderboardStats(tenantId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[GET /api/admin/gamification/leaderboard] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard stats' },
      { status: 500 }
    )
  }
}

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
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AbuseCheckBody = await req.json()

    if (!body.tenantId || !body.userId) {
      return NextResponse.json(
        { error: 'tenantId and userId are required' },
        { status: 400 }
      )
    }

    // Check admin role
    const { data: hasAccess } = await supabase.rpc('has_tenant_role', {
      p_tenant_id: body.tenantId,
      required_roles: ['owner', 'admin'],
    })

    const { data: isSystemAdmin } = await supabase.rpc('is_system_admin')

    if (!hasAccess && !isSystemAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await checkLeaderboardAbuseRisk(body.tenantId, body.userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/admin/gamification/leaderboard/abuse-check] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check abuse risk' },
      { status: 500 }
    )
  }
}

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
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExclusionBody = await req.json()

    if (!body.tenantId || !body.userId || typeof body.excluded !== 'boolean') {
      return NextResponse.json(
        { error: 'tenantId, userId, and excluded are required' },
        { status: 400 }
      )
    }

    // Check admin role
    const { data: hasAccess } = await supabase.rpc('has_tenant_role', {
      p_tenant_id: body.tenantId,
      required_roles: ['owner', 'admin'],
    })

    const { data: isSystemAdmin } = await supabase.rpc('is_system_admin')

    if (!hasAccess && !isSystemAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

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
  } catch (error) {
    console.error('[PATCH /api/admin/gamification/leaderboard] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update exclusion' },
      { status: 500 }
    )
  }
}
