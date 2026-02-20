import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { burnCoins, checkUserPurchaseLimit } from '@/lib/services/gamification-burn.server'
import { requireCronOrAdmin, AuthError } from '@/lib/api/auth-guard'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

interface BurnRequestBody {
  userId: string
  tenantId?: string | null
  sinkId?: string | null
  amount?: number
  idempotencyKey: string
  metadata?: Json
}

/**
 * POST /api/gamification/burn
 * 
 * Execute a coin burn transaction (purchase, boost activation, etc.)
 * Service role only - intended to be called from server-side code.
 * 
 * Body:
 * - userId: UUID (required)
 * - tenantId: UUID (optional)
 * - sinkId: UUID (optional) - the item being purchased
 * - amount: number (optional) - override amount if no sink
 * - idempotencyKey: string (required) - prevents double-spend
 * - metadata: object (optional) - additional context
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify caller is cron job or system admin
    await requireCronOrAdmin()

    const body: BurnRequestBody = await req.json()

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    if (!body.idempotencyKey) {
      return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 })
    }
    if (!body.sinkId && !body.amount) {
      return NextResponse.json({ error: 'Either sinkId or amount is required' }, { status: 400 })
    }

    // Check per-user limit if purchasing a sink
    if (body.sinkId) {
      const limitCheck = await checkUserPurchaseLimit(
        body.userId,
        body.tenantId ?? null,
        body.sinkId
      )
      
      if (!limitCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: `Purchase limit reached (${limitCheck.purchased}/${limitCheck.limit})`,
        }, { status: 400 })
      }
    }

    // Execute burn
    const result = await burnCoins({
      userId: body.userId,
      tenantId: body.tenantId ?? null,
      sinkId: body.sinkId ?? null,
      amount: body.amount,
      idempotencyKey: body.idempotencyKey,
      metadata: body.metadata,
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.errorMessage,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      burnLogId: result.burnLogId,
      transactionId: result.coinTransactionId,
      newBalance: result.newBalance,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[POST /api/gamification/burn] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
