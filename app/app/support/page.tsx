'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Textarea, Select } from '@/components/ui'
import {
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  BugAntIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  EnvelopeIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

// Types
interface Ticket {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  category: string
  createdAt: string
  lastUpdate: string
}

interface FAQ {
  question: string
  answer: string
}

// Mock data
const mockTickets: Ticket[] = [
  {
    id: '1',
    title: 'Problem med inloggning',
    status: 'resolved',
    category: 'technical',
    createdAt: '2025-01-25',
    lastUpdate: '2025-01-26',
  },
  {
    id: '2',
    title: 'Förslag på ny funktion',
    status: 'in_progress',
    category: 'feature',
    createdAt: '2025-01-20',
    lastUpdate: '2025-01-27',
  },
]

const mockFAQs: FAQ[] = [
  {
    question: 'Hur ändrar jag mitt lösenord?',
    answer: 'Gå till Inställningar > Profil > Ändra lösenord. Där kan du ange ditt nya lösenord.',
  },
  {
    question: 'Hur kontaktar jag supporten?',
    answer: 'Du kan skicka ett supportärende via denna sida eller maila oss på support@lekbanken.se.',
  },
  {
    question: 'Kan jag dela mitt konto?',
    answer: 'Nej, varje användare ska ha sitt eget konto. Med Team-planen kan du ha flera användare.',
  },
  {
    question: 'Hur avbryter jag min prenumeration?',
    answer: 'Gå till Prenumeration > Avbryt prenumeration. Din tillgång fortsätter till periodens slut.',
  },
]

const CATEGORIES = [
  { value: 'general', label: 'Allmänt' },
  { value: 'technical', label: 'Tekniskt problem' },
  { value: 'billing', label: 'Fakturering' },
  { value: 'feature', label: 'Funktionsförslag' },
  { value: 'bug', label: 'Buggrapport' },
]

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bugg', icon: BugAntIcon },
  { value: 'feature', label: 'Förslag', icon: LightBulbIcon },
  { value: 'question', label: 'Fråga', icon: QuestionMarkCircleIcon },
  { value: 'other', label: 'Övrigt', icon: ChatBubbleLeftRightIcon },
]

function getStatusVariant(status: string) {
  switch (status) {
    case 'open':
      return 'primary'
    case 'in_progress':
      return 'warning'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'default'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Öppen'
    case 'in_progress':
      return 'Pågår'
    case 'resolved':
      return 'Löst'
    case 'closed':
      return 'Stängd'
    default:
      return status
  }
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'contact' | 'tickets' | 'faq'>('contact')
  const [feedbackType, setFeedbackType] = useState('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rating, setRating] = useState(0)
  const [tickets] = useState<Ticket[]>(mockTickets)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    // Simulate submit
    setSubmitted(true)
    setTimeout(() => {
      setTitle('')
      setDescription('')
      setRating(0)
      setSubmitted(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground mt-1">Hur kan vi hjälpa dig idag?</p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setActiveTab('contact')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">Kontakta oss</div>
              <div className="text-sm text-muted-foreground">Skicka ett ärende</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setActiveTab('tickets')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-medium text-foreground">Mina ärenden</div>
              <div className="text-sm text-muted-foreground">{tickets.length} aktiva</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setActiveTab('faq')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <BookOpenIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="font-medium text-foreground">Vanliga frågor</div>
              <div className="text-sm text-muted-foreground">Snabba svar</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Button
          variant={activeTab === 'contact' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('contact')}
        >
          Kontakta oss
        </Button>
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tickets')}
        >
          Mina ärenden
        </Button>
        <Button
          variant={activeTab === 'faq' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('faq')}
        >
          Vanliga frågor
        </Button>
      </div>

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Skicka ett ärende</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Tack för ditt meddelande!</h3>
                  <p className="text-muted-foreground text-sm">
                    Vi återkommer så snart vi kan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Feedback Type */}
                  <div className="grid grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          onClick={() => setFeedbackType(type.value)}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            feedbackType === type.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 mx-auto mb-1 ${
                              feedbackType === type.value ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          />
                          <span className="text-xs">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Kategori
                    </label>
                    <Select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      options={CATEGORIES}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Titel
                    </label>
                    <Input
                      placeholder="Kort beskrivning av ärendet"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Beskrivning
                    </label>
                    <Textarea
                      placeholder="Beskriv ditt ärende i detalj..."
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hur nöjd är du med Lekbanken? (valfritt)
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1"
                        >
                          <StarIcon
                            className={`h-6 w-6 ${
                              star <= rating ? 'text-yellow-400' : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSubmit} disabled={!title || !description}>
                    <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                    Skicka ärende
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktuppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-foreground mb-1">E-post</div>
                <div className="text-primary">support@lekbanken.se</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Svarstid: 1-2 arbetsdagar
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-foreground mb-1">Telefon</div>
                <div className="text-primary">08-123 456 78</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Mån-Fre 9:00-17:00
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="font-medium text-foreground mb-1">Pro-support</div>
                <div className="text-sm text-muted-foreground">
                  Som Pro-användare har du prioriterad support med svarstid under 24 timmar.
                </div>
                <Badge variant="primary" className="mt-2">
                  Aktiverad
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <Card>
          <CardHeader>
            <CardTitle>Dina supportärenden</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          ticket.status === 'open'
                            ? 'bg-primary'
                            : ticket.status === 'in_progress'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-foreground">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Skapad {new Date(ticket.createdAt).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(ticket.status) as 'primary' | 'warning' | 'success' | 'default'}>
                        {getStatusLabel(ticket.status)}
                      </Badge>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Inga ärenden</h3>
                <p className="text-muted-foreground text-sm">
                  Du har inga aktiva supportärenden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <Card>
          <CardHeader>
            <CardTitle>Vanliga frågor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockFAQs.map((faq, index) => (
              <div key={index} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted"
                >
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <ChevronRightIcon
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      expandedFAQ === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedFAQ === index && (
                  <div className="px-4 pb-4 text-muted-foreground">{faq.answer}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
