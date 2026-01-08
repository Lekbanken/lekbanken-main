import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAvailableSinks } from '@/lib/services/gamification-burn.server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gamification/sinks
 * 
 * List available burn sinks (shop items, boosts, etc.) for the user's context.
 * Includes global sinks and tenant-specific sinks.
 * 
 * Query params:
 * - tenantId: UUID (optional) - filter to specific tenant context
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    
    const sinks = await getAvailableSinks(tenantId)
    
    return NextResponse.json({
      sinks: sinks.map((s) => ({
        id: s.id,
        sinkType: s.sinkType,
        name: s.name,
        description: s.description,
        costCoins: s.costCoins,
        remainingStock: s.remainingStock,
        availableUntil: s.availableUntil,
        metadata: s.metadata,
      })),
    })
  } catch (error) {
    console.error('[GET /api/gamification/sinks] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sinks' },
      { status: 500 }
    )
  }
}
