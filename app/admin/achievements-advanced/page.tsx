'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import {
  getActiveChallenges,
  createChallenge,
  createEvent,
  getActiveEvents,
  getAchievementLeaderboard,
  type CommunityChallenge,
  type LimitedTimeEvent,
} from '@/lib/services/achievementsAdvancedService';

type AchievementLeaderboardEntry = {
  user_id: string;
  user_name: string;
  rank: number;
  achievement_count: number;
  seasonal_count: number;
  total_points: number;
};

type TabType = 'challenges' | 'events' | 'leaderboard';

export default function AchievementsAdvancedPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const [activeTab, setActiveTab] = useState<TabType>('challenges');
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [events, setEvents] = useState<LimitedTimeEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<AchievementLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const defaultChallengeEnd = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [challengeForm, setChallengeForm] = useState(() => ({
    title: '',
    description: '',
    challenge_type: 'score',
    difficulty: 'medium',
    target_value: 100,
    reward_points: 50,
    ends_at: defaultChallengeEnd(),
  }));

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    theme: '',
    ends_at: '',
    event_type: 'engagement',
    reward_type: 'points',
    reward_amount: 100,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!tenantId) return;
      setLoading(true);
      const results = (await Promise.all([
        getActiveChallenges(tenantId, 50),
        getActiveEvents(tenantId, 50),
        getAchievementLeaderboard(tenantId, 1, 50),
      ])) as [CommunityChallenge[] | null, LimitedTimeEvent[] | null, AchievementLeaderboardEntry[] | null];
      setChallenges(results[0] || []);
      setEvents(results[1] || []);
      setLeaderboard(results[2] || []);
      setLoading(false);
    };
    loadData();
  }, [tenantId]);

  async function handleCreateChallenge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenantId || !user) return;

    try {
      await createChallenge(tenantId, user.id, {
        title: challengeForm.title,
        description: challengeForm.description,
        challenge_type: challengeForm.challenge_type,
        difficulty: challengeForm.difficulty,
        target_value: challengeForm.target_value,
        reward_points: challengeForm.reward_points,
        reward_currency_amount: null,
        status: 'active',
        starts_at: new Date().toISOString(),
        ends_at: challengeForm.ends_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setChallengeForm({
        title: '',
        description: '',
        challenge_type: 'score',
        difficulty: 'medium',
        target_value: 100,
        reward_points: 50,
        ends_at: defaultChallengeEnd(),
      });

      const data = await getActiveChallenges(tenantId, 50);
      setChallenges(data || []);
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  }

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenantId || !user) return;

    try {
      await createEvent(tenantId, user.id, {
        title: eventForm.title,
        description: eventForm.description,
        theme: eventForm.theme,
        event_type: eventForm.event_type,
        starts_at: new Date().toISOString(),
        ends_at: eventForm.ends_at,
        status: 'active',
        reward_type: eventForm.reward_type,
        reward_amount: eventForm.reward_amount,
      });

      setEventForm({
        title: '',
        description: '',
        theme: '',
        ends_at: '',
        event_type: 'engagement',
        reward_type: 'points',
        reward_amount: 100,
      });

      const data = await getActiveEvents(tenantId, 50);
      setEvents(data || []);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Achievements & Events</h1>
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'challenges'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Challenges
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'events'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Limited Events
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'leaderboard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {activeTab === 'challenges' && (
        <div className="space-y-8">
          {/* Create Challenge Form */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Create Challenge</h2>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Challenge Title"
                  value={challengeForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setChallengeForm({ ...challengeForm, title: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <select
                  value={challengeForm.challenge_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setChallengeForm({ ...challengeForm, challenge_type: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="score">Score Challenge</option>
                  <option value="participation">Participation</option>
                  <option value="speed">Speed Challenge</option>
                  <option value="cooperation">Cooperation</option>
                </select>
              </div>
              <textarea
                placeholder="Description"
                value={challengeForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setChallengeForm({ ...challengeForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
              />
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={challengeForm.difficulty}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setChallengeForm({ ...challengeForm, difficulty: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
                <input
                  type="number"
                  placeholder="Target Value"
                  value={challengeForm.target_value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setChallengeForm({
                      ...challengeForm,
                      target_value: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="number"
                  placeholder="Reward Points"
                  value={challengeForm.reward_points}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setChallengeForm({
                      ...challengeForm,
                      reward_points: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border rounded-md"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Challenge
              </button>
            </form>
          </div>

          {/* Active Challenges List */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Active Challenges</h2>
            <div className="space-y-4">
              {loading ? (
                <p>Loading challenges...</p>
              ) : challenges.length === 0 ? (
                <p className="text-gray-500">No challenges yet</p>
              ) : (
                challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{challenge.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>Type: {challenge.challenge_type}</span>
                        <span>Difficulty: {challenge.difficulty}</span>
                        <span>Target: {challenge.target_value}</span>
                        <span>Participants: {challenge.participation_count}</span>
                        <span>Completed: {challenge.completion_count}</span>
                      </div>
                    </div>
                    <button className="px-4 py-2 border rounded-md hover:bg-gray-100">
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-8">
          {/* Create Event Form */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Create Limited Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Event Title"
                  value={eventForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <input
                  type="text"
                  placeholder="Theme"
                  value={eventForm.theme}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventForm({ ...eventForm, theme: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                />
              </div>
              <textarea
                placeholder="Description"
                value={eventForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="datetime-local"
                  value={eventForm.ends_at}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventForm({ ...eventForm, ends_at: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <select
                  value={eventForm.reward_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEventForm({ ...eventForm, reward_type: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="points">Points</option>
                  <option value="currency">Currency</option>
                  <option value="cosmetics">Cosmetics</option>
                </select>
                <input
                  type="number"
                  placeholder="Reward Amount"
                  value={eventForm.reward_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventForm({
                      ...eventForm,
                      reward_amount: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border rounded-md"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Event
              </button>
            </form>
          </div>

          {/* Active Events List */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Active Events</h2>
            <div className="space-y-4">
              {loading ? (
                <p>Loading events...</p>
              ) : events.length === 0 ? (
                <p className="text-gray-500">No events yet</p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>Theme: {event.theme}</span>
                        <span>Ends: {new Date(event.ends_at).toLocaleDateString()}</span>
                        <span>Participants: {event.participant_count}</span>
                      </div>
                    </div>
                    <button className="px-4 py-2 border rounded-md hover:bg-gray-100">
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Achievement Leaderboard</h2>
          {loading ? (
            <p>Loading leaderboard...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-500">No leaderboard data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">Rank</th>
                    <th className="text-left py-2 px-4">Player</th>
                    <th className="text-center py-2 px-4">Achievements</th>
                    <th className="text-center py-2 px-4">Seasonal</th>
                    <th className="text-right py-2 px-4">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.user_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-semibold">#{entry.rank}</td>
                      <td className="py-2 px-4">{entry.user_name}</td>
                      <td className="py-2 px-4 text-center">{entry.achievement_count}</td>
                      <td className="py-2 px-4 text-center">{entry.seasonal_count}</td>
                      <td className="py-2 px-4 text-right font-semibold">
                        {entry.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
