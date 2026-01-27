import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const { id } = await params

  try {
    const { data: actions, error } = await supabaseAdmin
      .from('dunning_actions')
      .select('*')
      .eq('payment_failure_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dunning actions API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 })
    }

    return NextResponse.json({ actions: actions || [] })
  } catch (error) {
    console.error('[dunning actions API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
