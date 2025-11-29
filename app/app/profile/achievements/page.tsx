'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import {
  getUserAchievementProgress,
  AchievementProgress,
} from '@/lib/services/achievementService';
import AchievementBadge from '@/components/AchievementBadge';

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAchievements = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const progress = await getUserAchievementProgress(user.id);
        setAchievements(progress);
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [user]);

  const filteredAchievements = achievements.filter((item) => {
    if (filterType === 'unlocked') return item.isUnlocked;
    if (filterType === 'locked') return !item.isUnlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app/profile" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-lg text-gray-600">
            {unlockedCount} of {totalCount} unlocked ({Math.round((unlockedCount / totalCount) * 100)}%)
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900">Completion</span>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filterType === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('unlocked')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filterType === 'unlocked'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilterType('locked')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filterType === 'locked'
                ? 'bg-gray-500 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            Locked ({totalCount - unlockedCount})
          </button>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredAchievements.map((item) => (
            <div key={item.achievement.id} className="flex justify-center">
              <AchievementBadge
                achievement={item.achievement}
                isUnlocked={item.isUnlocked}
                unlockedAt={item.unlockedAt}
                size="lg"
                showLabel={true}
              />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {filterType === 'unlocked'
                ? 'No achievements unlocked yet'
                : filterType === 'locked'
                  ? 'All achievements unlocked!'
                  : 'No achievements found'}
            </p>
          </div>
        )}

        {/* Achievement Details */}
        {filteredAchievements.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Achievement Details</h2>
            <div className="space-y-4">
              {filteredAchievements.slice(0, 10).map((item) => (
                <div key={item.achievement.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                  <div className="text-3xl">
                    {item.isUnlocked ? '✓' : '🔒'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{item.achievement.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{item.achievement.description}</p>
                    {!item.isUnlocked && item.percentComplete > 0 && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${item.percentComplete}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(item.percentComplete)}% progress</p>
                      </div>
                    )}
                    {item.isUnlocked && item.unlockedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Unlocked on {new Date(item.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
