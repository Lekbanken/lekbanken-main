'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Heading, Subheading } from '@/catalyst-ui-kit/typescript/heading'
import { Text } from '@/catalyst-ui-kit/typescript/text'
import { Button } from '@/catalyst-ui-kit/typescript/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/catalyst-ui-kit/typescript/table'
import {
  Select,
} from '@/catalyst-ui-kit/typescript/select'
import { Badge } from '@/catalyst-ui-kit/typescript/badge'
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
          <Heading>{t('title')}</Heading>
          <Text className="text-zinc-600 dark:text-zinc-400">
            {t('description')}
          </Text>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('filterMeter')}
          </label>
          <Select
            value={selectedMeter}
            onChange={(e) => setSelectedMeter(e.target.value)}
          >
            <option value="all">{t('allMeters')}</option>
            {data?.meters.map((meter) => (
              <option key={meter.id} value={meter.slug}>
                {meter.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('filterPeriod')}
          </label>
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="current">{t('periodCurrent')}</option>
            <option value="previous">{t('periodPrevious')}</option>
            <option value="30days">{t('period30Days')}</option>
          </Select>
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
                <Subheading>{total.meter.name}</Subheading>
              </div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                {formatNumber(total.total)}
                <span className="text-lg font-normal text-zinc-500 ml-1">
                  {total.meter.unit_name}
                </span>
              </div>
              <Text className="text-sm text-zinc-500">
                {t('tenantsCount', { count: total.tenantCount })}
              </Text>
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
          <TableHead>
            <TableRow>
              <TableHeader>{t('table.tenant')}</TableHeader>
              <TableHeader>{t('table.meter')}</TableHeader>
              <TableHeader className="text-right">{t('table.quantity')}</TableHeader>
              <TableHeader className="text-right">{t('table.billable')}</TableHeader>
              <TableHeader>{t('table.period')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text>{t('loading')}</Text>
                </TableCell>
              </TableRow>
            ) : data?.summaries && data.summaries.length > 0 ? (
              data.summaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell>
                    <Text className="font-medium">{summary.tenant?.name || summary.tenant_id}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge color="blue">{summary.meter?.name || summary.meter_id}</Badge>
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
                    <Text className="text-sm text-zinc-500">
                      {formatDate(summary.period_start)} - {formatDate(summary.period_end)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text>{t('noData')}</Text>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Meters List */}
      <div className="mt-8">
        <Subheading>{t('metersTitle')}</Subheading>
        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t('metersTable.name')}</TableHeader>
                <TableHeader>{t('metersTable.slug')}</TableHeader>
                <TableHeader>{t('metersTable.unit')}</TableHeader>
                <TableHeader>{t('metersTable.aggregation')}</TableHeader>
                <TableHeader>{t('metersTable.status')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.meters && data.meters.length > 0 ? (
                data.meters.map((meter) => (
                  <TableRow key={meter.id}>
                    <TableCell>
                      <Text className="font-medium">{meter.name}</Text>
                      {meter.description && (
                        <Text className="text-sm text-zinc-500">{meter.description}</Text>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {meter.slug}
                      </code>
                    </TableCell>
                    <TableCell>{meter.unit_name}</TableCell>
                    <TableCell>
                      <Badge color="zinc">{meter.aggregation_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={meter.status === 'active' ? 'green' : 'zinc'}>
                        {meter.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    <Text>{t('noMeters')}</Text>
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
