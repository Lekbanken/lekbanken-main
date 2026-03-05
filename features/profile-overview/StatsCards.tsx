'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { FireIcon } from '@heroicons/react/24/outline';
import type { CoinsSummary, StreakSummary } from '@/features/gamification/types';

type StatsCardsProps = {
  coins: CoinsSummary | null;
  streak: StreakSummary | null;
};

export function StatsCards({ coins, streak }: StatsCardsProps) {
  const t = useTranslations('app.profile.sections.overview');

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* DiceCoin card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Image src="/icons/journey/dicecoin_webp.webp" alt="" width={36} height={36} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                DiceCoin
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {(coins?.balance ?? 0).toLocaleString('sv-SE')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-orange-500/10">
              <FireIcon className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('streak')}
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {streak?.currentStreakDays ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">{t('days')}</span>
              </p>
            </div>
            {streak && streak.bestStreakDays > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">{t('best')}</p>
                <p className="text-sm font-semibold text-muted-foreground tabular-nums">{streak.bestStreakDays}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
