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
  const { data, error } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
  if (error) {
    console.error('[api/tenants/:id/settings] get error', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
  return NextResponse.json({ settings: data ?? null })
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
    modules?: Record<string, unknown>
    product_access?: Record<string, unknown>
    preferences?: Record<string, unknown>
  }

  // Demo tenants: only system_admin may mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const isObj = (val: unknown) => !val || typeof val === 'object'
  if (!isObj(body.modules) || !isObj(body.product_access) || !isObj(body.preferences)) {
    return NextResponse.json({ errors: ['modules/product_access/preferences must be objects'] }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .upsert(
      {
        tenant_id: tenantId,
        modules: body.modules,
        product_access: body.product_access,
        preferences: body.preferences,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'tenant_id' }
    )
    .select()
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/:id/settings] update error', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'settings_updated',
    payload: body,
  })

  return NextResponse.json({ settings: data })
}
