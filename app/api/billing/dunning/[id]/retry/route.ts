import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
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
      return NextResponse.json({ error: 'Cannot retry resolved failure' }, { status: 400 })
    }

    if (!failure.invoice_id) {
      return NextResponse.json({ error: 'No invoice to retry' }, { status: 400 })
    }

    // Retry the payment via Stripe
    try {
      const invoice = await stripe.invoices.pay(failure.invoice_id)

      if (invoice.status === 'paid') {
        // Mark as recovered
        await supabaseAdmin
          .from('payment_failures')
          .update({
            status: 'recovered',
            resolved_at: new Date().toISOString(),
            resolution_method: 'manual_payment',
          })
          .eq('id', id)

        // Log action
        await supabaseAdmin.rpc('log_dunning_action', {
          p_payment_failure_id: id,
          p_action_type: 'recovered',
          p_action_result: 'success',
          p_action_details: { method: 'admin_retry' },
          p_performed_by: 'admin',
        })

        return NextResponse.json({ success: true, status: 'recovered' })
      }
    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Payment failed'
      
      // Update retry count
      await supabaseAdmin
        .from('payment_failures')
        .update({
          retry_count: (failure.retry_count || 0) + 1,
          last_retry_at: new Date().toISOString(),
          failure_message: errorMessage,
        })
        .eq('id', id)

      // Log failed retry
      await supabaseAdmin.rpc('log_dunning_action', {
        p_payment_failure_id: id,
        p_action_type: 'retry_attempted',
        p_action_result: 'failed',
        p_action_details: { error: errorMessage, method: 'admin_retry' },
        p_performed_by: 'admin',
      })

      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Unknown error' }, { status: 500 })
  } catch (error) {
    console.error('[dunning retry API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
