import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { refundBurn } from '@/lib/services/gamification-burn.server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RefundRequestBody {
  burnLogId: string
  reason?: string
}

/**
 * POST /api/admin/gamification/refund
 * 
 * Process a refund for a previous burn transaction.
 * Admin only.
 * 
 * Body:
 * - burnLogId: UUID (required) - the burn log entry to refund
 * - reason: string (optional) - reason for refund
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_system_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body: RefundRequestBody = await req.json()

    if (!body.burnLogId) {
      return NextResponse.json({ error: 'burnLogId is required' }, { status: 400 })
    }

    const result = await refundBurn({
      burnLogId: body.burnLogId,
      reason: body.reason,
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.errorMessage,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      refundTransactionId: result.refundTransactionId,
      newBalance: result.newBalance,
    })
  } catch (error) {
    console.error('[POST /api/admin/gamification/refund] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
