import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productPriceId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().min(1).max(10000),
  unitPrice: z.number().int().min(0), // In cents
  discountPercent: z.number().min(0).max(100).optional(),
  billingType: z.enum(['recurring', 'one_time']).default('recurring'),
  billingInterval: z.enum(['month', 'year']).optional(),
})

const createQuoteSchema = z.object({
  tenantId: z.string().uuid().optional(),
  contactName: z.string().min(1).max(100),
  contactEmail: z.string().email(),
  companyName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  currency: z.string().default('sek'),
  validDays: z.number().int().min(1).max(365).default(30),
  paymentTerms: z.enum(['immediate', 'net_30', 'net_60']).default('net_30'),
  contractLengthMonths: z.number().int().min(1).max(60).default(12),
  discountAmount: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  notesInternal: z.string().max(2000).optional(),
  lineItems: z.array(lineItemSchema).min(1),
})

export async function GET(request: Request) {
  try {
    await requireSystemAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const tenantId = url.searchParams.get('tenantId')

  try {
    let query = supabaseAdmin
      .from('quotes')
      .select(`
        *,
        tenant:tenants(id, name),
        created_by_user:users!quotes_created_by_fkey(id, display_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: quotes, error } = await query

    if (error) {
      console.error('[quotes API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    return NextResponse.json({ quotes: quotes || [] })
  } catch (error) {
    console.error('[quotes API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let userId: string
  try {
    const adminCtx = await requireSystemAdmin()
    // After requireSystemAdmin, user is guaranteed to exist
    if (!adminCtx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = adminCtx.user.id
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { lineItems, validDays, ...quoteData } = parsed.data

  try {
    // Generate quote number
    const { data: quoteNumberData, error: quoteNumberError } = await supabaseAdmin
      .rpc('generate_quote_number')

    if (quoteNumberError) {
      console.error('[quotes API] Quote number error:', quoteNumberError)
      return NextResponse.json({ error: 'Failed to generate quote number' }, { status: 500 })
    }

    const quoteNumber = quoteNumberData as string

    // Calculate valid until date
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    // Calculate subtotal from line items
    const subtotal = lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice
      const discount = item.discountPercent ? Math.round(itemTotal * item.discountPercent / 100) : 0
      return sum + (itemTotal - discount)
    }, 0)

    // Calculate discount
    let discountAmount = quoteData.discountAmount || 0
    if (quoteData.discountPercent && !quoteData.discountAmount) {
      discountAmount = Math.round(subtotal * quoteData.discountPercent / 100)
    }

    const totalAmount = subtotal - discountAmount

    // Create quote (adminUser.id comes from requireSystemAdmin)
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        tenant_id: quoteData.tenantId,
        contact_name: quoteData.contactName,
        contact_email: quoteData.contactEmail,
        company_name: quoteData.companyName,
        title: quoteData.title,
        description: quoteData.description,
        currency: quoteData.currency,
        subtotal,
        discount_amount: discountAmount,
        discount_percent: quoteData.discountPercent,
        total_amount: totalAmount,
        valid_until: validUntil.toISOString().split('T')[0],
        payment_terms: quoteData.paymentTerms,
        contract_length_months: quoteData.contractLengthMonths,
        notes_internal: quoteData.notesInternal,
        status: 'draft',
        created_by: userId,
      })
      .select('id')
      .single()

    if (quoteError || !quote) {
      console.error('[quotes API] Quote insert error:', quoteError)
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
    }

    // Create line items
    const lineItemsToInsert = lineItems.map((item, index) => ({
      quote_id: quote.id,
      product_id: item.productId,
      product_price_id: item.productPriceId,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_percent: item.discountPercent || 0,
      total_price: 0, // Will be calculated by trigger
      billing_type: item.billingType,
      billing_interval: item.billingInterval,
      position: index,
    }))

    const { error: lineItemsError } = await supabaseAdmin
      .from('quote_line_items')
      .insert(lineItemsToInsert)

    if (lineItemsError) {
      console.error('[quotes API] Line items insert error:', lineItemsError)
      // Non-fatal, quote was created
    }

    // Log activity
    await supabaseAdmin.rpc('log_quote_activity', {
      p_quote_id: quote.id,
      p_activity_type: 'created',
      p_activity_data: { items_count: lineItems.length },
    })

    return NextResponse.json({
      quote_id: quote.id,
      quote_number: quoteNumber,
    })
  } catch (error) {
    console.error('[quotes API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
