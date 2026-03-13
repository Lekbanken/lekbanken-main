import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { apiHandler } from '@/lib/api/route-handler'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth }) => {
  const supabase = await createServerRlsClient()
  const cookieStore = await cookies()
  const activeTenantId = await readTenantIdFromCookies(cookieStore)
  const user = auth!.user!

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSysAdmin = role === 'system_admin'
  const isTenantElevated = role === 'admin' || role === 'owner'

  let query = supabase.from('tenants').select('id,name').order('name', { ascending: true }).limit(200)
  if (!isSysAdmin) {
    if (!isTenantElevated || !activeTenantId) {
      return NextResponse.json({ tenants: [] })
    }
    query = query.eq('id', activeTenantId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[api/tenants] fetch error', error)
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })
  }

  return NextResponse.json({ tenants: data ?? [] })
  },
})

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, auth }) => {
  const supabase = await createServerRlsClient()
  const userId = auth!.user!.id

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    type?: string
    status?: string
    default_language?: string
    default_theme?: string
    demo_flag?: boolean
  }

  if (!body.name) {
    return NextResponse.json({ errors: ['name is required'] }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name: body.name || '',
      type: body.type || 'standard',
      status: body.status || 'active',
      default_language: body.default_language,
      default_theme: body.default_theme,
      demo_flag: body.demo_flag ?? false,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[api/tenants] create error', error)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId: data.id,
    actorUserId: userId,
    eventType: 'tenant_created',
    payload: body,
  })

  return NextResponse.json({ tenant: data }, { status: 201 })
  },
})
