'use client'

import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'open', label: 'Öppna' },
  { value: 'in-progress', label: 'Pågående' },
  { value: 'waiting', label: 'Väntar på svar' },
  { value: 'resolved', label: 'Lösta' },
  { value: 'closed', label: 'Stängda' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Alla prioriteter' },
  { value: 'urgent', label: 'Brådskande' },
  { value: 'high', label: 'Hög' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Låg' },
]

const TICKETS = [
  {
    id: 'TKT-001',
    subject: 'Kan inte logga in på mitt konto',
    customer: 'Anna Andersson',
    email: 'anna@email.se',
    status: 'open',
    priority: 'high',
    category: 'account',
    createdAt: '2024-01-15 14:32',
    lastUpdate: '2024-01-15 14:32',
    messages: [
      { from: 'customer', text: 'Hej! Jag har försökt logga in men får felmeddelande. Kan ni hjälpa mig?', time: '14:32' },
    ],
  },
  {
    id: 'TKT-002',
    subject: 'Fakturafråga - dubbeldebitering',
    customer: 'Stockholms Grundskola',
    email: 'faktura@stockholm.skola.se',
    status: 'in-progress',
    priority: 'urgent',
    category: 'billing',
    createdAt: '2024-01-15 10:15',
    lastUpdate: '2024-01-15 13:45',
    assignedTo: 'Support Team',
    messages: [
      { from: 'customer', text: 'Vi har blivit debiterade två gånger för januari månad.', time: '10:15' },
      { from: 'agent', text: 'Tack för att du kontaktar oss. Jag undersöker detta direkt.', time: '11:30' },
      { from: 'agent', text: 'Jag kan bekräfta dubbeldebitering. Återbetalning initierad.', time: '13:45' },
    ],
  },
  {
    id: 'TKT-003',
    subject: 'Önskar ny funktion för klasshantering',
    customer: 'Erik Eriksson',
    email: 'erik.lärare@goteborg.se',
    status: 'waiting',
    priority: 'low',
    category: 'feature',
    createdAt: '2024-01-14 09:20',
    lastUpdate: '2024-01-14 16:00',
    assignedTo: 'Produktteam',
    messages: [
      { from: 'customer', text: 'Det vore bra om man kunde gruppera elever i klasser direkt i appen.', time: '09:20' },
      { from: 'agent', text: 'Tack för förslaget! Vi har vidarebefordrat detta till vårt produktteam.', time: '16:00' },
    ],
  },
  {
    id: 'TKT-004',
    subject: 'Spel laddar inte korrekt',
    customer: 'Maria Johansson',
    email: 'maria@email.se',
    status: 'resolved',
    priority: 'medium',
    category: 'technical',
    createdAt: '2024-01-13 11:45',
    lastUpdate: '2024-01-14 08:30',
    assignedTo: 'Teknik',
    messages: [
      { from: 'customer', text: 'Minneslek-spelet fastnar på laddningsskärmen.', time: '11:45' },
      { from: 'agent', text: 'Vi har identifierat problemet. Kan du prova att rensa cachen?', time: '14:20' },
      { from: 'customer', text: 'Det fungerade! Tack så mycket!', time: '08:30' },
    ],
  },
]

const STATS = [
  { label: 'Öppna ärenden', value: '23', icon: TicketIcon, color: 'bg-blue-100 text-blue-600' },
  { label: 'Pågående', value: '12', icon: ClockIcon, color: 'bg-yellow-100 text-yellow-600' },
  { label: 'Lösta idag', value: '18', icon: CheckCircleIcon, color: 'bg-green-100 text-green-600' },
  { label: 'Genomsnittlig svarstid', value: '2.4h', icon: ChatBubbleLeftRightIcon, color: 'bg-purple-100 text-purple-600' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return <Badge variant="warning">Öppen</Badge>
    case 'in-progress':
      return <Badge className="bg-blue-100 text-blue-700">Pågående</Badge>
    case 'waiting':
      return <Badge variant="secondary">Väntar på svar</Badge>
    case 'resolved':
      return <Badge variant="success">Löst</Badge>
    case 'closed':
      return <Badge>Stängd</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return <Badge variant="error">Brådskande</Badge>
    case 'high':
      return <Badge className="bg-orange-100 text-orange-700">Hög</Badge>
    case 'medium':
      return <Badge variant="warning">Medium</Badge>
    case 'low':
      return <Badge variant="secondary">Låg</Badge>
    default:
      return <Badge>{priority}</Badge>
  }
}

export default function SupportSandboxPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<typeof TICKETS[0] | null>(null)
  const [replyText, setReplyText] = useState('')

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/sandbox/admin" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </a>
            <h1 className="text-lg font-semibold text-foreground">Support & Tickets</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button>
              <TicketIcon className="h-4 w-4 mr-2" />
              Skapa ärende
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
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Ärenden</h3>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Sök ärenden..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <Select
                      options={PRIORITY_OPTIONS}
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {TICKETS.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTicket?.id === ticket.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">{ticket.id}</p>
                          <p className="font-medium text-sm truncate">{ticket.subject}</p>
                          <p className="text-xs text-gray-600 mt-1">{ticket.customer}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{ticket.lastUpdate}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{selectedTicket.id}</span>
                        {getPriorityBadge(selectedTicket.priority)}
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                      <h3 className="font-semibold text-lg mt-1">{selectedTicket.subject}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicket(null)}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      {selectedTicket.customer}
                    </span>
                    <span>{selectedTicket.email}</span>
                    <span>Skapad: {selectedTicket.createdAt}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 space-y-4 mb-4 max-h-80 overflow-y-auto">
                    {selectedTicket.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.from === 'agent'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${
                            msg.from === 'agent' ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <div className="border-t pt-4">
                    <Textarea
                      placeholder="Skriv ditt svar..."
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <Button variant="ghost" size="sm">
                        <PaperClipIcon className="h-4 w-4 mr-1" />
                        Bifoga fil
                      </Button>
                      <div className="flex gap-2">
                        <Select
                          options={STATUS_OPTIONS.slice(1)}
                          value={selectedTicket.status}
                          onChange={() => {}}
                        />
                        <Button>
                          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                          Skicka svar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <TicketIcon className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="mt-4 text-gray-600">Välj ett ärende för att se detaljer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Ärendelista med prioritet och status</li>
            <li>Meddelandehistorik per ärende</li>
            <li>Svarsformulär med bilagor</li>
            <li>Prioritetsbadges och statusuppdatering</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
      </div>
    </div>
  )
}
