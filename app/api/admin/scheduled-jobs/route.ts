import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerAuthContext } from '@/lib/auth/server-context'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduled-jobs
 * 
 * Hämtar status för schemalagda jobb.
 * Endast tillgängligt för system_admin.
 */
export async function GET() {
  try {
    const auth = await getServerAuthContext()
    
    if (auth.effectiveGlobalRole !== 'system_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_scheduled_jobs_status')

    if (error) {
      console.error('[scheduled-jobs] RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled jobs', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[scheduled-jobs] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/scheduled-jobs/run
 * 
 * Kör ett schemalagt jobb manuellt.
 * Endast tillgängligt för system_admin.
 */
export async function POST(request: Request) {
  try {
    const auth = await getServerAuthContext()
    
    if (auth.effectiveGlobalRole !== 'system_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { jobName } = body

    if (!jobName) {
      return NextResponse.json(
        { error: 'Missing jobName' },
        { status: 400 }
      )
    }

    // Endast cleanup_demo_users stöds för manuell körning
    if (jobName !== 'cleanup_demo_users') {
      return NextResponse.json(
        { error: 'Unknown job' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('cleanup_demo_users')

    if (error) {
      console.error('[scheduled-jobs] Manual run error:', error)
      return NextResponse.json(
        { error: 'Failed to run job', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      result: data,
    })
  } catch (error) {
    console.error('[scheduled-jobs] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
