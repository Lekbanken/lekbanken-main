'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { Card, CardContent, Badge, Input, Button } from '@/components/ui';
import { TicketIcon } from '@heroicons/react/24/outline';
import {
  getAdminTickets,
  getTicketStats,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  addTicketMessage,
  type SupportTicket,
  type SupportStats,
  type TicketMessage,
} from '@/lib/services/supportService';

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // States
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<SupportTicket['status'] | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicket['priority'] | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Detail view states
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Load tickets and stats
  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadData = async () => {
      setIsLoading(true);
      const offset = (currentPage - 1) * 50;

      const [ticketsData, statsData] = await Promise.all([
        getAdminTickets(currentTenant.id, statusFilter || undefined, priorityFilter || undefined, 50, offset),
        getTicketStats(currentTenant.id),
      ]);

      if (ticketsData) setTickets(ticketsData);
      if (statsData) setStats(statsData);
      setIsLoading(false);
    };

    loadData();
  }, [user, currentTenant, statusFilter, priorityFilter, currentPage]);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const messages = await getTicketMessages(selectedTicket.id);
      if (messages) setTicketMessages(messages);
      setIsLoadingMessages(false);
    };

    loadMessages();
  }, [selectedTicket]);

  const handleStatusChange = async (ticketId: string, newStatus: SupportTicket['status']) => {
    const result = await updateTicketStatus(ticketId, newStatus);
    if (result) {
      setTickets(tickets.map((t) => (t.id === ticketId ? result : t)));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(result);
      }
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: SupportTicket['priority']) => {
    const result = await updateTicketPriority(ticketId, newPriority);
    if (result) {
      setTickets(tickets.map((t) => (t.id === ticketId ? result : t)));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(result);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || !newMessage.trim()) return;

    setIsSendingMessage(true);
    const result = await addTicketMessage({
      ticketId: selectedTicket.id,
      userId: user.id,
      message: newMessage,
      isInternal: false,
    });

    if (result) {
      setTicketMessages([...ticketMessages, result]);
      setNewMessage('');
    }
    setIsSendingMessage(false);
  };

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Support Tickets</h1>
            <p className="text-muted-foreground">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  const itemsPerPage = 50;
  const totalPages = Math.ceil((stats?.totalTickets || 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TicketIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Support Tickets</h1>
          </div>
          <p className="text-muted-foreground">Hantera support-ärenden från användare</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Totalt Ärenden</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalTickets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Öppna Ärenden</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.openTickets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Lösta</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.totalTickets - stats.openTickets}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Genomsnittlig Tid</p>
                <p className="text-3xl font-bold text-primary">
                  {stats.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}h` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <Card className="lg:col-span-2 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
              <h2 className="text-lg font-bold text-primary-foreground">Support Ärenden</h2>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as SupportTicket['status'] | '');
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-border rounded-lg text-sm bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Alla Status</option>
                <option value="open">Öppen</option>
                <option value="in_progress">Hanteras</option>
                <option value="resolved">Löst</option>
                <option value="closed">Stängt</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as SupportTicket['priority'] | '');
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-border rounded-lg text-sm bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Alla Prioriteter</option>
                <option value="urgent">Brådskande</option>
                <option value="high">Hög</option>
                <option value="medium">Medel</option>
                <option value="low">Låg</option>
              </select>
            </div>

            {/* Tickets */}
            <div className="divide-y divide-border overflow-y-auto flex-1 max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Laddar...</div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Inga ärenden hittades</div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-muted transition-colors border-l-4 ${
                      selectedTicket?.id === ticket.id ? 'bg-primary/10 border-l-primary' : 'border-l-border'
                    } ${
                      ticket.priority === 'urgent'
                        ? 'border-l-red-500'
                        : ticket.priority === 'high'
                          ? 'border-l-orange-500'
                          : 'border-l-border'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-foreground">{ticket.title}</p>
                      <Badge
                        variant={
                          ticket.status === 'open'
                            ? 'warning'
                            : ticket.status === 'in_progress'
                              ? 'default'
                              : ticket.status === 'resolved'
                                ? 'success'
                                : 'secondary'
                        }
                      >
                        {ticket.status === 'open'
                          ? 'Öppen'
                          : ticket.status === 'in_progress'
                            ? 'Hanteras'
                            : ticket.status === 'resolved'
                              ? 'Löst'
                              : 'Stängt'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{new Date(ticket.created_at).toLocaleDateString('sv-SE')}</p>
                    <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                  </button>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex justify-between items-center">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Föregående
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sida {currentPage} av {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Nästa
                </Button>
              </div>
            )}
          </Card>

          {/* Ticket Detail */}
          {selectedTicket ? (
            <Card className="overflow-hidden flex flex-col max-h-screen md:max-h-96 lg:max-h-full">
              <div className="bg-gradient-to-r from-accent to-accent/80 p-4">
                <h2 className="text-lg font-bold text-accent-foreground truncate">{selectedTicket.title}</h2>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Ticket Info */}
                <div className="space-y-2 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Ticket ID</p>
                    <p className="text-sm text-foreground">{selectedTicket.ticket_key || selectedTicket.id.slice(0, 8)}</p>
                  </div>

                  {selectedTicket.description && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Beskrivning</p>
                      <p className="text-sm text-foreground">{selectedTicket.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Skapat</p>
                      <p className="text-sm text-foreground">
                        {new Date(selectedTicket.created_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Kategori</p>
                      <p className="text-sm text-foreground">{selectedTicket.category || 'Allmänt'}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Priority Controls */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleStatusChange(selectedTicket.id, e.target.value as SupportTicket['status'])
                      }
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="open">Öppen</option>
                      <option value="in_progress">Hanteras</option>
                      <option value="waiting_for_user">Väntar på Användare</option>
                      <option value="resolved">Löst</option>
                      <option value="closed">Stängt</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Prioritet</p>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handlePriorityChange(selectedTicket.id, e.target.value as SupportTicket['priority'])
                      }
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="low">Låg</option>
                      <option value="medium">Medel</option>
                      <option value="high">Hög</option>
                      <option value="urgent">Brådskande</option>
                    </select>
                  </div>
                </div>

                {/* Messages */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Meddelanden ({ticketMessages.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {isLoadingMessages ? (
                      <p className="text-sm text-muted-foreground">Laddar meddelanden...</p>
                    ) : ticketMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Inga meddelanden än</p>
                    ) : (
                      ticketMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-lg text-sm ${
                            msg.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-muted'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {msg.is_internal && '🔒 Internt'} {new Date(msg.created_at).toLocaleString('sv-SE')}
                          </p>
                          <p className="text-foreground break-words">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Send Message */}
              <div className="p-4 border-t border-border">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Skicka ett meddelande..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isSendingMessage || !newMessage.trim()}
                    size="sm"
                  >
                    Skicka
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="p-6 flex items-center justify-center min-h-64">
              <p className="text-muted-foreground">Välj ett ärende för att se detaljer</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
