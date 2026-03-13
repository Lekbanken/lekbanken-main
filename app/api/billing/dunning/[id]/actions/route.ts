import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ params }) => {
    const { id } = params

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
  },
})
