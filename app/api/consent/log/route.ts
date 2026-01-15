/**
 * Consent Log API
 * Logs consent events to the database for GDPR compliance
 * 
 * NOTE: This API uses tables created by migration 20260115000000_cookie_consent_v2.sql
 * After applying the migration, run `npx supabase gen types typescript` to update types.
 * Until then, we use eslint-disable to bypass type checking on these operations.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ConsentAuditEvent } from '@/lib/consent/types'

export async function POST(request: NextRequest) {
  try {
    const event: ConsentAuditEvent = await request.json()

    // Validate required fields
    if (!event.consentId || !event.eventType || !event.newState || !event.consentVersion) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client IP (for audit purposes)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    // Use service role client to insert audit log (bypasses RLS)
    const supabase = await createServiceRoleClient()
    
    // Cast to any to bypass type checking until migration is applied and types regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Insert into audit log
    const { error: auditError } = await db
      .from('cookie_consent_audit')
      .insert({
        consent_id: event.consentId,
        user_id: event.userId || null,
        event_type: event.eventType,
        previous_state: event.previousState || null,
        new_state: event.newState,
        consent_version: event.consentVersion,
        ip_address: ipAddress,
        user_agent: event.userAgent || null,
        page_url: event.pageUrl || null,
        referrer: event.referrer || null,
        locale: event.locale || null,
        dnt_enabled: event.dntEnabled ?? false,
        gpc_enabled: event.gpcEnabled ?? false,
      })

    if (auditError) {
      console.error('[consent/log] Audit log error:', auditError)
      // Don't fail the request - consent logging is non-critical
    }

    // For anonymous users, also store/update their consent state
    if (!event.userId && (event.eventType === 'granted' || event.eventType === 'updated')) {
      const { error: consentError } = await db
        .from('anonymous_cookie_consents')
        .upsert({
          consent_id: event.consentId,
          necessary: event.newState.necessary ?? true,
          functional: event.newState.functional ?? false,
          analytics: event.newState.analytics ?? false,
          marketing: event.newState.marketing ?? false,
          consent_version: event.consentVersion,
          locale: event.locale || 'en',
          ip_address: ipAddress,
          user_agent: event.userAgent || null,
          dnt_enabled: event.dntEnabled ?? false,
          gpc_enabled: event.gpcEnabled ?? false,
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
  } catch (error) {
    console.error('[consent/log] Unexpected error:', error)
    // Return success anyway - consent logging shouldn't block UX
    return NextResponse.json({ success: true })
  }
}

// Prevent caching
export const dynamic = 'force-dynamic'
