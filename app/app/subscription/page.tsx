'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  CreditCardIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useSubscription } from '@/hooks/useSubscription'

export default function SubscriptionPage() {
  const t = useTranslations('app.subscription')
  const router = useRouter()
  const {
    subscription,
    invoices,
    entitlements,
    tenant,
    membership,
    isLoading,
    error,
    openBillingPortal,
  } = useSubscription()
  
  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoices' | 'entitlements'>('overview')
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  const handleManageSubscription = async () => {
    setIsPortalLoading(true)
    try {
      await openBillingPortal()
    } catch (err) {
      console.error('Failed to open billing portal:', err)
    } finally {
      setIsPortalLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">{t('error.title')}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => router.refresh()}>
          {t('error.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {tenant ? t('subtitle', { tenantName: tenant.name }) : t('subtitleNoTenant')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={selectedTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('overview')}
        >
          {t('tabs.overview')}
        </Button>
        <Button
          variant={selectedTab === 'entitlements' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('entitlements')}
        >
          {t('tabs.entitlements')}
        </Button>
        <Button
          variant={selectedTab === 'invoices' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('invoices')}
        >
          {t('tabs.invoices')}
        </Button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Subscription */}
          {subscription ? (
            <Card className="border-2 border-primary">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="primary">{t(`status.${subscription.status}`)}</Badge>
                      {subscription.cancel_at_period_end && (
                        <Badge variant="warning">{t('status.canceling')}</Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {subscription.plan.nickname || t('currentPlan.subscription')}
                    </h2>
                    {membership && (
                      <p className="text-muted-foreground mt-1">
                        {t('currentPlan.role', { role: membership.role })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {subscription.plan.amount && (
                      <>
                        <div className="text-3xl font-bold text-primary">
                          {formatCurrency(subscription.plan.amount, subscription.plan.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t('currentPlan.perInterval', { 
                            interval: subscription.plan.interval || 'month'
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>
                        {subscription.cancel_at_period_end
                          ? t('currentPlan.endsOn', { date: formatDate(subscription.current_period_end) })
                          : t('currentPlan.renews', { date: formatDate(subscription.current_period_end) })
                        }
                      </span>
                    </div>
                    {subscription.payment_method && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCardIcon className="h-4 w-4" />
                        <span>
                          {t('currentPlan.paymentMethod', { 
                            brand: subscription.payment_method.brand.toUpperCase(), 
                            last4: subscription.payment_method.last4 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    disabled={isPortalLoading}
                  >
                    {isPortalLoading ? (
                      <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                    )}
                    {t('currentPlan.manage')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <SparklesIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold">{t('noSubscription.title')}</h2>
                <p className="text-muted-foreground mt-1">{t('noSubscription.description')}</p>
                <Button className="mt-4" onClick={() => router.push('/checkout/start')}>
                  {t('noSubscription.choosePlan')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{entitlements.length}</div>
                <div className="text-sm text-muted-foreground">{t('stats.activeProducts')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{invoices.length}</div>
                <div className="text-sm text-muted-foreground">{t('stats.invoices')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {tenant?.type === 'private' ? t('stats.personal') : t('stats.organization')}
                </div>
                <div className="text-sm text-muted-foreground">{t('stats.accountType')}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Entitlements Tab */}
      {selectedTab === 'entitlements' && (
        <div className="space-y-4">
          {entitlements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <SparklesIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold">{t('entitlements.empty.title')}</h2>
                <p className="text-muted-foreground mt-1">{t('entitlements.empty.description')}</p>
                <Button className="mt-4" onClick={() => router.push('/checkout/start')}>
                  {t('entitlements.empty.browse')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            entitlements.map((entitlement) => (
              <Card key={entitlement.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CheckCircleIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{entitlement.product?.name || t('entitlements.unknownProduct')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {entitlement.product?.description || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="success">{t(`entitlements.status.${entitlement.status}`)}</Badge>
                      {entitlement.quantity_seats > 1 && (
                        <span className="text-sm text-muted-foreground">
                          {t('entitlements.seats', { count: entitlement.quantity_seats })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {selectedTab === 'invoices' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
              {t('invoices.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('invoices.empty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-background rounded-lg flex items-center justify-center border border-border">
                        <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {invoice.number || `#${invoice.id.slice(-8)}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.created)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'success'
                            : invoice.status === 'open'
                            ? 'warning'
                            : invoice.status === 'uncollectible'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {t(`invoices.status.${invoice.status || 'draft'}`)}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(invoice.amount_due, invoice.currency)}
                      </span>
                      <div className="flex gap-2">
                        {invoice.hosted_invoice_url && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                          >
                            {t('invoices.view')}
                          </Button>
                        )}
                        {invoice.invoice_pdf && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            {t('invoices.download')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
