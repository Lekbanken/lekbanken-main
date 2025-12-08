import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase.from('tenant_branding').select('*').eq('tenant_id', tenantId).maybeSingle()
  if (error) {
    console.error('[api/tenants/:id/branding] get error', error)
    return NextResponse.json({ error: 'Failed to load branding' }, { status: 500 })
  }
  return NextResponse.json({ branding: data ?? null })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(isSystemAdmin(user) || (await isTenantAdmin(tenantId, user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    logo_media_id?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    theme?: string | null
    brand_name_override?: string | null
  }

  // Demo tenants: only system_admin may mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  if (body.theme && !['light', 'dark'].includes(body.theme)) {
    return NextResponse.json({ errors: ['invalid theme'] }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenant_branding')
    .upsert(
      {
        tenant_id: tenantId,
        logo_media_id: body.logo_media_id ?? null,
        primary_color: body.primary_color ?? null,
        secondary_color: body.secondary_color ?? null,
        accent_color: body.accent_color ?? null,
        theme: body.theme ?? null,
        brand_name_override: body.brand_name_override ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/:id/branding] update error', error)
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'branding_updated',
    payload: body,
  })

  return NextResponse.json({ branding: data })
}
