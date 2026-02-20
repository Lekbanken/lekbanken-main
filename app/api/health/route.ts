import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Minimal health check — intentionally does NOT expose latency, version,
 * storage bucket counts, or error messages to unauthenticated callers.
 * For detailed diagnostics, use /api/system/metrics (system_admin only).
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ status: 'error' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.from('tenants').select('id').limit(1)

    if (error) {
      return NextResponse.json({ status: 'error' }, { status: 503 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
