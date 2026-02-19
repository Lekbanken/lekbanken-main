'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface UsageMeter {
  id: string
  name: string
  slug: string
  description: string | null
  unit_name: string
  aggregation_type: string
  status: string
}

interface UsageSummary {
  id: string
  tenant_id: string
  meter_id: string
  period_start: string
  period_end: string
  total_quantity: number
  billable_amount: number | null
  meter: {
    name: string
    slug: string
    unit_name: string
  }
  tenant: {
    id: string
    name: string
  }
}

interface TotalByMeter {
  meter: {
    name: string
    slug: string
    unit_name: string
  }
  total: number
  tenantCount: number
}

interface UsageData {
  period: {
    start: string
    end: string
  }
  meters: UsageMeter[]
  summaries: UsageSummary[]
  totals: TotalByMeter[]
}

export default function UsageAdminPage() {
  const t = useTranslations('billing.usage')
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMeter, setSelectedMeter] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMeter !== 'all') {
        params.set('meter', selectedMeter)
      }
      params.set('period', selectedPeriod)

      const res = await fetch(`/api/billing/usage/aggregate?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMeter, selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('sv-SE').format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t('description')}
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select
            label={t('filterMeter')}
            value={selectedMeter}
            onChange={(e) => setSelectedMeter(e.target.value)}
            options={[
              { value: 'all', label: t('allMeters') },
              ...(data?.meters.map((meter) => ({ value: meter.slug, label: meter.name })) ?? []),
            ]}
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Select
            label={t('filterPeriod')}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            options={[
              { value: 'current', label: t('periodCurrent') },
              { value: 'previous', label: t('periodPrevious') },
              { value: '30days', label: t('period30Days') },
            ]}
            className="w-full"
          />
        </div>
      </div>

      {/* Totals Overview */}
      {data?.totals && data.totals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.totals.map((total, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-foreground">{total.meter.name}</h3>
              </div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                {formatNumber(total.total)}
                <span className="text-lg font-normal text-zinc-500 ml-1">
                  {total.meter.unit_name}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {t('tenantsCount', { count: total.tenantCount })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Period Info */}
      {data?.period && (
        <div className="text-sm text-zinc-500">
          {t('periodRange', {
            start: formatDate(data.period.start),
            end: formatDate(data.period.end),
          })}
        </div>
      )}

      {/* Usage Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.tenant')}</TableHead>
              <TableHead>{t('table.meter')}</TableHead>
              <TableHead className="text-right">{t('table.quantity')}</TableHead>
              <TableHead className="text-right">{t('table.billable')}</TableHead>
              <TableHead>{t('table.period')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">{t('loading')}</p>
                </TableCell>
              </TableRow>
            ) : data?.summaries && data.summaries.length > 0 ? (
              data.summaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell>
                    <span className="font-medium">{summary.tenant?.name || summary.tenant_id}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{summary.meter?.name || summary.meter_id}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(summary.total_quantity)} {summary.meter?.unit_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {summary.billable_amount != null
                      ? `${formatNumber(summary.billable_amount / 100)} kr`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-500">
                      {formatDate(summary.period_start)} - {formatDate(summary.period_end)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">{t('noData')}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Meters List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">{t('metersTitle')}</h2>
        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('metersTable.name')}</TableHead>
                <TableHead>{t('metersTable.slug')}</TableHead>
                <TableHead>{t('metersTable.unit')}</TableHead>
                <TableHead>{t('metersTable.aggregation')}</TableHead>
                <TableHead>{t('metersTable.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.meters && data.meters.length > 0 ? (
                data.meters.map((meter) => (
                  <TableRow key={meter.id}>
                    <TableCell>
                      <span className="font-medium">{meter.name}</span>
                      {meter.description && (
                        <p className="text-sm text-zinc-500">{meter.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {meter.slug}
                      </code>
                    </TableCell>
                    <TableCell>{meter.unit_name}</TableCell>
                    <TableCell>
                      <Badge variant="default">{meter.aggregation_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meter.status === 'active' ? 'success' : 'default'}>
                        {meter.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    <p className="text-muted-foreground">{t('noMeters')}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
