import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateQuoteSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).optional(),
  contactName: z.string().min(1).max(100).optional(),
  contactEmail: z.string().email().optional(),
  companyName: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  discountAmount: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  notesInternal: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

export async function GET(
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
    // Get quote with line items
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select(`
        *,
        tenant:tenants(id, name),
        created_by_user:users!quotes_created_by_fkey(id, display_name, email),
        assigned_to_user:users!quotes_assigned_to_fkey(id, display_name, email)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Get line items
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from('quote_line_items')
      .select(`
        *,
        product:products(id, name)
      `)
      .eq('quote_id', id)
      .order('position')

    if (lineItemsError) {
      console.error('[quote API] Line items error:', lineItemsError)
    }

    // Get activities
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('quote_activities')
      .select(`
        *,
        performed_by_user:users(id, display_name, email)
      `)
      .eq('quote_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (activitiesError) {
      console.error('[quote API] Activities error:', activitiesError)
    }

    return NextResponse.json({
      quote,
      lineItems: lineItems || [],
      activities: activities || [],
    })
  } catch (error) {
    console.error('[quote API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const updates = parsed.data

  try {
    // Build update object
    const dbUpdates: Record<string, unknown> = {}
    if (updates.status) dbUpdates.status = updates.status
    if (updates.contactName) dbUpdates.contact_name = updates.contactName
    if (updates.contactEmail) dbUpdates.contact_email = updates.contactEmail
    if (updates.companyName) dbUpdates.company_name = updates.companyName
    if (updates.title) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.discountAmount !== undefined) dbUpdates.discount_amount = updates.discountAmount
    if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent
    if (updates.notesInternal !== undefined) dbUpdates.notes_internal = updates.notesInternal
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo

    // Special handling for status changes
    if (updates.status === 'accepted') {
      dbUpdates.accepted_at = new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('quotes')
      .update(dbUpdates)
      .eq('id', id)

    if (updateError) {
      console.error('[quote API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    // Log activity
    await supabaseAdmin.rpc('log_quote_activity', {
      p_quote_id: id,
      p_activity_type: 'updated',
      p_activity_data: { changes: Object.keys(updates) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[quote API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
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
    // Only allow deleting draft quotes
    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('status')
      .eq('id', id)
      .single()

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft quotes can be deleted' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('quotes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[quote API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[quote API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
