'use client'

import { useState } from 'react'
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
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
}

// Mock data
const mockPlans: Plan[] = [
  {
    id: 'free',
    name: 'Gratis',
    price: 0,
    interval: 'month',
    features: [
      'Upp till 10 aktiviteter',
      'Grundläggande statistik',
      'Begränsade kategorier',
      'E-postsupport',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month',
    features: [
      'Obegränsade aktiviteter',
      'Avancerad statistik',
      'Alla kategorier',
      'Prioriterad support',
      'Anpassade teman',
      'Exportera data',
    ],
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 299,
    interval: 'month',
    features: [
      'Allt i Pro',
      'Upp till 10 användare',
      'Admin-panel',
      'Team-statistik',
      'API-åtkomst',
      'Dedikerad support',
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoices' | 'plans'>('overview')
  const currentPlan = mockPlans[1] // Pro plan

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prenumeration</h1>
        <p className="text-muted-foreground mt-1">Hantera din prenumeration och fakturor</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={selectedTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('overview')}
        >
          Översikt
        </Button>
        <Button
          variant={selectedTab === 'plans' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('plans')}
        >
          Planer
        </Button>
        <Button
          variant={selectedTab === 'invoices' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('invoices')}
        >
          Fakturor
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
                    <Badge variant="primary">Aktiv</Badge>
                    <Badge variant="accent">Pro</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Pro-plan</h2>
                  <p className="text-muted-foreground mt-1">
                    Obegränsad tillgång till alla funktioner
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">99 kr</div>
                  <div className="text-sm text-muted-foreground">per månad</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>Förnyas: 1 februari 2025</span>
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
                  Byt plan
                </Button>
                <Button variant="ghost" className="text-red-500 hover:text-red-600">
                  Avbryt prenumeration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary" />
                Dina funktioner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {currentPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-foreground">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {feature}
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
                <div className="text-sm text-muted-foreground">Aktiviteter</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">247</div>
                <div className="text-sm text-muted-foreground">Använda idag</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">12</div>
                <div className="text-sm text-muted-foreground">Månader medlem</div>
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
                    Populärast
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {plan.id === 'free' && <StarIcon className="h-6 w-6 text-muted-foreground" />}
                    {plan.id === 'pro' && <SparklesIcon className="h-6 w-6 text-primary" />}
                    {plan.id === 'team' && <RocketLaunchIcon className="h-6 w-6 text-accent" />}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price} kr</span>
                    <span className="text-muted-foreground">/månad</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                    className="w-full"
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Nuvarande plan' : 'Välj plan'}
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
              Faktureringshistorik
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
                        {new Date(invoice.date).toLocaleDateString('sv-SE')}
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
                      {invoice.status === 'paid'
                        ? 'Betald'
                        : invoice.status === 'pending'
                        ? 'Väntande'
                        : 'Misslyckad'}
                    </Badge>
                    <span className="font-medium">{invoice.amount} kr</span>
                    <Button size="sm" variant="ghost">
                      Ladda ner
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
