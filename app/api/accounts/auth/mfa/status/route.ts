import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: factors, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    console.error('[mfa/status] listFactors error', error)
    return NextResponse.json({ error: 'Failed to load MFA status' }, { status: 500 })
  }

  const { data: mfaRow } = await supabase
    .from('user_mfa')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    factors: factors?.all ?? [],
    totp: factors?.totp ?? null,
    phone: factors?.phone ?? null,
    user_mfa: mfaRow ?? null,
  })
}
