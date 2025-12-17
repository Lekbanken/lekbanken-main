import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'

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
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle()
  if (error) {
    console.warn('[billing/invoices] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const status = (statusParam && ['draft', 'issued', 'sent', 'paid', 'overdue', 'canceled'].includes(statusParam)
    ? (statusParam as InvoiceStatus)
    : null)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)

  let query = supabase
    .from('invoices')
    .select('*, billing_product:billing_products(*), subscription:tenant_subscriptions(*), payments:payments(*)')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[billing/invoices] select error', error)
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 })
  }

  return NextResponse.json({ invoices: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    amount?: number
    currency?: string
    due_date?: string
    billing_product_id?: string | null
    subscription_id?: string | null
    status?: InvoiceStatus
    notes?: string | null
    pdf_url?: string | null
    invoice_number?: string | null
    issued_at?: string | null
    paid_at?: string | null
    amount_subtotal?: number | null
    amount_tax?: number | null
    amount_total?: number | null
    stripe_invoice_id?: string | null
  }

  if (!body.name || typeof body.amount !== 'number' || !body.due_date) {
    return NextResponse.json({ error: 'name, amount and due_date are required' }, { status: 400 })
  }

  const payload = {
    tenant_id: tenantId,
    name: body.name,
    amount: body.amount,
    amount_subtotal: body.amount_subtotal ?? body.amount,
    amount_tax: body.amount_tax ?? 0,
    amount_total: body.amount_total ?? body.amount,
    currency: body.currency || 'NOK',
    due_date: body.due_date,
    billing_product_id: body.billing_product_id ?? null,
    subscription_id: body.subscription_id ?? null,
    status: body.status ?? 'draft',
    notes: body.notes ?? null,
    pdf_url: body.pdf_url ?? null,
    invoice_number: body.invoice_number ?? null,
    issued_at: body.issued_at ?? null,
    paid_at: body.paid_at ?? null,
    stripe_invoice_id: body.stripe_invoice_id ?? null,
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select('*, billing_product:billing_products(*), subscription:tenant_subscriptions(*), payments:payments(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/invoices] insert error', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }

  return NextResponse.json({ invoice: data })
}
