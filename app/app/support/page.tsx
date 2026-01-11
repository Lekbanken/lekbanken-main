'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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

// Category/type/priority values (labels come from translations)
const CATEGORIES = ['general', 'technical', 'billing', 'feature', 'bug'] as const

const FEEDBACK_TYPES = [
  { value: 'bug', icon: BugAntIcon },
  { value: 'feature', icon: LightBulbIcon },
  { value: 'general', icon: QuestionMarkCircleIcon },
  { value: 'other', icon: ChatBubbleLeftRightIcon },
] as const

const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const

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

export default function SupportPage() {
  const t = useTranslations('app.support')
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
  const [faqs, setFaqs] = useState<Array<{ id?: string; question: string; answer_markdown: string }>>([])
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
      setTicketsError(result.error || t('errors.loadTickets'))
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
      setSubmitError(result.error || t('errors.submitFailed'))
    }
  }

  const activeTicketCount = tickets.filter(t => t.status !== 'closed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
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
              <div className="font-medium text-foreground">{t('quickLinks.contact')}</div>
              <div className="text-sm text-muted-foreground">{t('quickLinks.contactSub')}</div>
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
              <div className="font-medium text-foreground">{t('quickLinks.tickets')}</div>
              <div className="text-sm text-muted-foreground">{t('quickLinks.ticketsSub', { count: activeTicketCount })}</div>
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
              <div className="font-medium text-foreground">{t('quickLinks.faq')}</div>
              <div className="text-sm text-muted-foreground">{t('quickLinks.faqSub')}</div>
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
          {t('tabs.contact')}
        </Button>
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tickets')}
        >
          {t('tabs.tickets')}
        </Button>
        <Button
          variant={activeTab === 'faq' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('faq')}
        >
          {t('tabs.faq')}
        </Button>
      </div>

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t('form.success')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('form.successSub')}
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
                          <span className="text-xs">{t(`feedbackTypes.${type.value}` as 'feedbackTypes.bug')}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('tabs.contact')}
                    </label>
                    <Select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      options={CATEGORIES.map(cat => ({ value: cat, label: t(`categories.${cat}` as 'categories.general') }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('priority.medium')}
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      options={PRIORITY_OPTIONS.map(p => ({ value: p, label: t(`priority.${p}` as 'priority.low') }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('form.title')}
                    </label>
                    <Input
                      placeholder={t('form.titlePlaceholder')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('form.descriptionPlaceholder')}
                    </label>
                    <Textarea
                      placeholder={t('form.descriptionPlaceholder')}
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('form.ratingLabel')}
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
                        {t('form.submitting')}
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                        {t('form.submit')}
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
              <CardTitle>{t('tabs.contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-foreground mb-1">E-post</div>
                <div className="text-primary">support@lekbanken.se</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-foreground mb-1">{t('contactInfo.hours')}</div>
                <div className="text-primary">08-123 456 78</div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="font-medium text-foreground mb-1">Pro-support</div>
                <div className="text-sm text-muted-foreground">
                  {t('contactInfo.proSupport')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('tickets.title')}</CardTitle>
            <Link href="/app/support/contact">
              <Button size="sm">
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                {t('tickets.new')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">{t('tickets.loading')}</p>
              </div>
            ) : ticketsError ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{t('tickets.errorTitle')}</h3>
                <p className="text-muted-foreground text-sm mb-4">{ticketsError}</p>
                <Button onClick={loadTickets} variant="outline" size="sm">
                  {t('tickets.retry')}
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
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(ticket.status) as 'primary' | 'warning' | 'success' | 'default'}>
                        {t(`status.${ticket.status}` as 'status.open')}
                      </Badge>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{t('tickets.emptyTitle')}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('tickets.emptySub')}
                </p>
                <Link href="/app/support/contact">
                  <Button>
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    {t('tickets.create')}
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
            <CardTitle>{t('faq.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqsLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">{t('faq.loading')}</p>
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
