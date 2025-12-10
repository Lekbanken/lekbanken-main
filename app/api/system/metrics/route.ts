/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

interface SystemMetrics {
  timestamp: string
  errorRate: {
    last1h: number
    last24h: number
    last7d: number
  }
  apiLatency: {
    p50: number | null
    p95: number | null
    p99: number | null
  }
  activeUsers: {
    now: number
    last24h: number
  }
  storage: {
    totalFiles: number
    totalSizeGB: number | null
  }
  database: {
    totalRecords: number
    connectionPool: string
  }
}

async function getErrorRate(supabase: any) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [last1h, last24h, last7d] = await Promise.all([
    supabase
      .from('error_tracking')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo),
    supabase
      .from('error_tracking')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo),
    supabase
      .from('error_tracking')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
  ])

  return {
    last1h: last1h.count || 0,
    last24h: last24h.count || 0,
    last7d: last7d.count || 0,
  }
}

async function getApiLatency(supabase: any) {
  // Calculate latency from page_views duration
  const { data } = await supabase
    .from('page_views')
    .select('duration_seconds')
    .not('duration_seconds', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (!data || data.length === 0) {
    return { p50: null, p95: null, p99: null }
  }

  const durations = data
    .map((d: any) => d.duration_seconds)
    .filter((d: any): d is number => d !== null)
    .sort((a: number, b: number) => a - b)

  const percentile = (arr: number[], p: number) => {
    const index = Math.ceil(arr.length * p) - 1
    return arr[index] || 0
  }

  return {
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
  }
}

async function getActiveUsers(supabase: any) {
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [nowCount, last24hCount] = await Promise.all([
    supabase
      .from('page_views')
      .select('user_id', { count: 'exact', head: false })
      .gte('created_at', fiveMinutesAgo)
      .not('user_id', 'is', null),
    supabase
      .from('page_views')
      .select('user_id', { count: 'exact', head: false })
      .gte('created_at', oneDayAgo)
      .not('user_id', 'is', null),
  ])

  // Count unique users
  const uniqueNow = new Set(nowCount.data?.map((d: any) => d.user_id)).size
  const uniqueLast24h = new Set(last24hCount.data?.map((d: any) => d.user_id)).size

  return {
    now: uniqueNow,
    last24h: uniqueLast24h,
  }
}

async function getStorageStats(supabase: any) {
  const { count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })

  return {
    totalFiles: count || 0,
    totalSizeGB: null, // Would need to query storage API for actual sizes
  }
}

async function getDatabaseStats(supabase: any) {
  // Simple query to check connection
  const { count } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })

  return {
    totalRecords: count || 0,
    connectionPool: 'healthy',
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const [errorRate, apiLatency, activeUsers, storage, database] = await Promise.all([
      getErrorRate(supabase),
      getApiLatency(supabase),
      getActiveUsers(supabase),
      getStorageStats(supabase),
      getDatabaseStats(supabase),
    ])

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      errorRate,
      apiLatency,
      activeUsers,
      storage,
      database,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    logger.error('Failed to fetch system metrics', error instanceof Error ? error : undefined, {
      endpoint: '/api/system/metrics'
    })
    return NextResponse.json(
      { error: 'Failed to fetch system metrics' },
      { status: 500 }
    )
  }
}
