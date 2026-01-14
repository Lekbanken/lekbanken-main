'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeIcon } from './BadgeIcon';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Achievement } from '../types';

type ConfettiParticle = {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotate: number;
  duration: number;
  borderRadius: string;
};

type AchievementUnlockCelebrationProps = {
  achievement: Achievement | null;
  onClose: () => void;
};

// Particle generation using deterministic but varied values based on index
function generateConfettiParticles(): ConfettiParticle[] {
  const colors = ['#F1C232', '#10B981', '#8B5CF6', '#EF4444', '#0EA5E9', '#F59E0B'];
  // Use deterministic "pseudo-random" based on index for consistent SSR
  const seededValue = (seed: number) => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: seededValue(i * 1) * 100,
    delay: seededValue(i * 2) * 0.5,
    color: colors[Math.floor(seededValue(i * 3) * colors.length)],
    rotate: seededValue(i * 4) > 0.5 ? 360 : -360,
    duration: 3 + seededValue(i * 5) * 2,
    borderRadius: seededValue(i * 6) > 0.5 ? '50%' : '0%',
  }));
}

// Generate particles once at module level for consistent SSR/CSR
const CONFETTI_PARTICLES = generateConfettiParticles();

export function AchievementUnlockCelebration({ achievement, onClose }: AchievementUnlockCelebrationProps) {
  const t = useTranslations('app.gamification.achievements.celebration');

  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!achievement) return;
    
    const timer = setTimeout(stableOnClose, 5000);
    return () => clearTimeout(timer);
  }, [achievement, stableOnClose]);

  // Don't render if no achievement
  if (!achievement) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={stableOnClose}
    >
      {/* Confetti particles with CSS animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {CONFETTI_PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-3 h-3 animate-confetti"
            style={{
              left: `${particle.x}%`,
              top: '-20px',
              backgroundColor: particle.color,
              borderRadius: particle.borderRadius,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="relative bg-card rounded-3xl p-8 shadow-2xl max-w-sm mx-4 text-center animate-in zoom-in-95 duration-300"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={stableOnClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-4xl">🎉</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('title')}
        </h2>

        {/* Badge with glow animation */}
        <div className="my-6 flex justify-center">
          <div className="rounded-full animate-pulse-glow">
            <BadgeIcon 
              iconConfig={achievement.icon_config}
              size="lg"
              showGlow
            />
          </div>
        </div>

        {/* Achievement name */}
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="text-xl font-bold text-primary mb-2">
            {achievement.name}
          </h3>
          <p className="text-muted-foreground text-sm">
            {achievement.description}
          </p>
        </div>

        {/* Tap to dismiss */}
        <p className="mt-6 text-xs text-muted-foreground animate-in fade-in duration-1000 delay-1000">
          {t('tapToClose')}
        </p>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0px rgba(241, 194, 50, 0);
          }
          50% {
            box-shadow: 0 0 30px rgba(241, 194, 50, 0.5);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
