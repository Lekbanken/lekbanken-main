'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TrophyIcon } from '@heroicons/react/24/outline';
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrophyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Achievements & Events</h1>
          </div>
          <div className="flex gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab('challenges')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'challenges'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Challenges
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'events'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Limited Events
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'leaderboard'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>

      {activeTab === 'challenges' && (
        <div className="space-y-8">
          {/* Create Challenge Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Challenge Title"
                    value={challengeForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setChallengeForm({ ...challengeForm, title: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                    required
                  />
                  <select
                    value={challengeForm.challenge_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setChallengeForm({ ...challengeForm, challenge_type: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-3 gap-4">
                  <select
                    value={challengeForm.difficulty}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setChallengeForm({ ...challengeForm, difficulty: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
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
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
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
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Challenge
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Challenges List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Loading challenges...</p>
                ) : challenges.length === 0 ? (
                  <p className="text-muted-foreground">No challenges yet</p>
                ) : (
                  challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="flex justify-between items-center p-4 border border-border rounded-lg hover:bg-muted"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Type: {challenge.challenge_type}</span>
                          <span>Difficulty: {challenge.difficulty}</span>
                          <span>Target: {challenge.target_value}</span>
                          <span>Participants: {challenge.participation_count}</span>
                          <span>Completed: {challenge.completion_count}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-8">
          {/* Create Event Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Limited Event</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Event Title"
                    value={eventForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Theme"
                    value={eventForm.theme}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEventForm({ ...eventForm, theme: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={eventForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="datetime-local"
                    value={eventForm.ends_at}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEventForm({ ...eventForm, ends_at: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                    required
                  />
                  <select
                    value={eventForm.reward_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setEventForm({ ...eventForm, reward_type: e.target.value })
                    }
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
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
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Event
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground">Loading events...</p>
                ) : events.length === 0 ? (
                  <p className="text-muted-foreground">No events yet</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between items-center p-4 border border-border rounded-lg hover:bg-muted"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Theme: {event.theme}</span>
                          <span>Ends: {new Date(event.ends_at).toLocaleDateString()}</span>
                          <span>Participants: {event.participant_count}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle>Achievement Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-muted-foreground">No leaderboard data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-2 px-4 text-muted-foreground">Rank</th>
                      <th className="text-left py-2 px-4 text-muted-foreground">Player</th>
                      <th className="text-center py-2 px-4 text-muted-foreground">Achievements</th>
                      <th className="text-center py-2 px-4 text-muted-foreground">Seasonal</th>
                      <th className="text-right py-2 px-4 text-muted-foreground">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr key={entry.user_id} className="border-b border-border hover:bg-muted">
                        <td className="py-2 px-4 font-semibold text-foreground">#{entry.rank}</td>
                        <td className="py-2 px-4 text-foreground">{entry.user_name}</td>
                        <td className="py-2 px-4 text-center text-foreground">{entry.achievement_count}</td>
                        <td className="py-2 px-4 text-center text-foreground">{entry.seasonal_count}</td>
                        <td className="py-2 px-4 text-right font-semibold text-primary">
                          {entry.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
