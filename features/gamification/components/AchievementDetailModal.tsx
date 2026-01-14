'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BadgeIcon } from './BadgeIcon';
import { CheckCircleIcon, LockClosedIcon, CalendarIcon } from '@heroicons/react/24/solid';
import type { Achievement } from '../types';

type AchievementDetailModalProps = {
  achievement: Achievement | null;
  open: boolean;
  onClose: () => void;
};

export function AchievementDetailModal({ achievement, open, onClose }: AchievementDetailModalProps) {
  const t = useTranslations('app.gamification.achievements.detail');
  
  if (!achievement) return null;

  const isUnlocked = achievement.status === 'unlocked';
  const isInProgress = achievement.status === 'in_progress';
  const progress = Math.min(100, Math.max(0, achievement.progress ?? 0));

  const formattedDate = achievement.unlockedAt 
    ? new Date(achievement.unlockedAt).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Badge Display */}
          <div className="relative">
            <BadgeIcon 
              iconConfig={achievement.icon_config} 
              size="lg" 
              showGlow={isUnlocked}
              isLocked={!isUnlocked && !isInProgress}
            />
            
            {/* Status indicator */}
            {isUnlocked && (
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            )}
            {!isUnlocked && !isInProgress && (
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-lg">
                <LockClosedIcon className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-2">
            <DialogTitle className="text-xl font-bold">
              {isUnlocked || isInProgress ? achievement.name : '???'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {isUnlocked || isInProgress ? achievement.description : achievement.hint || ''}
            </DialogDescription>
          </div>

          {/* Progress Bar (for in_progress) */}
          {isInProgress && (
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Unlock Date (for unlocked) */}
          {isUnlocked && achievement.unlockedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {t('unlockedPrefix')} {formattedDate}
              </span>
            </div>
          )}

          {/* Hint (for locked, if available) */}
          {!isUnlocked && !isInProgress && achievement.hint && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground italic">
                💡 {achievement.hint}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
