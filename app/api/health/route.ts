import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'ok' | 'error'
  message?: string
  latency?: number
}

interface HealthResponse {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  checks: {
    database: HealthCheck
    storage: HealthCheck
    api: HealthCheck
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return { status: 'error', message: 'Missing Supabase credentials' }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.from('tenants').select('id').limit(1)

    const latency = Date.now() - start

    if (error) {
      return { status: 'error', message: error.message, latency }
    }

    return { status: 'ok', latency }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    }
  }
}

async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return { status: 'error', message: 'Missing Supabase credentials' }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.storage.listBuckets()

    const latency = Date.now() - start

    if (error) {
      return { status: 'error', message: error.message, latency }
    }

    if (!data || data.length === 0) {
      return { status: 'error', message: 'No storage buckets found', latency }
    }

    return { status: 'ok', latency }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    }
  }
}

function checkApi(): HealthCheck {
  // Basic API health - if this endpoint responds, API is working
  return { status: 'ok', message: 'API responding' }
}

export async function GET() {
  const [database, storage, api] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkApi(),
  ])

  const checks = { database, storage, api }
  
  // Determine overall status
  const hasError = Object.values(checks).some(check => check.status === 'error')
  const status: HealthResponse['status'] = hasError ? 'unhealthy' : 'healthy'

  const response: HealthResponse = {
    timestamp: new Date().toISOString(),
    status,
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }

  // Return 503 if unhealthy, 200 if healthy
  const httpStatus = status === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, { status: httpStatus })
}
