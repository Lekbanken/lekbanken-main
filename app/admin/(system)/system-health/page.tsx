'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  ServerIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UsersIcon,
  CircleStackIcon,
  CheckCircleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import { logger } from '@/lib/utils/logger'

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

interface HealthStatus {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  checks: {
    database: { status: 'ok' | 'error'; latency?: number; message?: string }
    storage: { status: 'ok' | 'error'; latency?: number; message?: string }
    api: { status: 'ok' | 'error'; message?: string }
  }
}

export default function SystemHealthPage() {
  const { user } = useAuth()
  const t = useTranslations('admin.systemHealth')
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = async () => {
    try {
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/system/metrics'),
        fetch('/api/health'),
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }
    } catch (error) {
      logger.error('Failed to load system health metrics', error instanceof Error ? error : undefined, {
        page: 'system-health',
        userId: user?.id
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    if (autoRefresh) {
      const interval = setInterval(loadData, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh])

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">{t('notLoggedIn')}</p>
        </div>
      </AdminPageLayout>
    )
  }

  const overallStatus = health?.status || 'healthy'
  const statusColors = {
    healthy: 'text-emerald-600 bg-emerald-50 ring-emerald-500/10',
    degraded: 'text-amber-600 bg-amber-50 ring-amber-500/10',
    unhealthy: 'text-red-600 bg-red-50 ring-red-500/10',
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ServerIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: t('breadcrumbs.admin'), href: '/admin' }, { label: t('breadcrumbs.systemHealth') }]}
        actions={
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              {t('autoRefresh')}
            </label>
            <button
              onClick={loadData}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {t('refreshNow')}
            </button>
          </div>
        }
      />

      {/* Overall Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SignalIcon className="h-5 w-5" />
            {t('systemStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${statusColors[overallStatus]}`}
              >
                {overallStatus === 'healthy' && <CheckCircleIcon className="h-5 w-5" />}
                {overallStatus === 'degraded' && <ExclamationTriangleIcon className="h-5 w-5" />}
                {overallStatus === 'unhealthy' && <ExclamationTriangleIcon className="h-5 w-5" />}
                {overallStatus === 'healthy' && t('status.healthy')}
                {overallStatus === 'degraded' && t('status.degraded')}
                {overallStatus === 'unhealthy' && t('status.unhealthy')}
              </div>
              {health && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('lastChecked', { time: new Date(health.timestamp).toLocaleString('sv-SE') })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('version')}</p>
              <p className="text-lg font-semibold">{health?.version || t('labels.unknown')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Health Checks */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('checks.database')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {health?.checks.database.status === 'ok' ? (
                    <span className="text-emerald-600">{t('checks.ok')}</span>
                  ) : (
                    <span className="text-red-600">{t('checks.error')}</span>
                  )}
                </p>
                {health?.checks.database.latency && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('checks.latency', { ms: health.checks.database.latency })}
                  </p>
                )}
              </div>
              <CircleStackIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('checks.storage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {health?.checks.storage.status === 'ok' ? (
                    <span className="text-emerald-600">{t('checks.ok')}</span>
                  ) : (
                    <span className="text-red-600">{t('checks.error')}</span>
                  )}
                </p>
                {health?.checks.storage.latency && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('checks.latency', { ms: health.checks.storage.latency })}
                  </p>
                )}
              </div>
              <ServerIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('checks.api')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {health?.checks.api.status === 'ok' ? (
                    <span className="text-emerald-600">{t('checks.ok')}</span>
                  ) : (
                    <span className="text-red-600">{t('checks.error')}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('checks.responding')}</p>
              </div>
              <SignalIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label={t('metrics.errorsLastHour')}
          value={metrics?.errorRate.last1h ?? 0}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconColor={metrics && metrics.errorRate.last1h > 10 ? 'red' : 'amber'}
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('metrics.activeUsersNow')}
          value={metrics?.activeUsers.now ?? 0}
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor="blue"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('metrics.apiLatencyP95')}
          value={metrics?.apiLatency.p95 ? `${metrics.apiLatency.p95.toFixed(2)}s` : t('labels.notAvailable')}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="purple"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('metrics.totalFiles')}
          value={metrics?.storage.totalFiles ?? 0}
          icon={<CircleStackIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Detailed Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.errorRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('timeRanges.lastHour')}</span>
                <span className="text-lg font-semibold">{metrics?.errorRate.last1h ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('timeRanges.last24h')}</span>
                <span className="text-lg font-semibold">{metrics?.errorRate.last24h ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('timeRanges.last7d')}</span>
                <span className="text-lg font-semibold">{metrics?.errorRate.last7d ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('cards.apiPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('latency.p50')}</span>
                <span className="text-lg font-semibold">
                  {metrics?.apiLatency.p50 ? `${metrics.apiLatency.p50.toFixed(2)}s` : t('labels.notAvailable')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('latency.p95')}</span>
                <span className="text-lg font-semibold">
                  {metrics?.apiLatency.p95 ? `${metrics.apiLatency.p95.toFixed(2)}s` : t('labels.notAvailable')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('latency.p99')}</span>
                <span className="text-lg font-semibold">
                  {metrics?.apiLatency.p99 ? `${metrics.apiLatency.p99.toFixed(2)}s` : t('labels.notAvailable')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('cards.users')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('activeUsers.now')}</span>
                <span className="text-lg font-semibold">{metrics?.activeUsers.now ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('activeUsers.last24h')}</span>
                <span className="text-lg font-semibold">{metrics?.activeUsers.last24h ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('cards.storageDatabase')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('storage.totalFiles')}</span>
                <span className="text-lg font-semibold">{metrics?.storage.totalFiles ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('storage.databaseRecords')}</span>
                <span className="text-lg font-semibold">{metrics?.database.totalRecords ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('storage.connectionPool')}</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {metrics?.database.connectionPool || t('labels.unknown')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}
