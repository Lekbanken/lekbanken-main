import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await context.params

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('purchase_intents')
    .select(
      'id, kind, status, tenant_id, tenant_name, product_id, product_price_id, quantity_seats, stripe_checkout_session_id, stripe_subscription_id, created_at, updated_at'
    )
    .eq('id', intentId)
    .maybeSingle()

  if (error) {
    console.error('[checkout/intents/:id] select error', error)
    return NextResponse.json({ error: 'Failed to load purchase intent' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ intent: data })
}
