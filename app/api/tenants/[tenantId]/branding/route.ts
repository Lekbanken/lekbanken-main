import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const { tenantId } = params
    const supabase = await createServerRlsClient()
    const { data, error } = await supabase.from('tenant_branding').select('*').eq('tenant_id', tenantId).maybeSingle()
    if (error) {
      console.error('[api/tenants/:id/branding] get error', error)
      return NextResponse.json({ error: 'Failed to load branding' }, { status: 500 })
    }
    return NextResponse.json({ branding: data ?? null })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ req, auth, params }) => {
    const { tenantId } = params
    await requireTenantRole(['admin', 'owner'], tenantId)

    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as {
      logo_media_id?: string | null
      primary_color?: string | null
      secondary_color?: string | null
      accent_color?: string | null
      theme?: string | null
      brand_name_override?: string | null
    }

    // Demo tenants: only system_admin may mutate
    const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
    if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && auth!.effectiveGlobalRole !== 'system_admin') {
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
      actorUserId: auth!.user!.id,
      eventType: 'branding_updated',
      payload: body,
    })

    return NextResponse.json({ branding: data })
  },
})
