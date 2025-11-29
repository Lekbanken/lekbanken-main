'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  submitFeedback,
  getUserFeedback,
  createTicket,
  getUserTickets,
  type Feedback,
  type SupportTicket,
} from '@/lib/services/supportService';

type FeedbackType = 'bug' | 'feature_request' | 'improvement' | 'other';

export default function SupportPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // Form states
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('other');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');

  // Data states
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Load user's feedback and tickets
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      const [feedbackData, ticketsData] = await Promise.all([
        getUserFeedback(user.id, 10),
        getUserTickets(user.id, undefined, 10),
      ]);

      if (feedbackData) setFeedback(feedbackData);
      if (ticketsData) setTickets(ticketsData);
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !feedbackTitle.trim()) return;

    setIsSending(true);
    const result = await submitFeedback({
      userId: user.id,
      tenantId: currentTenant?.id || null,
      type: feedbackType,
      title: feedbackTitle,
      description: feedbackDescription,
      rating: feedbackRating || undefined,
      isAnonymous,
    });

    if (result) {
      setFeedback([result, ...feedback]);
      setFeedbackTitle('');
      setFeedbackDescription('');
      setFeedbackRating(null);
      setIsAnonymous(false);
      alert('Tack för din feedback! 🎉');
    } else {
      alert('Det uppstod ett fel. Försök igen.');
    }
    setIsSending(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticketTitle.trim()) return;

    setIsSending(true);
    const result = await createTicket({
      userId: user.id,
      tenantId: currentTenant?.id || null,
      title: ticketTitle,
      description: ticketDescription,
      category: ticketCategory,
      priority: 'medium',
    });

    if (result) {
      setTickets([result, ...tickets]);
      setTicketTitle('');
      setTicketDescription('');
      setTicketCategory('general');
      alert('Support-ärende skapat! Vi tittar på det så snart vi kan. 📧');
    } else {
      alert('Det uppstod ett fel. Försök igen.');
    }
    setIsSending(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Support</h1>
            <p className="text-slate-600">Du måste logga in för att skicka feedback eller skapa support-ärenden.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Support & Feedback</h1>
          <p className="text-slate-600">Vi älskar att höra från dig! Sänd feedback eller skapa ett support-ärende.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'submit'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Skicka Feedback
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Historik ({feedback.length + tickets.length})
          </button>
        </div>

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Feedback Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">💬 Skicka Feedback</h2>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                {/* Feedback Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Typ av feedback
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="other">Allmän feedback</option>
                    <option value="bug">Bugg-rapport</option>
                    <option value="feature_request">Funktionsönskemål</option>
                    <option value="improvement">Förbättringsförslag</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rubrik
                  </label>
                  <input
                    type="text"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    placeholder="Kort beskrivning av din feedback..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Detaljer
                  </label>
                  <textarea
                    value={feedbackDescription}
                    onChange={(e) => setFeedbackDescription(e.target.value)}
                    placeholder="Berätta mer om din feedback..."
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nöjdhetsgrad (valfritt)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFeedbackRating(rating)}
                        className={`w-10 h-10 rounded-lg font-bold transition-all ${
                          feedbackRating === rating
                            ? 'bg-yellow-400 text-slate-900 scale-110'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {rating}⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anonymous */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Skicka anonymt</span>
                </label>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  {isSending ? 'Skickar...' : 'Skicka Feedback'}
                </button>
              </form>
            </div>

            {/* Support Ticket Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">🎟️ Skapa Support-Ärende</h2>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">Allmänt</option>
                    <option value="technical">Tekniskt problem</option>
                    <option value="account">Kontokonto</option>
                    <option value="billing">Fakturering</option>
                    <option value="other">Övrigt</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ämne
                  </label>
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    placeholder="Vad behöver du hjälp med?"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Beskrivning
                  </label>
                  <textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Beskriv problemet eller frågan i detalj..."
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  {isSending ? 'Skapar...' : 'Skapa Ärende'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Laddar...</p>
              </div>
            ) : (
              <>
                {/* Feedback */}
                {feedback.length > 0 && (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                      <h3 className="text-lg font-bold text-white">Din Feedback</h3>
                    </div>
                    <div className="divide-y">
                      {feedback.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{item.title}</p>
                              <p className="text-sm text-slate-500">
                                {new Date(item.created_at).toLocaleDateString('sv-SE')}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.type === 'bug'
                                  ? 'bg-red-100 text-red-700'
                                  : item.type === 'feature_request'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.type === 'bug'
                                ? 'Bugg'
                                : item.type === 'feature_request'
                                  ? 'Önskemål'
                                  : 'Feedback'}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-slate-600 text-sm mb-2">{item.description}</p>
                          )}
                          {item.rating && (
                            <p className="text-sm text-yellow-600">Betyg: {'⭐'.repeat(item.rating)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Support Tickets */}
                {tickets.length > 0 && (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                      <h3 className="text-lg font-bold text-white">Dina Support-Ärenden</h3>
                    </div>
                    <div className="divide-y">
                      {tickets.map((ticket) => (
                        <div key={ticket.id} className="p-4 hover:bg-slate-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{ticket.title}</p>
                              <p className="text-sm text-slate-500">
                                #{ticket.ticket_key || ticket.id.slice(0, 8)}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                                ? 'Öppet'
                                : ticket.status === 'in_progress'
                                  ? 'Hanteras'
                                  : ticket.status === 'resolved'
                                    ? 'Löst'
                                    : 'Stängt'}
                            </span>
                          </div>
                          {ticket.description && (
                            <p className="text-slate-600 text-sm mb-2">{ticket.description}</p>
                          )}
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>Prioritet: {ticket.priority}</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString('sv-SE')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feedback.length === 0 && tickets.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg">
                    <p className="text-slate-600">Du har inte skickat någon feedback eller support-ärenden ännu.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
