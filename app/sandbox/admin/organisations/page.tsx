'use client'

import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  CreditCardIcon,
  CogIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'school', label: 'Skola' },
  { value: 'preschool', label: 'Förskola' },
  { value: 'daycare', label: 'Daghem' },
  { value: 'municipality', label: 'Kommun' },
  { value: 'company', label: 'Företag' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'active', label: 'Aktiva' },
  { value: 'trial', label: 'Testperiod' },
  { value: 'inactive', label: 'Inaktiva' },
  { value: 'pending', label: 'Väntande' },
]

const ORGANISATIONS = [
  {
    id: 'ORG-001',
    name: 'Stockholms Grundskola',
    type: 'school',
    status: 'active',
    plan: 'Skola Pro',
    users: 156,
    licenses: 200,
    admin: 'Anna Svensson',
    email: 'admin@stockholms-grundskola.se',
    createdAt: '2023-06-15',
    lastActivity: '2024-01-15',
  },
  {
    id: 'ORG-002',
    name: 'Göteborgs Förskola',
    type: 'preschool',
    status: 'active',
    plan: 'Förskola Standard',
    users: 42,
    licenses: 50,
    admin: 'Erik Johansson',
    email: 'info@goteborg-forskola.se',
    createdAt: '2023-08-20',
    lastActivity: '2024-01-14',
  },
  {
    id: 'ORG-003',
    name: 'Malmö Kommun',
    type: 'municipality',
    status: 'trial',
    plan: 'Kommun Enterprise (Test)',
    users: 89,
    licenses: 500,
    admin: 'Maria Nilsson',
    email: 'utbildning@malmo.se',
    createdAt: '2024-01-01',
    lastActivity: '2024-01-15',
  },
  {
    id: 'ORG-004',
    name: 'Uppsala Daghem',
    type: 'daycare',
    status: 'pending',
    plan: 'Väntande aktivering',
    users: 0,
    licenses: 25,
    admin: 'Lars Eriksson',
    email: 'dagis@uppsala-daghem.se',
    createdAt: '2024-01-10',
    lastActivity: null,
  },
  {
    id: 'ORG-005',
    name: 'Lund International School',
    type: 'school',
    status: 'inactive',
    plan: 'Skola Pro (Avslutad)',
    users: 0,
    licenses: 0,
    admin: 'Sara Lindberg',
    email: 'admin@lundis.se',
    createdAt: '2022-09-01',
    lastActivity: '2023-12-31',
  },
]

const ORG_STATS = [
  { label: 'Totala organisationer', value: '247', change: '+12' },
  { label: 'Aktiva användare', value: '8,420', change: '+340' },
  { label: 'Totala licenser', value: '12,500', change: '+500' },
  { label: 'Genomsnittlig användning', value: '78%', change: '+5%' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success"><CheckCircleIcon className="h-3 w-3 mr-1" />Aktiv</Badge>
    case 'trial':
      return <Badge variant="warning"><ClockIcon className="h-3 w-3 mr-1" />Testperiod</Badge>
    case 'inactive':
      return <Badge variant="error"><XCircleIcon className="h-3 w-3 mr-1" />Inaktiv</Badge>
    case 'pending':
      return <Badge><ClockIcon className="h-3 w-3 mr-1" />Väntande</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'school':
      return <AcademicCapIcon className="h-5 w-5" />
    case 'preschool':
      return <HomeIcon className="h-5 w-5" />
    case 'daycare':
      return <HomeIcon className="h-5 w-5" />
    case 'municipality':
      return <BuildingLibraryIcon className="h-5 w-5" />
    case 'company':
      return <BuildingOffice2Icon className="h-5 w-5" />
    default:
      return <BuildingOffice2Icon className="h-5 w-5" />
  }
}

export default function OrganisationsSandboxPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<typeof ORGANISATIONS[0] | null>(null)

  return (
    <SandboxShell
      moduleId="admin-organisations"
      title="Organisations"
      description="Organization and tenant management"
    >
      <div className="space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Ny organisation
            </Button>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORG_STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Organisations List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-lg">Organisationer</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Sök organisation..."
                        className="pl-9 w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Select
                      options={TYPE_OPTIONS}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    />
                    <Select
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ORGANISATIONS.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedOrg?.id === org.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            org.type === 'school' ? 'bg-blue-100 text-blue-600' :
                            org.type === 'preschool' ? 'bg-green-100 text-green-600' :
                            org.type === 'municipality' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getTypeIcon(org.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{org.name}</h4>
                              {getStatusBadge(org.status)}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <UsersIcon className="h-4 w-4" />
                                {org.users} användare
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCardIcon className="h-4 w-4" />
                                {org.licenses} licenser
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-gray-600">Visar 1-5 av 247 organisationer</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>Föregående</Button>
                    <Button variant="outline" size="sm">Nästa</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Sidebar */}
          <div className="space-y-4">
            {selectedOrg ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Detaljer</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        selectedOrg.type === 'school' ? 'bg-blue-100 text-blue-600' :
                        selectedOrg.type === 'preschool' ? 'bg-green-100 text-green-600' :
                        selectedOrg.type === 'municipality' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getTypeIcon(selectedOrg.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{selectedOrg.name}</h4>
                        <p className="text-sm text-gray-600">{selectedOrg.plan}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y">
                      <div>
                        <p className="text-sm text-gray-600">Användare</p>
                        <p className="text-xl font-bold">{selectedOrg.users}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Licenser</p>
                        <p className="text-xl font-bold">{selectedOrg.licenses}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Admin</p>
                        <p className="font-medium">{selectedOrg.admin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">E-post</p>
                        <p className="font-medium">{selectedOrg.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Skapad</p>
                        <p className="font-medium">{selectedOrg.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Senaste aktivitet</p>
                        <p className="font-medium">{selectedOrg.lastActivity || 'Ingen aktivitet'}</p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button className="w-full">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        Hantera användare
                      </Button>
                      <Button variant="outline" className="w-full">
                        <CreditCardIcon className="h-4 w-4 mr-2" />
                        Licenshantering
                      </Button>
                      <Button variant="outline" className="w-full">
                        <CogIcon className="h-4 w-4 mr-2" />
                        Inställningar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Stats */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Användningsstatistik</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Licensutnyttjande</span>
                          <span className="font-medium">{Math.round((selectedOrg.users / selectedOrg.licenses) * 100) || 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${selectedOrg.licenses ? (selectedOrg.users / selectedOrg.licenses) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xl font-bold text-primary">1,247</p>
                          <p className="text-xs text-gray-600">Spelade spel</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xl font-bold text-accent">24h</p>
                          <p className="text-xs text-gray-600">Total speltid</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BuildingOffice2Icon className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="mt-4 text-gray-600">Välj en organisation för att se detaljer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Organisationstyper: skola, förskola, förening</li>
            <li>Medlemshantering per organisation</li>
            <li>Aktivitetsstatistik per organisation</li>
            <li>Detaljvy med kontaktinfo</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
