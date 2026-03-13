import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') // pending, retrying, recovered, failed, canceled

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
  },
})
