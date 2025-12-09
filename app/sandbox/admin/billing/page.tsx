'use client'

import {
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'paid', label: 'Betalda' },
  { value: 'pending', label: 'Väntande' },
  { value: 'failed', label: 'Misslyckade' },
  { value: 'refunded', label: 'Återbetalda' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'subscription', label: 'Prenumeration' },
  { value: 'license', label: 'Licens' },
  { value: 'addon', label: 'Tillägg' },
]

const TRANSACTIONS = [
  {
    id: 'TRX-001',
    customer: 'Stockholms Grundskola',
    email: 'faktura@stockholm.skola.se',
    type: 'subscription',
    plan: 'Skola Pro',
    amount: 2990,
    status: 'paid',
    date: '2024-01-15',
    paymentMethod: 'Faktura',
  },
  {
    id: 'TRX-002',
    customer: 'Anna Andersson',
    email: 'anna@email.se',
    type: 'subscription',
    plan: 'Familj',
    amount: 149,
    status: 'paid',
    date: '2024-01-14',
    paymentMethod: 'Kort ****4242',
  },
  {
    id: 'TRX-003',
    customer: 'Göteborgs Förskola',
    email: 'admin@goteborg-forskola.se',
    type: 'license',
    plan: '50 licenser',
    amount: 4990,
    status: 'pending',
    date: '2024-01-14',
    paymentMethod: 'Faktura',
  },
  {
    id: 'TRX-004',
    customer: 'Erik Eriksson',
    email: 'erik@email.se',
    type: 'subscription',
    plan: 'Premium',
    amount: 99,
    status: 'failed',
    date: '2024-01-13',
    paymentMethod: 'Kort ****1234',
  },
  {
    id: 'TRX-005',
    customer: 'Malmö Daghem',
    email: 'info@malmo-daghem.se',
    type: 'addon',
    plan: 'Extra lagring',
    amount: 299,
    status: 'refunded',
    date: '2024-01-12',
    paymentMethod: 'Kort ****5678',
  },
]

const INVOICES = [
  { id: 'INV-2024-001', customer: 'Stockholms Grundskola', amount: 2990, dueDate: '2024-02-01', status: 'unpaid' },
  { id: 'INV-2024-002', customer: 'Göteborgs Förskola', amount: 4990, dueDate: '2024-02-15', status: 'unpaid' },
  { id: 'INV-2023-089', customer: 'Uppsala Skola', amount: 1990, dueDate: '2024-01-01', status: 'overdue' },
]

const SUBSCRIPTION_STATS = [
  { label: 'Aktiva prenumerationer', value: '1,247', change: '+8%' },
  { label: 'MRR', value: '187,450 kr', change: '+12%' },
  { label: 'Churn rate', value: '2.3%', change: '-0.5%' },
  { label: 'ARPU', value: '150 kr', change: '+5%' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success"><CheckCircleIcon className="h-3 w-3 mr-1" />Betald</Badge>
    case 'pending':
      return <Badge variant="warning"><ClockIcon className="h-3 w-3 mr-1" />Väntande</Badge>
    case 'failed':
      return <Badge variant="error"><XCircleIcon className="h-3 w-3 mr-1" />Misslyckad</Badge>
    case 'refunded':
      return <Badge><ArrowPathIcon className="h-3 w-3 mr-1" />Återbetald</Badge>
    case 'unpaid':
      return <Badge variant="warning"><ClockIcon className="h-3 w-3 mr-1" />Obetald</Badge>
    case 'overdue':
      return <Badge variant="error"><ExclamationTriangleIcon className="h-3 w-3 mr-1" />Förfallen</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function BillingSandboxPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  return (
    <SandboxShell
      moduleId="admin-billing"
      title="Billing"
      description="Billing and payment management"
    >
      <div className="space-y-8">
          {/* Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Button variant="outline">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Skapa faktura
              </Button>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Ny transaktion
              </Button>
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className={`text-sm font-medium ${
                    stat.change.startsWith('+') || stat.change.startsWith('-0') 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <CreditCardIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Betalningsmetoder</p>
                <p className="text-sm text-gray-600">Hantera kortuppgifter</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Utbetalningar</p>
                <p className="text-sm text-gray-600">3 väntande utbetalningar</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Rapporter</p>
                <p className="text-sm text-gray-600">Exportera finansdata</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invoices Alert */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-yellow-100">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">Väntande fakturor</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Det finns {INVOICES.filter(i => i.status === 'unpaid' || i.status === 'overdue').length} obetalda fakturor som kräver uppmärksamhet.
                </p>
                <div className="mt-4 space-y-2">
                  {INVOICES.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-sm">{invoice.id}</span>
                        <span className="text-gray-500 text-sm ml-2">- {invoice.customer}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Förfaller: {invoice.dueDate}</span>
                        <span className="font-semibold">{invoice.amount.toLocaleString()} kr</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-lg">Transaktioner</h3>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Sök transaktion..."
                    className="pl-9 w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
                <Select
                  options={TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                />
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Datumfilter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-sm text-gray-600">ID</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Kund</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Typ</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Plan</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Belopp</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Status</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Datum</th>
                    <th className="pb-3 font-medium text-sm text-gray-600">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-4 text-sm font-medium">{tx.id}</td>
                      <td className="py-4">
                        <div>
                          <p className="text-sm font-medium">{tx.customer}</p>
                          <p className="text-xs text-gray-500">{tx.email}</p>
                        </div>
                      </td>
                      <td className="py-4 text-sm capitalize">{tx.type}</td>
                      <td className="py-4 text-sm">{tx.plan}</td>
                      <td className="py-4 text-sm font-semibold">{tx.amount} kr</td>
                      <td className="py-4">{getStatusBadge(tx.status)}</td>
                      <td className="py-4 text-sm text-gray-600">{tx.date}</td>
                      <td className="py-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <DocumentTextIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-gray-600">
                Visar 1-5 av 247 transaktioner
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Föregående
                </Button>
                <Button variant="outline" size="sm">
                  Nästa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Intäkter per månad</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { month: 'Januari', amount: 187450, growth: '+12%' },
                  { month: 'December', amount: 167320, growth: '+8%' },
                  { month: 'November', amount: 154890, growth: '+15%' },
                  { month: 'Oktober', amount: 134680, growth: '+6%' },
                ].map((item) => (
                  <div 
                    key={item.month}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <span className="font-medium">{item.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600 text-sm">{item.growth}</span>
                      <span className="font-semibold">{item.amount.toLocaleString()} kr</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Prenumerationsfördelning</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { plan: 'Gratis', count: 8420, percentage: 67 },
                  { plan: 'Premium', count: 2156, percentage: 17 },
                  { plan: 'Familj', count: 1287, percentage: 10 },
                  { plan: 'Skola Pro', count: 642, percentage: 5 },
                ].map((item) => (
                  <div key={item.plan} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.plan}</span>
                      <span className="text-gray-600">{item.count.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Transaktionslista med sök och filter</li>
            <li>Intäkts-KPI med trendindikator</li>
            <li>Prenumerationsfördelning</li>
            <li>Status-badges för betalningar</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
