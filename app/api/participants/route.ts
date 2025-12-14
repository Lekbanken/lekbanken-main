import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { cookies } from 'next/headers'

type ParticipantResponse = {
  id: string
  name: string
  email?: string
  tenantId: string | null
  tenantName: string
  lastActive: string
  risk: 'none' | 'low' | 'high'
}

export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const cookieStore = await cookies()
  const activeTenantId = await readTenantIdFromCookies(cookieStore)
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId') || activeTenantId || null

  const { data: rows, error } = await supabase
    .from('participants')
    .select(
      `
        id,
        display_name,
        email:progress->>email,
        last_seen_at,
        status,
        updated_at,
        created_at,
        session:participant_sessions!participants_session_id_fkey(
          tenant_id,
          display_name
        )
      `
    )
    .maybeSingle(false)

  if (error) {
    console.error('[api/participants] fetch error', error)
    return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 })
  }

  const mapped: ParticipantResponse[] = (rows || [])
    .filter((row) => {
      if (tenantId) {
        return (row as { session?: { tenant_id?: string | null } }).session?.tenant_id === tenantId
      }
      return true
    })
    .map((row) => {
      const session = (row as { session?: { tenant_id?: string | null; display_name?: string | null } }).session
      const status = (row as { status?: string }).status || 'active'
      const risk: ParticipantResponse['risk'] =
        status === 'blocked' || status === 'kicked' ? 'high' : status === 'disconnected' ? 'low' : 'none'

      return {
        id: (row as { id: string }).id,
        name: (row as { display_name: string }).display_name,
        email: (row as { email?: string | null }).email || undefined,
        tenantId: session?.tenant_id ?? null,
        tenantName: session?.display_name || 'Okänd',
        lastActive:
          (row as { last_seen_at?: string | null }).last_seen_at ||
          (row as { updated_at?: string | null }).updated_at ||
          (row as { created_at?: string | null }).created_at ||
          '',
        risk,
      }
    })

  return NextResponse.json({ participants: mapped })
}
