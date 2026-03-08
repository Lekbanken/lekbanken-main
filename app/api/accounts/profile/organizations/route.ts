import { NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('user_tenant_memberships')
    .select(`
      id,
      user_id,
      tenant_id,
      role,
      is_primary,
      status,
      created_at,
      tenant:tenants(id, name, slug, logo_url, type, status)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[accounts/profile/organizations] load error', error)
    return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 })
  }

  return NextResponse.json({ organizations: data ?? [] })
}