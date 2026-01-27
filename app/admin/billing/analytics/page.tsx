'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RevenueMetrics {
  mrr: number
  arr: number
  totalRevenue: number
  activeSubscriptions: number
  churnedSubscriptions: number
  newSubscriptions: number
  upgrades: number
  downgrades: number
  netRevenue: number
  avgRevenuePerUser: number
  revenueByProduct: Array<{
    productId: string
    productName: string
    revenue: number
    subscriptions: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    newMrr: number
    churned: number
  }>
}

export default function RevenueAnalyticsPage() {
  const t = useTranslations('admin.billing.analytics')
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/billing/analytics?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100)
  }

  const churnRate = metrics && metrics.activeSubscriptions > 0
    ? ((metrics.churnedSubscriptions / (metrics.activeSubscriptions + metrics.churnedSubscriptions)) * 100).toFixed(1)
    : '0'

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: '7d', label: t('period.7d') },
              { value: '30d', label: t('period.30d') },
              { value: '90d', label: t('period.90d') },
              { value: '12m', label: t('period.12m') },
            ]}
            className="w-[140px]"
          />
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.mrr')}</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.mrr || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('metrics.arr')}: {formatCurrency(metrics?.arr || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.activeSubscriptions')}</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.activeSubscriptions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{metrics?.newSubscriptions || 0} {t('metrics.newThisPeriod')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.churnRate')}</CardTitle>
            <ArrowTrendingDownIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{churnRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.churnedSubscriptions || 0} {t('metrics.churned')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.arpu')}</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.avgRevenuePerUser || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('metrics.perMonth')}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Product */}
      <Card>
        <CardHeader>
          <CardTitle>{t('revenueByProduct.title')}</CardTitle>
          <CardDescription>{t('revenueByProduct.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : metrics?.revenueByProduct && metrics.revenueByProduct.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('revenueByProduct.product')}</TableHead>
                  <TableHead className="text-right">{t('revenueByProduct.revenue')}</TableHead>
                  <TableHead className="text-right">{t('revenueByProduct.subscriptions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.revenueByProduct.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell className="text-right">{product.subscriptions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('revenueByProduct.empty')}</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t('monthlyTrend.title')}</CardTitle>
          <CardDescription>{t('monthlyTrend.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : metrics?.revenueByMonth && metrics.revenueByMonth.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('monthlyTrend.month')}</TableHead>
                  <TableHead className="text-right">{t('monthlyTrend.revenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.revenueByMonth.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('monthlyTrend.empty')}</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
              {t('growth.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('growth.newSubscriptions')}</p>
                  <p className="text-2xl font-bold text-green-600">+{metrics?.newSubscriptions || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('growth.upgrades')}</p>
                  <p className="text-2xl font-bold text-green-600">+{metrics?.upgrades || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
              {t('churn.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('churn.canceled')}</p>
                  <p className="text-2xl font-bold text-red-600">{metrics?.churnedSubscriptions || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('churn.downgrades')}</p>
                  <p className="text-2xl font-bold text-red-600">{metrics?.downgrades || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
