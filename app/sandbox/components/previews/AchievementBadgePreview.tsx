'use client';

import { useColors, useSpacing, useTypography } from '../../store/sandbox-store';
import { getFontFamily } from '../../tokens/fonts';
import {
  TrophyIcon,
  FireIcon,
  StarIcon,
  BoltIcon,
  AcademicCapIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';

const sampleAchievements = [
  { id: 'first-game', name: 'First Steps', icon: StarIcon, tier: 'bronze' },
  { id: 'streak-7', name: '7-Day Streak', icon: FireIcon, tier: 'silver' },
  { id: 'perfect-score', name: 'Perfect Score', icon: TrophyIcon, tier: 'gold' },
  { id: 'speed-demon', name: 'Speed Demon', icon: BoltIcon, tier: 'platinum' },
  { id: 'scholar', name: 'Scholar', icon: AcademicCapIcon, tier: 'diamond' },
];

const tierColors = {
  bronze: { bg: '#CD7F32', text: '#78461E' },
  silver: { bg: '#C0C0C0', text: '#6B6B6B' },
  gold: { bg: '#FFD700', text: '#B8860B' },
  platinum: { bg: '#E5E4E2', text: '#607D8B' },
  diamond: { bg: '#B9F2FF', text: '#00838F' },
};

export function AchievementBadgePreview() {
  const { accentHue } = useColors();
  const { borderRadius } = useSpacing();
  const { fontPrimary } = useTypography();
  const fontFamily = getFontFamily(fontPrimary);

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Achievement Badges
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-5 gap-4">
        {sampleAchievements.map((achievement) => {
          const colors = tierColors[achievement.tier as keyof typeof tierColors];
          const Icon = achievement.icon;
          return (
            <div key={achievement.id} className="flex flex-col items-center gap-2 text-center">
              <div
                className="relative flex h-16 w-16 items-center justify-center"
                style={{
                  background: `linear-gradient(145deg, ${colors.bg}, ${colors.text})`,
                  borderRadius: '50%',
                  boxShadow: `0 4px 12px ${colors.bg}40`,
                }}
              >
                <Icon className="h-8 w-8 text-white" />
              </div>
              <span className="text-xs font-medium" style={{ fontFamily }}>
                {achievement.name}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {achievement.tier}
              </span>
            </div>
          );
        })}
      </div>

      {/* Achievement card */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Achievement Card
        </div>
        <div
          className="border border-border bg-card p-4"
          style={{ borderRadius }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center"
              style={{
                background: `linear-gradient(145deg, hsl(${accentHue}, 80%, 55%), hsl(${accentHue}, 70%, 40%))`,
                borderRadius: '50%',
                boxShadow: `0 4px 12px hsl(${accentHue}, 60%, 30%, 0.3)`,
              }}
            >
              <SparklesIcon className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ fontFamily }}>
                  Achievement Unlocked!
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                  style={{
                    backgroundColor: `hsl(${accentHue}, 70%, 95%)`,
                    color: `hsl(${accentHue}, 70%, 40%)`,
                  }}
                >
                  +50 L
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed your first learning session. Keep it up!
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden bg-muted"
                  style={{ borderRadius }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: '75%',
                      backgroundColor: `hsl(${accentHue}, 70%, 50%)`,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">75%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress tiers */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tier Progress
        </div>
        <div className="flex gap-2">
          {Object.entries(tierColors).map(([tier, colors], idx) => (
            <div key={tier} className="flex-1 text-center">
              <div
                className="mx-auto mb-2 h-10 w-10"
                style={{
                  background: `linear-gradient(145deg, ${colors.bg}, ${colors.text})`,
                  borderRadius: '50%',
                }}
              />
              <div className="text-[10px] font-medium capitalize">{tier}</div>
              <div className="text-[10px] text-muted-foreground">{(idx + 1) * 1000} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
