import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded'

async function requireUser() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invoiceId: string }> }
) {
  const { tenantId, invoiceId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
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
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invoiceId: string }> }
) {
  const { tenantId, invoiceId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let invoice
  try {
    invoice = await fetchInvoice(supabase, tenantId, invoiceId)
  } catch {
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 })
  }
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as {
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

  const payload = {
    invoice_id: invoiceId,
    name: body.name,
    amount: body.amount,
    currency: body.currency || invoice.currency || 'NOK',
    status: body.status ?? 'pending',
    provider: body.provider ?? null,
    transaction_reference: body.transaction_reference ?? null,
    paid_at: body.paid_at ?? null,
  }

  if (payload.status === 'confirmed' && !payload.paid_at) {
    payload.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase.from('payments').insert(payload).select('*').maybeSingle()

  if (error) {
    console.error('[billing/payments] insert error', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  return NextResponse.json({ payment: data })
}
