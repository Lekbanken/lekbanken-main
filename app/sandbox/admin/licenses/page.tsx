'use client'

import {
  KeyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  TrashIcon,
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
  { value: 'active', label: 'Aktiva' },
  { value: 'expired', label: 'Utgångna' },
  { value: 'pending', label: 'Väntande' },
  { value: 'revoked', label: 'Återkallade' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'school', label: 'Skola' },
  { value: 'preschool', label: 'Förskola' },
  { value: 'enterprise', label: 'Företag' },
  { value: 'trial', label: 'Testlicens' },
]

const LICENSES = [
  {
    id: 'LIC-001',
    key: 'LEKB-SKOL-2024-ABCD-1234',
    organization: 'Stockholms Grundskola',
    type: 'school',
    seats: 200,
    usedSeats: 156,
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdAt: '2023-12-15',
  },
  {
    id: 'LIC-002',
    key: 'LEKB-FORS-2024-EFGH-5678',
    organization: 'Göteborgs Förskola',
    type: 'preschool',
    seats: 50,
    usedSeats: 42,
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdAt: '2023-12-20',
  },
  {
    id: 'LIC-003',
    key: 'LEKB-TEST-2024-IJKL-9012',
    organization: 'Malmö Kommun',
    type: 'trial',
    seats: 500,
    usedSeats: 89,
    status: 'pending',
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    createdAt: '2024-01-10',
  },
  {
    id: 'LIC-004',
    key: 'LEKB-SKOL-2023-MNOP-3456',
    organization: 'Uppsala Skola',
    type: 'school',
    seats: 100,
    usedSeats: 0,
    status: 'expired',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    createdAt: '2022-12-01',
  },
  {
    id: 'LIC-005',
    key: 'LEKB-ENTR-2024-QRST-7890',
    organization: 'TechStart AB',
    type: 'enterprise',
    seats: 25,
    usedSeats: 0,
    status: 'revoked',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdAt: '2023-12-28',
  },
]

const STATS = [
  { label: 'Aktiva licenser', value: '247', icon: CheckCircleIcon, color: 'bg-green-100 text-green-600' },
  { label: 'Totala platser', value: '12,500', icon: UsersIcon, color: 'bg-blue-100 text-blue-600' },
  { label: 'Utnyttjandegrad', value: '78%', icon: KeyIcon, color: 'bg-purple-100 text-purple-600' },
  { label: 'Utgår snart', value: '12', icon: ClockIcon, color: 'bg-yellow-100 text-yellow-600' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success"><CheckCircleIcon className="h-3 w-3 mr-1" />Aktiv</Badge>
    case 'expired':
      return <Badge variant="error"><XCircleIcon className="h-3 w-3 mr-1" />Utgången</Badge>
    case 'pending':
      return <Badge variant="warning"><ClockIcon className="h-3 w-3 mr-1" />Väntande</Badge>
    case 'revoked':
      return <Badge variant="secondary"><XCircleIcon className="h-3 w-3 mr-1" />Återkallad</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'school':
      return <Badge className="bg-blue-100 text-blue-700">Skola</Badge>
    case 'preschool':
      return <Badge className="bg-green-100 text-green-700">Förskola</Badge>
    case 'enterprise':
      return <Badge className="bg-purple-100 text-purple-700">Företag</Badge>
    case 'trial':
      return <Badge className="bg-yellow-100 text-yellow-700">Test</Badge>
    default:
      return <Badge>{type}</Badge>
  }
}

export default function LicensesSandboxPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLicense, setSelectedLicense] = useState<typeof LICENSES[0] | null>(null)

  return (
    <SandboxShell
      moduleId="admin-licenses"
      title="Licenses"
      description="License key management"
    >
      <div className="space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Skapa licens
            </Button>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Licenses List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-lg">Licenser</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Sök licens..."
                        className="pl-9 w-48"
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-sm text-gray-600">Organisation</th>
                        <th className="pb-3 font-medium text-sm text-gray-600">Typ</th>
                        <th className="pb-3 font-medium text-sm text-gray-600">Platser</th>
                        <th className="pb-3 font-medium text-sm text-gray-600">Status</th>
                        <th className="pb-3 font-medium text-sm text-gray-600">Utgår</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {LICENSES.map((license) => (
                        <tr
                          key={license.id}
                          onClick={() => setSelectedLicense(license)}
                          className={`cursor-pointer transition-colors ${
                            selectedLicense?.id === license.id
                              ? 'bg-primary/5'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-4">
                            <p className="font-medium text-sm">{license.organization}</p>
                            <p className="text-xs text-gray-500">{license.id}</p>
                          </td>
                          <td className="py-4">{getTypeBadge(license.type)}</td>
                          <td className="py-4">
                            <div className="text-sm">
                              <span className="font-medium">{license.usedSeats}</span>
                              <span className="text-gray-500">/{license.seats}</span>
                            </div>
                            <div className="h-1.5 w-20 bg-gray-100 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  license.usedSeats / license.seats > 0.9 ? 'bg-red-500' :
                                  license.usedSeats / license.seats > 0.7 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${(license.usedSeats / license.seats) * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-4">{getStatusBadge(license.status)}</td>
                          <td className="py-4 text-sm text-gray-600">{license.endDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* License Detail */}
          <div className="space-y-4">
            {selectedLicense ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Licensdetaljer</h3>
                      {getStatusBadge(selectedLicense.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gray-100">
                        <BuildingOffice2Icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedLicense.organization}</p>
                        {getTypeBadge(selectedLicense.type)}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Licensnyckel</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono">{selectedLicense.key}</code>
                        <Button variant="ghost" size="sm">
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Startdatum</p>
                        <p className="font-medium">{selectedLicense.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Slutdatum</p>
                        <p className="font-medium">{selectedLicense.endDate}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Platser använda</span>
                        <span className="font-medium">
                          {selectedLicense.usedSeats} / {selectedLicense.seats}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            selectedLicense.usedSeats / selectedLicense.seats > 0.9 ? 'bg-red-500' :
                            selectedLicense.usedSeats / selectedLicense.seats > 0.7 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(selectedLicense.usedSeats / selectedLicense.seats) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <Button className="w-full">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        Hantera användare
                      </Button>
                      <Button variant="outline" className="w-full">
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Förnya licens
                      </Button>
                      <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Återkalla licens
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Log */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Aktivitetslogg</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { action: 'Användare tillagd', user: 'anna@skola.se', time: '2 tim sedan' },
                        { action: 'Licens aktiverad', user: 'Admin', time: '3 dagar sedan' },
                        { action: 'Licens skapad', user: 'System', time: '2024-01-15' },
                      ].map((log, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <p className="text-xs text-gray-500">{log.user}</p>
                          </div>
                          <span className="text-xs text-gray-500">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <KeyIcon className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="mt-4 text-gray-600">Välj en licens för att se detaljer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Licenstyper: trial, standard, premium</li>
            <li>Koppling till organisationer</li>
            <li>Licenshistorik och logg</li>
            <li>Automatisk förnyelse och utgång</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
