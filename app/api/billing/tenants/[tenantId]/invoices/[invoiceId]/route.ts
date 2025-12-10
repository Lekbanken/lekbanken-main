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
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle()
  if (error) {
    console.warn('[billing/invoice] role lookup error', error)
    return null
  }
  return data?.role ?? null
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

  const { data, error } = await supabase
    .from('invoices')
    .select('*, billing_product:billing_products(*), subscription:tenant_subscriptions(*), payments:payments(*)')
    .eq('tenant_id', tenantId)
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) {
    console.error('[billing/invoice] select error', error)
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invoiceId: string }> }
) {
  const { tenantId, invoiceId } = await params
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

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (typeof body.amount === 'number') updates.amount = body.amount
  if (body.currency !== undefined) updates.currency = body.currency
  if (body.due_date !== undefined) updates.due_date = body.due_date
  if (body.billing_product_id !== undefined) updates.billing_product_id = body.billing_product_id
  if (body.subscription_id !== undefined) updates.subscription_id = body.subscription_id
  if (body.status !== undefined) updates.status = body.status
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.pdf_url !== undefined) updates.pdf_url = body.pdf_url
  if (body.invoice_number !== undefined) updates.invoice_number = body.invoice_number
  if (body.issued_at !== undefined) updates.issued_at = body.issued_at
  if (body.paid_at !== undefined) updates.paid_at = body.paid_at
  if (body.amount_subtotal !== undefined) updates.amount_subtotal = body.amount_subtotal
  if (body.amount_tax !== undefined) updates.amount_tax = body.amount_tax
  if (body.amount_total !== undefined) updates.amount_total = body.amount_total
  if (body.stripe_invoice_id !== undefined) updates.stripe_invoice_id = body.stripe_invoice_id

  if (body.status === 'paid' && updates.paid_at === undefined) {
    updates.paid_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select('*, billing_product:billing_products(*), subscription:tenant_subscriptions(*), payments:payments(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/invoice] patch error', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}
