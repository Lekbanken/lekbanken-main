'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import {
  getUserProgression,
  getUserMilestones,
  getLevelLeaderboard,
} from '@/lib/services/progressionService';
import {
  getUserAchievementStats,
  getUserAchievements,
  getAllAchievements,
  type UserAchievement,
  type Achievement,
} from '@/lib/services/achievementService';
import { getUserGlobalStats } from '@/lib/services/leaderboardService';
import AchievementBadge from '@/components/AchievementBadge';

interface Stats {
  level: number;
  currentXP: number;
  xpNeeded: number;
  xpPercentage: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalGamesPlayed: number;
  totalTimeSpent: number;
  globalRank: number | null;
  globalScore: number;
  achievements: {
    unlockedCount: number;
    totalCount: number;
    completionPercentage: number;
  };
  milestones: Array<{
    type: string;
    milestone: number;
    achieved: boolean;
    description: string;
  }>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [levelRank, setLevelRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false);
        setStats(null);
        return;
      }

      try {
        setIsLoading(true);

        const [progression, achievementStats, globalStats, achievements, allAch, leaderboard] =
          await Promise.all([
            getUserProgression(user.id),
            getUserAchievementStats(user.id),
            getUserGlobalStats(user.id),
            getUserAchievements(user.id),
            getAllAchievements(),
            getLevelLeaderboard(1000),
          ]);

        // Find user's rank in level leaderboard
        const userRank = leaderboard.findIndex((entry) => entry.userId === user.id) + 1;

        const milestones = await getUserMilestones(user.id);

        setStats({
          level: progression.level.level,
          currentXP: progression.level.currentXP,
          xpNeeded: progression.level.xpNeeded,
          xpPercentage: progression.level.xpPercentage,
          totalXP: progression.level.totalXP,
          currentStreak: progression.streak.currentStreak,
          longestStreak: progression.streak.longestStreak,
          totalGamesPlayed: progression.totalGamesPlayed,
          totalTimeSpent: progression.totalTimeSpent,
          globalRank: globalStats.rank,
          globalScore: globalStats.totalScore,
          achievements: {
            unlockedCount: achievementStats.unlockedCount,
            totalCount: achievementStats.totalCount,
            completionPercentage: achievementStats.completionPercentage,
          },
          milestones,
        });

        setUserAchievements(achievements);
        setAllAchievements(allAch);
        setLevelRank(userRank);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Error loading profile</p>
          <Link href="/app/games" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app/games" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
            ← Back to Games
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
        </div>

        {/* Level and XP */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-5xl font-bold mb-2">Level {stats.level}</h2>
              <p className="text-lg opacity-90">Total XP: {stats.totalXP.toLocaleString()}</p>
              {levelRank && (
                <p className="text-lg opacity-90 mt-2">
                  #{levelRank} in Level Rankings
                </p>
              )}
            </div>

            {/* XP Progress */}
            <div>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">XP to next level</span>
                  <span className="text-sm font-semibold">
                    {stats.currentXP} / {stats.xpNeeded}
                  </span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${stats.xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Streak */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Current Streak
            </h3>
            <p className="text-4xl font-bold text-orange-600">{stats.currentStreak}</p>
            <p className="text-sm text-gray-600 mt-2">
              Best: {stats.longestStreak} days
            </p>
          </div>

          {/* Games Played */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Games Played
            </h3>
            <p className="text-4xl font-bold text-blue-600">{stats.totalGamesPlayed}</p>
            <p className="text-sm text-gray-600 mt-2">
              {formatTime(stats.totalTimeSpent)} spent
            </p>
          </div>

          {/* Global Rank */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Global Rank
            </h3>
            <p className="text-4xl font-bold text-green-600">
              {stats.globalRank ? `#${stats.globalRank}` : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {stats.globalScore.toLocaleString()} points
            </p>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Achievements
            </h3>
            <p className="text-4xl font-bold text-purple-600">
              {stats.achievements.unlockedCount}/{stats.achievements.totalCount}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {stats.achievements.completionPercentage}% complete
            </p>
          </div>
        </div>

        {/* Milestones */}
        {stats.milestones.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Milestones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200"
                >
                  <div className="text-3xl">🎯</div>
                  <div>
                    <p className="font-semibold text-gray-900">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {userAchievements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Recent Achievements ({userAchievements.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {userAchievements.slice(0, 12).map((ua) => (
                <AchievementBadge
                  key={ua.id}
                  achievement={ua.achievement}
                  isUnlocked={true}
                  unlockedAt={ua.unlocked_at}
                  size="md"
                  showLabel={false}
                />
              ))}
            </div>
            <Link
              href="/app/profile/achievements"
              className="inline-block mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              View All Achievements
            </Link>
          </div>
        )}

        {/* Achievement Progress */}
        {allAchievements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Achievement Progress</h2>
            <div className="space-y-3">
              {allAchievements.slice(0, 5).map((achievement) => {
                const isUnlocked = userAchievements.some(
                  (ua) => ua.achievement_id === achievement.id
                );
                return (
                  <div key={achievement.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="text-gray-700">{achievement.name}</p>
                    {isUnlocked && <span className="ml-auto text-green-600">✓ Unlocked</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
