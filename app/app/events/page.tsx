'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { getActiveEvents, claimEventReward } from '@/lib/services/achievementsAdvancedService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default function EventsPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      if (!tenantId) return;
      setLoading(true);
      const data = await getActiveEvents(tenantId, 100);
      setEvents(data || []);
      setLoading(false);
    };
    loadEvents();
  }, [tenantId]);

  async function handleClaimReward(eventId: string) {
    if (!tenantId || !currentTenant?.membership.user_id) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (claimEventReward as any)(tenantId, eventId, currentTenant.membership.user_id);
      // Refresh events
      const data = await getActiveEvents(tenantId, 100);
      setEvents(data || []);
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  }

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getThemeColor = (index: number) => {
    const colors = [
      'from-pink-500 to-red-500',
      'from-purple-500 to-pink-500',
      'from-blue-500 to-purple-500',
      'from-green-500 to-blue-500',
      'from-yellow-500 to-orange-500',
    ];
    return colors[index % colors.length];
  };

  const getRewardIcon = (type: string) => {
    const icons: Record<string, string> = {
      points: '⭐',
      currency: '💰',
      cosmetics: '🎨',
    };
    return icons[type] || '🎁';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Limited Time Events</h1>
          <p className="text-gray-600">Participate in exclusive events and earn special rewards</p>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No active events at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event: AnyRecord, index: number) => {
              const timeRemaining = getTimeRemaining(event.end_date);
              const isEnded = timeRemaining === 'Ended';

              return (
                <div
                  key={event.id}
                  className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Event Header */}
                  <div className={`bg-gradient-to-r ${getThemeColor(index)} p-6 text-white`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-2xl font-bold">{event.title}</h2>
                        <p className="text-white/80 text-sm">{event.theme}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          isEnded
                            ? 'bg-gray-500/50'
                            : 'bg-white/20'
                        }`}
                      >
                        {timeRemaining}
                      </div>
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4">{event.description}</p>

                    {/* Stats */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{event.participant_count}</div>
                          <div className="text-xs text-gray-600">Participants</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{event.completion_count}</div>
                          <div className="text-xs text-gray-600">Completed</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {event.reward_amount}
                          </div>
                          <div className="text-xs text-gray-600">Reward</div>
                        </div>
                      </div>
                    </div>

                    {/* Reward Info */}
                    <div className="border-t border-b py-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-semibold flex items-center gap-2">
                          <span className="text-2xl">{getRewardIcon(event.reward_type)}</span>
                          Reward:
                        </span>
                        <span className="text-lg font-bold text-yellow-600">
                          {event.reward_amount} {event.reward_type}
                        </span>
                      </div>
                    </div>

                    {/* Participation Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-600">Event Progress</span>
                        <span className="text-gray-600">
                          {event.completion_count} / {event.participant_count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{
                            width:
                              event.participant_count > 0
                                ? `${(event.completion_count / event.participant_count) * 100}%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClaimReward(event.id)}
                        disabled={isEnded}
                        className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
                          isEnded
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isEnded ? 'Event Ended' : 'Claim Reward'}
                      </button>
                      <button className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 font-semibold transition-colors">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
