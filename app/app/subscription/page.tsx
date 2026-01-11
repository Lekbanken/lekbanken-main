'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  CheckIcon,
  CreditCardIcon,
  DocumentTextIcon,
  SparklesIcon,
  StarIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

// Types
interface Plan {
  id: string
  nameKey: string
  price: number
  interval: 'month' | 'year'
  featureKeys: string[]
  popular?: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
}

// Mock data - use translation keys for labels
const mockPlans: Plan[] = [
  {
    id: 'free',
    nameKey: 'plans.free',
    price: 0,
    interval: 'month',
    featureKeys: [
      'planFeatures.upTo10Activities',
      'planFeatures.basicStats',
      'planFeatures.limitedCategories',
      'planFeatures.emailSupport',
    ],
  },
  {
    id: 'pro',
    nameKey: 'plans.pro',
    price: 99,
    interval: 'month',
    featureKeys: [
      'planFeatures.unlimitedActivities',
      'planFeatures.advancedStats',
      'planFeatures.allCategories',
      'planFeatures.prioritySupport',
      'planFeatures.customThemes',
      'planFeatures.exportData',
    ],
    popular: true,
  },
  {
    id: 'team',
    nameKey: 'plans.team',
    price: 299,
    interval: 'month',
    featureKeys: [
      'planFeatures.everythingInPro',
      'planFeatures.upTo10Users',
      'planFeatures.adminPanel',
      'planFeatures.teamStats',
      'planFeatures.apiAccess',
      'planFeatures.dedicatedSupport',
    ],
  },
]

const mockInvoices: Invoice[] = [
  {
    id: '1',
    date: '2025-01-01',
    amount: 99,
    status: 'paid',
    description: 'Pro-plan - Januari 2025',
  },
  {
    id: '2',
    date: '2024-12-01',
    amount: 99,
    status: 'paid',
    description: 'Pro-plan - December 2024',
  },
  {
    id: '3',
    date: '2024-11-01',
    amount: 99,
    status: 'paid',
    description: 'Pro-plan - November 2024',
  },
]

export default function SubscriptionPage() {
  const t = useTranslations('app.subscription')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoices' | 'plans'>('overview')
  const currentPlan = mockPlans[1] // Pro plan

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
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
          variant={selectedTab === 'plans' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('plans')}
        >
          {t('tabs.plans')}
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
          {/* Current Plan */}
          <Card className="border-2 border-primary">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="primary">{t('status.active')}</Badge>
                    <Badge variant="accent">{t('plans.pro')}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{t('currentPlan.proPlan')}</h2>
                  <p className="text-muted-foreground mt-1">
                    {t('currentPlan.unlimited')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">99 kr</div>
                  <div className="text-sm text-muted-foreground">{t('currentPlan.perMonth')}</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>{t('currentPlan.renews', { date: '1 februari 2025' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCardIcon className="h-4 w-4" />
                    <span>Visa •••• 4242</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline">
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  {t('currentPlan.changePlan')}
                </Button>
                <Button variant="ghost" className="text-red-500 hover:text-red-600">
                  {t('currentPlan.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary" />
                {t('features.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {currentPlan.featureKeys.map((featureKey) => (
                  <li key={featureKey} className="flex items-center gap-2 text-foreground">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {t(featureKey as 'planFeatures.unlimitedActivities')}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">∞</div>
                <div className="text-sm text-muted-foreground">{t('stats.activities')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">247</div>
                <div className="text-sm text-muted-foreground">{t('stats.usedToday')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">12</div>
                <div className="text-sm text-muted-foreground">{t('stats.monthsMember')}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {selectedTab === 'plans' && (
        <div className="grid gap-6 sm:grid-cols-3">
          {mockPlans.map((plan) => {
            const isCurrent = plan.id === 'pro'

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden ${
                  plan.popular ? 'border-2 border-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg">
                    {t('plans.popular')}
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {plan.id === 'free' && <StarIcon className="h-6 w-6 text-muted-foreground" />}
                    {plan.id === 'pro' && <SparklesIcon className="h-6 w-6 text-primary" />}
                    {plan.id === 'team' && <RocketLaunchIcon className="h-6 w-6 text-accent" />}
                    <h3 className="text-lg font-bold">{t(plan.nameKey as 'plans.free')}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price} kr</span>
                    <span className="text-muted-foreground">{t('plans.perMonth')}</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.featureKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        {t(featureKey as 'planFeatures.unlimitedActivities')}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                    className="w-full"
                    disabled={isCurrent}
                  >
                    {isCurrent ? t('plans.current') : t('plans.select')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
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
            <div className="space-y-3">
              {mockInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-background rounded-lg flex items-center justify-center border border-border">
                      <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{invoice.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'success'
                          : invoice.status === 'pending'
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {t(`invoices.${invoice.status}` as 'invoices.paid')}
                    </Badge>
                    <span className="font-medium">{invoice.amount} kr</span>
                    <Button size="sm" variant="ghost">
                      {t('invoices.download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
