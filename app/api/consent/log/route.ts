/**
 * Consent Log API
 * Logs consent events to the database for GDPR compliance
 * 
 * NOTE: This API uses tables created by migration 20260115000000_cookie_consent_v2.sql
 * After applying the migration, run `npx supabase gen types typescript` to update types.
 * Until then, we use eslint-disable to bypass type checking on these operations.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { z } from 'zod'

const cookieConsentStateSchema = z.object({
  necessary: z.boolean(),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
})

const consentLogSchema = z.object({
  consentId: z.string().min(1).max(100),
  eventType: z.enum(['granted', 'updated', 'withdrawn', 'expired', 'reprompted']),
  newState: cookieConsentStateSchema,
  consentVersion: z.string().min(1).max(20),
  userId: z.string().uuid().optional(),
  previousState: cookieConsentStateSchema.optional(),
  locale: z.string().max(10),
  dntEnabled: z.boolean(),
  gpcEnabled: z.boolean(),
  pageUrl: z.string().max(2000),
  referrer: z.string().max(2000),
  userAgent: z.string().max(500),
})

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'strict',
  input: consentLogSchema,
  handler: async ({ body, req }) => {
    // Get client IP (for audit purposes)
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    // Use service role client to insert audit log (bypasses RLS — anonymous users don't have RLS sessions)
    const supabase = await createServiceRoleClient()
    
    // Cast to any to bypass type checking until migration is applied and types regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Insert into audit log
    const { error: auditError } = await db
      .from('cookie_consent_audit')
      .insert({
        consent_id: body.consentId,
        user_id: body.userId || null,
        event_type: body.eventType,
        previous_state: body.previousState || null,
        new_state: body.newState,
        consent_version: body.consentVersion,
        ip_address: ipAddress,
        user_agent: body.userAgent || null,
        page_url: body.pageUrl || null,
        referrer: body.referrer || null,
        locale: body.locale || null,
        dnt_enabled: body.dntEnabled ?? false,
        gpc_enabled: body.gpcEnabled ?? false,
      })

    if (auditError) {
      console.error('[consent/log] Audit log error:', auditError)
      // Don't fail the request - consent logging is non-critical
    }

    // For anonymous users, also store/update their consent state
    if (!body.userId && (body.eventType === 'granted' || body.eventType === 'updated')) {
      const { error: consentError } = await db
        .from('anonymous_cookie_consents')
        .upsert({
          consent_id: body.consentId,
          necessary: body.newState.necessary ?? true,
          functional: body.newState.functional ?? false,
          analytics: body.newState.analytics ?? false,
          marketing: body.newState.marketing ?? false,
          consent_version: body.consentVersion,
          locale: body.locale || 'en',
          ip_address: ipAddress,
          user_agent: body.userAgent || null,
          dnt_enabled: body.dntEnabled ?? false,
          gpc_enabled: body.gpcEnabled ?? false,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'consent_id',
          ignoreDuplicates: false 
        })

      if (consentError) {
        console.error('[consent/log] Anonymous consent error:', consentError)
      }
    }

    return NextResponse.json({ success: true })
  },
})

// Prevent caching
export const dynamic = 'force-dynamic'
