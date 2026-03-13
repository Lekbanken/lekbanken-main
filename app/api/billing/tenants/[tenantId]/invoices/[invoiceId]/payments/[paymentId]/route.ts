import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded'

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[billing/payment] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

async function fetchPayment(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  tenantId: string,
  invoiceId: string,
  paymentId: string
) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(id, tenant_id, currency)')
    .eq('id', paymentId)
    .eq('invoice_id', invoiceId)
    .maybeSingle()

  if (error) {
    console.error('[billing/payment] lookup error', error)
    throw new Error('payment_lookup_failed')
  }
  if (data && data.invoice?.tenant_id !== tenantId) return null
  return data
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { tenantId, invoiceId, paymentId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let payment
  try {
    payment = await fetchPayment(supabase, tenantId, invoiceId, paymentId)
  } catch {
    return NextResponse.json({ error: 'Failed to load payment' }, { status: 500 })
  }

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ payment })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { tenantId, invoiceId, paymentId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let payment
  try {
    payment = await fetchPayment(supabase, tenantId, invoiceId, paymentId)
  } catch {
    return NextResponse.json({ error: 'Failed to load payment' }, { status: 500 })
  }
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    amount?: number
    currency?: string
    status?: PaymentStatus
    provider?: string | null
    transaction_reference?: string | null
    paid_at?: string | null
  }

  // Tenant admins cannot confirm their own payments — only webhook/system_admin can
  const TENANT_BLOCKED_STATUSES: PaymentStatus[] = ['confirmed']
  if (body.status && TENANT_BLOCKED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Cannot set payment status to confirmed — this is managed by payment processing' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (typeof body.amount === 'number') updates.amount = body.amount
  if (body.currency !== undefined) updates.currency = body.currency
  if (body.status !== undefined) updates.status = body.status
  if (body.provider !== undefined) updates.provider = body.provider
  if (body.transaction_reference !== undefined) updates.transaction_reference = body.transaction_reference
  // paid_at is server-managed — tenant admins cannot set it directly

  if (body.status === 'confirmed' && updates.paid_at === undefined) {
    // paid_at is only set when status transitions to confirmed via webhook/admin
    // This path is blocked above for tenant admins
    updates.paid_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .eq('invoice_id', invoiceId)
    .select('*, invoice:invoices(id, tenant_id, currency)')
    .maybeSingle()

  if (error) {
    console.error('[billing/payment] patch error', error)
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
  }
  if (!data || data.invoice?.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ payment: data })
  },
})
