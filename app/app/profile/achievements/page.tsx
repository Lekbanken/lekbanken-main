'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import type {
  AchievementProgress} from '@/lib/services/achievementService';
import {
  getUserAchievementProgress
} from '@/lib/services/achievementService';
import AchievementBadge from '@/components/AchievementBadge';
import { Button, Card, CardContent } from '@/components/ui';
import {
  ArrowLeftIcon,
  TrophyIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function AchievementsPage() {
  const t = useTranslations('app.profile');
  const { user } = useAuth();

  const userId = user?.id;

  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        const progress = await getUserAchievementProgress(userId);
        setAchievements(progress);
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [userId]);

  const filteredAchievements = achievements.filter((item) => {
    if (filterType === 'unlocked') return item.isUnlocked;
    if (filterType === 'locked') return !item.isUnlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">{t('sections.achievements.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/app/profile"
          className="rounded-full p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t('title')}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t('sections.achievements.title')}
          </h1>
        </div>
      </header>

      {/* Progress Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-full bg-amber-500/20 p-3">
              <TrophyIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {unlockedCount} av {totalCount}
              </p>
              <p className="text-sm text-muted-foreground">{t('sections.achievements.progressLabel')}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('sections.achievements.progressSection')}</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          {t('sections.achievements.filters.all')} ({totalCount})
        </Button>
        <Button
          variant={filterType === 'unlocked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('unlocked')}
        >
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          {t('sections.achievements.filters.unlocked')} ({unlockedCount})
        </Button>
        <Button
          variant={filterType === 'locked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('locked')}
        >
          <LockClosedIcon className="h-4 w-4 mr-1" />
          {t('sections.achievements.filters.locked')} ({totalCount - unlockedCount})
        </Button>
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {filterType === 'unlocked'
                ? t('sections.achievements.emptyStates.unlocked')
                : filterType === 'locked'
                  ? t('sections.achievements.emptyStates.locked')
                  : t('sections.achievements.emptyStates.all')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
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
      )}

      {/* Achievement Details */}
      {filteredAchievements.length > 0 && (
        <Card>
          <CardContent className="divide-y divide-border">
            <div className="py-4">
              <h2 className="text-lg font-semibold text-foreground">{t('sections.achievements.details')}</h2>
            </div>
            {filteredAchievements.slice(0, 10).map((item) => (
              <div key={item.achievement.id} className="flex items-start gap-4 py-4">
                <div
                  className={`rounded-full p-2 ${
                    item.isUnlocked
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.isUnlocked ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <LockClosedIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{item.achievement.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {item.achievement.description}
                  </p>
                  {!item.isUnlocked && item.percentComplete > 0 && (
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.percentComplete}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('sections.achievements.percentComplete', { percent: Math.round(item.percentComplete) })}
                      </p>
                    </div>
                  )}
                  {item.isUnlocked && item.unlockedAt && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {t('sections.achievements.unlockedAt', { date: new Date(item.unlockedAt).toLocaleDateString('sv-SE') })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
