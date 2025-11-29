'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { getActiveChallenges, joinChallenge } from '@/lib/services/achievementsAdvancedService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export default function ChallengesPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [challenges, setChallenges] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    const loadChallenges = async () => {
      if (!tenantId) return;
      setLoading(true);
      const data = await getActiveChallenges(tenantId, 100);
      setChallenges(data || []);
      setLoading(false);
    };
    loadChallenges();
  }, [tenantId]);

  const filteredChallenges = challenges.filter((challenge: AnyRecord) => {
    if (selectedDifficulty !== 'all' && challenge.difficulty !== selectedDifficulty) return false;
    if (selectedType !== 'all' && challenge.type !== selectedType) return false;
    return true;
  });

  async function handleJoinChallenge(challengeId: string) {
    if (!tenantId || !currentTenant?.membership.user_id) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (joinChallenge as any)(tenantId, challengeId, currentTenant.membership.user_id);
      // Refresh challenges
      const data = await getActiveChallenges(tenantId, 100);
      setChallenges(data || []);
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      score: '🎯',
      participation: '👥',
      speed: '⚡',
      cooperation: '🤝',
    };
    return icons[type] || '🎮';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Community Challenges</h1>
          <p className="text-gray-600">Join challenges and compete with other players</p>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="score">Score Challenge</option>
                <option value="participation">Participation</option>
                <option value="speed">Speed Challenge</option>
                <option value="cooperation">Cooperation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading challenges...</p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              {challenges.length === 0 ? 'No challenges available yet' : 'No challenges match your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge: AnyRecord) => (
              <div
                key={challenge.id}
                className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-3xl">{getTypeIcon(challenge.type)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{challenge.title}</h2>
                </div>

                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold">{challenge.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target:</span>
                      <span className="font-semibold">{challenge.target_value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reward:</span>
                      <span className="font-semibold text-yellow-600">{challenge.reward_points} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="font-semibold">{challenge.participant_count}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Completion</span>
                      <span className="text-gray-600">
                        {challenge.completion_count} / {challenge.participant_count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width:
                            challenge.participant_count > 0
                              ? `${(challenge.completion_count / challenge.participant_count) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinChallenge(challenge.id)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Join Challenge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
