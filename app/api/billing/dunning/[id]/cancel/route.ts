import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const { id } = await params

  try {
    // Get the payment failure
    const { data: failure, error: failureError } = await supabaseAdmin
      .from('payment_failures')
      .select('*')
      .eq('id', id)
      .single()

    if (failureError || !failure) {
      return NextResponse.json({ error: 'Payment failure not found' }, { status: 404 })
    }

    if (failure.status === 'recovered' || failure.status === 'canceled') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 })
    }

    // Mark as canceled
    await supabaseAdmin
      .from('payment_failures')
      .update({
        status: 'canceled',
        resolved_at: new Date().toISOString(),
        resolution_method: 'canceled',
        next_retry_at: null,
      })
      .eq('id', id)

    // Log action
    await supabaseAdmin.rpc('log_dunning_action', {
      p_payment_failure_id: id,
      p_action_type: 'subscription_canceled',
      p_action_result: 'success',
      p_action_details: { reason: 'admin_action' },
      p_performed_by: 'admin',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[dunning cancel API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
