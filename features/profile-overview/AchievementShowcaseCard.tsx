'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeIcon } from '@/features/gamification/components/BadgeIcon';
import type { ShowcaseSummary, Achievement, ShowcaseSlot } from '@/features/gamification/types';

type AchievementShowcaseCardProps = {
  showcase: ShowcaseSummary | null;
  achievements: Achievement[];
};

export function AchievementShowcaseCard({ showcase, achievements }: AchievementShowcaseCardProps) {
  const t = useTranslations('app.profile.sections.overview');
  const unlocked = achievements.filter((a) => a.status === 'unlocked').length;

  // If no showcase data at all, still show the card with count
  const slots = showcase?.slots ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image src="/icons/journey/utmarkelser_v2_webp.webp" alt="" width={20} height={20} />
            {t('achievements')}
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {unlocked}/{achievements.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {slots.length > 0 ? (
          <div className="flex items-center justify-center gap-4">
            {slots.map((slot: ShowcaseSlot) => (
              <div key={slot.slot} className="flex flex-col items-center gap-1">
                {slot.achievement ? (
                  <>
                    <BadgeIcon
                      iconConfig={slot.achievement.icon_config}
                      size={slot.slot === 1 ? 'lg' : 'md'}
                    />
                    <span className="text-[10px] text-muted-foreground text-center max-w-[60px] truncate">
                      {slot.achievement.name}
                    </span>
                  </>
                ) : (
                  <div
                    className="rounded-full bg-muted flex items-center justify-center"
                    style={{ width: slot.slot === 1 ? 64 : 48, height: slot.slot === 1 ? 64 : 48 }}
                  >
                    <span className="text-muted-foreground/40 text-lg">?</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('noAchievements')}
          </p>
        )}

        {achievements.length > 0 && (
          <div className="mt-3 text-center">
            <Link
              href="/app/journey"
              className="text-xs text-primary hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
