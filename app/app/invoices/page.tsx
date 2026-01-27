'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useTenant } from '@/lib/context/TenantContext'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  createdAt: string
  dueDate: string | null
  paidAt: string | null
  invoicePdfUrl: string | null
  hostedInvoiceUrl: string | null
  tenantId: string
  tenantName: string
}

export default function InvoicesPage() {
  const t = useTranslations('app.invoices')
  const { currentTenant } = useTenant()
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const url = currentTenant?.id 
        ? `/api/billing/invoices/my?tenantId=${currentTenant.id}`
        : '/api/billing/invoices/my'
        
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || t('fetchError'))
      }
      
      setInvoices(data.invoices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fetchError'))
    } finally {
      setIsLoading(false)
    }
  }, [currentTenant?.id, t])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">{t('status.paid')}</Badge>
      case 'open':
        return <Badge variant="warning">{t('status.open')}</Badge>
      case 'draft':
        return <Badge variant="secondary">{t('status.draft')}</Badge>
      case 'void':
        return <Badge variant="secondary">{t('status.void')}</Badge>
      case 'uncollectible':
        return <Badge variant="destructive">{t('status.uncollectible')}</Badge>
      default:
        return <Badge variant="secondary">{status || t('status.unknown')}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount)
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('loading')}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">
                        {invoice.number || t('invoiceNumberMissing')}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{formatDate(invoice.createdAt)}</span>
                      {invoice.tenantName && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{invoice.tenantName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatAmount(invoice.amountDue, invoice.currency)}
                    </div>
                    {invoice.status === 'paid' && invoice.paidAt && (
                      <div className="text-xs text-muted-foreground">
                        {t('paidOn')} {formatDate(invoice.paidAt)}
                      </div>
                    )}
                    {invoice.status === 'open' && invoice.dueDate && (
                      <div className="text-xs text-warning-foreground">
                        {t('dueOn')} {formatDate(invoice.dueDate)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice.invoicePdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoicePdfUrl!, '_blank')}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    )}
                    {invoice.hostedInvoiceUrl && invoice.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                      >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                        {t('pay')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
