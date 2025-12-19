'use client';

import type { Achievement } from '@/lib/services/achievementService';
import Image from 'next/image';

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export default function AchievementBadge({
  achievement,
  isUnlocked,
  unlockedAt,
  size = 'md',
  showLabel = true,
  onClick,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const badgeColor = achievement.badge_color || 'from-yellow-400 to-yellow-600';

  return (
    <div
      className="flex flex-col items-center gap-2 cursor-pointer transition"
      onClick={onClick}
    >
      <div className="relative">
        {/* Badge */}
        <div
          className={`
            ${sizeClasses[size]}
            ${isUnlocked ? `bg-gradient-to-br ${badgeColor}` : 'bg-gray-300'}
            rounded-full flex items-center justify-center
            ${isUnlocked ? 'shadow-lg' : 'shadow'}
            transition transform hover:scale-110
            relative
          `}
        >
          {/* Icon placeholder - could be replaced with actual icons */}
          <div className="text-2xl md:text-3xl lg:text-4xl">
            {achievement.icon_url ? (
              <Image
                src={achievement.icon_url}
                alt={achievement.name}
                width={128}
                height={128}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="select-none">🏆</span>
            )}
          </div>

          {/* Locked indicator */}
          {!isUnlocked && (
            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              🔒
            </div>
          )}

          {/* Unlocked checkmark */}
          {isUnlocked && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md">
              ✓
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className={`font-bold text-gray-900 ${labelSizes[size]}`}>{achievement.name}</p>
          {isUnlocked && unlockedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Unlocked {new Date(unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Locked state label */}
      {!isUnlocked && (
        <p className="text-xs text-center text-gray-600 line-clamp-2">{achievement.description}</p>
      )}
    </div>
  );
}
