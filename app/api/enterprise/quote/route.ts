import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const quoteRequestSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  teamSize: z.string().min(1),
  message: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = quoteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { companyName, contactName, email, phone, teamSize, message } = parsed.data

  try {
    // Store the quote request in the database
    // Note: Using type assertion since table may not exist in generated types yet
    const { error: insertError } = await (supabaseAdmin as unknown as { 
      from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } 
    })
      .from('enterprise_quote_requests')
      .insert({
        company_name: companyName,
        contact_name: contactName,
        email,
        phone: phone || null,
        team_size: teamSize,
        message: message || null,
        status: 'pending',
      })

    if (insertError) {
      console.error('[enterprise-quote] Insert error:', insertError)
      // If the table doesn't exist, just log and continue
      if (!insertError.message.includes('does not exist')) {
        throw insertError
      }
    }

    // TODO: Send notification email to sales team
    // await sendEnterpriseQuoteNotification({ companyName, contactName, email, phone, teamSize, message })

    // TODO: Send confirmation email to the requester
    // await sendEnterpriseQuoteConfirmation({ email, contactName, companyName })

    return NextResponse.json({ 
      success: true,
      message: 'Quote request submitted successfully',
    })
  } catch (error) {
    console.error('[enterprise-quote] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit quote request' },
      { status: 500 }
    )
  }
}
