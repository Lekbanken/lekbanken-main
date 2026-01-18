/**
 * LiveProgressDashboard Component
 * 
 * Displays real-time game progress and achievement tracking for host
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

interface ProgressSummary {
  participant_id: string;
  display_name: string;
  game_id?: string;
  status: string;
  score: number;
  progress_percentage: number;
  achievements_count: number;
}

interface AchievementUnlock {
  participant_id: string;
  achievement_name: string;
  points: number;
  unlocked_at: string;
}

interface LiveProgressDashboardProps {
  sessionId: string;
}

export function LiveProgressDashboard({ sessionId }: LiveProgressDashboardProps) {
  const t = useTranslations('play.liveProgress');
  const [progressData, setProgressData] = useState<ProgressSummary[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<AchievementUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScore: 0,
    totalAchievements: 0,
    gamesCompleted: 0,
    activeGames: 0,
  });

  useEffect(() => {
    const fetchProgressData = async () => {
      const supabase = createBrowserClient();

      // Fetch all progress for this session
      const { data: progress } = await supabase
        .from('participant_game_progress')
        .select(`
          participant_id,
          game_id,
          status,
          score,
          progress_percentage,
          achievement_count,
          participants (
            display_name
          )
        `)
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (progress) {
        const formatted = progress.map((p) => ({
          participant_id: p.participant_id,
          display_name: (p.participants as unknown as { display_name: string })?.display_name || t('unknownParticipant'),
          game_id: p.game_id,
          status: p.status,
          score: p.score || 0,
          progress_percentage: Number(p.progress_percentage) || 0,
          achievements_count: p.achievement_count || 0,
        }));

        setProgressData(formatted);

        // Calculate stats
        const totalScore = formatted.reduce((sum, p) => sum + p.score, 0);
        const totalAchievements = formatted.reduce((sum, p) => sum + p.achievements_count, 0);
        const gamesCompleted = formatted.filter(p => p.status === 'completed').length;
        const activeGames = formatted.filter(p => p.status === 'in_progress').length;

        setStats({ totalScore, totalAchievements, gamesCompleted, activeGames });
      }

      // Fetch recent achievement unlocks
      const { data: unlocks } = await supabase
        .from('participant_achievement_unlocks')
        .select(`
          participant_id,
          achievement_name,
          achievement_points,
          unlocked_at,
          participants (
            display_name
          )
        `)
        .eq('session_id', sessionId)
        .order('unlocked_at', { ascending: false })
        .limit(10);

      if (unlocks) {
        const formatted = unlocks
          .filter(u => u.unlocked_at !== null)
          .map((u) => ({
            participant_id: u.participant_id,
            achievement_name: u.achievement_name,
            points: u.achievement_points || 0,
            unlocked_at: u.unlocked_at!,
          }));

        setRecentUnlocks(formatted);
      }

      setLoading(false);
    };

    fetchProgressData();

    // Subscribe to real-time updates
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('broadcast', { event: 'progress_updated' }, () => {
        fetchProgressData();
      })
      .on('broadcast', { event: 'achievement_unlocked' }, (payload) => {
        // Add to recent unlocks
        setRecentUnlocks(prev => [{
          participant_id: payload.payload.participant_id,
          achievement_name: payload.payload.achievement_name,
          points: payload.payload.points,
          unlocked_at: payload.payload.timestamp,
        }, ...prev].slice(0, 10));
        fetchProgressData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t('stats.totalScore')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalScore}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t('stats.achievements')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAchievements}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t('stats.completedGames')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.gamesCompleted}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t('stats.activeGames')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeGames}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Progress List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t('progress.title')}</h3>
          {progressData.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('progress.empty')}</p>
          ) : (
            <div className="space-y-3">
              {progressData.map((progress, index) => (
                <div key={`${progress.participant_id}-${index}`} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{progress.display_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{progress.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{t('progress.points', { count: progress.score })}</p>
                      <p className="text-xs text-gray-500">{t('progress.achievementsCount', { count: progress.achievements_count })}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress.progress_percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('progress.complete', { percent: progress.progress_percentage.toFixed(0) })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{t('achievements.title')}</h3>
          {recentUnlocks.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('achievements.empty')}</p>
          ) : (
            <div className="space-y-3">
              {recentUnlocks.map((unlock, index) => (
                <div key={index} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
                  <div className="text-2xl">🏆</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{unlock.achievement_name}</p>
                    <p className="text-sm text-gray-600">{t('achievements.points', { count: unlock.points })}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(unlock.unlocked_at).toLocaleTimeString('sv-SE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
