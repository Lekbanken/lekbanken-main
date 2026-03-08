import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PreferenceRow = Database['public']['Tables']['user_preferences']['Row']
type PreferenceInsert = Database['public']['Tables']['user_preferences']['Insert']

async function getAuthedUserId() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function assertTenantAccess(userId: string, tenantId: string) {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('[accounts/profile/preferences] membership check error', error)
    return { ok: false as const, status: 500, admin }
  }

  if (!data) {
    return { ok: false as const, status: 403, admin }
  }

  return { ok: true as const, status: 200, admin }
}

function normalizeTheme<T extends PreferenceRow | null>(preferences: T): T {
  if (preferences && preferences.theme === 'auto') {
    return {
      ...preferences,
      theme: 'system',
    } as T
  }

  return preferences
}

export async function GET(request: NextRequest) {
  const userId = await getAuthedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  const access = await assertTenantAccess(userId, tenantId)
  if (!access.ok) {
    const error = access.status === 403 ? 'Forbidden' : 'Failed to validate tenant access'
    return NextResponse.json({ error }, { status: access.status })
  }

  const { data, error } = await access.admin
    .from('user_preferences')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[accounts/profile/preferences] load error', error)
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }

  return NextResponse.json({ preferences: normalizeTheme(data ?? null) })
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    tenantId?: string
    preferences?: Partial<PreferenceRow>
  } | null

  const tenantId = body?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  const access = await assertTenantAccess(userId, tenantId)
  if (!access.ok) {
    const error = access.status === 403 ? 'Forbidden' : 'Failed to validate tenant access'
    return NextResponse.json({ error }, { status: access.status })
  }

  const updates = { ...(body?.preferences ?? {}) } as Record<string, unknown>
  delete updates.id
  delete updates.user_id
  delete updates.tenant_id
  delete updates.created_at
  delete updates.updated_at

  const payload: PreferenceInsert = {
    ...(updates as Partial<PreferenceInsert>),
    tenant_id: tenantId,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await access.admin
    .from('user_preferences')
    .upsert(payload, { onConflict: 'tenant_id,user_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[accounts/profile/preferences] save error', error)
    return NextResponse.json({ error: error.message || 'Failed to save preferences' }, { status: 500 })
  }

  return NextResponse.json({ preferences: normalizeTheme(data) })
}