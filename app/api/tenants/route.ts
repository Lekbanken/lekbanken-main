import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'

export async function GET() {
  const supabase = await createServerRlsClient()
  const cookieStore = await cookies()
  const activeTenantId = await readTenantIdFromCookies(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
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
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[api/tenants] create error', error)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId: data.id,
    actorUserId: user.id,
    eventType: 'tenant_created',
    payload: body,
  })

  return NextResponse.json({ tenant: data }, { status: 201 })
}
