import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const quoteRequestSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  teamSize: z.string().min(1),
  message: z.string().max(1000).optional(),
  // Honeypot field — must be empty. Bots filling hidden fields get rejected.
  website: z.string().max(0).optional(),
})

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'strict',
  input: quoteRequestSchema,
  handler: async ({ body }) => {
    const { companyName, contactName, email, phone, teamSize, message } = body

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
  },
})
