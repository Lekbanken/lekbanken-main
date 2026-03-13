import { NextResponse } from 'next/server'
import { refundBurn } from '@/lib/services/gamification-burn.server'
import { apiHandler } from '@/lib/api/route-handler'

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
export const POST = apiHandler({
  auth: 'system_admin',
  rateLimit: 'strict',
  handler: async ({ req }) => {
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
  },
})
