'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'
import { listUserTickets, createUserTicket } from '@/app/actions/tickets-user'
import { getPublishedFAQs } from '@/app/actions/support-kb'

// Types
interface Ticket {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'waiting_for_user'
  category: string
  created_at: string
  updated_at: string
}

// Fallback FAQ data (shown if DB fetch fails)
const fallbackFAQs = [
  {
    question: 'Hur ändrar jag mitt lösenord?',
    answer_markdown: 'Gå till Inställningar > Profil > Ändra lösenord. Där kan du ange ditt nya lösenord.',
  },
  {
    question: 'Hur kontaktar jag supporten?',
    answer_markdown: 'Du kan skicka ett supportärende via denna sida eller maila oss på support@lekbanken.se.',
  },
  {
    question: 'Kan jag dela mitt konto?',
    answer_markdown: 'Nej, varje användare ska ha sitt eget konto. Med Team-planen kan du ha flera användare.',
  },
  {
    question: 'Hur avbryter jag min prenumeration?',
    answer_markdown: 'Gå till Prenumeration > Avbryt prenumeration. Din tillgång fortsätter till periodens slut.',
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
  { value: 'general', label: 'Fråga', icon: QuestionMarkCircleIcon },
  { value: 'other', label: 'Övrigt', icon: ChatBubbleLeftRightIcon },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'Hög' },
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
  const [priority, setPriority] = useState('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rating, setRating] = useState(0)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [faqs, setFaqs] = useState<Array<{ id?: string; question: string; answer_markdown: string }>>(fallbackFAQs)
  const [faqsLoading, setFaqsLoading] = useState(false)

  // Load tickets function
  async function loadTickets() {
    setTicketsLoading(true)
    setTicketsError(null)
    const result = await listUserTickets()
    if (result.success && result.data) {
      // Cast to handle status type compatibility
      setTickets(result.data as unknown as Ticket[])
    } else {
      setTicketsError(result.error || 'Kunde inte hämta ärenden')
    }
    setTicketsLoading(false)
  }

  // Load FAQs function
  async function loadFAQs() {
    setFaqsLoading(true)
    try {
      const result = await getPublishedFAQs(undefined)
      if (result.success && result.data && result.data.length > 0) {
        setFaqs(result.data)
      }
    } catch (err) {
      console.error('Failed to load FAQs:', err)
    }
    // If no FAQs found in DB, keep the fallbacks
    setFaqsLoading(false)
  }

  // Load tickets when the tickets tab is activated
  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets()
    }
  }, [activeTab])

  // Load FAQs when the faq tab is activated
  useEffect(() => {
    if (activeTab === 'faq') {
      loadFAQs()
    }
  }, [activeTab])

  const handleSubmit = async () => {
    if (!title || !description) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    const result = await createUserTicket({
      title,
      description,
      category: feedbackType,
      priority: priority as 'low' | 'medium' | 'high',
    })
    
    setIsSubmitting(false)
    
    if (result.success) {
      setSubmitted(true)
      setTimeout(() => {
        setTitle('')
        setDescription('')
        setRating(0)
        setPriority('medium')
        setFeedbackType('general')
        setSubmitted(false)
        // Refresh tickets list
        loadTickets()
      }, 3000)
    } else {
      setSubmitError(result.error || 'Något gick fel. Försök igen.')
    }
  }

  const activeTicketCount = tickets.filter(t => t.status !== 'closed').length

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
              <div className="text-sm text-muted-foreground">{activeTicketCount} aktiva</div>
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
                      Prioritet
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      options={PRIORITY_OPTIONS}
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

                  {submitError && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{submitError}</p>
                    </div>
                  )}

                  <Button onClick={handleSubmit} disabled={!title || !description || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                        Skicka ärende
                      </>
                    )}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dina supportärenden</CardTitle>
            <Link href="/app/support/contact">
              <Button size="sm">
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                Nytt ärende
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Laddar ärenden...</p>
              </div>
            ) : ticketsError ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Kunde inte hämta ärenden</h3>
                <p className="text-muted-foreground text-sm mb-4">{ticketsError}</p>
                <Button onClick={loadTickets} variant="outline" size="sm">
                  Försök igen
                </Button>
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/app/support/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer block"
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
                          Skapad {new Date(ticket.created_at).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(ticket.status) as 'primary' | 'warning' | 'success' | 'default'}>
                        {getStatusLabel(ticket.status)}
                      </Badge>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Inga ärenden</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Du har inga aktiva supportärenden.
                </p>
                <Link href="/app/support/contact">
                  <Button>
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    Skapa ett ärende
                  </Button>
                </Link>
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
            {faqsLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Laddar frågor...</p>
              </div>
            ) : (
              faqs.map((faq, index) => (
                <div key={faq.id ?? index} className="border border-border rounded-lg overflow-hidden">
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
                    <div className="px-4 pb-4 text-muted-foreground whitespace-pre-wrap">{faq.answer_markdown}</div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
