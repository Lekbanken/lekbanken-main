import { NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
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

    // Use request-scoped client so the RPC can evaluate auth context (auth.uid())
    // for `public.is_system_admin()` checks inside the function.
    const supabase = await createServerRlsClient()

    const { data, error } = await supabase.rpc('get_scheduled_jobs_status')

    if (error) {
      console.error('[scheduled-jobs] RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled jobs', details: error.message },
        { status: 500 }
      )
    }

    // The RPC returns JSON. If the DB-side role check fails it returns `{ error: 'Unauthorized' }`.
    if (data && typeof data === 'object' && 'error' in data) {
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? 'Unauthorized' },
        { status: 403 }
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

    // Stödda jobb för manuell körning
    const supportedJobs = ['cleanup_demo_users', 'process_scheduled_notifications']
    if (!supportedJobs.includes(jobName)) {
      return NextResponse.json(
        { error: 'Unknown job' },
        { status: 400 }
      )
    }

    // Manual job execution should run with service role privileges.
    const supabase = createServiceRoleClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(jobName)

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
