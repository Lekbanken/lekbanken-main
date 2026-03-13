import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth }) => {
    const user = auth!.user!

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
  },
})