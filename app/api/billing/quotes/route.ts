import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

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

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const tenantId = url.searchParams.get('tenantId')

    const client = createServiceRoleClient()

    let query = client
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
  },
})

export const POST = apiHandler({
  auth: 'system_admin',
  input: createQuoteSchema,
  handler: async ({ auth, body }) => {
    const userId = auth!.user!.id
    const { lineItems, validDays = 30, ...quoteData } = body

    const client = createServiceRoleClient()

    // Generate quote number
    const { data: quoteNumberData, error: quoteNumberError } = await client
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

    // Create quote
    const { data: quote, error: quoteError } = await client
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

    const { error: lineItemsError } = await client
      .from('quote_line_items')
      .insert(lineItemsToInsert)

    if (lineItemsError) {
      console.error('[quotes API] Line items insert error:', lineItemsError)
      // Non-fatal, quote was created
    }

    // Log activity
    await client.rpc('log_quote_activity', {
      p_quote_id: quote.id,
      p_activity_type: 'created',
      p_activity_data: { items_count: lineItems.length },
    })

    return NextResponse.json({
      quote_id: quote.id,
      quote_number: quoteNumber,
    })
  },
})
