import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const redeemSchema = z.object({
  code: z.string().min(8).max(12),
  tenantId: z.string().uuid().optional(), // Optional: redeem to existing org
})

interface RedeemResult {
  success: boolean
  message?: string
  gift_id?: string
  product_id?: string
  entitlement_id?: string
}

interface GiftPurchase {
  id: string
  status: string
  redemption_code_expires_at: string | null
  product: { id: string; name: string } | null
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { code, tenantId } = parsed.data

  try {
    // Call the redeem function (using 'as never' since types not yet generated)
    const { data, error } = await supabaseAdmin.rpc('redeem_gift_code' as never, {
      p_code: code.toUpperCase(),
      p_user_id: user.id,
      p_tenant_id: tenantId || null,
    } as never)

    if (error) {
      console.error('[gift/redeem] RPC error', error)
      return NextResponse.json({ error: 'Failed to redeem gift' }, { status: 500 })
    }

    const resultArray = data as RedeemResult[] | null
    const result = resultArray?.[0]
    if (!result) {
      return NextResponse.json({ error: 'No result from redemption' }, { status: 500 })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Redemption failed', code: 'REDEMPTION_FAILED' },
        { status: 400 }
      )
    }

    // Get product name for the response
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', result.product_id as string)
      .single()

    return NextResponse.json({
      success: true,
      message: result.message,
      gift_id: result.gift_id,
      product_id: result.product_id,
      product_name: product?.name,
      entitlement_id: result.entitlement_id,
    })
  } catch (err) {
    console.error('[gift/redeem] Error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET: Validate a gift code without redeeming
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  // Use type assertion since gift_purchases types not yet generated
  const { data, error } = await supabaseAdmin
    .from('gift_purchases' as never)
    .select(`
      id,
      status,
      redemption_code_expires_at,
      product:products(id, name)
    ` as never)
    .eq('redemption_code' as never, code.toUpperCase())
    .maybeSingle()

  if (error) {
    console.error('[gift/redeem] Validate error', error)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }

  const gift = data as GiftPurchase | null

  if (!gift) {
    return NextResponse.json({ valid: false, reason: 'invalid' })
  }

  if (gift.status !== 'paid') {
    return NextResponse.json({
      valid: false,
      reason: gift.status === 'redeemed' ? 'already_redeemed' : gift.status,
    })
  }

  if (gift.redemption_code_expires_at && new Date(gift.redemption_code_expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  return NextResponse.json({
    valid: true,
    product: gift.product,
    expires_at: gift.redemption_code_expires_at,
  })
}
