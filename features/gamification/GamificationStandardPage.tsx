'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AcademicCapIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon,
  FireIcon,
  SparklesIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { GamificationPayload } from './types';

interface GamificationStandardPageProps {
  data: GamificationPayload | null;
}

export function GamificationStandardPage({ data }: GamificationStandardPageProps) {
  const t = useTranslations('gamification');

  const progress = data?.progress;
  const coins = data?.coins;
  const streak = data?.streak;
  const achievements = data?.achievements ?? [];
  const showcase = data?.showcase;

  const xpPercent = progress
    ? Math.round((progress.currentXp / Math.max(progress.nextLevelXp, 1)) * 100)
    : 0;

  const navItems = [
    { href: '/app/learning', icon: AcademicCapIcon, label: t('nav.courses'), desc: t('nav.coursesDesc') },
    { href: '/app/gamification/achievements', icon: TrophyIcon, label: t('nav.achievements'), desc: t('nav.achievementsDesc') },
    { href: '/app/gamification/coins', icon: CurrencyDollarIcon, label: t('nav.dicecoin'), desc: t('nav.dicecoinDesc') },
    { href: '/app/shop', icon: ShoppingBagIcon, label: t('nav.shop'), desc: t('nav.shopDesc') },
    { href: '/app/gamification/events', icon: ClockIcon, label: t('nav.eventlog'), desc: t('nav.eventlogDesc') },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Journey CTA banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 py-4">
          <SparklesIcon className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{t('standard.activateJourneyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('standard.activateJourneyDesc')}</p>
          </div>
          <Link href="/app/profile">
            <Button variant="primary" size="sm">{t('standard.activateJourneyButton')}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Identity + XP */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{t('standard.xpProgress')}</span>
            {progress && (
              <Badge variant="default">
                {t('level')} {progress.level}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={xpPercent} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {progress?.currentXp ?? 0} / {progress?.nextLevelXp ?? 1000} XP
          </p>
        </CardContent>
      </Card>

      {/* Coins + Streak row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Coins */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-amber-500" />
              {t('standard.yourCoins')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{coins?.balance ?? 0}</p>
            {coins?.recentTransactions && coins.recentTransactions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {coins.recentTransactions[0].description} ({coins.recentTransactions[0].date})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FireIcon className="h-5 w-5 text-orange-500" />
              {t('standard.yourStreak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {streak?.currentStreakDays ?? 0}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('streak.daysInARow')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('streak.best')}: {streak?.bestStreakDays ?? 0} {t('streak.days')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements / Showcase */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 text-yellow-500" />
              {t('standard.yourAchievements')}
            </span>
            <Link
              href="/app/gamification/achievements"
              className="text-sm text-primary hover:underline"
            >
              {t('viewAllAchievements')}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showcase?.slots && showcase.slots.some(s => s.achievement) ? (
            <div className="grid grid-cols-4 gap-3">
              {showcase.slots.map((slot) => (
                <div
                  key={slot.slot}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50"
                >
                  {slot.achievement ? (
                    <>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        {slot.achievement.icon ?? '🏆'}
                      </div>
                      <span className="text-xs text-center truncate w-full">
                        {slot.achievement.name}
                      </span>
                    </>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      —
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {achievements.filter(a => a.status === 'unlocked').length} / {achievements.length}{' '}
              {t('achievementsLabel').toLowerCase()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('standard.quickNav')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <item.icon className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
