import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const { tenantId } = params
    const supabase = await createServerRlsClient()
    const { data, error } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
    if (error) {
      console.error('[api/tenants/:id/settings] get error', error)
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    }
    return NextResponse.json({ settings: data ?? null })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ req, auth, params }) => {
    const { tenantId } = params
    await requireTenantRole(['admin', 'owner'], tenantId)

    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as {
      modules?: Record<string, unknown>
      product_access?: Record<string, unknown>
      preferences?: Record<string, unknown>
    }

    // Demo tenants: only system_admin may mutate
    const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
    if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && auth!.effectiveGlobalRole !== 'system_admin') {
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
          modules: body.modules as Json | undefined,
          product_access: body.product_access as Json | undefined,
          preferences: body.preferences as Json | undefined,
          updated_at: new Date().toISOString(),
        },
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
      actorUserId: auth!.user!.id,
      eventType: 'settings_updated',
      payload: body,
    })

    return NextResponse.json({ settings: data })
  },
})
