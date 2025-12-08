import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('tenant_invitations')
    .select('tenant_id, email, role, status, expires_at, accepted_at, token')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/invitations/:token] load error', error)
    return NextResponse.json({ error: 'Failed to load invitation' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invitation: data })
}
