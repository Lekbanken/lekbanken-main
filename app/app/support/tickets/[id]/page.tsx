'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Textarea } from '@/components/ui'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { getUserTicket, listUserTicketMessages, addUserTicketMessage } from '@/app/actions/tickets-user'

interface Ticket {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  category: string | null
  created_at: string
  updated_at: string
  user_id: string
}

interface Message {
  id: string
  message: string
  created_at: string
  user_id: string
  is_internal: boolean
}

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

function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'low':
      return 'Låg'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'Hög'
    default:
      return priority
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'general':
      return 'Allmänt'
    case 'technical':
      return 'Tekniskt'
    case 'billing':
      return 'Fakturering'
    case 'feature':
      return 'Funktionsförslag'
    case 'bug':
      return 'Bugg'
    default:
      return category
  }
}

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const loadTicketData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const [ticketResult, messagesResult] = await Promise.all([
      getUserTicket(ticketId),
      listUserTicketMessages(ticketId),
    ])
    
    if (!ticketResult.success || !ticketResult.data) {
      setError(ticketResult.error || 'Kunde inte hämta ärendet')
      setLoading(false)
      return
    }
    
    setTicket(ticketResult.data as Ticket)
    
    if (messagesResult.success && messagesResult.data) {
      setMessages(messagesResult.data as Message[])
    }
    
    setLoading(false)
  }, [ticketId])

  useEffect(() => {
    loadTicketData()
  }, [loadTicketData])

  async function handleSendMessage() {
    if (!newMessage.trim()) return
    
    setSending(true)
    setSendError(null)
    
    const result = await addUserTicketMessage({
      ticketId,
      message: newMessage.trim(),
    })
    
    setSending(false)
    
    if (result.success) {
      setNewMessage('')
      // Reload messages
      const messagesResult = await listUserTicketMessages(ticketId)
      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data as Message[])
      }
    } else {
      setSendError(result.error || 'Kunde inte skicka meddelandet')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-32">
        <header className="flex items-center gap-4">
          <Link
            href="/app/support"
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-foreground" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Support
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Laddar...
            </h1>
          </div>
        </header>
        <div className="text-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6 pb-32">
        <header className="flex items-center gap-4">
          <Link
            href="/app/support"
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-foreground" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Support
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Ärende
            </h1>
          </div>
        </header>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">
              Kunde inte hämta ärendet
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/app/support">
              <Button>Tillbaka till support</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canReply = ticket.status !== 'closed'

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/app/support"
          className="rounded-full p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Ärende #{ticket.id.slice(0, 8)}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {ticket.title}
          </h1>
        </div>
        <Badge variant={getStatusVariant(ticket.status) as 'primary' | 'warning' | 'success' | 'default'}>
          {getStatusLabel(ticket.status)}
        </Badge>
      </header>

      {/* Ticket Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Kategori</p>
              <p className="font-medium text-foreground">{getCategoryLabel(ticket.category || 'general')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Prioritet</p>
              <p className="font-medium text-foreground">{getPriorityLabel(ticket.priority)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Skapad</p>
              <p className="font-medium text-foreground">
                {new Date(ticket.created_at).toLocaleDateString('sv-SE')}
              </p>
            </div>
          </div>
          {ticket.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm mb-2">Beskrivning</p>
              <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Konversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Inga meddelanden ännu</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vi återkommer så snart vi kan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                // Support messages are from users other than the ticket owner
                const isFromSupport = message.user_id !== ticket.user_id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromSupport ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        isFromSupport
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isFromSupport && (
                        <p className="text-xs font-medium mb-1 opacity-80">
                          Support
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.message}</p>
                      <p className={`text-xs mt-2 ${isFromSupport ? 'text-muted-foreground' : 'opacity-80'}`}>
                        {new Date(message.created_at).toLocaleString('sv-SE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Reply Box */}
          {canReply ? (
            <div className="mt-6 pt-4 border-t border-border">
              <Textarea
                placeholder="Skriv ditt meddelande..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                className="mb-3"
              />
              {sendError && (
                <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-600">
                  {sendError}
                </div>
              )}
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Skicka svar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-center py-4 bg-muted rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Ärendet är stängt. Skapa ett nytt ärende om du behöver mer hjälp.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
