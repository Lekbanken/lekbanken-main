import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { cookies } from 'next/headers'

type SessionRow = {
  id: string
  title: string
  tenantId: string | null
  tenantName: string
  host: string
  participants: number
  startedAt: string | null
  status: 'active' | 'completed' | 'flagged'
}

export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const cookieStore = await cookies()
  const activeTenantId = await readTenantIdFromCookies(cookieStore)
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId') || activeTenantId || null

  const client = supabaseAdmin ?? supabase

  const { data, error } = await client
    .from('participant_sessions')
    .select(
      `
        id,
        display_name,
        tenant_id,
        participant_count,
        started_at,
        status,
        host_user_id,
        tenant:tenants!participant_sessions_tenant_id_fkey(name)
      `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[api/sessions] fetch error', error)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }

  const mapped: SessionRow[] = (data || [])
    .filter((row) => {
      if (tenantId) {
        return (row as { tenant_id?: string | null }).tenant_id === tenantId
      }
      return true
    })
    .map((row) => {
      const statusRaw = (row as { status?: string }).status || 'active'
      const status: SessionRow['status'] =
        statusRaw === 'archived' || statusRaw === 'cancelled' ? 'completed' : statusRaw === 'active' ? 'active' : 'flagged'
      return {
        id: (row as { id: string }).id,
        title: (row as { display_name: string }).display_name,
        tenantId: (row as { tenant_id?: string | null }).tenant_id ?? null,
        tenantName: (row as { tenant?: { name?: string | null } }).tenant?.name || 'Okänd',
        host: (row as { host_user_id?: string | null }).host_user_id || 'Okänd',
        participants: (row as { participant_count?: number | null }).participant_count ?? 0,
        startedAt: (row as { started_at?: string | null }).started_at ?? null,
        status,
      }
    })

  return NextResponse.json({ sessions: mapped })
}
