import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'
import { logMFADisabledByUser } from '@/lib/services/mfa/mfaAudit.server'
import { checkMFARequirement, clearMFAEnrollment } from '@/lib/services/mfa/mfaService.server'

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user is allowed to disable MFA
  const requirement = await checkMFARequirement(user.id)
  if (requirement.required) {
    const reasonText = requirement.reason === 'system_admin'
      ? 'System administrators must have MFA enabled'
      : requirement.reason === 'tenant_admin'
        ? 'Tenant administrators must have MFA enabled'
        : 'Your organization requires MFA for all users'
    
    return NextResponse.json(
      { error: 'Cannot disable MFA', reason: reasonText },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as { factor_id?: string }
  if (!body.factor_id) {
    return NextResponse.json({ errors: ['factor_id is required'] }, { status: 400 })
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: body.factor_id })
  if (error) {
    console.error('[mfa/disable] unenroll error', error)
    return NextResponse.json({ error: 'Failed to disable factor' }, { status: 400 })
  }

  // Clear MFA enrollment data
  await clearMFAEnrollment(user.id)

  // Log the event
  await logMFADisabledByUser(user.id)

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'mfa_disabled',
    payload: { factor_id: body.factor_id },
  })

  return NextResponse.json({ success: true })
}
