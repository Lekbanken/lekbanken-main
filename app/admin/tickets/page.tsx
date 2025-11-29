'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Support Tickets</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  const itemsPerPage = 50;
  const totalPages = Math.ceil((stats?.totalTickets || 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Support Tickets</h1>
          <p className="text-slate-600">Hantera support-ärenden från användare</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm font-medium mb-1">Totalt Ärenden</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalTickets}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm font-medium mb-1">Öppna Ärenden</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.openTickets}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm font-medium mb-1">Lösta</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.totalTickets - stats.openTickets}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm font-medium mb-1">Genomsnittlig Tid</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}h` : '-'}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h2 className="text-lg font-bold text-white">Support Ärenden</h2>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Alla Prioriteter</option>
                <option value="urgent">Brådskande</option>
                <option value="high">Hög</option>
                <option value="medium">Medel</option>
                <option value="low">Låg</option>
              </select>
            </div>

            {/* Tickets */}
            <div className="divide-y overflow-y-auto flex-1 max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-slate-600">Laddar...</div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-slate-600">Inga ärenden hittades</div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4 ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-slate-200'
                    } ${
                      ticket.priority === 'urgent'
                        ? 'border-l-red-500'
                        : ticket.priority === 'high'
                          ? 'border-l-orange-500'
                          : 'border-l-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-slate-900">{ticket.title}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          ticket.status === 'open'
                            ? 'bg-yellow-100 text-yellow-700'
                            : ticket.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : ticket.status === 'resolved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ticket.status === 'open'
                          ? 'Öppen'
                          : ticket.status === 'in_progress'
                            ? 'Hanteras'
                            : ticket.status === 'resolved'
                              ? 'Löst'
                              : 'Stängt'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{new Date(ticket.created_at).toLocaleDateString('sv-SE')}</p>
                    <p className="text-sm text-slate-600 truncate">{ticket.description}</p>
                  </button>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded disabled:opacity-50 hover:bg-slate-200"
                >
                  Föregående
                </button>
                <span className="text-sm text-slate-600">
                  Sida {currentPage} av {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded disabled:opacity-50 hover:bg-slate-200"
                >
                  Nästa
                </button>
              </div>
            )}
          </div>

          {/* Ticket Detail */}
          {selectedTicket ? (
            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-screen md:max-h-96 lg:max-h-full">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                <h2 className="text-lg font-bold text-white truncate">{selectedTicket.title}</h2>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Ticket Info */}
                <div className="space-y-2 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ticket ID</p>
                    <p className="text-sm text-slate-900">{selectedTicket.ticket_key || selectedTicket.id.slice(0, 8)}</p>
                  </div>

                  {selectedTicket.description && (
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Beskrivning</p>
                      <p className="text-sm text-slate-700">{selectedTicket.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Skapat</p>
                      <p className="text-sm text-slate-900">
                        {new Date(selectedTicket.created_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Kategori</p>
                      <p className="text-sm text-slate-900">{selectedTicket.category || 'Allmänt'}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Priority Controls */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleStatusChange(selectedTicket.id, e.target.value as SupportTicket['status'])
                      }
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="open">Öppen</option>
                      <option value="in_progress">Hanteras</option>
                      <option value="waiting_for_user">Väntar på Användare</option>
                      <option value="resolved">Löst</option>
                      <option value="closed">Stängt</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Prioritet</p>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handlePriorityChange(selectedTicket.id, e.target.value as SupportTicket['priority'])
                      }
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <p className="text-xs text-slate-500 font-medium mb-2">Meddelanden ({ticketMessages.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {isLoadingMessages ? (
                      <p className="text-sm text-slate-500">Laddar meddelanden...</p>
                    ) : ticketMessages.length === 0 ? (
                      <p className="text-sm text-slate-500">Inga meddelanden än</p>
                    ) : (
                      ticketMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded text-sm ${
                            msg.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'
                          }`}
                        >
                          <p className="text-xs text-slate-500 mb-1">
                            {msg.is_internal && '🔒 Internt'} {new Date(msg.created_at).toLocaleString('sv-SE')}
                          </p>
                          <p className="text-slate-700 break-words">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Send Message */}
              <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Skicka ett meddelande..."
                    className="flex-1 px-3 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !newMessage.trim()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm rounded transition-colors"
                  >
                    Skicka
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
              <p className="text-slate-600">Välj ett ärende för att se detaljer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
