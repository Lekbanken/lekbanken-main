'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrophyIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AchievementNotificationData {
  id: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  points?: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
}

interface AchievementNotificationProps {
  achievement: AchievementNotificationData | null;
  onDismiss: () => void;
  autoHideDuration?: number;
}

/**
 * Simple hash function to generate deterministic pseudo-random values
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate confetti particles deterministically based on achievement ID
 */
function generateConfettiFromId(achievementId: string): ConfettiParticle[] {
  const colors = ['#FFD700', '#FFA500', '#FF6347', '#7B68EE', '#00CED1'];
  const baseHash = hashCode(achievementId);
  
  return Array.from({ length: 20 }, (_, i) => {
    // Create deterministic values based on hash + index
    const seed = baseHash + i * 7919; // Use prime number for better distribution
    return {
      id: i,
      x: (seed % 100),
      delay: ((seed % 50) / 100),
      color: colors[seed % colors.length],
      rotation: (seed % 360),
    };
  });
}

/**
 * Celebratory notification for newly unlocked achievements.
 * Shows with a pop-in animation and confetti particles.
 */
export function AchievementNotification({
  achievement,
  onDismiss,
  autoHideDuration = 6000,
}: AchievementNotificationProps) {
  const t = useTranslations('gamification');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate confetti deterministically from achievement ID (pure during render)
  const confetti = useMemo(() => {
    if (!achievement) return [];
    return generateConfettiFromId(achievement.id);
  }, [achievement]);

  const handleDismiss = useCallback(() => {
    // Add exit animation class
    if (containerRef.current) {
      containerRef.current.classList.add('exiting');
    }
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  // Handle auto-dismiss timer
  useEffect(() => {
    if (!achievement) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Auto-hide after duration
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [achievement, autoHideDuration, handleDismiss]);

  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-20">
      {/* Confetti particles using CSS animations */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            '--rotation': `${particle.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}

      {/* Notification card */}
      <div
        ref={containerRef}
        className={cn(
          'pointer-events-auto transition-all duration-300 ease-out',
          'opacity-100 scale-100 translate-y-0 animate-bounce-in',
          '[&.exiting]:opacity-0 [&.exiting]:scale-90 [&.exiting]:-translate-y-5',
        )}
      >
        <div className={cn(
          'relative bg-gradient-to-br from-amber-50 to-yellow-100',
          'dark:from-amber-950/90 dark:to-yellow-900/80',
          'border-2 border-amber-400 dark:border-amber-500',
          'rounded-2xl shadow-2xl shadow-amber-500/30',
          'px-6 py-5 min-w-[320px] max-w-[400px]',
        )}>
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full',
              'bg-amber-200/50 hover:bg-amber-300/50',
              'dark:bg-amber-800/50 dark:hover:bg-amber-700/50',
              'transition-colors',
            )}
            aria-label={t('close')}
          >
            <XMarkIcon className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          </button>

          {/* Sparkle decoration */}
          <div className="absolute -top-3 -left-3 animate-pulse">
            <SparklesIcon className="w-8 h-8 text-amber-400" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              {t('achievementUnlocked')}
            </span>
          </div>

          {/* Content */}
          <div className="flex items-center gap-4">
            {/* Badge/Icon */}
            <div
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-full',
                'bg-gradient-to-br from-yellow-400 to-amber-500',
                'flex items-center justify-center',
                'shadow-lg shadow-amber-500/40',
                'ring-4 ring-white/50 dark:ring-amber-900/50',
                'animate-scale-pop',
              )}
            >
              {achievement.iconUrl ? (
                <Image
                  src={achievement.iconUrl}
                  alt={achievement.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <TrophyIcon className="w-8 h-8 text-white" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 truncate">
                {achievement.name}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 line-clamp-2">
                {achievement.description}
              </p>
              {achievement.points && achievement.points > 0 && (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 animate-fade-in-delayed">
                  +{achievement.points} {t('points')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchievementNotification;
