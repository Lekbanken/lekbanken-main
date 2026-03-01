import { NextResponse } from 'next/server'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/my-orgs
 *
 * Returns the authenticated user's tenants where they have owner or admin
 * role — i.e. the organisations they are allowed to purchase for.
 *
 * Response: `{ orgs: Array<{ id: string; name: string; role: string }> }`
 */
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ orgs: [] }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_tenant_memberships')
    .select('tenant_id, role, tenant:tenants(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])

  if (error) {
    console.error('[checkout/my-orgs] query error', error)
    return NextResponse.json({ orgs: [] })
  }

  const orgs = (data ?? [])
    .filter((m) => m.tenant && (m.tenant as { id: string; name: string }).id)
    .map((m) => {
      const t = m.tenant as { id: string; name: string }
      return { id: t.id, name: t.name, role: m.role }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

  return NextResponse.json({ orgs }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
