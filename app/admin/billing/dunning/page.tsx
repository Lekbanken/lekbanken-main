'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface PaymentFailure {
  id: string
  tenant_id: string
  subscription_id: string | null
  invoice_id: string | null
  failure_code: string | null
  failure_message: string | null
  amount: number
  currency: string
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  status: 'pending' | 'retrying' | 'recovered' | 'failed' | 'canceled'
  grace_period_ends_at: string | null
  created_at: string
  tenant?: { name: string }
}

interface DunningAction {
  id: string
  action_type: string
  action_result: string | null
  created_at: string
  action_details: Record<string, unknown>
}

export default function DunningPage() {
  const t = useTranslations('admin.billing.dunning')
  const [failures, setFailures] = useState<PaymentFailure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFailure, setSelectedFailure] = useState<PaymentFailure | null>(null)
  const [actions, setActions] = useState<DunningAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(false)

  const fetchFailures = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/billing/dunning')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setFailures(data.failures || [])
    } catch {
      setError('Failed to load payment failures')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActions = async (failureId: string) => {
    setActionsLoading(true)
    try {
      const response = await fetch(`/api/billing/dunning/${failureId}/actions`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setActions(data.actions || [])
    } catch {
      setActions([])
    } finally {
      setActionsLoading(false)
    }
  }

  const handleRetry = async (failureId: string) => {
    try {
      const response = await fetch(`/api/billing/dunning/${failureId}/retry`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Retry failed')
      fetchFailures()
    } catch {
      setError('Failed to retry payment')
    }
  }

  const handleCancel = async (failureId: string) => {
    if (!confirm(t('confirmCancel'))) return
    try {
      const response = await fetch(`/api/billing/dunning/${failureId}/cancel`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Cancel failed')
      fetchFailures()
    } catch {
      setError('Failed to cancel')
    }
  }

  useEffect(() => {
    fetchFailures()
  }, [])

  useEffect(() => {
    if (selectedFailure) {
      fetchActions(selectedFailure.id)
    }
  }, [selectedFailure])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><ClockIcon className="h-3 w-3 mr-1" />{t('status.pending')}</Badge>
      case 'retrying':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><ArrowPathIcon className="h-3 w-3 mr-1" />{t('status.retrying')}</Badge>
      case 'recovered':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircleIcon className="h-3 w-3 mr-1" />{t('status.recovered')}</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircleIcon className="h-3 w-3 mr-1" />{t('status.failed')}</Badge>
      case 'canceled':
        return <Badge variant="secondary">{t('status.canceled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingCount = failures.filter((f) => f.status === 'pending' || f.status === 'retrying').length
  const failedCount = failures.filter((f) => f.status === 'failed').length
  const recoveredCount = failures.filter((f) => f.status === 'recovered').length

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button variant="outline" onClick={fetchFailures}>
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">{error}</div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('stats.pending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('stats.failed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('stats.recovered')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{recoveredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Failures Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('failuresTable.title')}</CardTitle>
          <CardDescription>{t('failuresTable.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : failures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>{t('noFailures')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('failuresTable.tenant')}</TableHead>
                  <TableHead>{t('failuresTable.amount')}</TableHead>
                  <TableHead>{t('failuresTable.status')}</TableHead>
                  <TableHead>{t('failuresTable.retries')}</TableHead>
                  <TableHead>{t('failuresTable.gracePeriod')}</TableHead>
                  <TableHead>{t('failuresTable.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell>
                      <div className="font-medium">{failure.tenant?.name || failure.tenant_id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{failure.failure_code || '—'}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(failure.amount, failure.currency)}</TableCell>
                    <TableCell>{getStatusBadge(failure.status)}</TableCell>
                    <TableCell>
                      {failure.retry_count}/{failure.max_retries}
                    </TableCell>
                    <TableCell>
                      {failure.grace_period_ends_at
                        ? formatDate(failure.grace_period_ends_at)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFailure(failure)}
                            >
                              {t('viewDetails')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{t('detailsModal.title')}</DialogTitle>
                              <DialogDescription>
                                {failure.failure_message || t('detailsModal.noMessage')}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">{t('detailsModal.created')}: </span>
                                  {formatDate(failure.created_at)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('detailsModal.nextRetry')}: </span>
                                  {failure.next_retry_at ? formatDate(failure.next_retry_at) : '—'}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">{t('detailsModal.actionsLog')}</h4>
                                {actionsLoading ? (
                                  <Skeleton className="h-20 w-full" />
                                ) : actions.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">{t('detailsModal.noActions')}</p>
                                ) : (
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {actions.map((action) => (
                                      <div key={action.id} className="text-sm p-2 bg-muted rounded">
                                        <div className="flex justify-between">
                                          <span className="font-medium">{action.action_type}</span>
                                          <span className="text-muted-foreground">{formatDate(action.created_at)}</span>
                                        </div>
                                        {action.action_result && (
                                          <span className={action.action_result === 'success' ? 'text-green-600' : 'text-red-600'}>
                                            {action.action_result}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {(failure.status === 'pending' || failure.status === 'retrying') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleRetry(failure.id)}
                            >
                              {t('retryNow')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(failure.id)}
                            >
                              {t('cancel')}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
