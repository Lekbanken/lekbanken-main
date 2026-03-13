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
    console.warn('[billing/payments] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

async function fetchInvoice(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  tenantId: string,
  invoiceId: string
) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, tenant_id, status, amount, currency, due_date')
    .eq('tenant_id', tenantId)
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) {
    console.error('[billing/payments] invoice lookup error', error)
    throw new Error('invoice_lookup_failed')
  }
  return data
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { tenantId, invoiceId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let invoice
  try {
    invoice = await fetchInvoice(supabase, tenantId, invoiceId)
  } catch {
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 })
  }
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[billing/payments] select error', error)
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 })
  }

  return NextResponse.json({ invoice, payments: data ?? [] })
  },
})

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { tenantId, invoiceId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let invoice
  try {
    invoice = await fetchInvoice(supabase, tenantId, invoiceId)
  } catch {
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 })
  }
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    amount?: number
    currency?: string
    status?: PaymentStatus
    provider?: string | null
    transaction_reference?: string | null
    paid_at?: string | null
  }

  if (!body.name || typeof body.amount !== 'number') {
    return NextResponse.json({ error: 'name and amount are required' }, { status: 400 })
  }

  // Tenant admins cannot create confirmed payments — only webhook/system_admin can
  const TENANT_BLOCKED_STATUSES: PaymentStatus[] = ['confirmed']
  if (body.status && TENANT_BLOCKED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Cannot create payment with confirmed status — this is managed by payment processing' }, { status: 403 })
  }

  const payload = {
    invoice_id: invoiceId,
    name: body.name,
    amount: body.amount,
    currency: body.currency || invoice.currency || 'NOK',
    status: body.status ?? 'pending',
    provider: body.provider ?? null,
    transaction_reference: body.transaction_reference ?? null,
    paid_at: null as string | null,
  }

  const { data, error } = await supabase.from('payments').insert(payload).select('*').maybeSingle()

  if (error) {
    console.error('[billing/payments] insert error', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  return NextResponse.json({ payment: data })
  },
})
