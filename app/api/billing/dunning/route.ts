import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireSystemAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') // pending, retrying, recovered, failed, canceled

  try {
    let query = supabaseAdmin
      .from('payment_failures')
      .select(`
        *,
        tenant:tenants(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: failures, error } = await query

    if (error) {
      console.error('[dunning API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch failures' }, { status: 500 })
    }

    return NextResponse.json({ failures: failures || [] })
  } catch (error) {
    console.error('[dunning API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
