import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tenantId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  type: z.enum(['earn', 'spend']),
  amount: z.number().int().positive(),
  reasonCode: z.string().min(1),
  idempotencyKey: z.string().min(8),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * POST /api/gamification/coins/transaction
 * Server-only coin ledger mutation endpoint.
 *
 * - Requires tenant_admin or system_admin
 * - Uses service role + DB function for atomicity & idempotency
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, targetUserId, type, amount, reasonCode, idempotencyKey, description, metadata } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createServiceRoleClient()

    const { data, error } = await admin.rpc('apply_coin_transaction_v1', {
      p_user_id: targetUserId,
      p_tenant_id: tenantId,
      p_type: type,
      p_amount: amount,
      p_reason_code: reasonCode,
      p_idempotency_key: idempotencyKey,
      p_description: description ?? undefined,
      p_source: 'admin',
      p_metadata: (metadata ?? null) as unknown as Json,
    })

    if (error) {
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
      const status = message.toLowerCase().includes('insufficient') ? 409 : 500
      return NextResponse.json({ error: 'Coin transaction failed', details: message }, { status })
    }

    const row = Array.isArray(data) ? data[0] : data
    return NextResponse.json({ transactionId: row?.transaction_id ?? null, balance: row?.balance ?? null }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
